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
		require.NotNil(t, cache.stepCache)
		require.NotNil(t, cache.metrics)
	})
}

// =============================================================================
// Selection Cache Tests
// =============================================================================

func TestMultiLayerCacheSelection(t *testing.T) {
	t.Run("stores and retrieves selection", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{
			ID:       "path-1",
			UserID:   "user-1",
			Goal:     "Learn Go",
			Progress: 10,
			Steps:    []models.Step{},
		}
		selection := &ToolSelection{
			Tool:   "lesson",
			Topic:  "Variables",
			Reason: "Next concept",
		}

		cache.SetSelection("path-1", path, selection)

		retrieved, ok := cache.GetSelection("path-1", path)
		require.True(t, ok)
		require.NotNil(t, retrieved)
		assert.Equal(t, "lesson", retrieved.Tool)
		assert.Equal(t, "Variables", retrieved.Topic)
	})

	t.Run("returns false for non-existent selection", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1"}

		_, ok := cache.GetSelection("non-existent", path)
		assert.False(t, ok)
	})

	t.Run("invalidates selection by path", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1", Goal: "Test"}
		selection := &ToolSelection{Tool: "quiz"}

		cache.SetSelection("path-1", path, selection)
		cache.InvalidateSelection("path-1")

		_, ok := cache.GetSelection("path-1", path)
		assert.False(t, ok)
	})

	t.Run("tracks selection hits", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1"}
		selection := &ToolSelection{Tool: "lesson"}

		cache.SetSelection("path-1", path, selection)
		cache.GetSelection("path-1", path) // hit
		cache.GetSelection("path-1", path) // hit

		metrics := cache.GetMetrics()
		assert.Equal(t, int64(2), metrics.SelectionHits)
	})

	t.Run("tracks selection misses", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1"}

		cache.GetSelection("non-existent", path) // miss
		cache.GetSelection("also-missing", path) // miss

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
		path := &models.Course{
			ID: "path-1",
		}
		content := map[string]string{
			"title":   "Introduction to Variables",
			"content": "Variables store data...",
		}

		cache.SetContent("path-1", "lesson", path, "Variables", content)

		retrieved, ok := cache.GetContent("path-1", "lesson", path, "Variables")
		require.True(t, ok)
		require.NotNil(t, retrieved)

		retrievedMap := retrieved.(map[string]string)
		assert.Equal(t, "Introduction to Variables", retrievedMap["title"])
	})

	t.Run("returns false for non-existent content", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1"}

		_, ok := cache.GetContent("path-1", "lesson", path, "NonExistent")
		assert.False(t, ok)
	})

	t.Run("invalidates content by path and tool", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1"}

		cache.SetContent("path-1", "lesson", path, "Topic1", "content1")
		cache.SetContent("path-1", "quiz", path, "Topic1", "content2")

		cache.InvalidateContent("path-1", "lesson")

		_, ok1 := cache.GetContent("path-1", "lesson", path, "Topic1")
		_, ok2 := cache.GetContent("path-1", "quiz", path, "Topic1")

		assert.False(t, ok1) // Invalidated
		assert.True(t, ok2)  // Still exists
	})

	t.Run("invalidates all content for path", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1"}

		cache.SetContent("path-1", "lesson", path, "Topic1", "content1")
		cache.SetContent("path-1", "quiz", path, "Topic1", "content2")

		cache.InvalidateAllContent("path-1")

		_, ok1 := cache.GetContent("path-1", "lesson", path, "Topic1")
		_, ok2 := cache.GetContent("path-1", "quiz", path, "Topic1")

		assert.False(t, ok1)
		assert.False(t, ok2)
	})

	t.Run("tracks content hits and speculative hits", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1"}

		cache.SetContent("path-1", "lesson", path, "Topic", "content")
		cache.GetContent("path-1", "lesson", path, "Topic")

		metrics := cache.GetMetrics()
		assert.Equal(t, int64(1), metrics.ContentHits)
		assert.Equal(t, int64(1), metrics.SpeculativeHits)
	})
}

// =============================================================================
// Step Cache Tests
// =============================================================================

func TestMultiLayerCacheStep(t *testing.T) {
	t.Run("stores and retrieves step", func(t *testing.T) {
		cache := NewMultiLayerCache()
		step := &models.Step{
			ID:    "step-1",
			Type:  "lesson",
			Topic: "Variables",
		}

		cache.SetStep("path-1", "user-1", step)

		retrieved := cache.GetStep("path-1", "user-1")
		require.NotNil(t, retrieved)
		assert.Equal(t, "step-1", retrieved.ID)
	})

	t.Run("returns nil for non-existent step", func(t *testing.T) {
		cache := NewMultiLayerCache()

		retrieved := cache.GetStep("non-existent", "user-1")
		assert.Nil(t, retrieved)
	})

	t.Run("checks if step exists", func(t *testing.T) {
		cache := NewMultiLayerCache()
		step := &models.Step{ID: "step-1"}

		assert.False(t, cache.HasStep("path-1", "user-1"))

		cache.SetStep("path-1", "user-1", step)

		assert.True(t, cache.HasStep("path-1", "user-1"))
	})

	t.Run("invalidates step", func(t *testing.T) {
		cache := NewMultiLayerCache()
		step := &models.Step{ID: "step-1"}

		cache.SetStep("path-1", "user-1", step)
		cache.InvalidateStep("path-1", "user-1")

		assert.Nil(t, cache.GetStep("path-1", "user-1"))
	})

	t.Run("tracks step hits and misses", func(t *testing.T) {
		cache := NewMultiLayerCache()
		step := &models.Step{ID: "step-1"}

		cache.SetStep("path-1", "user-1", step)
		cache.GetStep("path-1", "user-1")       // hit
		cache.GetStep("non-existent", "user-1") // miss

		metrics := cache.GetMetrics()
		assert.Equal(t, int64(1), metrics.StepHits)
		assert.Equal(t, int64(1), metrics.StepMisses)
	})
}

// =============================================================================
// Invalidation Tests
// =============================================================================

func TestMultiLayerCacheInvalidation(t *testing.T) {
	t.Run("invalidates all caches for path", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1", Goal: "Test"}
		selection := &ToolSelection{Tool: "lesson"}
		step := &models.Step{ID: "step-1"}

		cache.SetSelection("path-1", path, selection)
		cache.SetContent("path-1", "lesson", path, "Topic", "content")
		cache.SetStep("path-1", "user-1", step)

		cache.InvalidateAll("path-1", "user-1")

		_, selOk := cache.GetSelection("path-1", path)
		_, contentOk := cache.GetContent("path-1", "lesson", path, "Topic")
		stepResult := cache.GetStep("path-1", "user-1")

		assert.False(t, selOk)
		assert.False(t, contentOk)
		assert.Nil(t, stepResult)
	})

	t.Run("invalidates for path preserves content", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1", Goal: "Test"}
		selection := &ToolSelection{Tool: "lesson"}
		step := &models.Step{ID: "step-1"}

		cache.SetSelection("path-1", path, selection)
		cache.SetContent("path-1", "lesson", path, "Topic", "content")
		cache.SetStep("path-1", "user-1", step)

		cache.InvalidateForCourse("path-1", "user-1")

		_, selOk := cache.GetSelection("path-1", path)
		_, contentOk := cache.GetContent("path-1", "lesson", path, "Topic")
		stepResult := cache.GetStep("path-1", "user-1")

		assert.False(t, selOk)
		assert.True(t, contentOk) // Content preserved
		assert.Nil(t, stepResult)
	})

	t.Run("clears all caches", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1", Goal: "Test"}

		cache.SetSelection("path-1", path, &ToolSelection{Tool: "lesson"})
		cache.SetContent("path-1", "lesson", path, "Topic", "content")
		cache.SetStep("path-1", "user-1", &models.Step{ID: "step-1"})

		cache.Clear()

		_, selOk := cache.GetSelection("path-1", path)
		_, contentOk := cache.GetContent("path-1", "lesson", path, "Topic")
		stepResult := cache.GetStep("path-1", "user-1")

		assert.False(t, selOk)
		assert.False(t, contentOk)
		assert.Nil(t, stepResult)
	})
}

// =============================================================================
// Hit Rate Tests
// =============================================================================

func TestMultiLayerCacheHitRates(t *testing.T) {
	t.Run("selection hit rate", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1"}
		selection := &ToolSelection{Tool: "lesson"}

		cache.SetSelection("path-1", path, selection)

		// 2 hits
		cache.GetSelection("path-1", path)
		cache.GetSelection("path-1", path)

		// 1 miss
		cache.GetSelection("non-existent", path)

		hitRate := cache.SelectionHitRate()
		assert.InDelta(t, 0.666, hitRate, 0.01)
	})

	t.Run("content hit rate", func(t *testing.T) {
		cache := NewMultiLayerCache()
		path := &models.Course{ID: "path-1", Goal: "Test"}

		cache.SetContent("path-1", "lesson", path, "Topic", "content")

		// 1 hit
		cache.GetContent("path-1", "lesson", path, "Topic")

		// 1 miss
		cache.GetContent("path-1", "quiz", path, "Topic")

		hitRate := cache.ContentHitRate()
		assert.Equal(t, 0.5, hitRate)
	})

	t.Run("step hit rate", func(t *testing.T) {
		cache := NewMultiLayerCache()
		step := &models.Step{ID: "step-1"}

		cache.SetStep("path-1", "user-1", step)

		// 3 hits
		cache.GetStep("path-1", "user-1")
		cache.GetStep("path-1", "user-1")
		cache.GetStep("path-1", "user-1")

		// 1 miss
		cache.GetStep("non-existent", "user-1")

		hitRate := cache.StepHitRate()
		assert.Equal(t, 0.75, hitRate)
	})

	t.Run("returns 0 for empty cache", func(t *testing.T) {
		cache := NewMultiLayerCache()

		assert.Equal(t, 0.0, cache.SelectionHitRate())
		assert.Equal(t, 0.0, cache.ContentHitRate())
		assert.Equal(t, 0.0, cache.StepHitRate())
	})
}

// =============================================================================
// Key Generation Tests
// =============================================================================

func TestCacheKeys(t *testing.T) {
	t.Run("selection key format", func(t *testing.T) {
		key := SelectionKey("path-123", "abc123")
		assert.Equal(t, "select:path-123:abc123", key)
	})

	t.Run("content key format", func(t *testing.T) {
		key := ContentKey("path-123", "lesson", "xyz789")
		assert.Equal(t, "content:path-123:lesson:xyz789", key)
	})

	t.Run("step key format", func(t *testing.T) {
		key := StepKey("path-123", "user-456")
		assert.Equal(t, "step:path-123:user-456", key)
	})

	t.Run("parse selection key", func(t *testing.T) {
		pathID, hash, ok := ParseSelectionKey("select:path-123:abc")
		assert.True(t, ok)
		assert.Equal(t, "path-123", pathID)
		assert.Equal(t, "abc", hash)
	})

	t.Run("parse invalid selection key", func(t *testing.T) {
		_, _, ok := ParseSelectionKey("invalid")
		assert.False(t, ok)
	})

	t.Run("parse content key", func(t *testing.T) {
		pathID, tool, hash, ok := ParseContentKey("content:path-123:lesson:abc")
		assert.True(t, ok)
		assert.Equal(t, "path-123", pathID)
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
	t.Run("generates consistent hash for same path", func(t *testing.T) {
		path := &models.Course{
			ID:       "path-1",
			Goal:     "Learn Go",
			Progress: 50,
			Steps:    []models.Step{{Type: "lesson", Topic: "Basics"}},
		}

		hash1 := ContextHash(path)
		hash2 := ContextHash(path)

		assert.Equal(t, hash1, hash2)
	})

	t.Run("generates different hash for different paths", func(t *testing.T) {
		path1 := &models.Course{
			ID:       "path-1",
			Progress: 50,
		}
		path2 := &models.Course{
			ID:       "path-2",
			Progress: 75,
		}

		hash1 := ContextHash(path1)
		hash2 := ContextHash(path2)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash changes when progress changes", func(t *testing.T) {
		path := &models.Course{
			ID:       "path-1",
			Progress: 50,
		}

		hash1 := ContextHash(path)

		path.Progress = 60
		hash2 := ContextHash(path)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash includes memory compaction", func(t *testing.T) {
		path := &models.Course{
			ID:     "path-1",
			Memory: nil,
		}
		hash1 := ContextHash(path)

		path.Memory = &models.Memory{
			Compaction: &models.Compaction{
				Summary:    "Good progress",
				Weaknesses: []string{"Pointers"},
			},
		}
		hash2 := ContextHash(path)

		assert.NotEqual(t, hash1, hash2)
	})
}

// =============================================================================
// Topic Hash Tests
// =============================================================================

func TestTopicHash(t *testing.T) {
	t.Run("generates consistent hash for same topic", func(t *testing.T) {
		path := &models.Course{
			ID: "path-1",
		}

		hash1 := TopicHash(path, "Variables")
		hash2 := TopicHash(path, "Variables")

		assert.Equal(t, hash1, hash2)
	})

	t.Run("generates different hash for different topics", func(t *testing.T) {
		path := &models.Course{
			ID: "path-1",
		}

		hash1 := TopicHash(path, "Variables")
		hash2 := TopicHash(path, "Functions")

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash includes topic confidence", func(t *testing.T) {
		path := &models.Course{
			ID: "path-1",
			Memory: &models.Memory{
				Topics: map[string]models.TopicMemory{
					"Variables": {Confidence: 0.8},
				},
			},
		}

		hash1 := TopicHash(path, "Variables")

		path.Memory.Topics["Variables"] = models.TopicMemory{Confidence: 0.5}
		hash2 := TopicHash(path, "Variables")

		assert.NotEqual(t, hash1, hash2)
	})
}
