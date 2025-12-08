package cache

import (
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// MultiLayerCache Creation Tests
// =============================================================================

func TestNewMultiLayerCache(t *testing.T) {
	t.Run("creates cache with all layers", func(t *testing.T) {
		cache := NewMultiLayerCache()

		require.NotNil(t, cache)
		require.NotNil(t, cache.selectionCache)
		require.NotNil(t, cache.contentCache)
		require.NotNil(t, cache.blockCache)
		require.NotNil(t, cache.metrics)
	})
}

// =============================================================================
// Selection Cache Tests
// =============================================================================

func TestMultiLayerCacheSelection(t *testing.T) {
	t.Run("stores and retrieves selection", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{
			ID:       "course-1",
			UserID:   "user-1",
			Title:    "Learn Go",
			Progress: 10,
		}
		selection := &ToolSelection{
			Tool:   "lesson",
			Topic:  "Variables",
			Reason: "Next concept",
		}

		cache.SetSelection("course-1", course, selection)

		retrieved, ok := cache.GetSelection("course-1", course)
		require.True(t, ok)
		require.NotNil(t, retrieved)
		assert.Equal(t, "lesson", retrieved.Tool)
		assert.Equal(t, "Variables", retrieved.Topic)
	})

	t.Run("returns false for non-existent selection", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1"}

		_, ok := cache.GetSelection("non-existent", course)
		assert.False(t, ok)
	})

	t.Run("invalidates selection by course", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1", Title: "Test"}
		selection := &ToolSelection{Tool: "quiz"}

		cache.SetSelection("course-1", course, selection)
		cache.InvalidateSelection("course-1")

		_, ok := cache.GetSelection("course-1", course)
		assert.False(t, ok)
	})

	t.Run("tracks selection hits", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1"}
		selection := &ToolSelection{Tool: "lesson"}

		cache.SetSelection("course-1", course, selection)
		cache.GetSelection("course-1", course) // hit
		cache.GetSelection("course-1", course) // hit

		metrics := cache.GetMetrics()
		assert.Equal(t, int64(2), metrics.SelectionHits)
	})

	t.Run("tracks selection misses", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1"}

		cache.GetSelection("non-existent", course) // miss
		cache.GetSelection("also-missing", course) // miss

		metrics := cache.GetMetrics()
		assert.Equal(t, int64(2), metrics.SelectionMisses)
	})
}

// =============================================================================
// Content Cache Tests
// =============================================================================

func TestMultiLayerCacheContent(t *testing.T) {
	t.Run("stores and retrieves content", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{
			ID: "course-1",
		}
		content := map[string]string{
			"title":   "Introduction to Variables",
			"content": "Variables store data...",
		}

		cache.SetContent("course-1", "lesson", course, "Variables", content)

		retrieved, ok := cache.GetContent("course-1", "lesson", course, "Variables")
		require.True(t, ok)
		require.NotNil(t, retrieved)

		retrievedMap := retrieved.(map[string]string)
		assert.Equal(t, "Introduction to Variables", retrievedMap["title"])
	})

	t.Run("returns false for non-existent content", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1"}

		_, ok := cache.GetContent("course-1", "lesson", course, "NonExistent")
		assert.False(t, ok)
	})

	t.Run("invalidates content by course and tool", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1"}

		cache.SetContent("course-1", "lesson", course, "Topic1", "content1")
		cache.SetContent("course-1", "quiz", course, "Topic1", "content2")

		cache.InvalidateContent("course-1", "lesson")

		_, ok1 := cache.GetContent("course-1", "lesson", course, "Topic1")
		_, ok2 := cache.GetContent("course-1", "quiz", course, "Topic1")

		assert.False(t, ok1) // Invalidated
		assert.True(t, ok2)  // Still exists
	})

	t.Run("invalidates all content for course", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1"}

		cache.SetContent("course-1", "lesson", course, "Topic1", "content1")
		cache.SetContent("course-1", "quiz", course, "Topic1", "content2")

		cache.InvalidateAllContent("course-1")

		_, ok1 := cache.GetContent("course-1", "lesson", course, "Topic1")
		_, ok2 := cache.GetContent("course-1", "quiz", course, "Topic1")

		assert.False(t, ok1)
		assert.False(t, ok2)
	})

	t.Run("tracks content hits and speculative hits", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1"}

		cache.SetContent("course-1", "lesson", course, "Topic", "content")
		cache.GetContent("course-1", "lesson", course, "Topic")

		metrics := cache.GetMetrics()
		assert.Equal(t, int64(1), metrics.ContentHits)
		assert.Equal(t, int64(1), metrics.SpeculativeHits)
	})
}

// =============================================================================
// Block Cache Tests
// =============================================================================

func TestMultiLayerCacheBlock(t *testing.T) {
	t.Run("stores and retrieves block", func(t *testing.T) {
		cache := NewMultiLayerCache()
		block := &models.Block{
			ID:    "block-1",
			Type:  models.BlockTypeText,
			Title: "Introduction",
		}

		cache.SetBlock("course-1", "lesson-1", "block-1", block)

		retrieved := cache.GetBlock("course-1", "lesson-1", "block-1")
		require.NotNil(t, retrieved)
		assert.Equal(t, "block-1", retrieved.ID)
		assert.Equal(t, models.BlockTypeText, retrieved.Type)
	})

	t.Run("returns nil for non-existent block", func(t *testing.T) {
		cache := NewMultiLayerCache()

		retrieved := cache.GetBlock("non-existent", "lesson-1", "block-1")
		assert.Nil(t, retrieved)
	})

	t.Run("checks if block exists", func(t *testing.T) {
		cache := NewMultiLayerCache()
		block := &models.Block{ID: "block-1"}

		assert.False(t, cache.HasBlock("course-1", "lesson-1", "block-1"))

		cache.SetBlock("course-1", "lesson-1", "block-1", block)

		assert.True(t, cache.HasBlock("course-1", "lesson-1", "block-1"))
	})

	t.Run("invalidates block", func(t *testing.T) {
		cache := NewMultiLayerCache()
		block := &models.Block{ID: "block-1"}

		cache.SetBlock("course-1", "lesson-1", "block-1", block)
		cache.InvalidateBlock("course-1", "lesson-1", "block-1")

		assert.Nil(t, cache.GetBlock("course-1", "lesson-1", "block-1"))
	})

	t.Run("tracks block hits and misses", func(t *testing.T) {
		cache := NewMultiLayerCache()
		block := &models.Block{ID: "block-1"}

		cache.SetBlock("course-1", "lesson-1", "block-1", block)
		cache.GetBlock("course-1", "lesson-1", "block-1")     // hit
		cache.GetBlock("non-existent", "lesson-1", "block-1") // miss

		metrics := cache.GetMetrics()
		assert.Equal(t, int64(1), metrics.BlockHits)
		assert.Equal(t, int64(1), metrics.BlockMisses)
	})
}

// =============================================================================
// Invalidation Tests
// =============================================================================

func TestMultiLayerCacheInvalidation(t *testing.T) {
	t.Run("invalidates selection for course", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1", Title: "Test"}
		selection := &ToolSelection{Tool: "lesson"}

		cache.SetSelection("course-1", course, selection)
		cache.SetContent("course-1", "lesson", course, "Topic", "content")

		cache.InvalidateForCourse("course-1")

		_, selOk := cache.GetSelection("course-1", course)
		_, contentOk := cache.GetContent("course-1", "lesson", course, "Topic")

		assert.False(t, selOk)
		assert.True(t, contentOk) // Content preserved
	})

	t.Run("invalidates all caches for course", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1", Title: "Test"}
		selection := &ToolSelection{Tool: "lesson"}

		cache.SetSelection("course-1", course, selection)
		cache.SetContent("course-1", "lesson", course, "Topic", "content")

		cache.InvalidateAll("course-1")

		_, selOk := cache.GetSelection("course-1", course)
		_, contentOk := cache.GetContent("course-1", "lesson", course, "Topic")

		assert.False(t, selOk)
		assert.False(t, contentOk)
	})

	t.Run("clears all caches", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1", Title: "Test"}

		cache.SetSelection("course-1", course, &ToolSelection{Tool: "lesson"})
		cache.SetContent("course-1", "lesson", course, "Topic", "content")
		cache.SetBlock("course-1", "lesson-1", "block-1", &models.Block{ID: "block-1"})

		cache.Clear()

		_, selOk := cache.GetSelection("course-1", course)
		_, contentOk := cache.GetContent("course-1", "lesson", course, "Topic")
		blockResult := cache.GetBlock("course-1", "lesson-1", "block-1")

		assert.False(t, selOk)
		assert.False(t, contentOk)
		assert.Nil(t, blockResult)
	})
}

// =============================================================================
// Hit Rate Tests
// =============================================================================

func TestMultiLayerCacheHitRates(t *testing.T) {
	t.Run("selection hit rate", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1"}
		selection := &ToolSelection{Tool: "lesson"}

		cache.SetSelection("course-1", course, selection)

		// 2 hits
		cache.GetSelection("course-1", course)
		cache.GetSelection("course-1", course)

		// 1 miss
		cache.GetSelection("non-existent", course)

		hitRate := cache.SelectionHitRate()
		assert.InDelta(t, 0.666, hitRate, 0.01)
	})

	t.Run("content hit rate", func(t *testing.T) {
		cache := NewMultiLayerCache()
		course := &models.Course{ID: "course-1", Title: "Test"}

		cache.SetContent("course-1", "lesson", course, "Topic", "content")

		// 1 hit
		cache.GetContent("course-1", "lesson", course, "Topic")

		// 1 miss
		cache.GetContent("course-1", "quiz", course, "Topic")

		hitRate := cache.ContentHitRate()
		assert.Equal(t, 0.5, hitRate)
	})

	t.Run("block hit rate", func(t *testing.T) {
		cache := NewMultiLayerCache()
		block := &models.Block{ID: "block-1"}

		cache.SetBlock("course-1", "lesson-1", "block-1", block)

		// 3 hits
		cache.GetBlock("course-1", "lesson-1", "block-1")
		cache.GetBlock("course-1", "lesson-1", "block-1")
		cache.GetBlock("course-1", "lesson-1", "block-1")

		// 1 miss
		cache.GetBlock("non-existent", "lesson-1", "block-1")

		hitRate := cache.BlockHitRate()
		assert.Equal(t, 0.75, hitRate)
	})

	t.Run("returns 0 for empty cache", func(t *testing.T) {
		cache := NewMultiLayerCache()

		assert.Equal(t, 0.0, cache.SelectionHitRate())
		assert.Equal(t, 0.0, cache.ContentHitRate())
		assert.Equal(t, 0.0, cache.BlockHitRate())
	})
}

// =============================================================================
// Key Generation Tests
// =============================================================================

func TestCacheKeys(t *testing.T) {
	t.Run("selection key format", func(t *testing.T) {
		key := SelectionKey("course-123", "abc123")
		assert.Equal(t, "select:course-123:abc123", key)
	})

	t.Run("content key format", func(t *testing.T) {
		key := ContentKey("course-123", "lesson", "xyz789")
		assert.Equal(t, "content:course-123:lesson:xyz789", key)
	})

	t.Run("step key format", func(t *testing.T) {
		key := StepKey("course-123", "user-456")
		assert.Equal(t, "step:course-123:user-456", key)
	})

	t.Run("parse selection key", func(t *testing.T) {
		pathID, hash, ok := ParseSelectionKey("select:course-123:abc")
		assert.True(t, ok)
		assert.Equal(t, "course-123", pathID)
		assert.Equal(t, "abc", hash)
	})

	t.Run("parse invalid selection key", func(t *testing.T) {
		_, _, ok := ParseSelectionKey("invalid")
		assert.False(t, ok)
	})

	t.Run("parse content key", func(t *testing.T) {
		pathID, tool, hash, ok := ParseContentKey("content:course-123:lesson:abc")
		assert.True(t, ok)
		assert.Equal(t, "course-123", pathID)
		assert.Equal(t, "lesson", tool)
		assert.Equal(t, "abc", hash)
	})

	t.Run("parse invalid content key", func(t *testing.T) {
		_, _, _, ok := ParseContentKey("invalid")
		assert.False(t, ok)
	})
}

// =============================================================================
// Context Hash Tests
// =============================================================================

func TestContextHash(t *testing.T) {
	t.Run("generates consistent hash for same course", func(t *testing.T) {
		course := &models.Course{
			ID:       "course-1",
			Title:    "Learn Go",
			Progress: 50,
		}

		hash1 := ContextHash(course)
		hash2 := ContextHash(course)

		assert.Equal(t, hash1, hash2)
	})

	t.Run("generates different hash for different courses", func(t *testing.T) {
		course1 := &models.Course{
			ID:       "course-1",
			Progress: 50,
		}
		course2 := &models.Course{
			ID:       "course-2",
			Progress: 75,
		}

		hash1 := ContextHash(course1)
		hash2 := ContextHash(course2)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash changes when progress changes", func(t *testing.T) {
		course := &models.Course{
			ID:       "course-1",
			Progress: 50,
		}

		hash1 := ContextHash(course)

		course.Progress = 60
		hash2 := ContextHash(course)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash changes with outline", func(t *testing.T) {
		course := &models.Course{
			ID:      "course-1",
			Outline: nil,
		}
		hash1 := ContextHash(course)

		course.Outline = &models.CourseOutline{
			Sections: []models.Section{
				{ID: "section-1", Lessons: []models.Lesson{{ID: "lesson-1"}}},
			},
		}
		hash2 := ContextHash(course)

		assert.NotEqual(t, hash1, hash2)
	})
}

// =============================================================================
// Topic Hash Tests
// =============================================================================

func TestTopicHash(t *testing.T) {
	t.Run("generates consistent hash for same topic", func(t *testing.T) {
		course := &models.Course{
			ID: "course-1",
		}

		hash1 := TopicHash(course, "Variables")
		hash2 := TopicHash(course, "Variables")

		assert.Equal(t, hash1, hash2)
	})

	t.Run("generates different hash for different topics", func(t *testing.T) {
		course := &models.Course{
			ID: "course-1",
		}

		hash1 := TopicHash(course, "Variables")
		hash2 := TopicHash(course, "Functions")

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash includes progress", func(t *testing.T) {
		course := &models.Course{
			ID:       "course-1",
			Progress: 50,
		}

		hash1 := TopicHash(course, "Variables")

		course.Progress = 60
		hash2 := TopicHash(course, "Variables")

		assert.NotEqual(t, hash1, hash2)
	})
}
