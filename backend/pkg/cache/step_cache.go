package cache

import (
	"sync"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// CachedStep represents a pre-generated step stored in cache
type CachedStep struct {
	Step      *models.Step
	CreatedAt time.Time
	ExpiresAt time.Time
}

// StepCache provides thread-safe in-memory caching for pre-generated steps
type StepCache struct {
	mu    sync.RWMutex
	items map[string]*CachedStep // key: "pathID:userID"
	ttl   time.Duration
}

// NewStepCache creates a new step cache with the specified TTL
func NewStepCache(ttl time.Duration) *StepCache {
	return &StepCache{
		items: make(map[string]*CachedStep),
		ttl:   ttl,
	}
}

// cacheKey generates a unique key for a path-user combination
func cacheKey(pathID, userID string) string {
	return pathID + ":" + userID
}

// Get retrieves a cached step if it exists and hasn't expired
func (c *StepCache) Get(pathID, userID string) *models.Step {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := cacheKey(pathID, userID)
	cached, exists := c.items[key]
	if !exists {
		return nil
	}

	// Check expiration
	if time.Now().After(cached.ExpiresAt) {
		return nil
	}

	return cached.Step
}

// Set stores a step in the cache
func (c *StepCache) Set(pathID, userID string, step *models.Step) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := cacheKey(pathID, userID)
	now := time.Now()
	c.items[key] = &CachedStep{
		Step:      step,
		CreatedAt: now,
		ExpiresAt: now.Add(c.ttl),
	}
}

// Delete removes a cached step
func (c *StepCache) Delete(pathID, userID string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := cacheKey(pathID, userID)
	delete(c.items, key)
}

// Has checks if a valid (non-expired) cached step exists
func (c *StepCache) Has(pathID, userID string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := cacheKey(pathID, userID)
	cached, exists := c.items[key]
	if !exists {
		return false
	}

	return time.Now().Before(cached.ExpiresAt)
}

// Size returns the number of items in the cache (including expired)
func (c *StepCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.items)
}

// StartCleanup starts a goroutine that periodically removes expired entries
func (c *StepCache) StartCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			c.cleanup()
		}
	}()
}

// cleanup removes expired entries from the cache
func (c *StepCache) cleanup() {
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
func (c *StepCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*CachedStep)
}
