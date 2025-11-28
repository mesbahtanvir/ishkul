package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthCheck(t *testing.T) {
	t.Run("returns healthy status", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rr := httptest.NewRecorder()

		HealthCheck(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response HealthResponse
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "healthy", response.Status)
		assert.Equal(t, "ishkul-backend", response.Service)
		assert.False(t, response.Timestamp.IsZero())
	})

	t.Run("timestamp is recent", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rr := httptest.NewRecorder()

		beforeCall := time.Now()
		HealthCheck(rr, req)
		afterCall := time.Now()

		var response HealthResponse
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response.Timestamp.After(beforeCall) || response.Timestamp.Equal(beforeCall))
		assert.True(t, response.Timestamp.Before(afterCall) || response.Timestamp.Equal(afterCall))
	})

	t.Run("works with all HTTP methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/health", nil)
				rr := httptest.NewRecorder()

				HealthCheck(rr, req)

				assert.Equal(t, http.StatusOK, rr.Code)
			})
		}
	})
}

func TestHealthResponse(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		response := HealthResponse{
			Status:    "healthy",
			Timestamp: time.Now(),
			Service:   "test-service",
		}

		jsonBytes, err := json.Marshal(response)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "status")
		assert.Contains(t, parsed, "timestamp")
		assert.Contains(t, parsed, "service")
	})
}
