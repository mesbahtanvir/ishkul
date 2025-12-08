package cache

import (
	"sync/atomic"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// ToolSelection represents the result of tool selection from LLM.
type ToolSelection struct {
	Tool   string `json:"tool"`
	Topic  string `json:"topic"`
	Reason string `json:"reason"`
}

// MultiLayerCache provides a 3-layer caching system for split LLM prompts.
//
// Layer 1: Selection Cache - Tool selection results (5 min TTL)
// Layer 2: Content Cache  - Tool-specific content (10 min TTL)
// Layer 3: Block Cache    - Complete pre-generated blocks (15 min TTL)
type MultiLayerCache struct {
	// Layer 1: Tool selection results
	selectionCache *GenericCache

	// Layer 2: Tool-specific content
	contentCache *GenericCache

	// Layer 3: Complete blocks (uses existing BlockCache)
	blockCache *BlockCache

	// Metrics
	metrics *CacheMetrics
}

// CacheMetrics tracks cache hit/miss statistics.
type CacheMetrics struct {
	SelectionHits   int64
	SelectionMisses int64
	ContentHits     int64
	ContentMisses   int64
	BlockHits       int64
	BlockMisses     int64
	SpeculativeHits int64 // Content that was pre-generated and used
}

// NewMultiLayerCache creates a new multi-layer cache.
func NewMultiLayerCache() *MultiLayerCache {
	return &MultiLayerCache{
		selectionCache: NewGenericCache(5 * time.Minute),
		contentCache:   NewGenericCache(10 * time.Minute),
		blockCache:     NewBlockCache(15 * time.Minute),
		metrics:        &CacheMetrics{},
	}
}

// StartCleanup starts cleanup goroutines for all cache layers.
func (m *MultiLayerCache) StartCleanup(interval time.Duration) {
	m.selectionCache.StartCleanup(interval)
	m.contentCache.StartCleanup(interval)
	m.blockCache.StartCleanup(interval)
}

// --- Layer 1: Selection Cache ---

// GetSelection retrieves a cached tool selection.
func (m *MultiLayerCache) GetSelection(courseID string, course *models.Course) (*ToolSelection, bool) {
	contextHash := ContextHash(course)
	key := SelectionKey(courseID, contextHash)

	value, ok := m.selectionCache.Get(key)
	if ok {
		atomic.AddInt64(&m.metrics.SelectionHits, 1)
		if selection, ok := value.(*ToolSelection); ok {
			return selection, true
		}
	}

	atomic.AddInt64(&m.metrics.SelectionMisses, 1)
	return nil, false
}

// SetSelection stores a tool selection result.
func (m *MultiLayerCache) SetSelection(courseID string, course *models.Course, selection *ToolSelection) {
	contextHash := ContextHash(course)
	key := SelectionKey(courseID, contextHash)
	m.selectionCache.Set(key, selection)
}

// InvalidateSelection removes selection cache for a course.
func (m *MultiLayerCache) InvalidateSelection(courseID string) {
	m.selectionCache.DeleteByPrefix("select:" + courseID)
}

// --- Layer 2: Content Cache ---

// GetContent retrieves cached tool content.
func (m *MultiLayerCache) GetContent(courseID, toolType string, course *models.Course, topic string) (interface{}, bool) {
	topicHash := TopicHash(course, topic)
	key := ContentKey(courseID, toolType, topicHash)

	value, ok := m.contentCache.Get(key)
	if ok {
		atomic.AddInt64(&m.metrics.ContentHits, 1)
		atomic.AddInt64(&m.metrics.SpeculativeHits, 1)
		return value, true
	}

	atomic.AddInt64(&m.metrics.ContentMisses, 1)
	return nil, false
}

// SetContent stores tool-specific content.
func (m *MultiLayerCache) SetContent(courseID, toolType string, course *models.Course, topic string, content interface{}) {
	topicHash := TopicHash(course, topic)
	key := ContentKey(courseID, toolType, topicHash)
	m.contentCache.Set(key, content)
}

// InvalidateContent removes content cache for a course/tool combination.
func (m *MultiLayerCache) InvalidateContent(courseID, toolType string) {
	m.contentCache.DeleteByPrefix("content:" + courseID + ":" + toolType)
}

// InvalidateAllContent removes all content cache for a course.
func (m *MultiLayerCache) InvalidateAllContent(courseID string) {
	m.contentCache.DeleteByPrefix("content:" + courseID)
}

// --- Layer 3: Block Cache ---

// GetBlock retrieves a cached complete block.
func (m *MultiLayerCache) GetBlock(courseID, lessonID, blockID string) *models.Block {
	block := m.blockCache.Get(courseID, lessonID, blockID)
	if block != nil {
		atomic.AddInt64(&m.metrics.BlockHits, 1)
	} else {
		atomic.AddInt64(&m.metrics.BlockMisses, 1)
	}
	return block
}

// SetBlock stores a complete block.
func (m *MultiLayerCache) SetBlock(courseID, lessonID, blockID string, block *models.Block) {
	m.blockCache.Set(courseID, lessonID, blockID, block)
}

// InvalidateBlock removes a cached block.
func (m *MultiLayerCache) InvalidateBlock(courseID, lessonID, blockID string) {
	m.blockCache.Delete(courseID, lessonID, blockID)
}

// HasBlock checks if a block is cached.
func (m *MultiLayerCache) HasBlock(courseID, lessonID, blockID string) bool {
	return m.blockCache.Has(courseID, lessonID, blockID)
}

// --- Metrics ---

// GetMetrics returns cache statistics.
func (m *MultiLayerCache) GetMetrics() CacheMetrics {
	return CacheMetrics{
		SelectionHits:   atomic.LoadInt64(&m.metrics.SelectionHits),
		SelectionMisses: atomic.LoadInt64(&m.metrics.SelectionMisses),
		ContentHits:     atomic.LoadInt64(&m.metrics.ContentHits),
		ContentMisses:   atomic.LoadInt64(&m.metrics.ContentMisses),
		BlockHits:       atomic.LoadInt64(&m.metrics.BlockHits),
		BlockMisses:     atomic.LoadInt64(&m.metrics.BlockMisses),
		SpeculativeHits: atomic.LoadInt64(&m.metrics.SpeculativeHits),
	}
}

// SelectionHitRate returns the selection cache hit rate.
func (m *MultiLayerCache) SelectionHitRate() float64 {
	hits := atomic.LoadInt64(&m.metrics.SelectionHits)
	misses := atomic.LoadInt64(&m.metrics.SelectionMisses)
	total := hits + misses
	if total == 0 {
		return 0
	}
	return float64(hits) / float64(total)
}

// ContentHitRate returns the content cache hit rate.
func (m *MultiLayerCache) ContentHitRate() float64 {
	hits := atomic.LoadInt64(&m.metrics.ContentHits)
	misses := atomic.LoadInt64(&m.metrics.ContentMisses)
	total := hits + misses
	if total == 0 {
		return 0
	}
	return float64(hits) / float64(total)
}

// BlockHitRate returns the block cache hit rate.
func (m *MultiLayerCache) BlockHitRate() float64 {
	hits := atomic.LoadInt64(&m.metrics.BlockHits)
	misses := atomic.LoadInt64(&m.metrics.BlockMisses)
	total := hits + misses
	if total == 0 {
		return 0
	}
	return float64(hits) / float64(total)
}

// --- Invalidation Helpers ---

// InvalidateForCourse invalidates all caches related to a course.
// Call this when a block is completed.
func (m *MultiLayerCache) InvalidateForCourse(courseID string) {
	m.InvalidateSelection(courseID)
	// Content cache and block cache are not invalidated as they may still be valid
}

// InvalidateAll clears all caches for a course.
func (m *MultiLayerCache) InvalidateAll(courseID string) {
	m.InvalidateSelection(courseID)
	m.InvalidateAllContent(courseID)
	// Note: Block cache uses courseID:lessonID:blockID keys, so we'd need prefix delete
}

// Clear removes all items from all cache layers.
func (m *MultiLayerCache) Clear() {
	m.selectionCache.Clear()
	m.contentCache.Clear()
	m.blockCache.Clear()
}
