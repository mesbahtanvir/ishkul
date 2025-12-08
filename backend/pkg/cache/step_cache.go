package cache

import (
	"sync"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// CachedBlock represents a pre-generated block stored in cache
type CachedBlock struct {
	Block     *models.Block
	CreatedAt time.Time
	ExpiresAt time.Time
}

// BlockCache provides thread-safe in-memory caching for pre-generated blocks
type BlockCache struct {
	mu    sync.RWMutex
	items map[string]*CachedBlock // key: "courseID:lessonID:blockID"
	ttl   time.Duration
}

// NewBlockCache creates a new block cache with the specified TTL
func NewBlockCache(ttl time.Duration) *BlockCache {
	return &BlockCache{
		items: make(map[string]*CachedBlock),
		ttl:   ttl,
	}
}

// cacheKey generates a unique key for a block
func cacheKey(courseID, lessonID, blockID string) string {
	return courseID + ":" + lessonID + ":" + blockID
}

// Get retrieves a cached block if it exists and hasn't expired
func (c *BlockCache) Get(courseID, lessonID, blockID string) *models.Block {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := cacheKey(courseID, lessonID, blockID)
	cached, exists := c.items[key]
	if !exists {
		return nil
	}

	// Check expiration
	if time.Now().After(cached.ExpiresAt) {
		return nil
	}

	return cached.Block
}

// Set stores a block in the cache
func (c *BlockCache) Set(courseID, lessonID, blockID string, block *models.Block) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := cacheKey(courseID, lessonID, blockID)
	now := time.Now()
	c.items[key] = &CachedBlock{
		Block:     block,
		CreatedAt: now,
		ExpiresAt: now.Add(c.ttl),
	}
}

// Delete removes a cached block
func (c *BlockCache) Delete(courseID, lessonID, blockID string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := cacheKey(courseID, lessonID, blockID)
	delete(c.items, key)
}

// Has checks if a valid (non-expired) cached block exists
func (c *BlockCache) Has(courseID, lessonID, blockID string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := cacheKey(courseID, lessonID, blockID)
	cached, exists := c.items[key]
	if !exists {
		return false
	}

	return time.Now().Before(cached.ExpiresAt)
}

// Size returns the number of items in the cache (including expired)
func (c *BlockCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.items)
}

// StartCleanup starts a goroutine that periodically removes expired entries
func (c *BlockCache) StartCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			c.cleanup()
		}
	}()
}

// cleanup removes expired entries from the cache
func (c *BlockCache) cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for key, cached := range c.items {
		if now.After(cached.ExpiresAt) {
			delete(c.items, key)
		}
	}
}

// Clear removes all items from the cache
func (c *BlockCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*CachedBlock)
}
