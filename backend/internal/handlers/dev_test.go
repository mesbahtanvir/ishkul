package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDevGetTestToken(t *testing.T) {
	// Setup JWT secret for tests
	os.Setenv("JWT_SECRET", "test-secret-for-dev-tests")
	defer os.Unsetenv("JWT_SECRET")

	t.Run("returns 404 in non-development environment", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "production")
		defer os.Unsetenv("ENVIRONMENT")

		req := httptest.NewRequest(http.MethodGet, "/dev/token", nil)
		rr := httptest.NewRecorder()

		DevGetTestToken(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), "Not found")
	})

	t.Run("returns 404 in staging environment", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "staging")
		defer os.Unsetenv("ENVIRONMENT")

		req := httptest.NewRequest(http.MethodGet, "/dev/token", nil)
		rr := httptest.NewRecorder()

		DevGetTestToken(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("returns 405 for non-GET requests in development", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "development")
		defer os.Unsetenv("ENVIRONMENT")

		methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/dev/token", nil)
				rr := httptest.NewRecorder()

				DevGetTestToken(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("returns token in development environment", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "development")
		os.Setenv("USER", "testuser")
		defer os.Unsetenv("ENVIRONMENT")
		defer os.Unsetenv("USER")

		req := httptest.NewRequest(http.MethodGet, "/dev/token", nil)
		rr := httptest.NewRecorder()

		DevGetTestToken(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		// Check response structure
		assert.NotEmpty(t, response["accessToken"])
		assert.NotEmpty(t, response["refreshToken"])
		assert.NotEmpty(t, response["expiresIn"])
		assert.Equal(t, "dev-test-user-testuser", response["userId"])
		assert.Equal(t, "dev-test@example.com", response["email"])
		assert.Contains(t, response["warning"].(string), "development-only")
	})

	t.Run("returns valid JWT tokens", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "development")
		os.Setenv("USER", "testuser")
		defer os.Unsetenv("ENVIRONMENT")
		defer os.Unsetenv("USER")

		req := httptest.NewRequest(http.MethodGet, "/dev/token", nil)
		rr := httptest.NewRecorder()

		DevGetTestToken(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		accessToken := response["accessToken"].(string)
		refreshToken := response["refreshToken"].(string)

		// Tokens should be JWT format (three parts separated by dots)
		assert.Regexp(t, `^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$`, accessToken)
		assert.Regexp(t, `^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$`, refreshToken)
	})

	t.Run("returns 404 when environment is not set", func(t *testing.T) {
		os.Unsetenv("ENVIRONMENT")

		req := httptest.NewRequest(http.MethodGet, "/dev/token", nil)
		rr := httptest.NewRecorder()

		DevGetTestToken(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("handles missing USER environment variable", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "development")
		os.Unsetenv("USER")
		defer os.Unsetenv("ENVIRONMENT")

		req := httptest.NewRequest(http.MethodGet, "/dev/token", nil)
		rr := httptest.NewRecorder()

		DevGetTestToken(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		// Should still work, but userId will be "dev-test-user-"
		assert.Equal(t, "dev-test-user-", response["userId"])
	})
}

func TestDevEndpointSecurity(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-for-dev-tests")
	defer os.Unsetenv("JWT_SECRET")

	t.Run("environment check is case sensitive", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "Development") // capital D
		defer os.Unsetenv("ENVIRONMENT")

		req := httptest.NewRequest(http.MethodGet, "/dev/token", nil)
		rr := httptest.NewRecorder()

		DevGetTestToken(rr, req)

		// Should return 404 because check is case-sensitive
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("DEVELOPMENT is case sensitive", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "DEVELOPMENT") // uppercase
		defer os.Unsetenv("ENVIRONMENT")

		req := httptest.NewRequest(http.MethodGet, "/dev/token", nil)
		rr := httptest.NewRecorder()

		DevGetTestToken(rr, req)

		// Should return 404 because check is case-sensitive
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})
}
