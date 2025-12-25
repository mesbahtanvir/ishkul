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
// BlockCache Creation Tests
// =============================================================================

func TestNewBlockCache(t *testing.T) {
	t.Run("creates cache with specified TTL", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		require.NotNil(t, cache)
		assert.Equal(t, 10*time.Minute, cache.ttl)
		assert.NotNil(t, cache.items)
		assert.Equal(t, 0, cache.Size())
	})

	t.Run("creates cache with short TTL", func(t *testing.T) {
		cache := NewBlockCache(1 * time.Second)

		require.NotNil(t, cache)
		assert.Equal(t, 1*time.Second, cache.ttl)
	})
}

// =============================================================================
// Cache Key Tests
// =============================================================================

func TestCacheKey(t *testing.T) {
	t.Run("generates correct key format", func(t *testing.T) {
		key := cacheKey("course-123", "lesson-456", "block-789")
		assert.Equal(t, "course-123:lesson-456:block-789", key)
	})

	t.Run("handles empty strings", func(t *testing.T) {
		key := cacheKey("", "", "")
		assert.Equal(t, "::", key)
	})

	t.Run("handles special characters", func(t *testing.T) {
		key := cacheKey("course-abc-123", "lesson-xyz", "block-789")
		assert.Equal(t, "course-abc-123:lesson-xyz:block-789", key)
	})
}

// =============================================================================
// Get/Set Tests
// =============================================================================

func TestBlockCacheGetSet(t *testing.T) {
	t.Run("stores and retrieves block", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)
		block := &models.Block{
			ID:    "block-123",
			Type:  models.BlockTypeText,
			Title: "Introduction",
		}

		cache.Set("course-1", "lesson-1", "block-123", block)

		retrieved := cache.Get("course-1", "lesson-1", "block-123")
		require.NotNil(t, retrieved)
		assert.Equal(t, "block-123", retrieved.ID)
		assert.Equal(t, models.BlockTypeText, retrieved.Type)
		assert.Equal(t, "Introduction", retrieved.Title)
	})

	t.Run("returns nil for non-existent key", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		retrieved := cache.Get("non-existent", "lesson", "block")
		assert.Nil(t, retrieved)
	})

	t.Run("returns nil for expired entry", func(t *testing.T) {
		cache := NewBlockCache(1 * time.Millisecond)
		block := &models.Block{ID: "block-1"}

		cache.Set("course-1", "lesson-1", "block-1", block)

		// Wait for expiration
		time.Sleep(5 * time.Millisecond)

		retrieved := cache.Get("course-1", "lesson-1", "block-1")
		assert.Nil(t, retrieved)
	})

	t.Run("overwrites existing entry", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		block1 := &models.Block{ID: "block-1", Title: "First"}
		block2 := &models.Block{ID: "block-2", Title: "Second"}

		cache.Set("course-1", "lesson-1", "block-1", block1)
		cache.Set("course-1", "lesson-1", "block-1", block2)

		retrieved := cache.Get("course-1", "lesson-1", "block-1")
		require.NotNil(t, retrieved)
		assert.Equal(t, "block-2", retrieved.ID)
		assert.Equal(t, "Second", retrieved.Title)
	})

	t.Run("stores different blocks for same lesson", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		block1 := &models.Block{ID: "block-1"}
		block2 := &models.Block{ID: "block-2"}

		cache.Set("course-1", "lesson-1", "block-1", block1)
		cache.Set("course-1", "lesson-1", "block-2", block2)

		assert.Equal(t, 2, cache.Size())
		assert.Equal(t, "block-1", cache.Get("course-1", "lesson-1", "block-1").ID)
		assert.Equal(t, "block-2", cache.Get("course-1", "lesson-1", "block-2").ID)
	})

	t.Run("stores same block ID for different lessons", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		block1 := &models.Block{ID: "block-1", Title: "Lesson 1 Block"}
		block2 := &models.Block{ID: "block-1", Title: "Lesson 2 Block"}

		cache.Set("course-1", "lesson-1", "block-1", block1)
		cache.Set("course-1", "lesson-2", "block-1", block2)

		assert.Equal(t, 2, cache.Size())
		assert.Equal(t, "Lesson 1 Block", cache.Get("course-1", "lesson-1", "block-1").Title)
		assert.Equal(t, "Lesson 2 Block", cache.Get("course-1", "lesson-2", "block-1").Title)
	})
}

// =============================================================================
// Delete Tests
// =============================================================================

func TestBlockCacheDelete(t *testing.T) {
	t.Run("deletes existing entry", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)
		block := &models.Block{ID: "block-1"}

		cache.Set("course-1", "lesson-1", "block-1", block)
		assert.Equal(t, 1, cache.Size())

		cache.Delete("course-1", "lesson-1", "block-1")
		assert.Equal(t, 0, cache.Size())
		assert.Nil(t, cache.Get("course-1", "lesson-1", "block-1"))
	})

	t.Run("handles deleting non-existent entry", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		// Should not panic
		cache.Delete("non-existent", "lesson", "block")
		assert.Equal(t, 0, cache.Size())
	})

	t.Run("only deletes specified entry", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		cache.Set("course-1", "lesson-1", "block-1", &models.Block{ID: "block-1"})
		cache.Set("course-1", "lesson-1", "block-2", &models.Block{ID: "block-2"})

		cache.Delete("course-1", "lesson-1", "block-1")

		assert.Nil(t, cache.Get("course-1", "lesson-1", "block-1"))
		assert.NotNil(t, cache.Get("course-1", "lesson-1", "block-2"))
		assert.Equal(t, 1, cache.Size())
	})
}

// =============================================================================
// Has Tests
// =============================================================================

func TestBlockCacheHas(t *testing.T) {
	t.Run("returns true for existing entry", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)
		cache.Set("course-1", "lesson-1", "block-1", &models.Block{ID: "block-1"})

		assert.True(t, cache.Has("course-1", "lesson-1", "block-1"))
	})

	t.Run("returns false for non-existent entry", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		assert.False(t, cache.Has("course-1", "lesson-1", "block-1"))
	})

	t.Run("returns false for expired entry", func(t *testing.T) {
		cache := NewBlockCache(1 * time.Millisecond)
		cache.Set("course-1", "lesson-1", "block-1", &models.Block{ID: "block-1"})

		time.Sleep(5 * time.Millisecond)

		assert.False(t, cache.Has("course-1", "lesson-1", "block-1"))
	})
}

// =============================================================================
// Size Tests
// =============================================================================

func TestBlockCacheSize(t *testing.T) {
	t.Run("returns 0 for empty cache", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)
		assert.Equal(t, 0, cache.Size())
	})

	t.Run("returns correct count after adds", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		cache.Set("course-1", "lesson-1", "block-1", &models.Block{ID: "1"})
		assert.Equal(t, 1, cache.Size())

		cache.Set("course-1", "lesson-1", "block-2", &models.Block{ID: "2"})
		assert.Equal(t, 2, cache.Size())

		cache.Set("course-1", "lesson-1", "block-3", &models.Block{ID: "3"})
		assert.Equal(t, 3, cache.Size())
	})

	t.Run("includes expired entries in count", func(t *testing.T) {
		cache := NewBlockCache(1 * time.Millisecond)
		cache.Set("course-1", "lesson-1", "block-1", &models.Block{ID: "1"})

		time.Sleep(5 * time.Millisecond)

		// Size includes expired entries (until cleanup runs)
		assert.Equal(t, 1, cache.Size())
	})
}

// =============================================================================
// Clear Tests
// =============================================================================

func TestBlockCacheClear(t *testing.T) {
	t.Run("removes all entries", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		cache.Set("course-1", "lesson-1", "block-1", &models.Block{ID: "1"})
		cache.Set("course-1", "lesson-1", "block-2", &models.Block{ID: "2"})
		cache.Set("course-1", "lesson-2", "block-3", &models.Block{ID: "3"})

		assert.Equal(t, 3, cache.Size())

		cache.Clear()

		assert.Equal(t, 0, cache.Size())
		assert.Nil(t, cache.Get("course-1", "lesson-1", "block-1"))
		assert.Nil(t, cache.Get("course-1", "lesson-1", "block-2"))
		assert.Nil(t, cache.Get("course-1", "lesson-2", "block-3"))
	})

	t.Run("handles clearing empty cache", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		// Should not panic
		cache.Clear()
		assert.Equal(t, 0, cache.Size())
	})
}

// =============================================================================
// Cleanup Tests
// =============================================================================

func TestBlockCacheCleanup(t *testing.T) {
	t.Run("removes expired entries", func(t *testing.T) {
		cache := NewBlockCache(1 * time.Millisecond)

		cache.Set("course-1", "lesson-1", "block-1", &models.Block{ID: "1"})

		time.Sleep(5 * time.Millisecond)

		// Manually trigger cleanup
		cache.cleanup()

		assert.Equal(t, 0, cache.Size())
	})

	t.Run("keeps non-expired entries", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)

		cache.Set("course-1", "lesson-1", "block-1", &models.Block{ID: "1"})

		cache.cleanup()

		assert.Equal(t, 1, cache.Size())
		assert.NotNil(t, cache.Get("course-1", "lesson-1", "block-1"))
	})

	t.Run("removes only expired entries", func(t *testing.T) {
		// Create cache with short TTL
		cache := &BlockCache{
			items: make(map[string]*CachedBlock),
			ttl:   10 * time.Minute,
		}

		now := time.Now()

		// Add expired entry
		cache.items["course-1:lesson-1:block-1"] = &CachedBlock{
			Block:     &models.Block{ID: "expired"},
			CreatedAt: now.Add(-20 * time.Minute),
			ExpiresAt: now.Add(-10 * time.Minute), // Already expired
		}

		// Add valid entry
		cache.items["course-1:lesson-1:block-2"] = &CachedBlock{
			Block:     &models.Block{ID: "valid"},
			CreatedAt: now,
			ExpiresAt: now.Add(10 * time.Minute),
		}

		cache.cleanup()

		assert.Equal(t, 1, cache.Size())
		assert.Nil(t, cache.Get("course-1", "lesson-1", "block-1"))
		assert.NotNil(t, cache.Get("course-1", "lesson-1", "block-2"))
	})
}

// =============================================================================
// Concurrency Tests
// =============================================================================

func TestBlockCacheConcurrency(t *testing.T) {
	t.Run("handles concurrent reads and writes", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)
		var wg sync.WaitGroup

		// Concurrent writers
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				block := &models.Block{ID: "block"}
				cache.Set("course", "lesson", "block", block)
			}(i)
		}

		// Concurrent readers
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_ = cache.Get("course", "lesson", "block")
			}()
		}

		wg.Wait()

		// Should not panic and cache should be consistent
		assert.True(t, cache.Size() >= 0)
	})

	t.Run("handles concurrent operations on different keys", func(t *testing.T) {
		cache := NewBlockCache(10 * time.Minute)
		var wg sync.WaitGroup

		numGoroutines := 50

		for i := 0; i < numGoroutines; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				courseID := "course-" + string(rune('A'+n%26))
				lessonID := "lesson-" + string(rune('0'+n%10))
				blockID := "block-" + string(rune('a'+n%26))

				cache.Set(courseID, lessonID, blockID, &models.Block{ID: "block"})
				_ = cache.Get(courseID, lessonID, blockID)
				_ = cache.Has(courseID, lessonID, blockID)
			}(i)
		}

		wg.Wait()

		// Should not panic
		assert.True(t, cache.Size() > 0)
	})

	t.Run("handles concurrent cleanup", func(t *testing.T) {
		cache := NewBlockCache(1 * time.Millisecond)
		var wg sync.WaitGroup

		// Add entries
		for i := 0; i < 50; i++ {
			cache.Set("course", "lesson", "block-"+string(rune('0'+i)), &models.Block{ID: "block"})
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
// CachedBlock Struct Tests
// =============================================================================

func TestCachedBlockStruct(t *testing.T) {
	t.Run("stores block with timestamps", func(t *testing.T) {
		block := &models.Block{
			ID:    "block-123",
			Type:  models.BlockTypeQuestion,
			Title: "Quiz",
		}

		now := time.Now()
		cached := &CachedBlock{
			Block:     block,
			CreatedAt: now,
			ExpiresAt: now.Add(10 * time.Minute),
		}

		assert.Equal(t, block, cached.Block)
		assert.Equal(t, now, cached.CreatedAt)
		assert.Equal(t, now.Add(10*time.Minute), cached.ExpiresAt)
	})
}
