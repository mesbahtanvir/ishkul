package cache

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// NewGenericCache Tests
// =============================================================================

func TestNewGenericCache(t *testing.T) {
	t.Run("creates cache with specified TTL", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		require.NotNil(t, cache)
		assert.Equal(t, 5*time.Minute, cache.ttl)
		assert.NotNil(t, cache.items)
		assert.Equal(t, 0, len(cache.items))
	})

	t.Run("creates cache with zero TTL", func(t *testing.T) {
		cache := NewGenericCache(0)
		require.NotNil(t, cache)
		assert.Equal(t, time.Duration(0), cache.ttl)
	})

	t.Run("creates cache with large TTL", func(t *testing.T) {
		cache := NewGenericCache(24 * time.Hour)
		require.NotNil(t, cache)
		assert.Equal(t, 24*time.Hour, cache.ttl)
	})
}

// =============================================================================
// Get Tests
// =============================================================================

func TestGenericCache_Get(t *testing.T) {
	t.Run("returns false for non-existent key", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)

		value, exists := cache.Get("non-existent")
		assert.False(t, exists)
		assert.Nil(t, value)
	})

	t.Run("returns value for existing key", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")

		value, exists := cache.Get("key1")
		assert.True(t, exists)
		assert.Equal(t, "value1", value)
	})

	t.Run("returns false for expired key", func(t *testing.T) {
		cache := NewGenericCache(1 * time.Millisecond)
		cache.Set("key1", "value1")

		// Wait for expiration
		time.Sleep(5 * time.Millisecond)

		value, exists := cache.Get("key1")
		assert.False(t, exists)
		assert.Nil(t, value)
	})

	t.Run("handles different value types", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)

		// String
		cache.Set("string", "hello")
		val, exists := cache.Get("string")
		assert.True(t, exists)
		assert.Equal(t, "hello", val)

		// Integer
		cache.Set("int", 42)
		val, exists = cache.Get("int")
		assert.True(t, exists)
		assert.Equal(t, 42, val)

		// Struct
		type TestStruct struct {
			Name string
			Age  int
		}
		cache.Set("struct", TestStruct{Name: "test", Age: 25})
		val, exists = cache.Get("struct")
		assert.True(t, exists)
		assert.Equal(t, TestStruct{Name: "test", Age: 25}, val)

		// Slice
		cache.Set("slice", []int{1, 2, 3})
		val, exists = cache.Get("slice")
		assert.True(t, exists)
		assert.Equal(t, []int{1, 2, 3}, val)
	})
}

// =============================================================================
// Set Tests
// =============================================================================

func TestGenericCache_Set(t *testing.T) {
	t.Run("stores value with default TTL", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")

		value, exists := cache.Get("key1")
		assert.True(t, exists)
		assert.Equal(t, "value1", value)
	})

	t.Run("overwrites existing value", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")
		cache.Set("key1", "value2")

		value, exists := cache.Get("key1")
		assert.True(t, exists)
		assert.Equal(t, "value2", value)
	})

	t.Run("stores nil value", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", nil)

		value, exists := cache.Get("key1")
		assert.True(t, exists)
		assert.Nil(t, value)
	})
}

// =============================================================================
// SetWithTTL Tests
// =============================================================================

func TestGenericCache_SetWithTTL(t *testing.T) {
	t.Run("stores value with custom TTL", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.SetWithTTL("key1", "value1", 10*time.Millisecond)

		// Should exist immediately
		value, exists := cache.Get("key1")
		assert.True(t, exists)
		assert.Equal(t, "value1", value)

		// Wait for expiration
		time.Sleep(20 * time.Millisecond)

		value, exists = cache.Get("key1")
		assert.False(t, exists)
		assert.Nil(t, value)
	})

	t.Run("custom TTL overrides default", func(t *testing.T) {
		cache := NewGenericCache(1 * time.Hour)
		cache.SetWithTTL("key1", "value1", 5*time.Millisecond)

		// Wait for custom TTL expiration
		time.Sleep(10 * time.Millisecond)

		value, exists := cache.Get("key1")
		assert.False(t, exists)
		assert.Nil(t, value)
	})
}

// =============================================================================
// Delete Tests
// =============================================================================

func TestGenericCache_Delete(t *testing.T) {
	t.Run("deletes existing key", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")
		cache.Delete("key1")

		value, exists := cache.Get("key1")
		assert.False(t, exists)
		assert.Nil(t, value)
	})

	t.Run("deleting non-existent key does not error", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		// Should not panic
		cache.Delete("non-existent")
	})

	t.Run("only deletes specified key", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")
		cache.Set("key2", "value2")
		cache.Delete("key1")

		_, exists := cache.Get("key1")
		assert.False(t, exists)

		value, exists := cache.Get("key2")
		assert.True(t, exists)
		assert.Equal(t, "value2", value)
	})
}

// =============================================================================
// DeleteByPrefix Tests
// =============================================================================

func TestGenericCache_DeleteByPrefix(t *testing.T) {
	t.Run("deletes all keys with matching prefix", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("user:1", "alice")
		cache.Set("user:2", "bob")
		cache.Set("user:3", "charlie")
		cache.Set("session:1", "session1")

		cache.DeleteByPrefix("user:")

		_, exists := cache.Get("user:1")
		assert.False(t, exists)
		_, exists = cache.Get("user:2")
		assert.False(t, exists)
		_, exists = cache.Get("user:3")
		assert.False(t, exists)

		// Session should still exist
		value, exists := cache.Get("session:1")
		assert.True(t, exists)
		assert.Equal(t, "session1", value)
	})

	t.Run("handles empty prefix", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")
		cache.Set("key2", "value2")

		cache.DeleteByPrefix("")

		// All keys should be deleted (empty prefix matches everything)
		assert.Equal(t, 0, cache.Size())
	})

	t.Run("handles no matching keys", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")

		cache.DeleteByPrefix("nomatch:")

		// Key should still exist
		value, exists := cache.Get("key1")
		assert.True(t, exists)
		assert.Equal(t, "value1", value)
	})
}

// =============================================================================
// Has Tests
// =============================================================================

func TestGenericCache_Has(t *testing.T) {
	t.Run("returns true for existing non-expired key", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")

		assert.True(t, cache.Has("key1"))
	})

	t.Run("returns false for non-existent key", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)

		assert.False(t, cache.Has("non-existent"))
	})

	t.Run("returns false for expired key", func(t *testing.T) {
		cache := NewGenericCache(1 * time.Millisecond)
		cache.Set("key1", "value1")

		time.Sleep(5 * time.Millisecond)

		assert.False(t, cache.Has("key1"))
	})
}

// =============================================================================
// Size Tests
// =============================================================================

func TestGenericCache_Size(t *testing.T) {
	t.Run("returns 0 for empty cache", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		assert.Equal(t, 0, cache.Size())
	})

	t.Run("returns correct count after adding items", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")
		cache.Set("key2", "value2")
		cache.Set("key3", "value3")

		assert.Equal(t, 3, cache.Size())
	})

	t.Run("includes expired items in count", func(t *testing.T) {
		cache := NewGenericCache(1 * time.Millisecond)
		cache.Set("key1", "value1")

		time.Sleep(5 * time.Millisecond)

		// Size still includes expired items (until cleanup runs)
		assert.Equal(t, 1, cache.Size())
	})

	t.Run("decreases after delete", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")
		cache.Set("key2", "value2")
		cache.Delete("key1")

		assert.Equal(t, 1, cache.Size())
	})
}

// =============================================================================
// Clear Tests
// =============================================================================

func TestGenericCache_Clear(t *testing.T) {
	t.Run("removes all items", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")
		cache.Set("key2", "value2")
		cache.Set("key3", "value3")

		cache.Clear()

		assert.Equal(t, 0, cache.Size())
		_, exists := cache.Get("key1")
		assert.False(t, exists)
	})

	t.Run("clearing empty cache does not error", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Clear()
		assert.Equal(t, 0, cache.Size())
	})
}

// =============================================================================
// Cleanup Tests
// =============================================================================

func TestGenericCache_Cleanup(t *testing.T) {
	t.Run("removes expired items", func(t *testing.T) {
		cache := NewGenericCache(1 * time.Millisecond)
		cache.Set("key1", "value1")

		time.Sleep(5 * time.Millisecond)

		// Call cleanup directly
		cache.cleanup()

		assert.Equal(t, 0, cache.Size())
	})

	t.Run("keeps non-expired items", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")

		cache.cleanup()

		assert.Equal(t, 1, cache.Size())
		value, exists := cache.Get("key1")
		assert.True(t, exists)
		assert.Equal(t, "value1", value)
	})

	t.Run("removes only expired items", func(t *testing.T) {
		cache := NewGenericCache(1 * time.Hour)
		cache.Set("long-lived", "value1")
		cache.SetWithTTL("short-lived", "value2", 1*time.Millisecond)

		time.Sleep(5 * time.Millisecond)

		cache.cleanup()

		assert.Equal(t, 1, cache.Size())
		_, exists := cache.Get("short-lived")
		assert.False(t, exists)
		value, exists := cache.Get("long-lived")
		assert.True(t, exists)
		assert.Equal(t, "value1", value)
	})
}

// =============================================================================
// Concurrency Tests
// =============================================================================

func TestGenericCache_Concurrency(t *testing.T) {
	t.Run("handles concurrent reads and writes", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		var wg sync.WaitGroup

		// Concurrent writes
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				cache.Set(string(rune('a'+i%26)), i)
			}(i)
		}

		// Concurrent reads
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				cache.Get(string(rune('a' + i%26)))
			}(i)
		}

		wg.Wait()
		// Should not panic or deadlock
	})

	t.Run("handles concurrent deletes", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)

		// Add items
		for i := 0; i < 100; i++ {
			cache.Set(string(rune('a'+i%26)), i)
		}

		var wg sync.WaitGroup

		// Concurrent deletes
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				cache.Delete(string(rune('a' + i%26)))
			}(i)
		}

		wg.Wait()
		// Should not panic or deadlock
	})

	t.Run("handles concurrent operations", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		var wg sync.WaitGroup

		// Mixed operations
		for i := 0; i < 50; i++ {
			wg.Add(4)

			go func(i int) {
				defer wg.Done()
				cache.Set(string(rune('a'+i%26)), i)
			}(i)

			go func(i int) {
				defer wg.Done()
				cache.Get(string(rune('a' + i%26)))
			}(i)

			go func(i int) {
				defer wg.Done()
				cache.Has(string(rune('a' + i%26)))
			}(i)

			go func(i int) {
				defer wg.Done()
				cache.Size()
			}(i)
		}

		wg.Wait()
		// Should not panic or deadlock
	})
}

// =============================================================================
// CachedItem Tests
// =============================================================================

func TestCachedItem(t *testing.T) {
	t.Run("stores value with timestamps", func(t *testing.T) {
		cache := NewGenericCache(5 * time.Minute)
		cache.Set("key1", "value1")

		cache.mu.RLock()
		item := cache.items["key1"]
		cache.mu.RUnlock()

		require.NotNil(t, item)
		assert.Equal(t, "value1", item.Value)
		assert.False(t, item.CreatedAt.IsZero())
		assert.False(t, item.ExpiresAt.IsZero())
		assert.True(t, item.ExpiresAt.After(item.CreatedAt))
	})
}
