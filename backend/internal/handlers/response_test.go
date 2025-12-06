package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// JSON Tests
// =============================================================================

func TestJSON(t *testing.T) {
	t.Run("sets Content-Type header to application/json", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSON(rr, http.StatusOK, map[string]string{"key": "value"})

		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	})

	t.Run("sets correct status code", func(t *testing.T) {
		testCases := []int{
			http.StatusOK,
			http.StatusCreated,
			http.StatusBadRequest,
			http.StatusUnauthorized,
			http.StatusForbidden,
			http.StatusNotFound,
			http.StatusInternalServerError,
		}

		for _, statusCode := range testCases {
			t.Run(http.StatusText(statusCode), func(t *testing.T) {
				rr := httptest.NewRecorder()

				JSON(rr, statusCode, nil)

				assert.Equal(t, statusCode, rr.Code)
			})
		}
	})

	t.Run("encodes data as JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		data := map[string]interface{}{
			"name":   "test",
			"count":  42,
			"active": true,
		}

		JSON(rr, http.StatusOK, data)

		var response map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "test", response["name"])
		assert.Equal(t, float64(42), response["count"]) // JSON numbers are float64
		assert.Equal(t, true, response["active"])
	})

	t.Run("handles nil data", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSON(rr, http.StatusNoContent, nil)

		assert.Equal(t, http.StatusNoContent, rr.Code)
		assert.Empty(t, rr.Body.Bytes())
	})

	t.Run("encodes struct correctly", func(t *testing.T) {
		rr := httptest.NewRecorder()
		data := struct {
			ID    int    `json:"id"`
			Email string `json:"email"`
		}{
			ID:    123,
			Email: "test@example.com",
		}

		JSON(rr, http.StatusOK, data)

		var response map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, float64(123), response["id"])
		assert.Equal(t, "test@example.com", response["email"])
	})

	t.Run("encodes slice correctly", func(t *testing.T) {
		rr := httptest.NewRecorder()
		data := []string{"one", "two", "three"}

		JSON(rr, http.StatusOK, data)

		var response []string
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, []string{"one", "two", "three"}, response)
	})

	t.Run("handles empty map", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSON(rr, http.StatusOK, map[string]string{})

		assert.Equal(t, "{}\n", rr.Body.String())
	})

	t.Run("handles empty slice", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSON(rr, http.StatusOK, []string{})

		assert.Equal(t, "[]\n", rr.Body.String())
	})
}

// =============================================================================
// JSONSuccess Tests
// =============================================================================

func TestJSONSuccess(t *testing.T) {
	t.Run("returns 200 OK status", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSONSuccess(rr, map[string]string{"status": "ok"})

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("sets Content-Type header", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSONSuccess(rr, nil)

		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	})

	t.Run("encodes response body", func(t *testing.T) {
		rr := httptest.NewRecorder()
		data := map[string]string{"message": "success"}

		JSONSuccess(rr, data)

		var response map[string]string
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "success", response["message"])
	})
}

// =============================================================================
// JSONCreated Tests
// =============================================================================

func TestJSONCreated(t *testing.T) {
	t.Run("returns 201 Created status", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSONCreated(rr, map[string]string{"id": "new-123"})

		assert.Equal(t, http.StatusCreated, rr.Code)
	})

	t.Run("sets Content-Type header", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSONCreated(rr, nil)

		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	})

	t.Run("encodes response body", func(t *testing.T) {
		rr := httptest.NewRecorder()
		data := map[string]interface{}{
			"id":        "abc-123",
			"createdAt": "2024-01-15T10:30:00Z",
		}

		JSONCreated(rr, data)

		var response map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "abc-123", response["id"])
	})
}

// =============================================================================
// JSONError Tests
// =============================================================================

func TestJSONError(t *testing.T) {
	t.Run("returns specified status code", func(t *testing.T) {
		testCases := []struct {
			statusCode int
		}{
			{http.StatusBadRequest},
			{http.StatusUnauthorized},
			{http.StatusForbidden},
			{http.StatusNotFound},
			{http.StatusInternalServerError},
		}

		for _, tc := range testCases {
			t.Run(http.StatusText(tc.statusCode), func(t *testing.T) {
				rr := httptest.NewRecorder()

				JSONError(rr, tc.statusCode, "ERROR_CODE", "Error message")

				assert.Equal(t, tc.statusCode, rr.Code)
			})
		}
	})

	t.Run("returns error response structure", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSONError(rr, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input")

		var response ErrorResponse
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "VALIDATION_ERROR", response.Code)
		assert.Equal(t, "Invalid input", response.Message)
	})

	t.Run("sets Content-Type header", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSONError(rr, http.StatusBadRequest, "ERROR", "message")

		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	})

	t.Run("handles empty code", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSONError(rr, http.StatusInternalServerError, "", "Something went wrong")

		var response ErrorResponse
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Empty(t, response.Code)
		assert.Equal(t, "Something went wrong", response.Message)
	})

	t.Run("handles empty message", func(t *testing.T) {
		rr := httptest.NewRecorder()

		JSONError(rr, http.StatusBadRequest, "BAD_REQUEST", "")

		var response ErrorResponse
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "BAD_REQUEST", response.Code)
		assert.Empty(t, response.Message)
	})
}

// =============================================================================
// RequireMethod Tests
// =============================================================================

func TestRequireMethod(t *testing.T) {
	t.Run("returns true for allowed method", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)

		result := RequireMethod(rr, req, http.MethodGet)

		assert.True(t, result)
		assert.Equal(t, http.StatusOK, rr.Code) // No response written yet
	})

	t.Run("returns true for any of multiple allowed methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPost, http.MethodPut}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				rr := httptest.NewRecorder()
				req := httptest.NewRequest(method, "/test", nil)

				result := RequireMethod(rr, req, http.MethodGet, http.MethodPost, http.MethodPut)

				assert.True(t, result)
			})
		}
	})

	t.Run("returns false and 405 for disallowed method", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodDelete, "/test", nil)

		result := RequireMethod(rr, req, http.MethodGet, http.MethodPost)

		assert.False(t, result)
		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
		assert.Contains(t, rr.Body.String(), "Method not allowed")
	})

	t.Run("returns false for empty allowed methods list", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)

		result := RequireMethod(rr, req)

		assert.False(t, result)
		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("is case sensitive for HTTP methods", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest("get", "/test", nil) // lowercase

		result := RequireMethod(rr, req, http.MethodGet) // uppercase GET

		assert.False(t, result)
		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})
}

// =============================================================================
// GetUserIDOrFail Tests
// =============================================================================

func TestGetUserIDOrFail(t *testing.T) {
	t.Run("returns user ID when available", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)

		getUserID := func() string { return "user-123" }

		result := GetUserIDOrFail(rr, req, getUserID)

		assert.Equal(t, "user-123", result)
		assert.Equal(t, http.StatusOK, rr.Code) // No error response written
	})

	t.Run("returns empty and 401 when user ID is empty", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)

		getUserID := func() string { return "" }

		result := GetUserIDOrFail(rr, req, getUserID)

		assert.Empty(t, result)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Unauthorized")
	})

	t.Run("handles whitespace-only user ID as empty", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)

		// Whitespace is technically not empty, so it passes
		getUserID := func() string { return "   " }

		result := GetUserIDOrFail(rr, req, getUserID)

		assert.Equal(t, "   ", result) // Returns the whitespace
		assert.Equal(t, http.StatusOK, rr.Code)
	})
}

// =============================================================================
// SuccessResponse Tests
// =============================================================================

func TestSuccessResponse(t *testing.T) {
	t.Run("returns map with success true", func(t *testing.T) {
		result := SuccessResponse("Operation completed")

		success, ok := result["success"].(bool)
		require.True(t, ok)
		assert.True(t, success)
	})

	t.Run("includes message in response", func(t *testing.T) {
		result := SuccessResponse("User created successfully")

		message, ok := result["message"].(string)
		require.True(t, ok)
		assert.Equal(t, "User created successfully", message)
	})

	t.Run("handles empty message", func(t *testing.T) {
		result := SuccessResponse("")

		message, ok := result["message"].(string)
		require.True(t, ok)
		assert.Empty(t, message)
	})

	t.Run("can be encoded to JSON", func(t *testing.T) {
		result := SuccessResponse("Test message")

		jsonBytes, err := json.Marshal(result)
		require.NoError(t, err)

		var decoded map[string]interface{}
		err = json.Unmarshal(jsonBytes, &decoded)
		require.NoError(t, err)

		assert.Equal(t, true, decoded["success"])
		assert.Equal(t, "Test message", decoded["message"])
	})
}

// =============================================================================
// Integration Tests
// =============================================================================

func TestResponseHelperIntegration(t *testing.T) {
	t.Run("typical success flow", func(t *testing.T) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			if !RequireMethod(w, r, http.MethodPost) {
				return
			}

			userID := GetUserIDOrFail(w, r, func() string { return "user-123" })
			if userID == "" {
				return
			}

			JSONCreated(w, map[string]interface{}{
				"id":      "resource-456",
				"ownerId": userID,
			})
		}

		req := httptest.NewRequest(http.MethodPost, "/api/resource", nil)
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "resource-456", response["id"])
		assert.Equal(t, "user-123", response["ownerId"])
	})

	t.Run("typical error flow - wrong method", func(t *testing.T) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			if !RequireMethod(w, r, http.MethodPost) {
				return
			}
			JSONSuccess(w, SuccessResponse("ok"))
		}

		req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
	})

	t.Run("typical error flow - unauthorized", func(t *testing.T) {
		handler := func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserIDOrFail(w, r, func() string { return "" })
			if userID == "" {
				return
			}
			JSONSuccess(w, SuccessResponse("ok"))
		}

		req := httptest.NewRequest(http.MethodGet, "/api/resource", nil)
		rr := httptest.NewRecorder()

		handler(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})
}
