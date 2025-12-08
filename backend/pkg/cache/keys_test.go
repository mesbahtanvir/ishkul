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
	t.Run("returns consistent hash for same course", func(t *testing.T) {
		course := &models.Course{
			ID:       "course1",
			Progress: 50,
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{
						ID:    "section1",
						Title: "Introduction",
						Lessons: []models.Lesson{
							{ID: "lesson1", Title: "Intro", Status: models.LessonStatusCompleted},
							{ID: "lesson2", Title: "Basics", Status: models.LessonStatusPending},
						},
					},
				},
			},
		}

		hash1 := ContextHash(course)
		hash2 := ContextHash(course)

		assert.Equal(t, hash1, hash2)
		assert.Len(t, hash1, 16) // 8 bytes = 16 hex characters
	})

	t.Run("returns different hash for different courses", func(t *testing.T) {
		course1 := &models.Course{
			ID:       "course1",
			Progress: 50,
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{ID: "section1", Lessons: []models.Lesson{{ID: "lesson1"}}},
				},
			},
		}

		course2 := &models.Course{
			ID:       "course2",
			Progress: 75,
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{ID: "section1", Lessons: []models.Lesson{{ID: "lesson1"}, {ID: "lesson2"}}},
				},
			},
		}

		hash1 := ContextHash(course1)
		hash2 := ContextHash(course2)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash changes when progress changes", func(t *testing.T) {
		course := &models.Course{
			ID:       "course1",
			Progress: 50,
		}

		hash1 := ContextHash(course)

		course.Progress = 75
		hash2 := ContextHash(course)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash changes when sections change", func(t *testing.T) {
		course := &models.Course{
			ID: "course1",
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{ID: "section1", Lessons: []models.Lesson{{ID: "lesson1"}}},
				},
			},
		}

		hash1 := ContextHash(course)

		// Add a new section
		course.Outline.Sections = append(course.Outline.Sections, models.Section{
			ID:      "section2",
			Lessons: []models.Lesson{{ID: "lesson2"}},
		})
		hash2 := ContextHash(course)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("hash changes when position changes", func(t *testing.T) {
		course := &models.Course{
			ID:       "course1",
			Progress: 50,
			CurrentPosition: &models.LessonPosition{
				SectionIndex: 0,
				LessonIndex:  0,
			},
		}

		hash1 := ContextHash(course)

		course.CurrentPosition.LessonIndex = 1
		hash2 := ContextHash(course)

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("handles empty course", func(t *testing.T) {
		course := &models.Course{}

		hash := ContextHash(course)
		assert.NotEmpty(t, hash)
		assert.Len(t, hash, 16)
	})
}

// =============================================================================
// TopicHash Tests
// =============================================================================

func TestTopicHashFunction(t *testing.T) {
	t.Run("returns consistent hash for same topic and course", func(t *testing.T) {
		course := &models.Course{
			ID: "course1",
		}

		hash1 := TopicHash(course, "variables")
		hash2 := TopicHash(course, "variables")

		assert.Equal(t, hash1, hash2)
		assert.Len(t, hash1, 16)
	})

	t.Run("returns different hash for different topics", func(t *testing.T) {
		course := &models.Course{
			ID: "course1",
		}

		hash1 := TopicHash(course, "variables")
		hash2 := TopicHash(course, "functions")

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("includes progress in hash", func(t *testing.T) {
		course := &models.Course{
			ID:       "course1",
			Progress: 50,
		}

		hash1 := TopicHash(course, "variables")

		course.Progress = 75
		hash2 := TopicHash(course, "variables")

		assert.NotEqual(t, hash1, hash2)
	})

	t.Run("handles empty topic", func(t *testing.T) {
		course := &models.Course{
			ID: "course1",
		}

		hash := TopicHash(course, "")
		assert.NotEmpty(t, hash)
		assert.Len(t, hash, 16)
	})
}

// =============================================================================
// SelectionKey Tests
// =============================================================================

func TestSelectionKey(t *testing.T) {
	t.Run("generates correct format", func(t *testing.T) {
		key := SelectionKey("course123", "abc123")
		assert.Equal(t, "select:course123:abc123", key)
	})

	t.Run("handles empty values", func(t *testing.T) {
		key := SelectionKey("", "")
		assert.Equal(t, "select::", key)
	})

	t.Run("handles special characters", func(t *testing.T) {
		key := SelectionKey("course-with-dashes", "hash_with_underscore")
		assert.Equal(t, "select:course-with-dashes:hash_with_underscore", key)
	})
}

// =============================================================================
// ContentKey Tests
// =============================================================================

func TestContentKey(t *testing.T) {
	t.Run("generates correct format", func(t *testing.T) {
		key := ContentKey("course123", "quiz", "topic456")
		assert.Equal(t, "content:course123:quiz:topic456", key)
	})

	t.Run("handles different tool types", func(t *testing.T) {
		lessonKey := ContentKey("course1", "lesson", "hash1")
		quizKey := ContentKey("course1", "quiz", "hash1")
		practiceKey := ContentKey("course1", "practice", "hash1")

		assert.Equal(t, "content:course1:lesson:hash1", lessonKey)
		assert.Equal(t, "content:course1:quiz:hash1", quizKey)
		assert.Equal(t, "content:course1:practice:hash1", practiceKey)
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
		key := StepKey("course123", "user456")
		assert.Equal(t, "step:course123:user456", key)
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
		courseID, contextHash, ok := ParseSelectionKey("select:course123:abc456")

		assert.True(t, ok)
		assert.Equal(t, "course123", courseID)
		assert.Equal(t, "abc456", contextHash)
	})

	t.Run("returns false for wrong prefix", func(t *testing.T) {
		_, _, ok := ParseSelectionKey("content:course123:abc456")
		assert.False(t, ok)
	})

	t.Run("returns false for wrong part count", func(t *testing.T) {
		_, _, ok := ParseSelectionKey("select:course123")
		assert.False(t, ok)

		_, _, ok = ParseSelectionKey("select:course123:hash:extra")
		assert.False(t, ok)
	})

	t.Run("returns false for empty string", func(t *testing.T) {
		_, _, ok := ParseSelectionKey("")
		assert.False(t, ok)
	})

	t.Run("handles empty courseID and hash", func(t *testing.T) {
		courseID, contextHash, ok := ParseSelectionKey("select::")

		assert.True(t, ok)
		assert.Equal(t, "", courseID)
		assert.Equal(t, "", contextHash)
	})
}

// =============================================================================
// ParseContentKey Tests
// =============================================================================

func TestParseContentKey(t *testing.T) {
	t.Run("parses valid content key", func(t *testing.T) {
		courseID, toolType, topicHash, ok := ParseContentKey("content:course123:quiz:hash456")

		assert.True(t, ok)
		assert.Equal(t, "course123", courseID)
		assert.Equal(t, "quiz", toolType)
		assert.Equal(t, "hash456", topicHash)
	})

	t.Run("returns false for wrong prefix", func(t *testing.T) {
		_, _, _, ok := ParseContentKey("select:course123:quiz:hash456")
		assert.False(t, ok)
	})

	t.Run("returns false for wrong part count", func(t *testing.T) {
		_, _, _, ok := ParseContentKey("content:course123:quiz")
		assert.False(t, ok)

		_, _, _, ok = ParseContentKey("content:course123:quiz:hash:extra")
		assert.False(t, ok)
	})

	t.Run("returns false for empty string", func(t *testing.T) {
		_, _, _, ok := ParseContentKey("")
		assert.False(t, ok)
	})

	t.Run("handles all tool types", func(t *testing.T) {
		toolTypes := []string{"lesson", "quiz", "practice", "flashcard", "review", "summary"}

		for _, toolType := range toolTypes {
			key := ContentKey("course1", toolType, "hash1")
			parsedCourse, parsedTool, parsedHash, ok := ParseContentKey(key)

			assert.True(t, ok, "Should parse key for tool type: %s", toolType)
			assert.Equal(t, "course1", parsedCourse)
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
		originalCourseID := "course-abc-123"
		originalHash := "deadbeef12345678"

		key := SelectionKey(originalCourseID, originalHash)
		parsedCourseID, parsedHash, ok := ParseSelectionKey(key)

		assert.True(t, ok)
		assert.Equal(t, originalCourseID, parsedCourseID)
		assert.Equal(t, originalHash, parsedHash)
	})

	t.Run("content key roundtrip", func(t *testing.T) {
		originalCourseID := "course-xyz-789"
		originalToolType := "quiz"
		originalHash := "cafebabe87654321"

		key := ContentKey(originalCourseID, originalToolType, originalHash)
		parsedCourseID, parsedToolType, parsedHash, ok := ParseContentKey(key)

		assert.True(t, ok)
		assert.Equal(t, originalCourseID, parsedCourseID)
		assert.Equal(t, originalToolType, parsedToolType)
		assert.Equal(t, originalHash, parsedHash)
	})
}
