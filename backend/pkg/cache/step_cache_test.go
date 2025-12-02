package cache

import (
	"sync"
	"testing"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// StepCache Creation Tests
// =============================================================================

func TestNewStepCache(t *testing.T) {
	t.Run("creates cache with specified TTL", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		require.NotNil(t, cache)
		assert.Equal(t, 10*time.Minute, cache.ttl)
		assert.NotNil(t, cache.items)
		assert.Equal(t, 0, cache.Size())
	})

	t.Run("creates cache with short TTL", func(t *testing.T) {
		cache := NewStepCache(1 * time.Second)

		require.NotNil(t, cache)
		assert.Equal(t, 1*time.Second, cache.ttl)
	})
}

// =============================================================================
// Cache Key Tests
// =============================================================================

func TestCacheKey(t *testing.T) {
	t.Run("generates correct key format", func(t *testing.T) {
		key := cacheKey("path-123", "user-456")
		assert.Equal(t, "path-123:user-456", key)
	})

	t.Run("handles empty strings", func(t *testing.T) {
		key := cacheKey("", "")
		assert.Equal(t, ":", key)
	})

	t.Run("handles special characters", func(t *testing.T) {
		key := cacheKey("path-abc-123", "user-xyz-789")
		assert.Equal(t, "path-abc-123:user-xyz-789", key)
	})
}

// =============================================================================
// Get/Set Tests
// =============================================================================

func TestStepCacheGetSet(t *testing.T) {
	t.Run("stores and retrieves step", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)
		step := &models.Step{
			ID:    "step-123",
			Type:  "lesson",
			Topic: "Go Basics",
			Title: "Introduction",
		}

		cache.Set("path-1", "user-1", step)

		retrieved := cache.Get("path-1", "user-1")
		require.NotNil(t, retrieved)
		assert.Equal(t, "step-123", retrieved.ID)
		assert.Equal(t, "lesson", retrieved.Type)
		assert.Equal(t, "Go Basics", retrieved.Topic)
	})

	t.Run("returns nil for non-existent key", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		retrieved := cache.Get("non-existent", "user")
		assert.Nil(t, retrieved)
	})

	t.Run("returns nil for expired entry", func(t *testing.T) {
		cache := NewStepCache(1 * time.Millisecond)
		step := &models.Step{ID: "step-1"}

		cache.Set("path-1", "user-1", step)

		// Wait for expiration
		time.Sleep(5 * time.Millisecond)

		retrieved := cache.Get("path-1", "user-1")
		assert.Nil(t, retrieved)
	})

	t.Run("overwrites existing entry", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		step1 := &models.Step{ID: "step-1", Title: "First"}
		step2 := &models.Step{ID: "step-2", Title: "Second"}

		cache.Set("path-1", "user-1", step1)
		cache.Set("path-1", "user-1", step2)

		retrieved := cache.Get("path-1", "user-1")
		require.NotNil(t, retrieved)
		assert.Equal(t, "step-2", retrieved.ID)
		assert.Equal(t, "Second", retrieved.Title)
	})

	t.Run("stores different paths for same user", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		step1 := &models.Step{ID: "step-1"}
		step2 := &models.Step{ID: "step-2"}

		cache.Set("path-1", "user-1", step1)
		cache.Set("path-2", "user-1", step2)

		assert.Equal(t, 2, cache.Size())
		assert.Equal(t, "step-1", cache.Get("path-1", "user-1").ID)
		assert.Equal(t, "step-2", cache.Get("path-2", "user-1").ID)
	})

	t.Run("stores same path for different users", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		step1 := &models.Step{ID: "step-1"}
		step2 := &models.Step{ID: "step-2"}

		cache.Set("path-1", "user-1", step1)
		cache.Set("path-1", "user-2", step2)

		assert.Equal(t, 2, cache.Size())
		assert.Equal(t, "step-1", cache.Get("path-1", "user-1").ID)
		assert.Equal(t, "step-2", cache.Get("path-1", "user-2").ID)
	})
}

// =============================================================================
// Delete Tests
// =============================================================================

func TestStepCacheDelete(t *testing.T) {
	t.Run("deletes existing entry", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)
		step := &models.Step{ID: "step-1"}

		cache.Set("path-1", "user-1", step)
		assert.Equal(t, 1, cache.Size())

		cache.Delete("path-1", "user-1")
		assert.Equal(t, 0, cache.Size())
		assert.Nil(t, cache.Get("path-1", "user-1"))
	})

	t.Run("handles deleting non-existent entry", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		// Should not panic
		cache.Delete("non-existent", "user")
		assert.Equal(t, 0, cache.Size())
	})

	t.Run("only deletes specified entry", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		cache.Set("path-1", "user-1", &models.Step{ID: "step-1"})
		cache.Set("path-2", "user-1", &models.Step{ID: "step-2"})

		cache.Delete("path-1", "user-1")

		assert.Nil(t, cache.Get("path-1", "user-1"))
		assert.NotNil(t, cache.Get("path-2", "user-1"))
		assert.Equal(t, 1, cache.Size())
	})
}

// =============================================================================
// Has Tests
// =============================================================================

func TestStepCacheHas(t *testing.T) {
	t.Run("returns true for existing entry", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)
		cache.Set("path-1", "user-1", &models.Step{ID: "step-1"})

		assert.True(t, cache.Has("path-1", "user-1"))
	})

	t.Run("returns false for non-existent entry", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		assert.False(t, cache.Has("path-1", "user-1"))
	})

	t.Run("returns false for expired entry", func(t *testing.T) {
		cache := NewStepCache(1 * time.Millisecond)
		cache.Set("path-1", "user-1", &models.Step{ID: "step-1"})

		time.Sleep(5 * time.Millisecond)

		assert.False(t, cache.Has("path-1", "user-1"))
	})
}

// =============================================================================
// Size Tests
// =============================================================================

func TestStepCacheSize(t *testing.T) {
	t.Run("returns 0 for empty cache", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)
		assert.Equal(t, 0, cache.Size())
	})

	t.Run("returns correct count after adds", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		cache.Set("path-1", "user-1", &models.Step{ID: "1"})
		assert.Equal(t, 1, cache.Size())

		cache.Set("path-2", "user-1", &models.Step{ID: "2"})
		assert.Equal(t, 2, cache.Size())

		cache.Set("path-3", "user-1", &models.Step{ID: "3"})
		assert.Equal(t, 3, cache.Size())
	})

	t.Run("includes expired entries in count", func(t *testing.T) {
		cache := NewStepCache(1 * time.Millisecond)
		cache.Set("path-1", "user-1", &models.Step{ID: "1"})

		time.Sleep(5 * time.Millisecond)

		// Size includes expired entries (until cleanup runs)
		assert.Equal(t, 1, cache.Size())
	})
}

// =============================================================================
// Clear Tests
// =============================================================================

func TestStepCacheClear(t *testing.T) {
	t.Run("removes all entries", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		cache.Set("path-1", "user-1", &models.Step{ID: "1"})
		cache.Set("path-2", "user-1", &models.Step{ID: "2"})
		cache.Set("path-3", "user-2", &models.Step{ID: "3"})

		assert.Equal(t, 3, cache.Size())

		cache.Clear()

		assert.Equal(t, 0, cache.Size())
		assert.Nil(t, cache.Get("path-1", "user-1"))
		assert.Nil(t, cache.Get("path-2", "user-1"))
		assert.Nil(t, cache.Get("path-3", "user-2"))
	})

	t.Run("handles clearing empty cache", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		// Should not panic
		cache.Clear()
		assert.Equal(t, 0, cache.Size())
	})
}

// =============================================================================
// Cleanup Tests
// =============================================================================

func TestStepCacheCleanup(t *testing.T) {
	t.Run("removes expired entries", func(t *testing.T) {
		cache := NewStepCache(1 * time.Millisecond)

		cache.Set("path-1", "user-1", &models.Step{ID: "1"})

		time.Sleep(5 * time.Millisecond)

		// Manually trigger cleanup
		cache.cleanup()

		assert.Equal(t, 0, cache.Size())
	})

	t.Run("keeps non-expired entries", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)

		cache.Set("path-1", "user-1", &models.Step{ID: "1"})

		cache.cleanup()

		assert.Equal(t, 1, cache.Size())
		assert.NotNil(t, cache.Get("path-1", "user-1"))
	})

	t.Run("removes only expired entries", func(t *testing.T) {
		// Create cache with short TTL
		cache := &StepCache{
			items: make(map[string]*CachedStep),
			ttl:   10 * time.Minute,
		}

		now := time.Now()

		// Add expired entry
		cache.items["path-1:user-1"] = &CachedStep{
			Step:      &models.Step{ID: "expired"},
			CreatedAt: now.Add(-20 * time.Minute),
			ExpiresAt: now.Add(-10 * time.Minute), // Already expired
		}

		// Add valid entry
		cache.items["path-2:user-1"] = &CachedStep{
			Step:      &models.Step{ID: "valid"},
			CreatedAt: now,
			ExpiresAt: now.Add(10 * time.Minute),
		}

		cache.cleanup()

		assert.Equal(t, 1, cache.Size())
		assert.Nil(t, cache.Get("path-1", "user-1"))
		assert.NotNil(t, cache.Get("path-2", "user-1"))
	})
}

// =============================================================================
// Concurrency Tests
// =============================================================================

func TestStepCacheConcurrency(t *testing.T) {
	t.Run("handles concurrent reads and writes", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)
		var wg sync.WaitGroup

		// Concurrent writers
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				step := &models.Step{ID: "step"}
				cache.Set("path", "user", step)
			}(i)
		}

		// Concurrent readers
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_ = cache.Get("path", "user")
			}()
		}

		wg.Wait()

		// Should not panic and cache should be consistent
		assert.True(t, cache.Size() >= 0)
	})

	t.Run("handles concurrent operations on different keys", func(t *testing.T) {
		cache := NewStepCache(10 * time.Minute)
		var wg sync.WaitGroup

		numGoroutines := 50

		for i := 0; i < numGoroutines; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				pathID := "path-" + string(rune('A'+n%26))
				userID := "user-" + string(rune('0'+n%10))

				cache.Set(pathID, userID, &models.Step{ID: "step"})
				_ = cache.Get(pathID, userID)
				_ = cache.Has(pathID, userID)
			}(i)
		}

		wg.Wait()

		// Should not panic
		assert.True(t, cache.Size() > 0)
	})

	t.Run("handles concurrent cleanup", func(t *testing.T) {
		cache := NewStepCache(1 * time.Millisecond)
		var wg sync.WaitGroup

		// Add entries
		for i := 0; i < 50; i++ {
			cache.Set("path", "user-"+string(rune('0'+i)), &models.Step{ID: "step"})
		}

		time.Sleep(5 * time.Millisecond)

		// Concurrent cleanup
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				cache.cleanup()
			}()
		}

		wg.Wait()

		// All expired entries should be removed
		assert.Equal(t, 0, cache.Size())
	})
}

// =============================================================================
// CachedStep Struct Tests
// =============================================================================

func TestCachedStepStruct(t *testing.T) {
	t.Run("stores step with timestamps", func(t *testing.T) {
		step := &models.Step{
			ID:    "step-123",
			Type:  "quiz",
			Topic: "Testing",
		}

		now := time.Now()
		cached := &CachedStep{
			Step:      step,
			CreatedAt: now,
			ExpiresAt: now.Add(10 * time.Minute),
		}

		assert.Equal(t, step, cached.Step)
		assert.Equal(t, now, cached.CreatedAt)
		assert.Equal(t, now.Add(10*time.Minute), cached.ExpiresAt)
	})
}
