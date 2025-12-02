package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// LearningPath Tests
// =============================================================================

func TestLearningPathStruct(t *testing.T) {
	t.Run("creates LearningPath with all fields", func(t *testing.T) {
		path := LearningPath{
			ID:               "path-123",
			UserID:           "user-456",
			Goal:             "Learn Go",
			Level:            "beginner",
			Emoji:            "🎯",
			Progress:         50,
			LessonsCompleted: 5,
			TotalLessons:     10,
			Steps:            []Step{},
			Memory:           &Memory{Topics: map[string]TopicMemory{}},
			CreatedAt:        1704067200000,
			UpdatedAt:        1704067200000,
			LastAccessedAt:   1704067200000,
		}

		assert.Equal(t, "path-123", path.ID)
		assert.Equal(t, "user-456", path.UserID)
		assert.Equal(t, "Learn Go", path.Goal)
		assert.Equal(t, "beginner", path.Level)
		assert.Equal(t, "🎯", path.Emoji)
		assert.Equal(t, 50, path.Progress)
		assert.Equal(t, 5, path.LessonsCompleted)
		assert.Equal(t, 10, path.TotalLessons)
	})

	t.Run("JSON marshaling includes all fields", func(t *testing.T) {
		path := LearningPath{
			ID:               "path-123",
			UserID:           "user-456",
			Goal:             "Learn Go",
			Level:            "beginner",
			Emoji:            "🎯",
			Progress:         50,
			LessonsCompleted: 5,
			TotalLessons:     10,
			Steps:            []Step{},
			CreatedAt:        1704067200000,
			UpdatedAt:        1704067200000,
			LastAccessedAt:   1704067200000,
		}

		jsonBytes, err := json.Marshal(path)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "path-123", parsed["id"])
		assert.Equal(t, "user-456", parsed["userId"])
		assert.Equal(t, "Learn Go", parsed["goal"])
		assert.Equal(t, "beginner", parsed["level"])
		assert.Equal(t, "🎯", parsed["emoji"])
		assert.Contains(t, parsed, "progress")
		assert.Contains(t, parsed, "lessonsCompleted")
		assert.Contains(t, parsed, "totalLessons")
		assert.Contains(t, parsed, "steps")
		assert.Contains(t, parsed, "createdAt")
		assert.Contains(t, parsed, "updatedAt")
		assert.Contains(t, parsed, "lastAccessedAt")
	})

	t.Run("JSON unmarshaling works correctly", func(t *testing.T) {
		jsonStr := `{
			"id": "path-789",
			"userId": "user-123",
			"goal": "Master Python",
			"level": "intermediate",
			"emoji": "🐍",
			"progress": 75,
			"lessonsCompleted": 15,
			"totalLessons": 20,
			"steps": [],
			"createdAt": 1704067200000,
			"updatedAt": 1704067200000,
			"lastAccessedAt": 1704067200000
		}`

		var path LearningPath
		err := json.Unmarshal([]byte(jsonStr), &path)
		require.NoError(t, err)

		assert.Equal(t, "path-789", path.ID)
		assert.Equal(t, "user-123", path.UserID)
		assert.Equal(t, "Master Python", path.Goal)
		assert.Equal(t, "intermediate", path.Level)
		assert.Equal(t, "🐍", path.Emoji)
		assert.Equal(t, 75, path.Progress)
		assert.Equal(t, 15, path.LessonsCompleted)
		assert.Equal(t, 20, path.TotalLessons)
	})
}

// =============================================================================
// Step Tests
// =============================================================================

func TestStepStruct(t *testing.T) {
	t.Run("creates lesson Step", func(t *testing.T) {
		step := Step{
			ID:        "step-123",
			Index:     0,
			Type:      "lesson",
			Topic:     "Go Basics",
			Title:     "Introduction to Go",
			Content:   "Go is a statically typed language...",
			Completed: false,
			CreatedAt: 1704067200000,
		}

		assert.Equal(t, "step-123", step.ID)
		assert.Equal(t, 0, step.Index)
		assert.Equal(t, "lesson", step.Type)
		assert.Equal(t, "Go Basics", step.Topic)
		assert.Equal(t, "Introduction to Go", step.Title)
		assert.NotEmpty(t, step.Content)
		assert.False(t, step.Completed)
	})

	t.Run("creates quiz Step", func(t *testing.T) {
		step := Step{
			ID:             "step-456",
			Index:          1,
			Type:           "quiz",
			Topic:          "Go Basics",
			Title:          "Quiz: Variables",
			Question:       "What keyword declares a variable in Go?",
			Options:        []string{"var", "let", "const", "dim"},
			ExpectedAnswer: "var",
			Completed:      false,
			CreatedAt:      1704067200000,
		}

		assert.Equal(t, "quiz", step.Type)
		assert.NotEmpty(t, step.Question)
		assert.Len(t, step.Options, 4)
		assert.Equal(t, "var", step.ExpectedAnswer)
	})

	t.Run("creates practice Step", func(t *testing.T) {
		step := Step{
			ID:        "step-789",
			Index:     2,
			Type:      "practice",
			Topic:     "Go Basics",
			Title:     "Practice: Hello World",
			Task:      "Write a program that prints 'Hello, World!'",
			Hints:     []string{"Use fmt.Println", "Import fmt package"},
			Completed: false,
			CreatedAt: 1704067200000,
		}

		assert.Equal(t, "practice", step.Type)
		assert.NotEmpty(t, step.Task)
		assert.Len(t, step.Hints, 2)
	})

	t.Run("creates completed Step with score", func(t *testing.T) {
		step := Step{
			ID:          "step-completed",
			Index:       3,
			Type:        "quiz",
			Topic:       "Go Basics",
			Title:       "Completed Quiz",
			Completed:   true,
			CompletedAt: 1704070800000,
			UserAnswer:  "var",
			Score:       100,
			CreatedAt:   1704067200000,
		}

		assert.True(t, step.Completed)
		assert.Equal(t, int64(1704070800000), step.CompletedAt)
		assert.Equal(t, "var", step.UserAnswer)
		assert.Equal(t, float64(100), step.Score)
	})

	t.Run("JSON omits empty optional fields", func(t *testing.T) {
		step := Step{
			ID:        "step-minimal",
			Index:     0,
			Type:      "lesson",
			Topic:     "Test",
			Title:     "Minimal Step",
			Completed: false,
			CreatedAt: 1704067200000,
		}

		jsonBytes, err := json.Marshal(step)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "content")
		assert.NotContains(t, parsed, "question")
		assert.NotContains(t, parsed, "options")
		assert.NotContains(t, parsed, "expectedAnswer")
		assert.NotContains(t, parsed, "task")
		assert.NotContains(t, parsed, "hints")
		assert.NotContains(t, parsed, "completedAt")
		assert.NotContains(t, parsed, "userAnswer")
		assert.NotContains(t, parsed, "score")
	})

	t.Run("content truncation constant exists", func(t *testing.T) {
		assert.Equal(t, 2000, MaxStepContentLength)
	})
}

// =============================================================================
// LearningPathCreate Tests
// =============================================================================

func TestLearningPathCreateStruct(t *testing.T) {
	t.Run("creates request with all fields", func(t *testing.T) {
		req := LearningPathCreate{
			Goal:  "Learn Go",
			Level: "beginner",
			Emoji: "🎯",
		}

		assert.Equal(t, "Learn Go", req.Goal)
		assert.Equal(t, "beginner", req.Level)
		assert.Equal(t, "🎯", req.Emoji)
	})

	t.Run("JSON marshaling works correctly", func(t *testing.T) {
		req := LearningPathCreate{
			Goal:  "Learn Python",
			Level: "intermediate",
			Emoji: "🐍",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "Learn Python", parsed["goal"])
		assert.Equal(t, "intermediate", parsed["level"])
		assert.Equal(t, "🐍", parsed["emoji"])
	})

	t.Run("JSON unmarshaling works correctly", func(t *testing.T) {
		jsonStr := `{"goal": "Learn Rust", "level": "advanced", "emoji": "🦀"}`

		var req LearningPathCreate
		err := json.Unmarshal([]byte(jsonStr), &req)
		require.NoError(t, err)

		assert.Equal(t, "Learn Rust", req.Goal)
		assert.Equal(t, "advanced", req.Level)
		assert.Equal(t, "🦀", req.Emoji)
	})
}

// =============================================================================
// LearningPathUpdate Tests
// =============================================================================

func TestLearningPathUpdateStruct(t *testing.T) {
	t.Run("creates update with all optional fields", func(t *testing.T) {
		goal := "Updated Goal"
		level := "intermediate"
		emoji := "🚀"
		progress := 50
		lessonsCompleted := 5
		totalLessons := 10

		req := LearningPathUpdate{
			Goal:             &goal,
			Level:            &level,
			Emoji:            &emoji,
			Progress:         &progress,
			LessonsCompleted: &lessonsCompleted,
			TotalLessons:     &totalLessons,
		}

		assert.Equal(t, "Updated Goal", *req.Goal)
		assert.Equal(t, "intermediate", *req.Level)
		assert.Equal(t, "🚀", *req.Emoji)
		assert.Equal(t, 50, *req.Progress)
		assert.Equal(t, 5, *req.LessonsCompleted)
		assert.Equal(t, 10, *req.TotalLessons)
	})

	t.Run("allows nil fields for partial updates", func(t *testing.T) {
		goal := "Only Goal Update"

		req := LearningPathUpdate{
			Goal: &goal,
		}

		assert.NotNil(t, req.Goal)
		assert.Nil(t, req.Level)
		assert.Nil(t, req.Emoji)
		assert.Nil(t, req.Progress)
		assert.Nil(t, req.LessonsCompleted)
		assert.Nil(t, req.TotalLessons)
	})

	t.Run("JSON omits nil fields", func(t *testing.T) {
		goal := "Only Goal"
		req := LearningPathUpdate{
			Goal: &goal,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "goal")
		assert.NotContains(t, parsed, "level")
		assert.NotContains(t, parsed, "emoji")
		assert.NotContains(t, parsed, "progress")
		assert.NotContains(t, parsed, "lessonsCompleted")
		assert.NotContains(t, parsed, "totalLessons")
	})
}

// =============================================================================
// StepComplete Tests
// =============================================================================

func TestStepCompleteStruct(t *testing.T) {
	t.Run("creates completion with answer and score", func(t *testing.T) {
		req := StepComplete{
			UserAnswer: "var",
			Score:      100,
		}

		assert.Equal(t, "var", req.UserAnswer)
		assert.Equal(t, float64(100), req.Score)
	})

	t.Run("allows empty completion (for lessons)", func(t *testing.T) {
		req := StepComplete{}

		assert.Empty(t, req.UserAnswer)
		assert.Equal(t, float64(0), req.Score)
	})

	t.Run("JSON omits empty fields", func(t *testing.T) {
		req := StepComplete{}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "userAnswer")
		assert.NotContains(t, parsed, "score")
	})

	t.Run("JSON includes non-empty fields", func(t *testing.T) {
		req := StepComplete{
			UserAnswer: "42",
			Score:      85.5,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "userAnswer")
		assert.Contains(t, parsed, "score")
		assert.Equal(t, "42", parsed["userAnswer"])
		assert.Equal(t, 85.5, parsed["score"])
	})
}

// =============================================================================
// Compaction Tests
// =============================================================================

func TestCompactionStruct(t *testing.T) {
	t.Run("creates Compaction with all fields", func(t *testing.T) {
		compaction := Compaction{
			Summary:         "User has completed 10 steps and shows good progress.",
			Strengths:       []string{"Variables", "Functions", "Control Flow"},
			Weaknesses:      []string{"Pointers", "Concurrency"},
			Recommendations: []string{"Practice more with pointers", "Study goroutines"},
			LastStepIndex:   9,
			CompactedAt:     1704067200000,
		}

		assert.Equal(t, "User has completed 10 steps and shows good progress.", compaction.Summary)
		assert.Len(t, compaction.Strengths, 3)
		assert.Len(t, compaction.Weaknesses, 2)
		assert.Len(t, compaction.Recommendations, 2)
		assert.Equal(t, 9, compaction.LastStepIndex)
		assert.Equal(t, int64(1704067200000), compaction.CompactedAt)
	})

	t.Run("JSON marshaling works correctly", func(t *testing.T) {
		compaction := Compaction{
			Summary:         "Good progress",
			Strengths:       []string{"A", "B"},
			Weaknesses:      []string{"C"},
			Recommendations: []string{"D"},
			LastStepIndex:   5,
			CompactedAt:     1704067200000,
		}

		jsonBytes, err := json.Marshal(compaction)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "summary")
		assert.Contains(t, parsed, "strengths")
		assert.Contains(t, parsed, "weaknesses")
		assert.Contains(t, parsed, "recommendations")
		assert.Contains(t, parsed, "lastStepIndex")
		assert.Contains(t, parsed, "compactedAt")
	})
}

// =============================================================================
// CompactionInterval Constant Tests
// =============================================================================

func TestCompactionIntervalConstant(t *testing.T) {
	t.Run("compaction interval is 10", func(t *testing.T) {
		assert.Equal(t, 10, CompactionInterval)
	})
}

// =============================================================================
// Integration Tests - Full LearningPath with Steps and Memory
// =============================================================================

func TestLearningPathWithStepsAndMemory(t *testing.T) {
	t.Run("creates complete learning path", func(t *testing.T) {
		path := LearningPath{
			ID:               "path-full",
			UserID:           "user-123",
			Goal:             "Learn Go Programming",
			Level:            "beginner",
			Emoji:            "🎯",
			Progress:         30,
			LessonsCompleted: 3,
			TotalLessons:     10,
			Steps: []Step{
				{
					ID:          "step-1",
					Index:       0,
					Type:        "lesson",
					Topic:       "Go Basics",
					Title:       "Introduction",
					Content:     "Go is a programming language...",
					Completed:   true,
					CompletedAt: 1704067200000,
					CreatedAt:   1704060000000,
				},
				{
					ID:             "step-2",
					Index:          1,
					Type:           "quiz",
					Topic:          "Go Basics",
					Title:          "Quiz",
					Question:       "What is Go?",
					Options:        []string{"A", "B", "C", "D"},
					ExpectedAnswer: "A",
					Completed:      true,
					CompletedAt:    1704070800000,
					UserAnswer:     "A",
					Score:          100,
					CreatedAt:      1704067200000,
				},
				{
					ID:        "step-3",
					Index:     2,
					Type:      "practice",
					Topic:     "Go Basics",
					Title:     "Practice",
					Task:      "Write hello world",
					Hints:     []string{"Use fmt.Println"},
					Completed: true,
					Score:     85,
					CreatedAt: 1704070800000,
				},
				{
					ID:        "step-4",
					Index:     3,
					Type:      "lesson",
					Topic:     "Variables",
					Title:     "Variables in Go",
					Content:   "Variables store data...",
					Completed: false,
					CreatedAt: 1704074400000,
				},
			},
			Memory: &Memory{
				Topics: map[string]TopicMemory{
					"Go Basics": {
						Confidence:   0.9,
						LastReviewed: "2024-01-01",
						TimesTested:  3,
					},
				},
				Compaction: &Compaction{
					Summary:       "User completed basics",
					Strengths:     []string{"Go Basics"},
					Weaknesses:    []string{},
					LastStepIndex: 2,
					CompactedAt:   1704074400000,
				},
			},
			CreatedAt:      1704060000000,
			UpdatedAt:      1704074400000,
			LastAccessedAt: 1704074400000,
		}

		// Verify structure
		assert.Len(t, path.Steps, 4)
		assert.Equal(t, 3, path.LessonsCompleted)

		// Count completed steps
		completedCount := 0
		for _, s := range path.Steps {
			if s.Completed {
				completedCount++
			}
		}
		assert.Equal(t, 3, completedCount)

		// Verify memory
		assert.NotNil(t, path.Memory)
		assert.Len(t, path.Memory.Topics, 1)
		assert.NotNil(t, path.Memory.Compaction)
		assert.Equal(t, 0.9, path.Memory.Topics["Go Basics"].Confidence)
	})

	t.Run("JSON round-trip preserves data", func(t *testing.T) {
		original := LearningPath{
			ID:               "path-roundtrip",
			UserID:           "user-456",
			Goal:             "Test Goal",
			Level:            "intermediate",
			Emoji:            "🚀",
			Progress:         50,
			LessonsCompleted: 5,
			TotalLessons:     10,
			Steps: []Step{
				{
					ID:        "step-1",
					Index:     0,
					Type:      "lesson",
					Topic:     "Test",
					Title:     "Test Lesson",
					Completed: true,
					CreatedAt: 1704067200000,
				},
			},
			Memory: &Memory{
				Topics: map[string]TopicMemory{
					"Test": {
						Confidence:   0.8,
						LastReviewed: "2024-01-01",
						TimesTested:  2,
					},
				},
			},
			CreatedAt:      1704060000000,
			UpdatedAt:      1704067200000,
			LastAccessedAt: 1704067200000,
		}

		jsonBytes, err := json.Marshal(original)
		require.NoError(t, err)

		var restored LearningPath
		err = json.Unmarshal(jsonBytes, &restored)
		require.NoError(t, err)

		assert.Equal(t, original.ID, restored.ID)
		assert.Equal(t, original.UserID, restored.UserID)
		assert.Equal(t, original.Goal, restored.Goal)
		assert.Equal(t, original.Level, restored.Level)
		assert.Equal(t, original.Emoji, restored.Emoji)
		assert.Equal(t, original.Progress, restored.Progress)
		assert.Equal(t, original.LessonsCompleted, restored.LessonsCompleted)
		assert.Equal(t, original.TotalLessons, restored.TotalLessons)
		assert.Len(t, restored.Steps, 1)
		assert.NotNil(t, restored.Memory)
		assert.Equal(t, original.Memory.Topics["Test"].Confidence, restored.Memory.Topics["Test"].Confidence)
	})
}

// =============================================================================
// Path Status Constants Tests
// =============================================================================

func TestPathStatusConstants(t *testing.T) {
	t.Run("status constants have correct values", func(t *testing.T) {
		assert.Equal(t, "active", PathStatusActive)
		assert.Equal(t, "completed", PathStatusCompleted)
		assert.Equal(t, "archived", PathStatusArchived)
		assert.Equal(t, "deleted", PathStatusDeleted)
	})

	t.Run("status constants are unique", func(t *testing.T) {
		statuses := []string{PathStatusActive, PathStatusCompleted, PathStatusArchived, PathStatusDeleted}
		unique := make(map[string]bool)

		for _, status := range statuses {
			assert.False(t, unique[status], "Duplicate status: %s", status)
			unique[status] = true
		}

		assert.Len(t, unique, 4)
	})
}

// =============================================================================
// LearningPath Status Field Tests
// =============================================================================

func TestLearningPathStatusField(t *testing.T) {
	t.Run("creates path with active status", func(t *testing.T) {
		path := LearningPath{
			ID:     "path-1",
			UserID: "user-1",
			Goal:   "Learn Go",
			Level:  "beginner",
			Status: PathStatusActive,
		}

		assert.Equal(t, PathStatusActive, path.Status)
	})

	t.Run("creates path with completed status and timestamp", func(t *testing.T) {
		path := LearningPath{
			ID:          "path-1",
			UserID:      "user-1",
			Goal:        "Learn Go",
			Level:       "beginner",
			Status:      PathStatusCompleted,
			Progress:    100,
			CompletedAt: 1704067200000,
		}

		assert.Equal(t, PathStatusCompleted, path.Status)
		assert.Equal(t, int64(1704067200000), path.CompletedAt)
	})

	t.Run("creates path with archived status and timestamp", func(t *testing.T) {
		path := LearningPath{
			ID:         "path-1",
			UserID:     "user-1",
			Goal:       "Learn Go",
			Level:      "beginner",
			Status:     PathStatusArchived,
			ArchivedAt: 1704067200000,
		}

		assert.Equal(t, PathStatusArchived, path.Status)
		assert.Equal(t, int64(1704067200000), path.ArchivedAt)
	})

	t.Run("creates path with deleted status and timestamp", func(t *testing.T) {
		path := LearningPath{
			ID:        "path-1",
			UserID:    "user-1",
			Goal:      "Learn Go",
			Level:     "beginner",
			Status:    PathStatusDeleted,
			DeletedAt: 1704067200000,
		}

		assert.Equal(t, PathStatusDeleted, path.Status)
		assert.Equal(t, int64(1704067200000), path.DeletedAt)
	})

	t.Run("JSON includes status field", func(t *testing.T) {
		path := LearningPath{
			ID:     "path-123",
			UserID: "user-456",
			Goal:   "Learn Go",
			Level:  "beginner",
			Status: PathStatusActive,
		}

		jsonBytes, err := json.Marshal(path)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "status")
		assert.Equal(t, "active", parsed["status"])
	})

	t.Run("JSON omits empty timestamps", func(t *testing.T) {
		path := LearningPath{
			ID:     "path-123",
			UserID: "user-456",
			Goal:   "Learn Go",
			Level:  "beginner",
			Status: PathStatusActive,
		}

		jsonBytes, err := json.Marshal(path)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		// These should be omitted when zero
		assert.NotContains(t, parsed, "completedAt")
		assert.NotContains(t, parsed, "archivedAt")
		assert.NotContains(t, parsed, "deletedAt")
	})

	t.Run("JSON includes non-zero timestamps", func(t *testing.T) {
		path := LearningPath{
			ID:          "path-123",
			UserID:      "user-456",
			Goal:        "Learn Go",
			Level:       "beginner",
			Status:      PathStatusCompleted,
			CompletedAt: 1704067200000,
		}

		jsonBytes, err := json.Marshal(path)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "completedAt")
	})

	t.Run("JSON unmarshaling handles status correctly", func(t *testing.T) {
		jsonStr := `{
			"id": "path-789",
			"userId": "user-123",
			"goal": "Master Python",
			"level": "intermediate",
			"status": "completed",
			"completedAt": 1704067200000
		}`

		var path LearningPath
		err := json.Unmarshal([]byte(jsonStr), &path)
		require.NoError(t, err)

		assert.Equal(t, PathStatusCompleted, path.Status)
		assert.Equal(t, int64(1704067200000), path.CompletedAt)
	})
}

// =============================================================================
// LearningPath Lifecycle Tests
// =============================================================================

func TestLearningPathLifecycle(t *testing.T) {
	t.Run("new path starts as active", func(t *testing.T) {
		path := LearningPath{
			ID:               "path-new",
			UserID:           "user-123",
			Goal:             "Learn Go",
			Level:            "beginner",
			Status:           PathStatusActive,
			Progress:         0,
			LessonsCompleted: 0,
			TotalLessons:     10,
		}

		assert.Equal(t, PathStatusActive, path.Status)
		assert.Equal(t, int64(0), path.CompletedAt)
		assert.Equal(t, int64(0), path.ArchivedAt)
		assert.Equal(t, int64(0), path.DeletedAt)
	})

	t.Run("completed path has 100% progress", func(t *testing.T) {
		path := LearningPath{
			ID:               "path-done",
			UserID:           "user-123",
			Goal:             "Learn Go",
			Level:            "beginner",
			Status:           PathStatusCompleted,
			Progress:         100,
			LessonsCompleted: 10,
			TotalLessons:     10,
			CompletedAt:      1704067200000,
		}

		assert.Equal(t, PathStatusCompleted, path.Status)
		assert.Equal(t, 100, path.Progress)
		assert.Equal(t, path.LessonsCompleted, path.TotalLessons)
		assert.NotEqual(t, int64(0), path.CompletedAt)
	})

	t.Run("archived path preserves progress", func(t *testing.T) {
		path := LearningPath{
			ID:               "path-archived",
			UserID:           "user-123",
			Goal:             "Learn Go",
			Level:            "beginner",
			Status:           PathStatusArchived,
			Progress:         50,
			LessonsCompleted: 5,
			TotalLessons:     10,
			ArchivedAt:       1704067200000,
		}

		assert.Equal(t, PathStatusArchived, path.Status)
		assert.Equal(t, 50, path.Progress)
		assert.NotEqual(t, int64(0), path.ArchivedAt)
	})

	t.Run("deleted path has deletedAt timestamp", func(t *testing.T) {
		path := LearningPath{
			ID:        "path-deleted",
			UserID:    "user-123",
			Goal:      "Learn Go",
			Level:     "beginner",
			Status:    PathStatusDeleted,
			DeletedAt: 1704067200000,
		}

		assert.Equal(t, PathStatusDeleted, path.Status)
		assert.NotEqual(t, int64(0), path.DeletedAt)
	})
}

// =============================================================================
// LearningPath Status Validation Helpers
// =============================================================================

func TestStatusValidationHelpers(t *testing.T) {
	t.Run("validates status is one of known values", func(t *testing.T) {
		validStatuses := map[string]bool{
			PathStatusActive:    true,
			PathStatusCompleted: true,
			PathStatusArchived:  true,
			PathStatusDeleted:   true,
		}

		assert.True(t, validStatuses["active"])
		assert.True(t, validStatuses["completed"])
		assert.True(t, validStatuses["archived"])
		assert.True(t, validStatuses["deleted"])
		assert.False(t, validStatuses["unknown"])
		assert.False(t, validStatuses[""])
	})
}

// =============================================================================
// LearningPath with Steps - Completion Scenario Tests
// =============================================================================

func TestLearningPathCompletionScenarios(t *testing.T) {
	t.Run("path with all completed steps and passing quizzes", func(t *testing.T) {
		path := LearningPath{
			ID:               "path-complete",
			UserID:           "user-123",
			Goal:             "Learn Go",
			Level:            "beginner",
			Status:           PathStatusCompleted,
			Progress:         100,
			LessonsCompleted: 3,
			TotalLessons:     3,
			Steps: []Step{
				{ID: "step-1", Type: "lesson", Completed: true, Score: 0},
				{ID: "step-2", Type: "quiz", Completed: true, Score: 85},
				{ID: "step-3", Type: "lesson", Completed: true, Score: 0},
			},
			CompletedAt: 1704067200000,
		}

		// All steps completed
		allCompleted := true
		for _, s := range path.Steps {
			if !s.Completed {
				allCompleted = false
				break
			}
		}
		assert.True(t, allCompleted)

		// All quizzes passed (>= 70%)
		allQuizzesPassed := true
		for _, s := range path.Steps {
			if s.Type == "quiz" && s.Score < 70 {
				allQuizzesPassed = false
				break
			}
		}
		assert.True(t, allQuizzesPassed)
	})

	t.Run("path with failed quiz should not be completed", func(t *testing.T) {
		path := LearningPath{
			ID:               "path-incomplete",
			UserID:           "user-123",
			Goal:             "Learn Go",
			Level:            "beginner",
			Status:           PathStatusActive, // Should remain active due to failed quiz
			Progress:         100,
			LessonsCompleted: 3,
			TotalLessons:     3,
			Steps: []Step{
				{ID: "step-1", Type: "lesson", Completed: true, Score: 0},
				{ID: "step-2", Type: "quiz", Completed: true, Score: 60}, // Failed
				{ID: "step-3", Type: "lesson", Completed: true, Score: 0},
			},
		}

		// Check if all quizzes passed
		allQuizzesPassed := true
		for _, s := range path.Steps {
			if s.Type == "quiz" && s.Score < 70 {
				allQuizzesPassed = false
				break
			}
		}
		assert.False(t, allQuizzesPassed)
		assert.Equal(t, PathStatusActive, path.Status)
	})
}
