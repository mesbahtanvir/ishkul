package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetUsers(t *testing.T) {
	t.Run("rejects non-GET methods", func(t *testing.T) {
		methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/users", nil)
				rr := httptest.NewRecorder()

				GetUsers(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
		rr := httptest.NewRecorder()

		GetUsers(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Firestore not initialized")
	})
}

func TestCreateUser(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/users", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				CreateUser(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/users", nil)
		rr := httptest.NewRecorder()

		CreateUser(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPost, "/api/users", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CreateUser(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		body := `{"email": "test@example.com", "displayName": "Test User"}`
		req := createAuthenticatedRequest(http.MethodPost, "/api/users", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CreateUser(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Firestore not initialized")
	})
}

func TestUserModel(t *testing.T) {
	t.Run("User struct has correct JSON tags", func(t *testing.T) {
		user := models.User{
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

		assert.Contains(t, parsed, "id")
		assert.Contains(t, parsed, "email")
		assert.Contains(t, parsed, "displayName")
		assert.Contains(t, parsed, "goal")
		assert.Contains(t, parsed, "level")
	})

	t.Run("User struct omits empty optional fields", func(t *testing.T) {
		user := models.User{
			ID:    "user123",
			Email: "test@example.com",
		}

		jsonBytes, err := json.Marshal(user)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		// photoUrl should be omitted when empty
		assert.NotContains(t, parsed, "photoUrl")
	})
}

func TestUserDocumentModel(t *testing.T) {
	t.Run("UserDocument struct has correct JSON tags", func(t *testing.T) {
		doc := models.UserDocument{
			User: models.User{
				ID:    "user123",
				Email: "test@example.com",
			},
			Memory: &models.Memory{
				Topics: map[string]models.TopicMemory{
					"python": {
						Confidence:   0.85,
						LastReviewed: "2024-01-01T00:00:00Z",
						TimesTested:  5,
					},
				},
			},
			History: []models.HistoryEntry{
				{
					Type:      "lesson",
					Topic:     "Python",
					Score:     0.9,
					Timestamp: 1704067200000,
				},
			},
			NextStep: &models.NextStep{
				Type:  "quiz",
				Topic: "Python",
			},
		}

		jsonBytes, err := json.Marshal(doc)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "id")
		assert.Contains(t, parsed, "memory")
		assert.Contains(t, parsed, "history")
		assert.Contains(t, parsed, "nextStep")
	})
}

func TestMemoryModel(t *testing.T) {
	t.Run("Memory struct has correct JSON tags", func(t *testing.T) {
		memory := models.Memory{
			Topics: map[string]models.TopicMemory{
				"python": {
					Confidence:   0.85,
					LastReviewed: "2024-01-01T00:00:00Z",
					TimesTested:  5,
				},
			},
		}

		jsonBytes, err := json.Marshal(memory)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "topics")
	})
}

func TestTopicMemoryModel(t *testing.T) {
	t.Run("TopicMemory struct has correct JSON tags", func(t *testing.T) {
		topicMemory := models.TopicMemory{
			Confidence:   0.85,
			LastReviewed: "2024-01-01T00:00:00Z",
			TimesTested:  5,
		}

		jsonBytes, err := json.Marshal(topicMemory)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "confidence")
		assert.Contains(t, parsed, "lastReviewed")
		assert.Contains(t, parsed, "timesTested")
	})
}

func TestHistoryEntryModel(t *testing.T) {
	t.Run("HistoryEntry struct has correct JSON tags", func(t *testing.T) {
		entry := models.HistoryEntry{
			Type:      "lesson",
			Topic:     "Python",
			Score:     0.9,
			Timestamp: 1704067200000,
		}

		jsonBytes, err := json.Marshal(entry)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "type")
		assert.Contains(t, parsed, "topic")
		assert.Contains(t, parsed, "score")
		assert.Contains(t, parsed, "timestamp")
	})

	t.Run("HistoryEntry omits score when zero", func(t *testing.T) {
		entry := models.HistoryEntry{
			Type:      "lesson",
			Topic:     "Python",
			Timestamp: 1704067200000,
		}

		jsonBytes, err := json.Marshal(entry)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		// score should be omitted when zero
		assert.NotContains(t, parsed, "score")
	})
}
