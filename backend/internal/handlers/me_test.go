package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
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

// Note: AddHistory, AddHistoryRequest, and NextStep tests removed - legacy features replaced by block-based model
