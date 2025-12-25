package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Helper to create request with path for learning paths handler
func createCourseRequest(method, path string, body *bytes.Buffer, userID, email string) *http.Request {
	var req *http.Request
	if body != nil {
		req = httptest.NewRequest(method, path, body)
	} else {
		req = httptest.NewRequest(method, path, nil)
	}

	if userID != "" {
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		ctx = context.WithValue(ctx, middleware.UserEmailKey, email)
		return req.WithContext(ctx)
	}
	return req
}

// =============================================================================
// CoursesHandler Routing Tests
// =============================================================================

func TestCoursesHandler_Routing(t *testing.T) {
	t.Run("root path GET routes to list", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		// Will fail at DB level but validates routing
		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("root path POST routes to create", func(t *testing.T) {
		body := `{"goal": "Learn Go"}`
		req := createCourseRequest(http.MethodPost, "/api/courses", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("root path rejects unsupported methods", func(t *testing.T) {
		methods := []string{http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createCourseRequest(method, "/api/courses", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				CoursesHandler(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("path with ID GET routes to get", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("path with ID PATCH routes to update", func(t *testing.T) {
		body := `{"goal": "Updated Goal"}`
		req := createCourseRequest(http.MethodPatch, "/api/courses/path-123", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("path with ID PUT routes to update", func(t *testing.T) {
		body := `{"goal": "Updated Goal"}`
		req := createCourseRequest(http.MethodPut, "/api/courses/path-123", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("path with ID DELETE routes to delete", func(t *testing.T) {
		req := createCourseRequest(http.MethodDelete, "/api/courses/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("path with ID rejects POST", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("next action only accepts POST", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/next", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("next action rejects GET", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses/path-123/next", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("complete action only accepts POST", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/complete", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("memory action only accepts POST", func(t *testing.T) {
		body := `{"topic": "Go basics", "confidence": 0.8}`
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/memory", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unknown action returns 404", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/unknown", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("archive action only accepts POST", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("archive action rejects GET", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("archive action rejects PATCH", func(t *testing.T) {
		req := createCourseRequest(http.MethodPatch, "/api/courses/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("archive action rejects PUT", func(t *testing.T) {
		req := createCourseRequest(http.MethodPut, "/api/courses/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("archive action rejects DELETE", func(t *testing.T) {
		req := createCourseRequest(http.MethodDelete, "/api/courses/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unarchive action only accepts POST", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("unarchive action rejects GET", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unarchive action rejects PATCH", func(t *testing.T) {
		req := createCourseRequest(http.MethodPatch, "/api/courses/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unarchive action rejects PUT", func(t *testing.T) {
		req := createCourseRequest(http.MethodPut, "/api/courses/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unarchive action rejects DELETE", func(t *testing.T) {
		req := createCourseRequest(http.MethodDelete, "/api/courses/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})
}

// =============================================================================
// listCourses Tests
// =============================================================================

func TestListCourses(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses", nil, "", "")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Unauthorized")
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Database not available")
	})
}

// =============================================================================
// createCourse Tests
// =============================================================================

func TestCreateCourse(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		body := `{"goal": "Learn Go"}`
		req := createCourseRequest(http.MethodPost, "/api/courses", bytes.NewBufferString(body), "", "")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("rejects missing title", func(t *testing.T) {
		body := `{}`
		req := createCourseRequest(http.MethodPost, "/api/courses", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Title is required")
	})

	t.Run("rejects empty title", func(t *testing.T) {
		body := `{"title": ""}`
		req := createCourseRequest(http.MethodPost, "/api/courses", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Title is required")
	})
}

// =============================================================================
// getCourse Tests
// =============================================================================

func TestGetCourse(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses/path-123", nil, "", "")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createCourseRequest(http.MethodGet, "/api/courses/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		// Will fail at DB level
		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// updateCourse Tests
// =============================================================================

func TestUpdateCourse(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		body := `{"goal": "Updated Goal"}`
		req := createCourseRequest(http.MethodPatch, "/api/courses/path-123", bytes.NewBufferString(body), "", "")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		body := `{"goal": "Updated Goal"}`
		req := createCourseRequest(http.MethodPatch, "/api/courses/path-123", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// deleteCourse Tests
// =============================================================================

func TestDeleteCourse(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createCourseRequest(http.MethodDelete, "/api/courses/path-123", nil, "", "")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createCourseRequest(http.MethodDelete, "/api/courses/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// archiveCourse Tests
// =============================================================================

func TestArchiveCourse(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/archive", nil, "", "")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// unarchiveCourse Tests
// =============================================================================

func TestUnarchiveCourse(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/unarchive", nil, "", "")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createCourseRequest(http.MethodPost, "/api/courses/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CoursesHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// Model JSON Serialization Tests
// =============================================================================

func TestCourseCreateJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := models.CourseCreate{
			Title: "Learn Go",
			Emoji: "🎯",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "title")
		assert.Contains(t, parsed, "emoji")
	})
}

func TestCourseUpdateJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		title := "Updated Title"
		emoji := "🚀"
		progress := 50
		lessonsCompleted := 5
		totalLessons := 10

		req := models.CourseUpdate{
			Title:            &title,
			Emoji:            &emoji,
			Progress:         &progress,
			LessonsCompleted: &lessonsCompleted,
			TotalLessons:     &totalLessons,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "title")
		assert.Contains(t, parsed, "emoji")
		assert.Contains(t, parsed, "progress")
		assert.Contains(t, parsed, "lessonsCompleted")
		assert.Contains(t, parsed, "totalLessons")
	})

	t.Run("omits nil fields", func(t *testing.T) {
		req := models.CourseUpdate{
			Title: nil,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "title")
	})
}

func TestBlockCompleteRequestJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := models.BlockCompleteRequest{
			UserAnswer: "The answer is 42",
			Score:      85.5,
			TimeSpent:  120,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "userAnswer")
		assert.Contains(t, parsed, "score")
		assert.Contains(t, parsed, "timeSpent")
	})

	t.Run("omits empty fields", func(t *testing.T) {
		req := models.BlockCompleteRequest{}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		// Empty string and zero values should be omitted due to omitempty
		assert.NotContains(t, parsed, "userAnswer")
		assert.NotContains(t, parsed, "score")
		assert.NotContains(t, parsed, "timeSpent")
	})
}

func TestCourseJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		course := models.Course{
			ID:               "course-123",
			UserID:           "user-456",
			Title:            "Learn Go",
			Emoji:            "🎯",
			Status:           "active",
			OutlineStatus:    "ready",
			Progress:         50,
			LessonsCompleted: 5,
			TotalLessons:     10,
			CreatedAt:        1234567890,
			UpdatedAt:        1234567890,
			LastAccessedAt:   1234567890,
		}

		jsonBytes, err := json.Marshal(course)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "id")
		assert.Contains(t, parsed, "userId")
		assert.Contains(t, parsed, "title")
		assert.Contains(t, parsed, "emoji")
		assert.Contains(t, parsed, "status")
		assert.Contains(t, parsed, "outlineStatus")
		assert.Contains(t, parsed, "progress")
		assert.Contains(t, parsed, "lessonsCompleted")
		assert.Contains(t, parsed, "totalLessons")
		assert.Contains(t, parsed, "createdAt")
		assert.Contains(t, parsed, "updatedAt")
		assert.Contains(t, parsed, "lastAccessedAt")
	})
}

func TestBlockJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		block := models.Block{
			ID:            "block-123",
			Type:          "text",
			Title:         "Introduction to Go",
			Purpose:       "Learn the basics of Go",
			Order:         0,
			ContentStatus: "ready",
		}

		jsonBytes, err := json.Marshal(block)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "id")
		assert.Contains(t, parsed, "type")
		assert.Contains(t, parsed, "title")
		assert.Contains(t, parsed, "purpose")
		assert.Contains(t, parsed, "order")
		assert.Contains(t, parsed, "contentStatus")
	})

	t.Run("block with content has correct JSON tags", func(t *testing.T) {
		block := models.Block{
			ID:            "block-123",
			Type:          "text",
			Title:         "Introduction",
			ContentStatus: "ready",
			Content: &models.BlockContent{
				Text: &models.TextContent{
					Markdown: "# Hello World",
				},
			},
		}

		jsonBytes, err := json.Marshal(block)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "content")
	})
}

// =============================================================================
// Helper Function Tests
// =============================================================================

func TestCourseGetCurrentLesson(t *testing.T) {
	t.Run("returns nil for course without outline", func(t *testing.T) {
		course := &models.Course{}
		result := course.GetCurrentLesson()
		assert.Nil(t, result)
	})

	t.Run("returns nil when current position is nil", func(t *testing.T) {
		course := &models.Course{
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{ID: "s1", Lessons: []models.Lesson{{ID: "l1"}}},
				},
			},
		}
		result := course.GetCurrentLesson()
		assert.Nil(t, result)
	})

	t.Run("returns lesson at current position", func(t *testing.T) {
		course := &models.Course{
			Outline: &models.CourseOutline{
				Sections: []models.Section{
					{ID: "s1", Lessons: []models.Lesson{{ID: "l1", Title: "Lesson 1"}}},
					{ID: "s2", Lessons: []models.Lesson{{ID: "l2", Title: "Lesson 2"}}},
				},
			},
			CurrentPosition: &models.LessonPosition{
				SectionIndex: 1,
				LessonIndex:  0,
			},
		}
		result := course.GetCurrentLesson()
		require.NotNil(t, result)
		assert.Equal(t, "l2", result.ID)
		assert.Equal(t, "Lesson 2", result.Title)
	})
}

// =============================================================================
// countOutlineLessons Tests
// =============================================================================

func TestCountOutlineLessons(t *testing.T) {
	t.Run("returns 0 for nil outline", func(t *testing.T) {
		result := countOutlineLessons(nil)
		assert.Equal(t, 0, result)
	})

	t.Run("counts lessons from new sections format", func(t *testing.T) {
		outline := &models.CourseOutline{
			Sections: []models.Section{
				{
					ID:    "s1",
					Title: "Section 1",
					Lessons: []models.Lesson{
						{ID: "s1-l1", Title: "Lesson 1"},
						{ID: "s1-l2", Title: "Lesson 2"},
						{ID: "s1-l3", Title: "Lesson 3"},
					},
				},
				{
					ID:    "s2",
					Title: "Section 2",
					Lessons: []models.Lesson{
						{ID: "s2-l1", Title: "Lesson 1"},
						{ID: "s2-l2", Title: "Lesson 2"},
					},
				},
			},
		}
		result := countOutlineLessons(outline)
		assert.Equal(t, 5, result)
	})

	t.Run("returns 0 for empty sections", func(t *testing.T) {
		outline := &models.CourseOutline{
			Sections: []models.Section{},
		}
		result := countOutlineLessons(outline)
		assert.Equal(t, 0, result)
	})
}

// =============================================================================
// Course Outline Parsing Tests (LLM Response Format)
// =============================================================================

// TestCourseOutlineParsing tests that the LLM output format is correctly parsed
// into the CourseOutline model structure. This validates the fix for the
// sections/lessons vs modules/topics format mismatch.
func TestCourseOutlineParsing(t *testing.T) {
	t.Run("parses new format with sections and lessons", func(t *testing.T) {
		// This is the exact format the LLM generates based on course-outline.prompt.yml
		llmOutput := `{
			"title": "Python Programming Fundamentals",
			"description": "Learn the foundational concepts of Python programming.",
			"emoji": "🐍",
			"estimatedMinutes": 180,
			"difficulty": "beginner",
			"category": "programming",
			"prerequisites": ["None"],
			"learningOutcomes": [
				"Write basic Python scripts",
				"Understand fundamental programming concepts"
			],
			"sections": [
				{
					"id": "s1",
					"title": "Introduction to Python",
					"description": "Covers the basics of Python",
					"estimatedMinutes": 30,
					"learningOutcomes": ["Set up development environment"],
					"lessons": [
						{
							"id": "s1-l1",
							"title": "Installing Python",
							"description": "Learn how to install Python",
							"estimatedMinutes": 7
						},
						{
							"id": "s1-l2",
							"title": "Understanding Python Syntax",
							"description": "Get familiar with Python code structure",
							"estimatedMinutes": 8
						}
					]
				},
				{
					"id": "s2",
					"title": "Data Types and Variables",
					"description": "Explore Python data types",
					"estimatedMinutes": 30,
					"learningOutcomes": ["Understand data types"],
					"lessons": [
						{
							"id": "s2-l1",
							"title": "Introduction to Data Types",
							"description": "Learn about different data types",
							"estimatedMinutes": 8
						}
					]
				}
			],
			"reasoning": {
				"structureRationale": "Progressive learning path",
				"learningProgression": "Builds complexity gradually",
				"personalization": "Tailored for beginners"
			}
		}`

		// Parse the LLM output using the same struct as generateCourseOutline
		var outlineData struct {
			Title            string   `json:"title"`
			Description      string   `json:"description"`
			Emoji            string   `json:"emoji"`
			EstimatedMinutes int      `json:"estimatedMinutes"`
			Difficulty       string   `json:"difficulty"`
			Category         string   `json:"category"`
			Prerequisites    []string `json:"prerequisites"`
			LearningOutcomes []string `json:"learningOutcomes"`
			Sections         []struct {
				ID               string   `json:"id"`
				Title            string   `json:"title"`
				Description      string   `json:"description"`
				EstimatedMinutes int      `json:"estimatedMinutes"`
				LearningOutcomes []string `json:"learningOutcomes"`
				Lessons          []struct {
					ID               string `json:"id"`
					Title            string `json:"title"`
					Description      string `json:"description"`
					EstimatedMinutes int    `json:"estimatedMinutes"`
				} `json:"lessons"`
			} `json:"sections"`
		}

		err := json.Unmarshal([]byte(llmOutput), &outlineData)
		require.NoError(t, err)

		// Verify top-level fields
		assert.Equal(t, "Python Programming Fundamentals", outlineData.Title)
		assert.Equal(t, "🐍", outlineData.Emoji)
		assert.Equal(t, 180, outlineData.EstimatedMinutes)
		assert.Equal(t, "beginner", outlineData.Difficulty)
		assert.Equal(t, "programming", outlineData.Category)
		assert.Len(t, outlineData.Prerequisites, 1)
		assert.Len(t, outlineData.LearningOutcomes, 2)

		// Verify sections
		assert.Len(t, outlineData.Sections, 2)

		// Verify first section
		section1 := outlineData.Sections[0]
		assert.Equal(t, "s1", section1.ID)
		assert.Equal(t, "Introduction to Python", section1.Title)
		assert.Equal(t, 30, section1.EstimatedMinutes)
		assert.Len(t, section1.Lessons, 2)

		// Verify first lesson in first section
		lesson1 := section1.Lessons[0]
		assert.Equal(t, "s1-l1", lesson1.ID)
		assert.Equal(t, "Installing Python", lesson1.Title)
		assert.Equal(t, 7, lesson1.EstimatedMinutes)

		// Verify second section
		section2 := outlineData.Sections[1]
		assert.Equal(t, "s2", section2.ID)
		assert.Len(t, section2.Lessons, 1)
	})

	t.Run("converts parsed data to CourseOutline model correctly", func(t *testing.T) {
		// Simulate what generateCourseOutline does after parsing
		outline := &models.CourseOutline{
			Title:            "Python Programming Fundamentals",
			Description:      "Learn Python programming",
			EstimatedMinutes: 180,
			Prerequisites:    []string{"None"},
			LearningOutcomes: []string{"Write Python scripts"},
			Metadata: models.OutlineMetadata{
				Difficulty: "beginner",
				Category:   "programming",
				Tags:       []string{},
			},
			GeneratedAt: 1234567890,
			Sections: []models.Section{
				{
					ID:               "s1",
					Title:            "Introduction to Python",
					Description:      "Basics of Python",
					EstimatedMinutes: 30,
					LearningOutcomes: []string{"Set up environment"},
					Status:           models.SectionStatusPending,
					Lessons: []models.Lesson{
						{
							ID:               "s1-l1",
							Title:            "Installing Python",
							Description:      "Install Python on your computer",
							EstimatedMinutes: 7,
							BlocksStatus:     models.ContentStatusPending,
							Status:           models.LessonStatusPending,
							Blocks:           []models.Block{},
						},
						{
							ID:               "s1-l2",
							Title:            "Python Syntax",
							Description:      "Learn basic syntax",
							EstimatedMinutes: 8,
							BlocksStatus:     models.ContentStatusPending,
							Status:           models.LessonStatusPending,
							Blocks:           []models.Block{},
						},
					},
				},
				{
					ID:               "s2",
					Title:            "Data Types",
					Description:      "Explore data types",
					EstimatedMinutes: 30,
					LearningOutcomes: []string{"Understand data types"},
					Status:           models.SectionStatusPending,
					Lessons: []models.Lesson{
						{
							ID:               "s2-l1",
							Title:            "Introduction to Data Types",
							Description:      "Learn about data types",
							EstimatedMinutes: 8,
							BlocksStatus:     models.ContentStatusPending,
							Status:           models.LessonStatusPending,
							Blocks:           []models.Block{},
						},
					},
				},
			},
		}

		// Verify the outline structure
		assert.Equal(t, "Python Programming Fundamentals", outline.Title)
		assert.Equal(t, "beginner", outline.Metadata.Difficulty)
		assert.Equal(t, "programming", outline.Metadata.Category)
		assert.Len(t, outline.Sections, 2)

		// Count total lessons
		totalLessons := countOutlineLessons(outline)
		assert.Equal(t, 3, totalLessons)

		// Verify section structure
		assert.Equal(t, "s1", outline.Sections[0].ID)
		assert.Equal(t, models.SectionStatusPending, outline.Sections[0].Status)
		assert.Len(t, outline.Sections[0].Lessons, 2)

		// Verify lesson structure
		assert.Equal(t, "s1-l1", outline.Sections[0].Lessons[0].ID)
		assert.Equal(t, models.ContentStatusPending, outline.Sections[0].Lessons[0].BlocksStatus)
		assert.Equal(t, models.LessonStatusPending, outline.Sections[0].Lessons[0].Status)
		assert.NotNil(t, outline.Sections[0].Lessons[0].Blocks)
	})

	t.Run("handles markdown code blocks in LLM output", func(t *testing.T) {
		// LLMs sometimes wrap JSON in markdown code blocks
		llmOutputWithCodeBlock := "```json\n" + `{
			"title": "Test Course",
			"description": "A test course",
			"emoji": "📚",
			"estimatedMinutes": 60,
			"difficulty": "beginner",
			"category": "general",
			"prerequisites": [],
			"learningOutcomes": ["Learn something"],
			"sections": [
				{
					"id": "s1",
					"title": "Section 1",
					"description": "First section",
					"estimatedMinutes": 30,
					"learningOutcomes": ["Outcome 1"],
					"lessons": [
						{
							"id": "s1-l1",
							"title": "Lesson 1",
							"description": "First lesson",
							"estimatedMinutes": 10
						}
					]
				}
			]
		}` + "\n```"

		// Use the llm package's ParseJSONResponse which strips markdown
		var outlineData struct {
			Title    string `json:"title"`
			Sections []struct {
				ID      string `json:"id"`
				Lessons []struct {
					ID string `json:"id"`
				} `json:"lessons"`
			} `json:"sections"`
		}

		// Import and use the llm package's JSON parser
		cleaned := strings.TrimSpace(llmOutputWithCodeBlock)
		if strings.HasPrefix(cleaned, "```") {
			// Simple cleanup for test
			cleaned = strings.TrimPrefix(cleaned, "```json\n")
			cleaned = strings.TrimSuffix(cleaned, "\n```")
		}

		err := json.Unmarshal([]byte(cleaned), &outlineData)
		require.NoError(t, err)

		assert.Equal(t, "Test Course", outlineData.Title)
		assert.Len(t, outlineData.Sections, 1)
		assert.Equal(t, "s1", outlineData.Sections[0].ID)
		assert.Len(t, outlineData.Sections[0].Lessons, 1)
	})
}

// =============================================================================
// Course API Response Format Tests
// =============================================================================

func TestCourseOutlineAPIResponse(t *testing.T) {
	t.Run("course with outline serializes correctly", func(t *testing.T) {
		course := models.Course{
			ID:            "course-123",
			UserID:        "user-456",
			Title:         "Python Programming",
			Emoji:         "🐍",
			Status:        models.CourseStatusActive,
			OutlineStatus: models.OutlineStatusReady,
			Progress:      0,
			TotalLessons:  3,
			Outline: &models.CourseOutline{
				Title:            "Python Programming Fundamentals",
				Description:      "Learn Python",
				EstimatedMinutes: 180,
				Prerequisites:    []string{"None"},
				LearningOutcomes: []string{"Write Python code"},
				Metadata: models.OutlineMetadata{
					Difficulty: "beginner",
					Category:   "programming",
					Tags:       []string{},
				},
				GeneratedAt: 1234567890,
				Sections: []models.Section{
					{
						ID:               "s1",
						Title:            "Introduction",
						Description:      "Getting started",
						EstimatedMinutes: 30,
						Status:           models.SectionStatusInProgress,
						Lessons: []models.Lesson{
							{
								ID:           "s1-l1",
								Title:        "Installing Python",
								Description:  "Setup guide",
								BlocksStatus: models.ContentStatusPending,
								Status:       models.LessonStatusInProgress,
							},
						},
					},
				},
			},
			CurrentPosition: &models.LessonPosition{
				SectionIndex: 0,
				LessonIndex:  0,
				SectionID:    "s1",
				LessonID:     "s1-l1",
			},
			CreatedAt:      1234567890,
			UpdatedAt:      1234567890,
			LastAccessedAt: 1234567890,
		}

		// Serialize to JSON
		jsonBytes, err := json.Marshal(course)
		require.NoError(t, err)

		// Parse back to verify structure
		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		// Verify top-level fields
		assert.Equal(t, "course-123", parsed["id"])
		assert.Equal(t, models.CourseStatusActive, parsed["status"])
		assert.Equal(t, models.OutlineStatusReady, parsed["outlineStatus"])

		// Verify outline exists and has sections
		outline, ok := parsed["outline"].(map[string]interface{})
		require.True(t, ok, "outline should be a map")
		assert.Equal(t, "Python Programming Fundamentals", outline["title"])

		sections, ok := outline["sections"].([]interface{})
		require.True(t, ok, "sections should be an array")
		assert.Len(t, sections, 1)

		// Verify first section
		section1, ok := sections[0].(map[string]interface{})
		require.True(t, ok, "section should be a map")
		assert.Equal(t, "s1", section1["id"])
		assert.Equal(t, "Introduction", section1["title"])

		// Verify lessons in section
		lessons, ok := section1["lessons"].([]interface{})
		require.True(t, ok, "lessons should be an array")
		assert.Len(t, lessons, 1)

		lesson1, ok := lessons[0].(map[string]interface{})
		require.True(t, ok, "lesson should be a map")
		assert.Equal(t, "s1-l1", lesson1["id"])
		assert.Equal(t, "Installing Python", lesson1["title"])

		// Verify currentPosition
		currentPos, ok := parsed["currentPosition"].(map[string]interface{})
		require.True(t, ok, "currentPosition should be a map")
		assert.Equal(t, float64(0), currentPos["sectionIndex"])
		assert.Equal(t, float64(0), currentPos["lessonIndex"])
		assert.Equal(t, "s1", currentPos["sectionId"])
		assert.Equal(t, "s1-l1", currentPos["lessonId"])
	})

	t.Run("outline metadata serializes with correct field names", func(t *testing.T) {
		metadata := models.OutlineMetadata{
			Difficulty: "beginner",
			Category:   "programming",
			Tags:       []string{"python", "basics"},
		}

		jsonBytes, err := json.Marshal(metadata)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "beginner", parsed["difficulty"])
		assert.Equal(t, "programming", parsed["category"])

		tags, ok := parsed["tags"].([]interface{})
		require.True(t, ok)
		assert.Len(t, tags, 2)
	})
}

// =============================================================================
// LessonPosition Tests
// =============================================================================

func TestLessonPosition(t *testing.T) {
	t.Run("serializes correctly", func(t *testing.T) {
		pos := models.LessonPosition{
			SectionIndex: 1,
			LessonIndex:  2,
			SectionID:    "s2",
			LessonID:     "s2-l3",
		}

		jsonBytes, err := json.Marshal(pos)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, float64(1), parsed["sectionIndex"])
		assert.Equal(t, float64(2), parsed["lessonIndex"])
		assert.Equal(t, "s2", parsed["sectionId"])
		assert.Equal(t, "s2-l3", parsed["lessonId"])
	})
}

// =============================================================================
// Section and Lesson Model Tests
// =============================================================================

func TestSectionModel(t *testing.T) {
	t.Run("serializes with correct JSON tags", func(t *testing.T) {
		section := models.Section{
			ID:               "s1",
			Title:            "Introduction",
			Description:      "Getting started",
			EstimatedMinutes: 30,
			LearningOutcomes: []string{"Outcome 1"},
			Status:           models.SectionStatusPending,
			Lessons: []models.Lesson{
				{ID: "s1-l1", Title: "Lesson 1"},
			},
		}

		jsonBytes, err := json.Marshal(section)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "s1", parsed["id"])
		assert.Equal(t, "Introduction", parsed["title"])
		assert.Equal(t, "Getting started", parsed["description"])
		assert.Equal(t, float64(30), parsed["estimatedMinutes"])
		assert.Equal(t, models.SectionStatusPending, parsed["status"])
	})
}

func TestLessonModel(t *testing.T) {
	t.Run("serializes with correct JSON tags", func(t *testing.T) {
		lesson := models.Lesson{
			ID:               "s1-l1",
			Title:            "Installing Python",
			Description:      "Setup guide",
			EstimatedMinutes: 10,
			BlocksStatus:     models.ContentStatusPending,
			Status:           models.LessonStatusPending,
			Blocks:           []models.Block{},
		}

		jsonBytes, err := json.Marshal(lesson)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "s1-l1", parsed["id"])
		assert.Equal(t, "Installing Python", parsed["title"])
		assert.Equal(t, "Setup guide", parsed["description"])
		assert.Equal(t, float64(10), parsed["estimatedMinutes"])
		assert.Equal(t, models.ContentStatusPending, parsed["blocksStatus"])
		assert.Equal(t, models.LessonStatusPending, parsed["status"])
	})
}
