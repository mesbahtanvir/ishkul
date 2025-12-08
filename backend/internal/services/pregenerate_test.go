package services

import (
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Helper Function Tests
// =============================================================================

func TestBuildCourseContext(t *testing.T) {
	t.Run("builds context for new course", func(t *testing.T) {
		course := &models.Course{
			Title:    "Learn Go Programming",
			Progress: 0,
			Outline:  nil,
		}

		context := buildCourseContext(course)
		assert.Contains(t, context, "Learn Go Programming")
		assert.Contains(t, context, "0%")
	})

	t.Run("builds context with progress", func(t *testing.T) {
		course := &models.Course{
			Title:    "Learn Go",
			Progress: 50,
			Outline:  nil,
		}

		context := buildCourseContext(course)
		assert.Contains(t, context, "50%")
	})

	t.Run("builds context with outline sections", func(t *testing.T) {
		course := &models.Course{
			Title:    "Learn Go",
			Progress: 25,
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{
						ID:    "section-1",
						Title: "Basics",
						Lessons: []models.Lesson{
							{ID: "lesson-1", Title: "Variables", Status: models.LessonStatusCompleted},
							{ID: "lesson-2", Title: "Functions", Status: models.LessonStatusPending},
						},
					},
					{
						ID:    "section-2",
						Title: "Advanced",
						Lessons: []models.Lesson{
							{ID: "lesson-3", Title: "Goroutines", Status: models.LessonStatusPending},
						},
					},
				},
			},
		}

		context := buildCourseContext(course)
		assert.Contains(t, context, "Learn Go")
		assert.Contains(t, context, "Sections: 2")
		assert.Contains(t, context, "Lessons completed: 1/3")
	})

	t.Run("builds context with all lessons completed", func(t *testing.T) {
		course := &models.Course{
			Title:    "Learn Go",
			Progress: 100,
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{
						ID:    "section-1",
						Title: "Basics",
						Lessons: []models.Lesson{
							{ID: "lesson-1", Title: "Variables", Status: models.LessonStatusCompleted},
							{ID: "lesson-2", Title: "Functions", Status: models.LessonStatusCompleted},
						},
					},
				},
			},
		}

		context := buildCourseContext(course)
		assert.Contains(t, context, "100%")
		assert.Contains(t, context, "Lessons completed: 2/2")
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

		assert.False(t, service.IsGenerating("course-1", "lesson-1"))
	})

	t.Run("tracks generation state correctly", func(t *testing.T) {
		service := &PregenerateService{}

		// Simulate setting in-progress state
		service.inProgress.Store("course-1:lesson-1", true)

		assert.True(t, service.IsGenerating("course-1", "lesson-1"))
		assert.False(t, service.IsGenerating("course-2", "lesson-1"))
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

		course := &models.Course{
			ID:     "course-1",
			UserID: "user-1",
			Title:  "Learn Go",
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{
						Lessons: []models.Lesson{
							{ID: "lesson-1", Title: "Variables"},
						},
					},
				},
			},
			CurrentPosition: &models.LessonPosition{
				SectionIndex: 0,
				LessonIndex:  0,
			},
		}

		// Should not panic
		service.TriggerPregeneration(course, "free")

		// Should not be marked as generating
		assert.False(t, service.IsGenerating("course-1", "lesson-1"))
	})

	t.Run("does nothing when course has no current lesson", func(t *testing.T) {
		service := &PregenerateService{
			llmProvider: nil,
			loader:      nil,
		}

		course := &models.Course{
			ID:              "course-1",
			UserID:          "user-1",
			Title:           "Learn Go",
			Outline:         nil,
			CurrentPosition: nil,
		}

		// Should not panic
		service.TriggerPregeneration(course, "free")

		// Should not be marked as generating
		assert.False(t, service.IsGenerating("course-1", ""))
	})
}

// =============================================================================
// Integration Scenario Tests (without actual LLM calls)
// =============================================================================

func TestPregenerateServiceScenarios(t *testing.T) {
	t.Run("builds context for new learner", func(t *testing.T) {
		course := &models.Course{
			ID:       "course-new",
			UserID:   "user-new",
			Title:    "Learn Go Programming",
			Progress: 0,
			Outline:  nil,
		}

		context := buildCourseContext(course)
		assert.Contains(t, context, "Learn Go Programming")
		assert.Contains(t, context, "0%")
	})

	t.Run("builds context for experienced learner with progress", func(t *testing.T) {
		course := &models.Course{
			ID:       "course-experienced",
			UserID:   "user-exp",
			Title:    "Master Go",
			Progress: 80,
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{
						ID:    "section-1",
						Title: "Basics",
						Lessons: []models.Lesson{
							{ID: "lesson-1", Title: "Variables", Status: models.LessonStatusCompleted},
							{ID: "lesson-2", Title: "Functions", Status: models.LessonStatusCompleted},
						},
					},
					{
						ID:    "section-2",
						Title: "Intermediate",
						Lessons: []models.Lesson{
							{ID: "lesson-3", Title: "Structs", Status: models.LessonStatusCompleted},
							{ID: "lesson-4", Title: "Interfaces", Status: models.LessonStatusCompleted},
						},
					},
					{
						ID:    "section-3",
						Title: "Advanced",
						Lessons: []models.Lesson{
							{ID: "lesson-5", Title: "Goroutines", Status: models.LessonStatusInProgress},
							{ID: "lesson-6", Title: "Channels", Status: models.LessonStatusPending},
						},
					},
				},
			},
			CurrentPosition: &models.LessonPosition{
				SectionIndex: 2,
				LessonIndex:  0,
			},
		}

		context := buildCourseContext(course)
		assert.Contains(t, context, "Master Go")
		assert.Contains(t, context, "80%")
		assert.Contains(t, context, "Sections: 3")
		assert.Contains(t, context, "Lessons completed: 4/6")
	})

	t.Run("handles course with no lessons completed", func(t *testing.T) {
		course := &models.Course{
			ID:       "course-start",
			Title:    "Learn Python",
			Progress: 0,
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{
						ID:    "section-1",
						Title: "Getting Started",
						Lessons: []models.Lesson{
							{ID: "lesson-1", Title: "Introduction", Status: models.LessonStatusPending},
							{ID: "lesson-2", Title: "Setup", Status: models.LessonStatusPending},
						},
					},
				},
			},
		}

		context := buildCourseContext(course)
		assert.Contains(t, context, "Learn Python")
		assert.Contains(t, context, "Lessons completed: 0/2")
	})
}
