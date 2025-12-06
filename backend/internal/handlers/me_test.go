package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createAuthenticatedRequest(method, url string, body *bytes.Buffer, userID, email string) *http.Request {
	var req *http.Request
	if body != nil {
		req = httptest.NewRequest(method, url, body)
	} else {
		req = httptest.NewRequest(method, url, nil)
	}

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.UserEmailKey, email)
	return req.WithContext(ctx)
}

func TestGetMe(t *testing.T) {
	t.Run("rejects non-GET methods", func(t *testing.T) {
		methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				GetMe(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/me", nil)
		rr := httptest.NewRecorder()

		GetMe(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Unauthorized")
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodGet, "/api/me", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		GetMe(rr, req)

		// Without Firebase initialized, should return 500
		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

func TestUpdateMe(t *testing.T) {
	t.Run("rejects non-PUT/PATCH methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPost, http.MethodDelete}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				UpdateMe(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/me", nil)
		rr := httptest.NewRecorder()

		UpdateMe(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPut, "/api/me", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		UpdateMe(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("accepts PUT method", func(t *testing.T) {
		body := `{"goal": "Learn Python"}`
		req := createAuthenticatedRequest(http.MethodPut, "/api/me", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		UpdateMe(rr, req)

		// Will fail at database level but validates method is accepted
		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("accepts PATCH method", func(t *testing.T) {
		body := `{"goal": "Learn Python"}`
		req := createAuthenticatedRequest(http.MethodPatch, "/api/me", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		UpdateMe(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})
}

func TestUpdateMeRequest(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		goal := "Learn Python"
		name := "Test User"
		req := UpdateMeRequest{
			Goal:        &goal,
			DisplayName: &name,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "goal")
		assert.Contains(t, parsed, "displayName")
	})

	t.Run("omits nil fields", func(t *testing.T) {
		req := UpdateMeRequest{
			Goal: nil,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "goal")
	})
}

func TestGetMeDocument(t *testing.T) {
	t.Run("rejects non-GET methods", func(t *testing.T) {
		methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me/document", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				GetMeDocument(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/me/document", nil)
		rr := httptest.NewRecorder()

		GetMeDocument(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})
}

func TestCreateMeDocument(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me/document", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				CreateMeDocument(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/me/document", nil)
		rr := httptest.NewRecorder()

		CreateMeDocument(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPost, "/api/me/document", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		CreateMeDocument(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

func TestCreateUserDocumentRequest(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := CreateUserDocumentRequest{
			Goal: "Learn Python",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "goal")
	})
}

func TestAddHistory(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me/history", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				AddHistory(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/me/history", nil)
		rr := httptest.NewRecorder()

		AddHistory(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPost, "/api/me/history", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		AddHistory(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("rejects missing type field", func(t *testing.T) {
		body := `{"topic": "Python"}`
		req := createAuthenticatedRequest(http.MethodPost, "/api/me/history", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		AddHistory(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Type and topic are required")
	})

	t.Run("rejects missing topic field", func(t *testing.T) {
		body := `{"type": "lesson"}`
		req := createAuthenticatedRequest(http.MethodPost, "/api/me/history", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		AddHistory(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Type and topic are required")
	})
}

func TestAddHistoryRequest(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := AddHistoryRequest{
			Type:  "lesson",
			Topic: "Python",
			Score: 0.85,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "type")
		assert.Contains(t, parsed, "topic")
		assert.Contains(t, parsed, "score")
	})
}

func TestGetNextStep(t *testing.T) {
	t.Run("rejects non-GET methods", func(t *testing.T) {
		methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me/next-step", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				GetNextStep(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/me/next-step", nil)
		rr := httptest.NewRecorder()

		GetNextStep(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})
}

func TestSetNextStep(t *testing.T) {
	t.Run("rejects non-PUT/POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me/next-step", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				SetNextStep(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/me/next-step", nil)
		rr := httptest.NewRecorder()

		SetNextStep(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPut, "/api/me/next-step", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		SetNextStep(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("rejects missing type field", func(t *testing.T) {
		body := `{"topic": "Python"}`
		req := createAuthenticatedRequest(http.MethodPut, "/api/me/next-step", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		SetNextStep(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Type and topic are required")
	})

	t.Run("rejects missing topic field", func(t *testing.T) {
		body := `{"type": "lesson"}`
		req := createAuthenticatedRequest(http.MethodPut, "/api/me/next-step", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		SetNextStep(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Type and topic are required")
	})

	t.Run("accepts PUT method", func(t *testing.T) {
		body := `{"type": "lesson", "topic": "Python"}`
		req := createAuthenticatedRequest(http.MethodPut, "/api/me/next-step", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		SetNextStep(rr, req)

		// Will fail at database level but validates method is accepted
		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("accepts POST method", func(t *testing.T) {
		body := `{"type": "lesson", "topic": "Python"}`
		req := createAuthenticatedRequest(http.MethodPost, "/api/me/next-step", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		SetNextStep(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusBadRequest, rr.Code)
	})
}

func TestClearNextStep(t *testing.T) {
	t.Run("rejects non-DELETE methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me/next-step", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				ClearNextStep(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/me/next-step", nil)
		rr := httptest.NewRecorder()

		ClearNextStep(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})
}

func TestUpdateMemory(t *testing.T) {
	t.Run("rejects non-POST/PUT methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/me/memory", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				UpdateMemory(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/me/memory", nil)
		rr := httptest.NewRecorder()

		UpdateMemory(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPost, "/api/me/memory", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		UpdateMemory(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("rejects missing topic field", func(t *testing.T) {
		body := `{"confidence": 0.85, "timesTested": 5}`
		req := createAuthenticatedRequest(http.MethodPost, "/api/me/memory", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		UpdateMemory(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Topic is required")
	})
}

func TestUpdateMemoryRequest(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := UpdateMemoryRequest{
			Topic:       "Python",
			Confidence:  0.85,
			TimesTested: 5,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "topic")
		assert.Contains(t, parsed, "confidence")
		assert.Contains(t, parsed, "timesTested")
	})
}

func TestModelsNextStep(t *testing.T) {
	t.Run("NextStep struct has correct JSON tags", func(t *testing.T) {
		step := models.NextStep{
			Type:    "lesson",
			Topic:   "Python",
			Title:   "Introduction",
			Content: "Content here",
		}

		jsonBytes, err := json.Marshal(step)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "type")
		assert.Contains(t, parsed, "topic")
		assert.Contains(t, parsed, "title")
		assert.Contains(t, parsed, "content")
	})
}
