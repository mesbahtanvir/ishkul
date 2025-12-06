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
// Layer 3: Step Cache     - Complete pre-generated steps (15 min TTL)
type MultiLayerCache struct {
	// Layer 1: Tool selection results
	selectionCache *GenericCache

	// Layer 2: Tool-specific content
	contentCache *GenericCache

	// Layer 3: Complete steps (uses existing StepCache)
	stepCache *StepCache

	// Metrics
	metrics *CacheMetrics
}

// CacheMetrics tracks cache hit/miss statistics.
type CacheMetrics struct {
	SelectionHits   int64
	SelectionMisses int64
	ContentHits     int64
	ContentMisses   int64
	StepHits        int64
	StepMisses      int64
	SpeculativeHits int64 // Content that was pre-generated and used
}

// NewMultiLayerCache creates a new multi-layer cache.
func NewMultiLayerCache() *MultiLayerCache {
	return &MultiLayerCache{
		selectionCache: NewGenericCache(5 * time.Minute),
		contentCache:   NewGenericCache(10 * time.Minute),
		stepCache:      NewStepCache(15 * time.Minute),
		metrics:        &CacheMetrics{},
	}
}

// StartCleanup starts cleanup goroutines for all cache layers.
func (m *MultiLayerCache) StartCleanup(interval time.Duration) {
	m.selectionCache.StartCleanup(interval)
	m.contentCache.StartCleanup(interval)
	m.stepCache.StartCleanup(interval)
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

// --- Layer 3: Step Cache ---

// GetStep retrieves a cached complete step.
func (m *MultiLayerCache) GetStep(courseID, userID string) *models.Step {
	step := m.stepCache.Get(courseID, userID)
	if step != nil {
		atomic.AddInt64(&m.metrics.StepHits, 1)
	} else {
		atomic.AddInt64(&m.metrics.StepMisses, 1)
	}
	return step
}

// SetStep stores a complete step.
func (m *MultiLayerCache) SetStep(courseID, userID string, step *models.Step) {
	m.stepCache.Set(courseID, userID, step)
}

// InvalidateStep removes a cached step.
func (m *MultiLayerCache) InvalidateStep(courseID, userID string) {
	m.stepCache.Delete(courseID, userID)
}

// HasStep checks if a step is cached.
func (m *MultiLayerCache) HasStep(courseID, userID string) bool {
	return m.stepCache.Has(courseID, userID)
}

// --- Metrics ---

// GetMetrics returns cache statistics.
func (m *MultiLayerCache) GetMetrics() CacheMetrics {
	return CacheMetrics{
		SelectionHits:   atomic.LoadInt64(&m.metrics.SelectionHits),
		SelectionMisses: atomic.LoadInt64(&m.metrics.SelectionMisses),
		ContentHits:     atomic.LoadInt64(&m.metrics.ContentHits),
		ContentMisses:   atomic.LoadInt64(&m.metrics.ContentMisses),
		StepHits:        atomic.LoadInt64(&m.metrics.StepHits),
		StepMisses:      atomic.LoadInt64(&m.metrics.StepMisses),
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

// StepHitRate returns the step cache hit rate.
func (m *MultiLayerCache) StepHitRate() float64 {
	hits := atomic.LoadInt64(&m.metrics.StepHits)
	misses := atomic.LoadInt64(&m.metrics.StepMisses)
	total := hits + misses
	if total == 0 {
		return 0
	}
	return float64(hits) / float64(total)
}

// --- Invalidation Helpers ---

// InvalidateForCourse invalidates all caches related to a course.
// Call this when a step is completed.
func (m *MultiLayerCache) InvalidateForCourse(courseID, userID string) {
	m.InvalidateSelection(courseID)
	m.InvalidateStep(courseID, userID)
	// Content cache is not invalidated as it may still be valid for same topic
}

// InvalidateAll clears all caches for a course.
func (m *MultiLayerCache) InvalidateAll(courseID, userID string) {
	m.InvalidateSelection(courseID)
	m.InvalidateAllContent(courseID)
	m.InvalidateStep(courseID, userID)
}

// Clear removes all items from all cache layers.
func (m *MultiLayerCache) Clear() {
	m.selectionCache.Clear()
	m.contentCache.Clear()
	m.stepCache.Clear()
}
