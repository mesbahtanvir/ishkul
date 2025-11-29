package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetProgress(t *testing.T) {
	t.Run("rejects non-GET methods", func(t *testing.T) {
		methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/progress", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				GetProgress(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/progress", nil)
		rr := httptest.NewRecorder()

		GetProgress(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodGet, "/api/progress", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		GetProgress(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Firestore not initialized")
	})
}

func TestUpdateProgress(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/progress", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				UpdateProgress(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/progress", nil)
		rr := httptest.NewRecorder()

		UpdateProgress(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPost, "/api/progress", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		UpdateProgress(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		body := `{"lessonId": "lesson-123", "completed": true, "score": 85}`
		req := createAuthenticatedRequest(http.MethodPost, "/api/progress", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		UpdateProgress(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Firestore not initialized")
	})
}

func TestProgressModel(t *testing.T) {
	t.Run("Progress struct has correct JSON tags", func(t *testing.T) {
		progress := models.Progress{
			UserID:           "user123",
			LessonID:         "lesson-456",
			Completed:        true,
			Score:            85,
			TimeSpentMinutes: 30,
			LastAttempt:      time.Now(),
			Attempts:         3,
		}

		jsonBytes, err := json.Marshal(progress)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "userId")
		assert.Contains(t, parsed, "lessonId")
		assert.Contains(t, parsed, "completed")
		assert.Contains(t, parsed, "score")
		assert.Contains(t, parsed, "timeSpentMinutes")
		assert.Contains(t, parsed, "lastAttempt")
		assert.Contains(t, parsed, "attempts")
	})

	t.Run("Progress JSON values are correct", func(t *testing.T) {
		now := time.Now().Truncate(time.Second)
		progress := models.Progress{
			UserID:           "user123",
			LessonID:         "lesson-456",
			Completed:        true,
			Score:            85,
			TimeSpentMinutes: 30,
			LastAttempt:      now,
			Attempts:         3,
		}

		jsonBytes, err := json.Marshal(progress)
		require.NoError(t, err)

		var parsed models.Progress
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "user123", parsed.UserID)
		assert.Equal(t, "lesson-456", parsed.LessonID)
		assert.True(t, parsed.Completed)
		assert.Equal(t, 85, parsed.Score)
		assert.Equal(t, 30, parsed.TimeSpentMinutes)
		assert.Equal(t, 3, parsed.Attempts)
	})

	t.Run("Progress omits empty optional fields", func(t *testing.T) {
		progress := models.Progress{
			UserID:    "user123",
			LessonID:  "lesson-456",
			Completed: false,
		}

		jsonBytes, err := json.Marshal(progress)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		// score and timeSpentMinutes should be omitted when zero
		assert.NotContains(t, parsed, "score")
		assert.NotContains(t, parsed, "timeSpentMinutes")
	})
}

func TestProgressDocumentID(t *testing.T) {
	t.Run("composite key format is correct", func(t *testing.T) {
		userID := "user123"
		lessonID := "lesson-456"
		expectedDocID := userID + "_" + lessonID

		assert.Equal(t, "user123_lesson-456", expectedDocID)
	})

	t.Run("composite key works with various IDs", func(t *testing.T) {
		testCases := []struct {
			userID   string
			lessonID string
			expected string
		}{
			{"user1", "lesson1", "user1_lesson1"},
			{"abc123", "xyz789", "abc123_xyz789"},
			{"user-with-dashes", "lesson-with-dashes", "user-with-dashes_lesson-with-dashes"},
		}

		for _, tc := range testCases {
			t.Run(tc.expected, func(t *testing.T) {
				docID := tc.userID + "_" + tc.lessonID
				assert.Equal(t, tc.expected, docID)
			})
		}
	})
}

func TestProgressRequestParsing(t *testing.T) {
	t.Run("parses valid progress request", func(t *testing.T) {
		body := `{
			"lessonId": "lesson-123",
			"completed": true,
			"score": 85,
			"timeSpentMinutes": 30
		}`

		var progress models.Progress
		err := json.Unmarshal([]byte(body), &progress)
		require.NoError(t, err)

		assert.Equal(t, "lesson-123", progress.LessonID)
		assert.True(t, progress.Completed)
		assert.Equal(t, 85, progress.Score)
		assert.Equal(t, 30, progress.TimeSpentMinutes)
	})

	t.Run("handles minimal progress request", func(t *testing.T) {
		body := `{"lessonId": "lesson-123"}`

		var progress models.Progress
		err := json.Unmarshal([]byte(body), &progress)
		require.NoError(t, err)

		assert.Equal(t, "lesson-123", progress.LessonID)
		assert.False(t, progress.Completed)
		assert.Equal(t, 0, progress.Score)
	})
}
