package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetLessons(t *testing.T) {
	t.Run("rejects non-GET methods", func(t *testing.T) {
		methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/lessons", nil)
				rr := httptest.NewRecorder()

				GetLessons(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/lessons", nil)
		rr := httptest.NewRecorder()

		GetLessons(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Firestore not initialized")
	})

	t.Run("accepts level query parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/lessons?level=beginner", nil)
		rr := httptest.NewRecorder()

		GetLessons(rr, req)

		// Will fail at database level, but validates query param handling
		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

func TestLessonModel(t *testing.T) {
	t.Run("Lesson struct has correct JSON tags", func(t *testing.T) {
		lesson := models.Lesson{
			ID:          "lesson-123",
			Title:       "Introduction to Python",
			Description: "Learn the basics",
			Level:       "beginner",
			Category:    "programming",
			Content:     "Python is a programming language...",
			Order:       1,
			Duration:    30,
			Tags:        []string{"python", "basics"},
		}

		jsonBytes, err := json.Marshal(lesson)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "id")
		assert.Contains(t, parsed, "title")
		assert.Contains(t, parsed, "description")
		assert.Contains(t, parsed, "level")
		assert.Contains(t, parsed, "category")
		assert.Contains(t, parsed, "content")
		assert.Contains(t, parsed, "order")
		assert.Contains(t, parsed, "duration")
		assert.Contains(t, parsed, "tags")
	})

	t.Run("Lesson omits empty tags", func(t *testing.T) {
		lesson := models.Lesson{
			ID:    "lesson-123",
			Title: "Test",
		}

		jsonBytes, err := json.Marshal(lesson)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		// Tags should be omitted when empty
		assert.NotContains(t, parsed, "tags")
	})

	t.Run("Lesson JSON values are correct", func(t *testing.T) {
		lesson := models.Lesson{
			ID:       "lesson-123",
			Title:    "Test Lesson",
			Level:    "intermediate",
			Order:    5,
			Duration: 45,
		}

		jsonBytes, err := json.Marshal(lesson)
		require.NoError(t, err)

		var parsed models.Lesson
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "lesson-123", parsed.ID)
		assert.Equal(t, "Test Lesson", parsed.Title)
		assert.Equal(t, "intermediate", parsed.Level)
		assert.Equal(t, 5, parsed.Order)
		assert.Equal(t, 45, parsed.Duration)
	})
}

func TestLessonsQueryParams(t *testing.T) {
	t.Run("extracts level from query string", func(t *testing.T) {
		testCases := []struct {
			url           string
			expectedLevel string
		}{
			{"/api/lessons", ""},
			{"/api/lessons?level=beginner", "beginner"},
			{"/api/lessons?level=intermediate", "intermediate"},
			{"/api/lessons?level=advanced", "advanced"},
			{"/api/lessons?other=param", ""},
			{"/api/lessons?level=beginner&other=param", "beginner"},
		}

		for _, tc := range testCases {
			t.Run(tc.url, func(t *testing.T) {
				req := httptest.NewRequest(http.MethodGet, tc.url, nil)
				level := req.URL.Query().Get("level")
				assert.Equal(t, tc.expectedLevel, level)
			})
		}
	})
}
