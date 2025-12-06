package services

import (
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Helper Function Tests
// =============================================================================

func TestGetRecentSteps(t *testing.T) {
	t.Run("returns all steps when no compaction", func(t *testing.T) {
		path := &models.Course{
			Steps: []models.Step{
				{ID: "step-1", Topic: "Basics"},
				{ID: "step-2", Topic: "Functions"},
				{ID: "step-3", Topic: "Structs"},
			},
			Memory: nil,
		}

		recentSteps := getRecentSteps(path)
		assert.Len(t, recentSteps, 3)
	})

	t.Run("returns all steps when memory exists but no compaction", func(t *testing.T) {
		path := &models.Course{
			Steps: []models.Step{
				{ID: "step-1", Topic: "Basics"},
				{ID: "step-2", Topic: "Functions"},
			},
			Memory: &models.Memory{
				Topics:     map[string]models.TopicMemory{},
				Compaction: nil,
			},
		}

		recentSteps := getRecentSteps(path)
		assert.Len(t, recentSteps, 2)
	})

	t.Run("returns steps after compaction index", func(t *testing.T) {
		path := &models.Course{
			Steps: []models.Step{
				{ID: "step-1", Topic: "Basics", Index: 0},
				{ID: "step-2", Topic: "Functions", Index: 1},
				{ID: "step-3", Topic: "Structs", Index: 2},
				{ID: "step-4", Topic: "Interfaces", Index: 3},
				{ID: "step-5", Topic: "Concurrency", Index: 4},
			},
			Memory: &models.Memory{
				Compaction: &models.Compaction{
					LastStepIndex: 2, // Compacted up to index 2
				},
			},
		}

		recentSteps := getRecentSteps(path)
		assert.Len(t, recentSteps, 2) // Steps 3 and 4 (indices 3 and 4)
		assert.Equal(t, "Interfaces", recentSteps[0].Topic)
		assert.Equal(t, "Concurrency", recentSteps[1].Topic)
	})

	t.Run("returns empty slice when all steps compacted", func(t *testing.T) {
		path := &models.Course{
			Steps: []models.Step{
				{ID: "step-1", Topic: "Basics", Index: 0},
				{ID: "step-2", Topic: "Functions", Index: 1},
			},
			Memory: &models.Memory{
				Compaction: &models.Compaction{
					LastStepIndex: 1, // Compacted up to last step
				},
			},
		}

		recentSteps := getRecentSteps(path)
		assert.Len(t, recentSteps, 0)
	})

	t.Run("handles empty steps", func(t *testing.T) {
		path := &models.Course{
			Steps:  []models.Step{},
			Memory: nil,
		}

		recentSteps := getRecentSteps(path)
		assert.Len(t, recentSteps, 0)
	})
}

func TestBuildMemoryContext(t *testing.T) {
	t.Run("returns default message when no memory", func(t *testing.T) {
		path := &models.Course{
			Memory: nil,
		}

		context := buildMemoryContext(path)
		assert.Equal(t, "No prior learning history.", context)
	})

	t.Run("returns default message for empty memory", func(t *testing.T) {
		path := &models.Course{
			Memory: &models.Memory{
				Topics: map[string]models.TopicMemory{},
			},
		}

		context := buildMemoryContext(path)
		assert.Equal(t, "No prior learning history.", context)
	})

	t.Run("includes compaction summary", func(t *testing.T) {
		path := &models.Course{
			Memory: &models.Memory{
				Compaction: &models.Compaction{
					Summary: "User has shown great progress in Go basics.",
				},
			},
		}

		context := buildMemoryContext(path)
		assert.Contains(t, context, "Learning Summary:")
		assert.Contains(t, context, "User has shown great progress")
	})

	t.Run("includes strengths and weaknesses", func(t *testing.T) {
		path := &models.Course{
			Memory: &models.Memory{
				Compaction: &models.Compaction{
					Summary:    "Good progress",
					Strengths:  []string{"Variables", "Functions"},
					Weaknesses: []string{"Pointers", "Concurrency"},
				},
			},
		}

		context := buildMemoryContext(path)
		assert.Contains(t, context, "Strengths:")
		assert.Contains(t, context, "Variables")
		assert.Contains(t, context, "Functions")
		assert.Contains(t, context, "Areas needing work:")
		assert.Contains(t, context, "Pointers")
		assert.Contains(t, context, "Concurrency")
	})

	t.Run("includes recommendations", func(t *testing.T) {
		path := &models.Course{
			Memory: &models.Memory{
				Compaction: &models.Compaction{
					Summary:         "Making progress",
					Recommendations: []string{"Focus on error handling", "Practice more with channels"},
				},
			},
		}

		context := buildMemoryContext(path)
		assert.Contains(t, context, "Recommendations:")
		assert.Contains(t, context, "Focus on error handling")
	})

	t.Run("includes topic confidence scores", func(t *testing.T) {
		path := &models.Course{
			Memory: &models.Memory{
				Topics: map[string]models.TopicMemory{
					"Go Basics": {Confidence: 0.85},
					"Functions": {Confidence: 0.70},
				},
			},
		}

		context := buildMemoryContext(path)
		assert.Contains(t, context, "Topic Confidence:")
		assert.Contains(t, context, "Go Basics: 85%")
		assert.Contains(t, context, "Functions: 70%")
	})

	t.Run("includes all memory components", func(t *testing.T) {
		path := &models.Course{
			Memory: &models.Memory{
				Topics: map[string]models.TopicMemory{
					"Variables": {Confidence: 0.90},
				},
				Compaction: &models.Compaction{
					Summary:         "Great progress in fundamentals",
					Strengths:       []string{"Variables"},
					Weaknesses:      []string{"Pointers"},
					Recommendations: []string{"Practice pointers"},
				},
			},
		}

		context := buildMemoryContext(path)
		assert.Contains(t, context, "Learning Summary:")
		assert.Contains(t, context, "Strengths:")
		assert.Contains(t, context, "Areas needing work:")
		assert.Contains(t, context, "Recommendations:")
		assert.Contains(t, context, "Topic Confidence:")
	})
}

// =============================================================================
// PregenerateService Creation Tests
// =============================================================================

func TestNewPregenerateService(t *testing.T) {
	t.Run("creates service with all dependencies", func(t *testing.T) {
		// Note: This is a basic test since we can't easily mock all dependencies
		// In a real scenario, you'd use interfaces for better testability
		service := NewPregenerateService(nil, nil, "", nil, nil, nil)
		assert.NotNil(t, service)
	})
}

// =============================================================================
// IsGenerating Tests
// =============================================================================

func TestIsGenerating(t *testing.T) {
	t.Run("returns false when not generating", func(t *testing.T) {
		service := &PregenerateService{}

		assert.False(t, service.IsGenerating("path-1", "user-1"))
	})

	t.Run("tracks generation state correctly", func(t *testing.T) {
		service := &PregenerateService{}

		// Simulate setting in-progress state
		service.inProgress.Store("path-1:user-1", true)

		assert.True(t, service.IsGenerating("path-1", "user-1"))
		assert.False(t, service.IsGenerating("path-2", "user-1"))
	})
}

// =============================================================================
// TriggerPregeneration Edge Cases
// =============================================================================

func TestTriggerPregenerationEdgeCases(t *testing.T) {
	t.Run("does nothing when llmProvider is nil", func(t *testing.T) {
		service := &PregenerateService{
			llmProvider: nil,
			loader:      nil,
		}

		path := &models.Course{
			ID:     "path-1",
			UserID: "user-1",
		}

		// Should not panic
		service.TriggerPregeneration(path, "free")

		// Should not be marked as generating
		assert.False(t, service.IsGenerating("path-1", "user-1"))
	})
}

// =============================================================================
// Integration Scenario Tests (without actual LLM calls)
// =============================================================================

func TestPregenerateServiceScenarios(t *testing.T) {
	t.Run("builds context for new learner", func(t *testing.T) {
		path := &models.Course{
			ID:     "path-new",
			UserID: "user-new",
			Goal:   "Learn Go Programming",
			Steps:  []models.Step{},
			Memory: nil,
		}

		context := buildMemoryContext(path)
		assert.Equal(t, "No prior learning history.", context)

		recentSteps := getRecentSteps(path)
		assert.Len(t, recentSteps, 0)
	})

	t.Run("builds context for experienced learner", func(t *testing.T) {
		path := &models.Course{
			ID:     "path-experienced",
			UserID: "user-exp",
			Goal:   "Master Go",
			Steps: []models.Step{
				{ID: "1", Topic: "Variables", Completed: true},
				{ID: "2", Topic: "Functions", Completed: true},
				{ID: "3", Topic: "Structs", Completed: true},
				{ID: "4", Topic: "Interfaces", Completed: true},
				{ID: "5", Topic: "Goroutines", Completed: true},
				{ID: "6", Topic: "Channels", Completed: true},
				{ID: "7", Topic: "Patterns", Completed: true},
				{ID: "8", Topic: "Testing", Completed: true},
				{ID: "9", Topic: "Benchmarks", Completed: true},
				{ID: "10", Topic: "Profiling", Completed: true},
				{ID: "11", Topic: "Advanced Concurrency", Completed: false},
			},
			Memory: &models.Memory{
				Topics: map[string]models.TopicMemory{
					"Variables":  {Confidence: 0.95},
					"Functions":  {Confidence: 0.90},
					"Goroutines": {Confidence: 0.75},
				},
				Compaction: &models.Compaction{
					Summary:         "User has mastered Go fundamentals and is progressing well with concurrency.",
					Strengths:       []string{"Variables", "Functions", "Structs"},
					Weaknesses:      []string{"Error handling"},
					Recommendations: []string{"Focus on advanced concurrency patterns"},
					LastStepIndex:   9,
				},
			},
		}

		context := buildMemoryContext(path)
		assert.Contains(t, context, "Learning Summary:")
		assert.Contains(t, context, "Strengths:")
		assert.Contains(t, context, "Topic Confidence:")

		recentSteps := getRecentSteps(path)
		assert.Len(t, recentSteps, 1) // Only step after compaction index
		assert.Equal(t, "Advanced Concurrency", recentSteps[0].Topic)
	})
}
