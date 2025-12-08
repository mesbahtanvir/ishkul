package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// Course Tests
// =============================================================================

func TestCourseStruct(t *testing.T) {
	t.Run("creates Course with all fields", func(t *testing.T) {
		course := Course{
			ID:               "course-123",
			UserID:           "user-456",
			Title:            "Learn Go",
			Emoji:            "🎯",
			Status:           CourseStatusActive,
			Progress:         50,
			LessonsCompleted: 5,
			TotalLessons:     10,
			CreatedAt:        1704067200000,
			UpdatedAt:        1704067200000,
			LastAccessedAt:   1704067200000,
		}

		assert.Equal(t, "course-123", course.ID)
		assert.Equal(t, "user-456", course.UserID)
		assert.Equal(t, "Learn Go", course.Title)
		assert.Equal(t, "🎯", course.Emoji)
		assert.Equal(t, 50, course.Progress)
		assert.Equal(t, 5, course.LessonsCompleted)
		assert.Equal(t, 10, course.TotalLessons)
	})

	t.Run("JSON marshaling includes all fields", func(t *testing.T) {
		course := Course{
			ID:               "course-123",
			UserID:           "user-456",
			Title:            "Learn Go",
			Emoji:            "🎯",
			Progress:         50,
			LessonsCompleted: 5,
			TotalLessons:     10,
			CreatedAt:        1704067200000,
			UpdatedAt:        1704067200000,
			LastAccessedAt:   1704067200000,
		}

		jsonBytes, err := json.Marshal(course)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "course-123", parsed["id"])
		assert.Equal(t, "user-456", parsed["userId"])
		assert.Equal(t, "Learn Go", parsed["title"])
		assert.Equal(t, "🎯", parsed["emoji"])
		assert.Contains(t, parsed, "progress")
		assert.Contains(t, parsed, "lessonsCompleted")
		assert.Contains(t, parsed, "totalLessons")
	})

	t.Run("JSON unmarshaling works correctly", func(t *testing.T) {
		jsonStr := `{
			"id": "course-789",
			"userId": "user-123",
			"title": "Master Python",
			"emoji": "🐍",
			"progress": 75,
			"lessonsCompleted": 15,
			"totalLessons": 20,
			"createdAt": 1704067200000,
			"updatedAt": 1704067200000,
			"lastAccessedAt": 1704067200000
		}`

		var course Course
		err := json.Unmarshal([]byte(jsonStr), &course)
		require.NoError(t, err)

		assert.Equal(t, "course-789", course.ID)
		assert.Equal(t, "user-123", course.UserID)
		assert.Equal(t, "Master Python", course.Title)
		assert.Equal(t, "🐍", course.Emoji)
		assert.Equal(t, 75, course.Progress)
		assert.Equal(t, 15, course.LessonsCompleted)
		assert.Equal(t, 20, course.TotalLessons)
	})
}

// =============================================================================
// Section Tests
// =============================================================================

func TestSectionStruct(t *testing.T) {
	t.Run("creates Section with lessons", func(t *testing.T) {
		section := Section{
			ID:               "s1",
			Title:            "Getting Started",
			Description:      "Introduction to Go programming",
			EstimatedMinutes: 30,
			LearningOutcomes: []string{"Understand Go basics"},
			Lessons: []Lesson{
				{ID: "l1", Title: "Introduction", Status: LessonStatusPending},
				{ID: "l2", Title: "Variables", Status: LessonStatusPending},
			},
			Status: SectionStatusPending,
		}

		assert.Equal(t, "s1", section.ID)
		assert.Len(t, section.Lessons, 2)
		assert.Equal(t, SectionStatusPending, section.Status)
	})
}

// =============================================================================
// Lesson Tests
// =============================================================================

func TestLessonStruct(t *testing.T) {
	t.Run("creates Lesson with default values", func(t *testing.T) {
		lesson := NewLesson("l1", "Introduction to Go", "Learn the basics", 10)

		assert.Equal(t, "l1", lesson.ID)
		assert.Equal(t, "Introduction to Go", lesson.Title)
		assert.Equal(t, "Learn the basics", lesson.Description)
		assert.Equal(t, 10, lesson.EstimatedMinutes)
		assert.Equal(t, ContentStatusPending, lesson.BlocksStatus)
		assert.Equal(t, LessonStatusPending, lesson.Status)
		assert.Empty(t, lesson.Blocks)
	})

	t.Run("creates Lesson with blocks", func(t *testing.T) {
		lesson := Lesson{
			ID:           "l1",
			Title:        "Data Types",
			Description:  "Learn about data types",
			BlocksStatus: ContentStatusReady,
			Blocks: []Block{
				{ID: "b1", Type: BlockTypeText, Title: "What are Data Types?", ContentStatus: ContentStatusReady},
				{ID: "b2", Type: BlockTypeCode, Title: "Examples", ContentStatus: ContentStatusReady},
				{ID: "b3", Type: BlockTypeQuestion, Title: "Quiz", ContentStatus: ContentStatusPending},
			},
			Status: LessonStatusInProgress,
		}

		assert.Equal(t, ContentStatusReady, lesson.BlocksStatus)
		assert.Len(t, lesson.Blocks, 3)
		assert.Equal(t, LessonStatusInProgress, lesson.Status)
	})
}

// =============================================================================
// CourseCreate Tests
// =============================================================================

func TestCourseCreateStruct(t *testing.T) {
	t.Run("creates request with all fields", func(t *testing.T) {
		req := CourseCreate{
			Title: "Learn Go",
			Emoji: "🎯",
		}

		assert.Equal(t, "Learn Go", req.Title)
		assert.Equal(t, "🎯", req.Emoji)
	})

	t.Run("JSON marshaling works correctly", func(t *testing.T) {
		req := CourseCreate{
			Title: "Learn Python",
			Emoji: "🐍",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "Learn Python", parsed["title"])
		assert.Equal(t, "🐍", parsed["emoji"])
	})
}

// =============================================================================
// CourseUpdate Tests
// =============================================================================

func TestCourseUpdateStruct(t *testing.T) {
	t.Run("creates update with all optional fields", func(t *testing.T) {
		title := "Updated Title"
		emoji := "🚀"
		progress := 50
		lessonsCompleted := 5
		totalLessons := 10

		req := CourseUpdate{
			Title:            &title,
			Emoji:            &emoji,
			Progress:         &progress,
			LessonsCompleted: &lessonsCompleted,
			TotalLessons:     &totalLessons,
		}

		assert.Equal(t, "Updated Title", *req.Title)
		assert.Equal(t, "🚀", *req.Emoji)
		assert.Equal(t, 50, *req.Progress)
		assert.Equal(t, 5, *req.LessonsCompleted)
		assert.Equal(t, 10, *req.TotalLessons)
	})

	t.Run("allows nil fields for partial updates", func(t *testing.T) {
		title := "Only Title Update"

		req := CourseUpdate{
			Title: &title,
		}

		assert.NotNil(t, req.Title)
		assert.Nil(t, req.Emoji)
		assert.Nil(t, req.Progress)
		assert.Nil(t, req.LessonsCompleted)
		assert.Nil(t, req.TotalLessons)
	})
}

// =============================================================================
// Course Status Constants Tests
// =============================================================================

func TestCourseStatusConstants(t *testing.T) {
	t.Run("status constants have correct values", func(t *testing.T) {
		assert.Equal(t, "active", CourseStatusActive)
		assert.Equal(t, "completed", CourseStatusCompleted)
		assert.Equal(t, "archived", CourseStatusArchived)
		assert.Equal(t, "deleted", CourseStatusDeleted)
	})

	t.Run("lesson status constants have correct values", func(t *testing.T) {
		assert.Equal(t, "pending", LessonStatusPending)
		assert.Equal(t, "in_progress", LessonStatusInProgress)
		assert.Equal(t, "completed", LessonStatusCompleted)
		assert.Equal(t, "skipped", LessonStatusSkipped)
	})

	t.Run("section status constants have correct values", func(t *testing.T) {
		assert.Equal(t, "pending", SectionStatusPending)
		assert.Equal(t, "in_progress", SectionStatusInProgress)
		assert.Equal(t, "completed", SectionStatusCompleted)
	})
}

// =============================================================================
// Course Helper Methods Tests
// =============================================================================

func TestCourseHelperMethods(t *testing.T) {
	t.Run("NewCourse creates course with defaults", func(t *testing.T) {
		course := NewCourse("user-123", "Learn Go", "🎯")

		assert.Equal(t, "user-123", course.UserID)
		assert.Equal(t, "Learn Go", course.Title)
		assert.Equal(t, "🎯", course.Emoji)
		assert.Equal(t, CourseStatusActive, course.Status)
		assert.Equal(t, OutlineStatusGenerating, course.OutlineStatus)
		assert.Equal(t, 0, course.Progress)
		assert.NotNil(t, course.CourseProgress)
	})

	t.Run("CountTotalLessons returns correct count", func(t *testing.T) {
		course := Course{
			Outline: &CourseOutline{
				Sections: []Section{
					{Lessons: []Lesson{{ID: "l1"}, {ID: "l2"}}},
					{Lessons: []Lesson{{ID: "l3"}, {ID: "l4"}, {ID: "l5"}}},
				},
			},
		}

		assert.Equal(t, 5, course.CountTotalLessons())
	})

	t.Run("CountCompletedLessons returns correct count", func(t *testing.T) {
		course := Course{
			Outline: &CourseOutline{
				Sections: []Section{
					{Lessons: []Lesson{
						{ID: "l1", Status: LessonStatusCompleted},
						{ID: "l2", Status: LessonStatusPending},
					}},
					{Lessons: []Lesson{
						{ID: "l3", Status: LessonStatusCompleted},
						{ID: "l4", Status: LessonStatusInProgress},
						{ID: "l5", Status: LessonStatusCompleted},
					}},
				},
			},
		}

		assert.Equal(t, 3, course.CountCompletedLessons())
	})

	t.Run("CalculateProgress returns correct percentage", func(t *testing.T) {
		course := Course{
			Outline: &CourseOutline{
				Sections: []Section{
					{Lessons: []Lesson{
						{ID: "l1", Status: LessonStatusCompleted},
						{ID: "l2", Status: LessonStatusCompleted},
						{ID: "l3", Status: LessonStatusPending},
						{ID: "l4", Status: LessonStatusPending},
					}},
				},
			},
		}

		assert.Equal(t, 50, course.CalculateProgress())
	})

	t.Run("GetLesson returns correct lesson", func(t *testing.T) {
		course := Course{
			Outline: &CourseOutline{
				Sections: []Section{
					{ID: "s1", Lessons: []Lesson{{ID: "l1", Title: "First"}, {ID: "l2", Title: "Second"}}},
					{ID: "s2", Lessons: []Lesson{{ID: "l3", Title: "Third"}}},
				},
			},
		}

		lesson := course.GetLesson("l2")
		assert.NotNil(t, lesson)
		assert.Equal(t, "Second", lesson.Title)

		notFound := course.GetLesson("nonexistent")
		assert.Nil(t, notFound)
	})

	t.Run("FindNextIncompleteLesson returns first incomplete", func(t *testing.T) {
		course := Course{
			Outline: &CourseOutline{
				Sections: []Section{
					{ID: "s1", Lessons: []Lesson{
						{ID: "l1", Status: LessonStatusCompleted},
						{ID: "l2", Status: LessonStatusPending, Title: "Next"},
					}},
				},
			},
		}

		lesson, section, sIdx, lIdx := course.FindNextIncompleteLesson()
		assert.NotNil(t, lesson)
		assert.NotNil(t, section)
		assert.Equal(t, "Next", lesson.Title)
		assert.Equal(t, 0, sIdx)
		assert.Equal(t, 1, lIdx)
	})
}

// =============================================================================
// Course Lifecycle Tests
// =============================================================================

func TestCourseLifecycle(t *testing.T) {
	t.Run("new course starts as active", func(t *testing.T) {
		course := NewCourse("user-123", "Learn Go", "🎯")

		assert.Equal(t, CourseStatusActive, course.Status)
		assert.Equal(t, int64(0), course.CompletedAt)
		assert.Equal(t, int64(0), course.ArchivedAt)
		assert.Equal(t, int64(0), course.DeletedAt)
	})

	t.Run("completed course has timestamp", func(t *testing.T) {
		course := Course{
			ID:          "course-1",
			UserID:      "user-1",
			Title:       "Learn Go",
			Status:      CourseStatusCompleted,
			Progress:    100,
			CompletedAt: 1704067200000,
		}

		assert.Equal(t, CourseStatusCompleted, course.Status)
		assert.Equal(t, int64(1704067200000), course.CompletedAt)
	})

	t.Run("archived course has timestamp", func(t *testing.T) {
		course := Course{
			ID:         "course-1",
			UserID:     "user-1",
			Title:      "Learn Go",
			Status:     CourseStatusArchived,
			ArchivedAt: 1704067200000,
		}

		assert.Equal(t, CourseStatusArchived, course.Status)
		assert.Equal(t, int64(1704067200000), course.ArchivedAt)
	})
}

// =============================================================================
// Full Course with Outline Tests
// =============================================================================

func TestCourseWithOutline(t *testing.T) {
	t.Run("creates complete course structure", func(t *testing.T) {
		course := Course{
			ID:            "course-full",
			UserID:        "user-123",
			Title:         "Learn Go Programming",
			Emoji:         "🎯",
			Status:        CourseStatusActive,
			OutlineStatus: OutlineStatusReady,
			Progress:      25,
			Outline: &CourseOutline{
				Title:       "Go Programming Fundamentals",
				Description: "Master Go from basics to advanced",
				Sections: []Section{
					{
						ID:          "s1",
						Title:       "Getting Started",
						Description: "Introduction to Go",
						Lessons: []Lesson{
							{
								ID:           "l1",
								Title:        "What is Go?",
								BlocksStatus: ContentStatusReady,
								Blocks: []Block{
									{ID: "b1", Type: BlockTypeText, ContentStatus: ContentStatusReady},
									{ID: "b2", Type: BlockTypeQuestion, ContentStatus: ContentStatusReady},
								},
								Status: LessonStatusCompleted,
							},
							{
								ID:           "l2",
								Title:        "Installing Go",
								BlocksStatus: ContentStatusPending,
								Status:       LessonStatusPending,
							},
						},
						Status: SectionStatusInProgress,
					},
				},
			},
			CurrentPosition: &LessonPosition{
				SectionIndex: 0,
				LessonIndex:  1,
				SectionID:    "s1",
				LessonID:     "l2",
			},
		}

		assert.Equal(t, OutlineStatusReady, course.OutlineStatus)
		assert.NotNil(t, course.Outline)
		assert.Len(t, course.Outline.Sections, 1)
		assert.Len(t, course.Outline.Sections[0].Lessons, 2)
		assert.Len(t, course.Outline.Sections[0].Lessons[0].Blocks, 2)
		assert.NotNil(t, course.CurrentPosition)
		assert.Equal(t, "l2", course.CurrentPosition.LessonID)
	})

	t.Run("JSON round-trip preserves structure", func(t *testing.T) {
		original := Course{
			ID:            "course-roundtrip",
			UserID:        "user-456",
			Title:         "Test Course",
			Emoji:         "🚀",
			Status:        CourseStatusActive,
			OutlineStatus: OutlineStatusReady,
			Outline: &CourseOutline{
				Title: "Test Outline",
				Sections: []Section{
					{
						ID:    "s1",
						Title: "Section 1",
						Lessons: []Lesson{
							{
								ID:           "l1",
								Title:        "Lesson 1",
								BlocksStatus: ContentStatusReady,
								Blocks: []Block{
									{ID: "b1", Type: BlockTypeText, Title: "Text Block"},
								},
							},
						},
					},
				},
			},
		}

		jsonBytes, err := json.Marshal(original)
		require.NoError(t, err)

		var restored Course
		err = json.Unmarshal(jsonBytes, &restored)
		require.NoError(t, err)

		assert.Equal(t, original.ID, restored.ID)
		assert.Equal(t, original.Title, restored.Title)
		assert.NotNil(t, restored.Outline)
		assert.Len(t, restored.Outline.Sections, 1)
		assert.Len(t, restored.Outline.Sections[0].Lessons, 1)
		assert.Len(t, restored.Outline.Sections[0].Lessons[0].Blocks, 1)
	})
}
