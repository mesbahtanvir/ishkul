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

// Helper to create request with path for learning paths handler
func createLearningPathRequest(method, path string, body *bytes.Buffer, userID, email string) *http.Request {
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
// LearningPathsHandler Routing Tests
// =============================================================================

func TestLearningPathsHandler_Routing(t *testing.T) {
	t.Run("root path GET routes to list", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		// Will fail at DB level but validates routing
		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("root path POST routes to create", func(t *testing.T) {
		body := `{"goal": "Learn Go", "level": "beginner"}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("root path rejects unsupported methods", func(t *testing.T) {
		methods := []string{http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createLearningPathRequest(method, "/api/learning-paths", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				LearningPathsHandler(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("path with ID GET routes to get", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("path with ID PATCH routes to update", func(t *testing.T) {
		body := `{"goal": "Updated Goal"}`
		req := createLearningPathRequest(http.MethodPatch, "/api/learning-paths/path-123", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("path with ID PUT routes to update", func(t *testing.T) {
		body := `{"goal": "Updated Goal"}`
		req := createLearningPathRequest(http.MethodPut, "/api/learning-paths/path-123", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("path with ID DELETE routes to delete", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodDelete, "/api/learning-paths/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("path with ID rejects POST", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("next action only accepts POST", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/next", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("next action rejects GET", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths/path-123/next", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("complete action only accepts POST", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/complete", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("memory action only accepts POST", func(t *testing.T) {
		body := `{"topic": "Go basics", "confidence": 0.8}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/memory", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("memory action rejects GET", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths/path-123/memory", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("step complete action only accepts POST", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/steps/step-456/complete", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("step complete rejects GET", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths/path-123/steps/step-456/complete", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("step view action only accepts POST", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/steps/step-456/view", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unknown action returns 404", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/unknown", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("unknown step action returns 404", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/steps/step-456/unknown", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("session action routes same as next (backward compatibility)", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/session", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("archive action only accepts POST", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("archive action rejects GET", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("archive action rejects PATCH", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPatch, "/api/learning-paths/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("archive action rejects PUT", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPut, "/api/learning-paths/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("archive action rejects DELETE", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodDelete, "/api/learning-paths/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unarchive action only accepts POST", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.NotEqual(t, http.StatusMethodNotAllowed, rr.Code)
		assert.NotEqual(t, http.StatusNotFound, rr.Code)
	})

	t.Run("unarchive action rejects GET", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unarchive action rejects PATCH", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPatch, "/api/learning-paths/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unarchive action rejects PUT", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPut, "/api/learning-paths/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("unarchive action rejects DELETE", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodDelete, "/api/learning-paths/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})
}

// =============================================================================
// listLearningPaths Tests
// =============================================================================

func TestListLearningPaths(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Unauthorized")
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Database not available")
	})
}

// =============================================================================
// createLearningPath Tests
// =============================================================================

func TestCreateLearningPath(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		body := `{"goal": "Learn Go", "level": "beginner"}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths", bytes.NewBufferString(body), "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("rejects missing goal", func(t *testing.T) {
		body := `{"level": "beginner"}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Goal and level are required")
	})

	t.Run("rejects missing level", func(t *testing.T) {
		body := `{"goal": "Learn Go"}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Goal and level are required")
	})

	t.Run("rejects empty goal", func(t *testing.T) {
		body := `{"goal": "", "level": "beginner"}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Goal and level are required")
	})

	t.Run("rejects empty level", func(t *testing.T) {
		body := `{"goal": "Learn Go", "level": ""}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Goal and level are required")
	})
}

// =============================================================================
// getLearningPath Tests
// =============================================================================

func TestGetLearningPath(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths/path-123", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodGet, "/api/learning-paths/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		// Will fail at DB level
		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// updateLearningPath Tests
// =============================================================================

func TestUpdateLearningPath(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		body := `{"goal": "Updated Goal"}`
		req := createLearningPathRequest(http.MethodPatch, "/api/learning-paths/path-123", bytes.NewBufferString(body), "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		body := `{"goal": "Updated Goal"}`
		req := createLearningPathRequest(http.MethodPatch, "/api/learning-paths/path-123", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// deleteLearningPath Tests
// =============================================================================

func TestDeleteLearningPath(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodDelete, "/api/learning-paths/path-123", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodDelete, "/api/learning-paths/path-123", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// archiveLearningPath Tests
// =============================================================================

func TestArchiveLearningPath(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/archive", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/archive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// unarchiveLearningPath Tests
// =============================================================================

func TestUnarchiveLearningPath(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/unarchive", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/unarchive", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// getPathNextStep Tests
// =============================================================================

func TestGetPathNextStep(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/next", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/next", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// completeCurrentStep Tests
// =============================================================================

func TestCompleteCurrentStep(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/complete", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/complete", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// completeStep Tests
// =============================================================================

func TestCompleteStep(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/steps/step-456/complete", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/steps/step-456/complete", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// viewStep Tests
// =============================================================================

func TestViewStep(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/steps/step-456/view", nil, "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("returns error when database not available", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/steps/step-456/view", nil, "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

// =============================================================================
// updatePathMemory Tests
// =============================================================================

func TestUpdatePathMemory(t *testing.T) {
	t.Run("rejects unauthenticated request", func(t *testing.T) {
		body := `{"topic": "Go basics", "confidence": 0.8}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/memory", bytes.NewBufferString(body), "", "")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/memory", bytes.NewBufferString("invalid"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("rejects missing topic", func(t *testing.T) {
		body := `{"confidence": 0.8, "timesTested": 5}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/memory", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Topic is required")
	})

	t.Run("rejects empty topic", func(t *testing.T) {
		body := `{"topic": "", "confidence": 0.8}`
		req := createLearningPathRequest(http.MethodPost, "/api/learning-paths/path-123/memory", bytes.NewBufferString(body), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		LearningPathsHandler(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Topic is required")
	})
}

// =============================================================================
// Model JSON Serialization Tests
// =============================================================================

func TestLearningPathCreateJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := models.LearningPathCreate{
			Goal:  "Learn Go",
			Emoji: "🎯",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "goal")
		assert.Contains(t, parsed, "emoji")
	})
}

func TestLearningPathUpdateJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		goal := "Updated Goal"
		emoji := "🚀"
		progress := 50
		lessonsCompleted := 5
		totalLessons := 10

		req := models.LearningPathUpdate{
			Goal:             &goal,
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

		assert.Contains(t, parsed, "goal")
		assert.Contains(t, parsed, "emoji")
		assert.Contains(t, parsed, "progress")
		assert.Contains(t, parsed, "lessonsCompleted")
		assert.Contains(t, parsed, "totalLessons")
	})

	t.Run("omits nil fields", func(t *testing.T) {
		req := models.LearningPathUpdate{
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

func TestStepCompleteJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := models.StepComplete{
			UserAnswer: "The answer is 42",
			Score:      85.5,
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "userAnswer")
		assert.Contains(t, parsed, "score")
	})

	t.Run("omits empty fields", func(t *testing.T) {
		req := models.StepComplete{}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		// Empty string and zero score should be omitted due to omitempty
		assert.NotContains(t, parsed, "userAnswer")
		assert.NotContains(t, parsed, "score")
	})
}

func TestLearningPathJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		path := models.LearningPath{
			ID:               "path-123",
			UserID:           "user-456",
			Goal:             "Learn Go",
			Level:            "beginner",
			Emoji:            "🎯",
			Progress:         50,
			LessonsCompleted: 5,
			TotalLessons:     10,
			Steps:            []models.Step{},
			CreatedAt:        1234567890,
			UpdatedAt:        1234567890,
			LastAccessedAt:   1234567890,
		}

		jsonBytes, err := json.Marshal(path)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "id")
		assert.Contains(t, parsed, "userId")
		assert.Contains(t, parsed, "goal")
		assert.Contains(t, parsed, "level")
		assert.Contains(t, parsed, "emoji")
		assert.Contains(t, parsed, "progress")
		assert.Contains(t, parsed, "lessonsCompleted")
		assert.Contains(t, parsed, "totalLessons")
		assert.Contains(t, parsed, "steps")
		assert.Contains(t, parsed, "createdAt")
		assert.Contains(t, parsed, "updatedAt")
		assert.Contains(t, parsed, "lastAccessedAt")
	})
}

func TestStepJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		step := models.Step{
			ID:          "step-123",
			Index:       0,
			Type:        "lesson",
			Topic:       "Go basics",
			Title:       "Introduction to Go",
			Content:     "Go is a programming language...",
			Completed:   true,
			CompletedAt: 1234567890,
			CreatedAt:   1234567890,
		}

		jsonBytes, err := json.Marshal(step)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "id")
		assert.Contains(t, parsed, "index")
		assert.Contains(t, parsed, "type")
		assert.Contains(t, parsed, "topic")
		assert.Contains(t, parsed, "title")
		assert.Contains(t, parsed, "content")
		assert.Contains(t, parsed, "completed")
		assert.Contains(t, parsed, "completedAt")
		assert.Contains(t, parsed, "createdAt")
	})

	t.Run("quiz step has correct JSON tags", func(t *testing.T) {
		step := models.Step{
			ID:             "step-123",
			Index:          1,
			Type:           "quiz",
			Topic:          "Go basics",
			Title:          "Quiz: Variables",
			Question:       "What keyword declares a variable?",
			Options:        []string{"var", "let", "const", "dim"},
			ExpectedAnswer: "var",
			Completed:      false,
			CreatedAt:      1234567890,
		}

		jsonBytes, err := json.Marshal(step)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "question")
		assert.Contains(t, parsed, "options")
		assert.Contains(t, parsed, "expectedAnswer")
	})

	t.Run("practice step has correct JSON tags", func(t *testing.T) {
		step := models.Step{
			ID:        "step-123",
			Index:     2,
			Type:      "practice",
			Topic:     "Go basics",
			Title:     "Practice: Hello World",
			Task:      "Write a program that prints Hello World",
			Hints:     []string{"Use fmt.Println", "Import the fmt package"},
			Completed: false,
			CreatedAt: 1234567890,
		}

		jsonBytes, err := json.Marshal(step)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "task")
		assert.Contains(t, parsed, "hints")
	})
}

func TestUpdatePathMemoryRequestJSON(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := UpdatePathMemoryRequest{
			Topic:       "Go basics",
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

// =============================================================================
// Helper Function Tests
// =============================================================================

func TestGetCurrentStep(t *testing.T) {
	t.Run("returns nil for empty steps", func(t *testing.T) {
		steps := []models.Step{}
		result := getCurrentStep(steps)
		assert.Nil(t, result)
	})

	t.Run("returns nil when all steps completed", func(t *testing.T) {
		steps := []models.Step{
			{ID: "1", Completed: true},
			{ID: "2", Completed: true},
			{ID: "3", Completed: true},
		}
		result := getCurrentStep(steps)
		assert.Nil(t, result)
	})

	t.Run("returns first incomplete step", func(t *testing.T) {
		steps := []models.Step{
			{ID: "1", Completed: true},
			{ID: "2", Completed: false},
			{ID: "3", Completed: false},
		}
		result := getCurrentStep(steps)
		require.NotNil(t, result)
		assert.Equal(t, "2", result.ID)
	})

	t.Run("returns first step when none completed", func(t *testing.T) {
		steps := []models.Step{
			{ID: "1", Completed: false},
			{ID: "2", Completed: false},
		}
		result := getCurrentStep(steps)
		require.NotNil(t, result)
		assert.Equal(t, "1", result.ID)
	})
}

func TestGetRecentSteps(t *testing.T) {
	t.Run("returns all steps when no memory", func(t *testing.T) {
		path := &models.LearningPath{
			Steps:  []models.Step{{ID: "1"}, {ID: "2"}, {ID: "3"}},
			Memory: nil,
		}
		result := getRecentSteps(path)
		assert.Len(t, result, 3)
	})

	t.Run("returns all steps when no compaction", func(t *testing.T) {
		path := &models.LearningPath{
			Steps: []models.Step{{ID: "1"}, {ID: "2"}, {ID: "3"}},
			Memory: &models.Memory{
				Compaction: nil,
			},
		}
		result := getRecentSteps(path)
		assert.Len(t, result, 3)
	})

	t.Run("returns steps after last compaction", func(t *testing.T) {
		path := &models.LearningPath{
			Steps: []models.Step{{ID: "1"}, {ID: "2"}, {ID: "3"}, {ID: "4"}, {ID: "5"}},
			Memory: &models.Memory{
				Compaction: &models.Compaction{
					LastStepIndex: 2, // Steps 0, 1, 2 were compacted
				},
			},
		}
		result := getRecentSteps(path)
		assert.Len(t, result, 2) // Steps 3 and 4
		assert.Equal(t, "4", result[0].ID)
		assert.Equal(t, "5", result[1].ID)
	})

	t.Run("returns empty when all steps compacted", func(t *testing.T) {
		path := &models.LearningPath{
			Steps: []models.Step{{ID: "1"}, {ID: "2"}, {ID: "3"}},
			Memory: &models.Memory{
				Compaction: &models.Compaction{
					LastStepIndex: 2,
				},
			},
		}
		result := getRecentSteps(path)
		assert.Len(t, result, 0)
	})
}

func TestBuildMemoryContext(t *testing.T) {
	t.Run("returns empty string for nil memory", func(t *testing.T) {
		path := &models.LearningPath{Memory: nil}
		result := buildMemoryContext(path)
		assert.Empty(t, result)
	})

	t.Run("includes compaction summary", func(t *testing.T) {
		path := &models.LearningPath{
			Memory: &models.Memory{
				Compaction: &models.Compaction{
					Summary:    "User is making good progress",
					Strengths:  []string{"Variables", "Functions"},
					Weaknesses: []string{"Pointers"},
				},
			},
		}
		result := buildMemoryContext(path)
		assert.Contains(t, result, "Learning Summary: User is making good progress")
		assert.Contains(t, result, "Strengths: Variables, Functions")
		assert.Contains(t, result, "Weaknesses: Pointers")
	})

	t.Run("includes topic confidence scores", func(t *testing.T) {
		path := &models.LearningPath{
			Memory: &models.Memory{
				Topics: map[string]models.TopicMemory{
					"Variables": {Confidence: 0.9},
					"Functions": {Confidence: 0.75},
				},
			},
		}
		result := buildMemoryContext(path)
		assert.Contains(t, result, "Topic Confidence:")
		assert.Contains(t, result, "90%")
		assert.Contains(t, result, "75%")
	})
}
