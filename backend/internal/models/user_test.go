package models

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserStruct(t *testing.T) {
	t.Run("creates User with all fields", func(t *testing.T) {
		now := time.Now()
		user := User{
			ID:          "user123",
			Email:       "test@example.com",
			DisplayName: "Test User",
			PhotoURL:    "https://example.com/photo.jpg",
			CreatedAt:   now,
			UpdatedAt:   now,
			Goal:        "Learn Python",
			Level:       "beginner",
		}

		assert.Equal(t, "user123", user.ID)
		assert.Equal(t, "test@example.com", user.Email)
		assert.Equal(t, "Test User", user.DisplayName)
		assert.Equal(t, "https://example.com/photo.jpg", user.PhotoURL)
		assert.Equal(t, "Learn Python", user.Goal)
		assert.Equal(t, "beginner", user.Level)
	})

	t.Run("JSON marshaling includes all fields", func(t *testing.T) {
		user := User{
			ID:          "user123",
			Email:       "test@example.com",
			DisplayName: "Test User",
			PhotoURL:    "https://example.com/photo.jpg",
			Goal:        "Learn Python",
			Level:       "beginner",
		}

		jsonBytes, err := json.Marshal(user)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "user123", parsed["id"])
		assert.Equal(t, "test@example.com", parsed["email"])
		assert.Equal(t, "Test User", parsed["displayName"])
		assert.Equal(t, "https://example.com/photo.jpg", parsed["photoUrl"])
		assert.Equal(t, "Learn Python", parsed["goal"])
		assert.Equal(t, "beginner", parsed["level"])
	})

	t.Run("JSON omits empty optional fields", func(t *testing.T) {
		user := User{
			ID:    "user123",
			Email: "test@example.com",
		}

		jsonBytes, err := json.Marshal(user)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "photoUrl")
		assert.NotContains(t, parsed, "goal")
		assert.NotContains(t, parsed, "level")
	})

	t.Run("JSON unmarshaling works correctly", func(t *testing.T) {
		jsonStr := `{
			"id": "user456",
			"email": "another@test.com",
			"displayName": "Another User",
			"goal": "Learn Go",
			"level": "intermediate"
		}`

		var user User
		err := json.Unmarshal([]byte(jsonStr), &user)
		require.NoError(t, err)

		assert.Equal(t, "user456", user.ID)
		assert.Equal(t, "another@test.com", user.Email)
		assert.Equal(t, "Another User", user.DisplayName)
		assert.Equal(t, "Learn Go", user.Goal)
		assert.Equal(t, "intermediate", user.Level)
	})
}

func TestUserDocumentStruct(t *testing.T) {
	t.Run("creates UserDocument with embedded User", func(t *testing.T) {
		userDoc := UserDocument{
			User: User{
				ID:    "user123",
				Email: "test@example.com",
			},
			Memory: &Memory{
				Topics: map[string]TopicMemory{
					"python": {Confidence: 0.8, TimesTested: 5},
				},
			},
			History: []HistoryEntry{
				{Type: "lesson", Topic: "Python", Timestamp: 1704067200000},
			},
			NextStep: &NextStep{
				Type:  "quiz",
				Topic: "Python",
			},
		}

		assert.Equal(t, "user123", userDoc.ID)
		assert.Equal(t, "test@example.com", userDoc.Email)
		assert.NotNil(t, userDoc.Memory)
		assert.NotNil(t, userDoc.NextStep)
		assert.Len(t, userDoc.History, 1)
	})

	t.Run("JSON marshaling includes nested fields", func(t *testing.T) {
		userDoc := UserDocument{
			User: User{
				ID: "user123",
			},
			Memory: &Memory{
				Topics: map[string]TopicMemory{
					"python": {Confidence: 0.8},
				},
			},
		}

		jsonBytes, err := json.Marshal(userDoc)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "memory")
	})
}

func TestMemoryStruct(t *testing.T) {
	t.Run("creates Memory with topics", func(t *testing.T) {
		memory := Memory{
			Topics: map[string]TopicMemory{
				"python":     {Confidence: 0.85, LastReviewed: "2024-01-01", TimesTested: 5},
				"javascript": {Confidence: 0.70, LastReviewed: "2024-01-02", TimesTested: 3},
			},
		}

		assert.Len(t, memory.Topics, 2)
		assert.Equal(t, 0.85, memory.Topics["python"].Confidence)
		assert.Equal(t, 5, memory.Topics["python"].TimesTested)
	})

	t.Run("JSON marshaling works correctly", func(t *testing.T) {
		memory := Memory{
			Topics: map[string]TopicMemory{
				"python": {Confidence: 0.85, LastReviewed: "2024-01-01", TimesTested: 5},
			},
		}

		jsonBytes, err := json.Marshal(memory)
		require.NoError(t, err)

		var parsed Memory
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, 0.85, parsed.Topics["python"].Confidence)
		assert.Equal(t, "2024-01-01", parsed.Topics["python"].LastReviewed)
		assert.Equal(t, 5, parsed.Topics["python"].TimesTested)
	})
}

func TestTopicMemoryStruct(t *testing.T) {
	t.Run("creates TopicMemory", func(t *testing.T) {
		tm := TopicMemory{
			Confidence:   0.92,
			LastReviewed: "2024-01-15T10:30:00Z",
			TimesTested:  10,
		}

		assert.Equal(t, 0.92, tm.Confidence)
		assert.Equal(t, "2024-01-15T10:30:00Z", tm.LastReviewed)
		assert.Equal(t, 10, tm.TimesTested)
	})

	t.Run("JSON tags are correct", func(t *testing.T) {
		tm := TopicMemory{
			Confidence:   0.75,
			LastReviewed: "2024-01-01",
			TimesTested:  3,
		}

		jsonBytes, err := json.Marshal(tm)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "confidence")
		assert.Contains(t, parsed, "lastReviewed")
		assert.Contains(t, parsed, "timesTested")
	})
}

func TestHistoryEntryStruct(t *testing.T) {
	t.Run("creates HistoryEntry for lesson", func(t *testing.T) {
		entry := HistoryEntry{
			Type:      "lesson",
			Topic:     "Python Basics",
			Timestamp: 1704067200000,
		}

		assert.Equal(t, "lesson", entry.Type)
		assert.Equal(t, "Python Basics", entry.Topic)
		assert.Equal(t, int64(1704067200000), entry.Timestamp)
	})

	t.Run("creates HistoryEntry for quiz with score", func(t *testing.T) {
		entry := HistoryEntry{
			Type:      "quiz",
			Topic:     "Python Quiz",
			Score:     0.85,
			Timestamp: 1704067200000,
		}

		assert.Equal(t, "quiz", entry.Type)
		assert.Equal(t, 0.85, entry.Score)
	})

	t.Run("JSON omits zero score", func(t *testing.T) {
		entry := HistoryEntry{
			Type:      "lesson",
			Topic:     "Test",
			Timestamp: 1704067200000,
		}

		jsonBytes, err := json.Marshal(entry)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "score")
	})
}

func TestNextStepStruct(t *testing.T) {
	t.Run("creates NextStep for lesson", func(t *testing.T) {
		step := NextStep{
			Type:    "lesson",
			Topic:   "Python Variables",
			Title:   "Introduction to Variables",
			Content: "Variables store data values...",
		}

		assert.Equal(t, "lesson", step.Type)
		assert.Equal(t, "Python Variables", step.Topic)
		assert.Equal(t, "Introduction to Variables", step.Title)
		assert.NotEmpty(t, step.Content)
	})

	t.Run("creates NextStep for quiz", func(t *testing.T) {
		step := NextStep{
			Type:     "quiz",
			Topic:    "Python Quiz",
			Question: "What is the output of print(2+2)?",
			Options:  []string{"2", "4", "22", "Error"},
			Answer:   "4",
		}

		assert.Equal(t, "quiz", step.Type)
		assert.NotEmpty(t, step.Question)
		assert.Len(t, step.Options, 4)
		assert.Equal(t, "4", step.Answer)
	})

	t.Run("creates NextStep for practice", func(t *testing.T) {
		step := NextStep{
			Type:  "practice",
			Topic: "Python Exercise",
			Task:  "Write a function that calculates the factorial",
		}

		assert.Equal(t, "practice", step.Type)
		assert.NotEmpty(t, step.Task)
	})

	t.Run("JSON omits empty optional fields", func(t *testing.T) {
		step := NextStep{
			Type:  "lesson",
			Topic: "Test",
		}

		jsonBytes, err := json.Marshal(step)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "title")
		assert.NotContains(t, parsed, "content")
		assert.NotContains(t, parsed, "question")
		assert.NotContains(t, parsed, "options")
		assert.NotContains(t, parsed, "answer")
		assert.NotContains(t, parsed, "task")
	})
}

func TestProgressStruct(t *testing.T) {
	t.Run("creates Progress", func(t *testing.T) {
		now := time.Now()
		progress := Progress{
			UserID:           "user123",
			LessonID:         "lesson-456",
			Completed:        true,
			Score:            85,
			TimeSpentMinutes: 30,
			LastAttempt:      now,
			Attempts:         3,
		}

		assert.Equal(t, "user123", progress.UserID)
		assert.Equal(t, "lesson-456", progress.LessonID)
		assert.True(t, progress.Completed)
		assert.Equal(t, 85, progress.Score)
		assert.Equal(t, 30, progress.TimeSpentMinutes)
		assert.Equal(t, 3, progress.Attempts)
	})

	t.Run("JSON tags are correct", func(t *testing.T) {
		progress := Progress{
			UserID:    "user123",
			LessonID:  "lesson-456",
			Completed: true,
		}

		jsonBytes, err := json.Marshal(progress)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "userId")
		assert.Contains(t, parsed, "lessonId")
		assert.Contains(t, parsed, "completed")
	})
}

func TestLessonStruct(t *testing.T) {
	t.Run("creates Lesson", func(t *testing.T) {
		lesson := Lesson{
			ID:          "lesson-123",
			Title:       "Python Basics",
			Description: "Learn the fundamentals of Python",
			Level:       "beginner",
			Category:    "programming",
			Content:     "Python is a high-level programming language...",
			Order:       1,
			Duration:    30,
			Tags:        []string{"python", "basics", "programming"},
		}

		assert.Equal(t, "lesson-123", lesson.ID)
		assert.Equal(t, "Python Basics", lesson.Title)
		assert.Equal(t, "beginner", lesson.Level)
		assert.Equal(t, 1, lesson.Order)
		assert.Equal(t, 30, lesson.Duration)
		assert.Len(t, lesson.Tags, 3)
	})

	t.Run("JSON tags are correct", func(t *testing.T) {
		lesson := Lesson{
			ID:       "lesson-123",
			Title:    "Test",
			Level:    "beginner",
			Category: "test",
			Order:    1,
			Duration: 10,
		}

		jsonBytes, err := json.Marshal(lesson)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "id")
		assert.Contains(t, parsed, "title")
		assert.Contains(t, parsed, "level")
		assert.Contains(t, parsed, "category")
		assert.Contains(t, parsed, "order")
		assert.Contains(t, parsed, "duration")
	})

	t.Run("JSON omits empty tags", func(t *testing.T) {
		lesson := Lesson{
			ID:    "lesson-123",
			Title: "Test",
		}

		jsonBytes, err := json.Marshal(lesson)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "tags")
	})
}
