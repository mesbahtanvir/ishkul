package cache

import (
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// ContextHash Tests
// =============================================================================

func TestContextHashFunction(t *testing.T) {
	t.Run("returns consistent hash for same path", func(t *testing.T) {
		path := &models.Course{
			ID:       "path1",
			Progress: 50,
			Steps: []models.Step{
				{Type: "lesson", Topic: "intro"},
				{Type: "quiz", Topic: "basics"},
			},
		}

		hash1 := ContextHash(path)
		hash2 := ContextHash(path)

		assert.Equal(t, hash1, hash2)
		assert.Len(t, hash1, 16) // 8 bytes = 16 hex characters
	})

	t.Run("returns different hash for different paths", func(t *testing.T) {
		path1 := &models.Course{
			ID:       "path1",
			Progress: 50,
			Steps: []models.Step{
				{Type: "lesson", Topic: "intro"},
			},
		}

		path2 := &models.Course{
			ID:       "path2",
			Progress: 75,
			Steps: []models.Step{
				{Type: "quiz", Topic: "advanced"},
			},
		}

		hash1 := ContextHash(path1)
		hash2 := ContextHash(path2)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash changes when progress changes", func(t *testing.T) {
		path := &models.Course{
			ID:       "path1",
			Progress: 50,
		}

		hash1 := ContextHash(path)

		path.Progress = 75
		hash2 := ContextHash(path)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash changes when steps change", func(t *testing.T) {
		path := &models.Course{
			ID: "path1",
			Steps: []models.Step{
				{Type: "lesson", Topic: "intro"},
			},
		}

		hash1 := ContextHash(path)

		path.Steps = append(path.Steps, models.Step{Type: "quiz", Topic: "test"})
		hash2 := ContextHash(path)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("includes memory in hash when present", func(t *testing.T) {
		path := &models.Course{
			ID:       "path1",
			Progress: 50,
		}

		hash1 := ContextHash(path)

		path.Memory = &models.Memory{
			Compaction: &models.Compaction{
				Summary:    "User is learning well",
				Weaknesses: []string{"needs more practice"},
			},
		}
		hash2 := ContextHash(path)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("handles empty path", func(t *testing.T) {
		path := &models.Course{}

		hash := ContextHash(path)
		assert.NotEmpty(t, hash)
		assert.Len(t, hash, 16)
	})

	t.Run("uses last 3 steps for pattern detection", func(t *testing.T) {
		path := &models.Course{
			ID: "path1",
			Steps: []models.Step{
				{Type: "lesson", Topic: "topic1"},
				{Type: "lesson", Topic: "topic2"},
				{Type: "quiz", Topic: "topic3"},
				{Type: "practice", Topic: "topic4"},
			},
		}

		hash1 := ContextHash(path)

		// Changing first step shouldn't affect hash (only last 3 are used)
		path.Steps[0].Topic = "different"
		hash2 := ContextHash(path)

		assert.Equal(t, hash1, hash2)

		// But changing last step should
		path.Steps[3].Topic = "changed"
		hash3 := ContextHash(path)

		assert.NotEqual(t, hash1, hash3)
	})
}

// =============================================================================
// TopicHash Tests
// =============================================================================

func TestTopicHashFunction(t *testing.T) {
	t.Run("returns consistent hash for same topic and path", func(t *testing.T) {
		path := &models.Course{
			ID: "path1",
		}

		hash1 := TopicHash(path, "variables")
		hash2 := TopicHash(path, "variables")

		assert.Equal(t, hash1, hash2)
		assert.Len(t, hash1, 16)
	})

	t.Run("returns different hash for different topics", func(t *testing.T) {
		path := &models.Course{
			ID: "path1",
		}

		hash1 := TopicHash(path, "variables")
		hash2 := TopicHash(path, "functions")

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("includes level in hash", func(t *testing.T) {
		path := &models.Course{
			ID: "path1",
		}

		hash1 := TopicHash(path, "variables")

		hash2 := TopicHash(path, "variables")

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("includes topic confidence when available", func(t *testing.T) {
		path := &models.Course{
			ID: "path1",
		}

		hash1 := TopicHash(path, "variables")

		path.Memory = &models.Memory{
			Topics: map[string]models.TopicMemory{
				"variables": {
					Confidence: 0.75,
				},
			},
		}
		hash2 := TopicHash(path, "variables")

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("handles missing topic memory", func(t *testing.T) {
		path := &models.Course{
			ID: "path1",
			Memory: &models.Memory{
				Topics: map[string]models.TopicMemory{
					"functions": {
						Confidence: 0.5,
					},
				},
			},
		}

		// Should not panic when querying a topic that doesn't exist in memory
		hash := TopicHash(path, "variables")
		assert.NotEmpty(t, hash)
		assert.Len(t, hash, 16)
	})
}

// =============================================================================
// SelectionKey Tests
// =============================================================================

func TestSelectionKey(t *testing.T) {
	t.Run("generates correct format", func(t *testing.T) {
		key := SelectionKey("path123", "abc123")
		assert.Equal(t, "select:path123:abc123", key)
	})

	t.Run("handles empty values", func(t *testing.T) {
		key := SelectionKey("", "")
		assert.Equal(t, "select::", key)
	})

	t.Run("handles special characters", func(t *testing.T) {
		key := SelectionKey("path-with-dashes", "hash_with_underscore")
		assert.Equal(t, "select:path-with-dashes:hash_with_underscore", key)
	})
}

// =============================================================================
// ContentKey Tests
// =============================================================================

func TestContentKey(t *testing.T) {
	t.Run("generates correct format", func(t *testing.T) {
		key := ContentKey("path123", "quiz", "topic456")
		assert.Equal(t, "content:path123:quiz:topic456", key)
	})

	t.Run("handles different tool types", func(t *testing.T) {
		lessonKey := ContentKey("path1", "lesson", "hash1")
		quizKey := ContentKey("path1", "quiz", "hash1")
		practiceKey := ContentKey("path1", "practice", "hash1")

		assert.Equal(t, "content:path1:lesson:hash1", lessonKey)
		assert.Equal(t, "content:path1:quiz:hash1", quizKey)
		assert.Equal(t, "content:path1:practice:hash1", practiceKey)
	})

	t.Run("handles empty values", func(t *testing.T) {
		key := ContentKey("", "", "")
		assert.Equal(t, "content:::", key)
	})
}

// =============================================================================
// StepKey Tests
// =============================================================================

func TestStepKey(t *testing.T) {
	t.Run("generates correct format", func(t *testing.T) {
		key := StepKey("path123", "user456")
		assert.Equal(t, "step:path123:user456", key)
	})

	t.Run("handles empty values", func(t *testing.T) {
		key := StepKey("", "")
		assert.Equal(t, "step::", key)
	})
}

// =============================================================================
// ParseSelectionKey Tests
// =============================================================================

func TestParseSelectionKey(t *testing.T) {
	t.Run("parses valid selection key", func(t *testing.T) {
		pathID, contextHash, ok := ParseSelectionKey("select:path123:abc456")

		assert.True(t, ok)
		assert.Equal(t, "path123", pathID)
		assert.Equal(t, "abc456", contextHash)
	})

	t.Run("returns false for wrong prefix", func(t *testing.T) {
		_, _, ok := ParseSelectionKey("content:path123:abc456")
		assert.False(t, ok)
	})

	t.Run("returns false for wrong part count", func(t *testing.T) {
		_, _, ok := ParseSelectionKey("select:path123")
		assert.False(t, ok)

		_, _, ok = ParseSelectionKey("select:path123:hash:extra")
		assert.False(t, ok)
	})

	t.Run("returns false for empty string", func(t *testing.T) {
		_, _, ok := ParseSelectionKey("")
		assert.False(t, ok)
	})

	t.Run("handles empty pathID and hash", func(t *testing.T) {
		pathID, contextHash, ok := ParseSelectionKey("select::")

		assert.True(t, ok)
		assert.Equal(t, "", pathID)
		assert.Equal(t, "", contextHash)
	})
}

// =============================================================================
// ParseContentKey Tests
// =============================================================================

func TestParseContentKey(t *testing.T) {
	t.Run("parses valid content key", func(t *testing.T) {
		pathID, toolType, topicHash, ok := ParseContentKey("content:path123:quiz:hash456")

		assert.True(t, ok)
		assert.Equal(t, "path123", pathID)
		assert.Equal(t, "quiz", toolType)
		assert.Equal(t, "hash456", topicHash)
	})

	t.Run("returns false for wrong prefix", func(t *testing.T) {
		_, _, _, ok := ParseContentKey("select:path123:quiz:hash456")
		assert.False(t, ok)
	})

	t.Run("returns false for wrong part count", func(t *testing.T) {
		_, _, _, ok := ParseContentKey("content:path123:quiz")
		assert.False(t, ok)

		_, _, _, ok = ParseContentKey("content:path123:quiz:hash:extra")
		assert.False(t, ok)
	})

	t.Run("returns false for empty string", func(t *testing.T) {
		_, _, _, ok := ParseContentKey("")
		assert.False(t, ok)
	})

	t.Run("handles all tool types", func(t *testing.T) {
		toolTypes := []string{"lesson", "quiz", "practice", "flashcard", "review", "summary"}

		for _, toolType := range toolTypes {
			key := ContentKey("path1", toolType, "hash1")
			parsedPath, parsedTool, parsedHash, ok := ParseContentKey(key)

			assert.True(t, ok, "Should parse key for tool type: %s", toolType)
			assert.Equal(t, "path1", parsedPath)
			assert.Equal(t, toolType, parsedTool)
			assert.Equal(t, "hash1", parsedHash)
		}
	})
}

// =============================================================================
// Key Roundtrip Tests
// =============================================================================

func TestKeyRoundtrip(t *testing.T) {
	t.Run("selection key roundtrip", func(t *testing.T) {
		originalPathID := "path-abc-123"
		originalHash := "deadbeef12345678"

		key := SelectionKey(originalPathID, originalHash)
		parsedPathID, parsedHash, ok := ParseSelectionKey(key)

		assert.True(t, ok)
		assert.Equal(t, originalPathID, parsedPathID)
		assert.Equal(t, originalHash, parsedHash)
	})

	t.Run("content key roundtrip", func(t *testing.T) {
		originalPathID := "path-xyz-789"
		originalToolType := "quiz"
		originalHash := "cafebabe87654321"

		key := ContentKey(originalPathID, originalToolType, originalHash)
		parsedPathID, parsedToolType, parsedHash, ok := ParseContentKey(key)

		assert.True(t, ok)
		assert.Equal(t, originalPathID, parsedPathID)
		assert.Equal(t, originalToolType, parsedToolType)
		assert.Equal(t, originalHash, parsedHash)
	})
}
