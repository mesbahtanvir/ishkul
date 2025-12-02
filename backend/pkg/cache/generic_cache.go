package cache

import (
	"sync"
	"time"
)

// CachedItem represents a generic cached item with expiration.
type CachedItem struct {
	Value     interface{}
	CreatedAt time.Time
	ExpiresAt time.Time
}

// GenericCache provides thread-safe in-memory caching for any type.
type GenericCache struct {
	mu    sync.RWMutex
	items map[string]*CachedItem
	ttl   time.Duration
}

// NewGenericCache creates a new generic cache with the specified TTL.
func NewGenericCache(ttl time.Duration) *GenericCache {
	return &GenericCache{
		items: make(map[string]*CachedItem),
		ttl:   ttl,
	}
}

// Get retrieves a cached item if it exists and hasn't expired.
func (c *GenericCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	cached, exists := c.items[key]
	if !exists {
		return nil, false
	}

	// Check expiration
	if time.Now().After(cached.ExpiresAt) {
		return nil, false
	}

	return cached.Value, true
}

// Set stores an item in the cache with default TTL.
func (c *GenericCache) Set(key string, value interface{}) {
	c.SetWithTTL(key, value, c.ttl)
}

// SetWithTTL stores an item in the cache with custom TTL.
func (c *GenericCache) SetWithTTL(key string, value interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	c.items[key] = &CachedItem{
		Value:     value,
		CreatedAt: now,
		ExpiresAt: now.Add(ttl),
	}
}

// Delete removes a cached item.
func (c *GenericCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.items, key)
}

// DeleteByPrefix removes all items with keys starting with the given prefix.
func (c *GenericCache) DeleteByPrefix(prefix string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for key := range c.items {
		if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
			delete(c.items, key)
		}
	}
}

// Has checks if a valid (non-expired) cached item exists.
func (c *GenericCache) Has(key string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	cached, exists := c.items[key]
	if !exists {
		return false
	}

	return time.Now().Before(cached.ExpiresAt)
}

// Size returns the number of items in the cache (including expired).
func (c *GenericCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.items)
}

// StartCleanup starts a goroutine that periodically removes expired entries.
func (c *GenericCache) StartCleanup(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			c.cleanup()
		}
	}()
}

// cleanup removes expired entries from the cache.
func (c *GenericCache) cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for key, cached := range c.items {
		if now.After(cached.ExpiresAt) {
			delete(c.items, key)
		}
	}
}

// Clear removes all items from the cache.
func (c *GenericCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*CachedItem)
}
