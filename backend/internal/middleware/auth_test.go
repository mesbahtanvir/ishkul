package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func resetJWTSecretForTests() {
	// Reset the JWT secret for fresh tests
	os.Setenv("JWT_SECRET", "test-middleware-secret-key")
}

func TestAuthMiddleware(t *testing.T) {
	resetJWTSecretForTests()
	defer os.Unsetenv("JWT_SECRET")

	t.Run("passes with valid token", func(t *testing.T) {
		tokenPair, err := auth.GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			email := GetUserEmail(r.Context())
			assert.Equal(t, "user123", userID)
			assert.Equal(t, "test@example.com", email)
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer "+tokenPair.AccessToken)
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("rejects request without Authorization header", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called")
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Authorization header required")
	})

	t.Run("rejects request with empty Authorization header", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called")
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "")
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects request with invalid format (no Bearer)", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called")
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "InvalidToken")
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid authorization header format")
	})

	t.Run("rejects request with invalid format (Basic instead of Bearer)", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called")
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Basic sometoken")
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects request with invalid token", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called")
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid token")
	})

	t.Run("rejects request with refresh token", func(t *testing.T) {
		tokenPair, err := auth.GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called")
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer "+tokenPair.RefreshToken)
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects request with too many parts in Authorization", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called")
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer token extra")
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})
}

func TestGetUserID(t *testing.T) {
	t.Run("returns user ID from context", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserIDKey, "user123")
		userID := GetUserID(ctx)
		assert.Equal(t, "user123", userID)
	})

	t.Run("returns empty string when not set", func(t *testing.T) {
		ctx := context.Background()
		userID := GetUserID(ctx)
		assert.Equal(t, "", userID)
	})

	t.Run("returns empty string for wrong type", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserIDKey, 12345)
		userID := GetUserID(ctx)
		assert.Equal(t, "", userID)
	})

	t.Run("returns empty string for nil value", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserIDKey, nil)
		userID := GetUserID(ctx)
		assert.Equal(t, "", userID)
	})
}

func TestGetUserEmail(t *testing.T) {
	t.Run("returns user email from context", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserEmailKey, "test@example.com")
		email := GetUserEmail(ctx)
		assert.Equal(t, "test@example.com", email)
	})

	t.Run("returns empty string when not set", func(t *testing.T) {
		ctx := context.Background()
		email := GetUserEmail(ctx)
		assert.Equal(t, "", email)
	})

	t.Run("returns empty string for wrong type", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), UserEmailKey, 12345)
		email := GetUserEmail(ctx)
		assert.Equal(t, "", email)
	})
}

func TestContextKeys(t *testing.T) {
	t.Run("context keys are unique", func(t *testing.T) {
		assert.NotEqual(t, UserIDKey, UserEmailKey)
	})

	t.Run("context key values are correct", func(t *testing.T) {
		assert.Equal(t, contextKey("userID"), UserIDKey)
		assert.Equal(t, contextKey("userEmail"), UserEmailKey)
	})
}

func TestAuthMiddlewareIntegration(t *testing.T) {
	resetJWTSecretForTests()
	defer os.Unsetenv("JWT_SECRET")

	t.Run("context values are accessible in handler", func(t *testing.T) {
		tokenPair, err := auth.GenerateTokenPair("testuser", "testuser@example.com")
		require.NoError(t, err)

		var capturedUserID, capturedEmail string

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedUserID = GetUserID(r.Context())
			capturedEmail = GetUserEmail(r.Context())
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer "+tokenPair.AccessToken)
		rr := httptest.NewRecorder()

		Auth(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "testuser", capturedUserID)
		assert.Equal(t, "testuser@example.com", capturedEmail)
	})

	t.Run("works with different HTTP methods", func(t *testing.T) {
		tokenPair, err := auth.GenerateTokenPair("user", "user@test.com")
		require.NoError(t, err)

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		methods := []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/test", nil)
				req.Header.Set("Authorization", "Bearer "+tokenPair.AccessToken)
				rr := httptest.NewRecorder()

				Auth(handler).ServeHTTP(rr, req)
				assert.Equal(t, http.StatusOK, rr.Code)
			})
		}
	})
}

func TestConcurrentAccess(t *testing.T) {
	resetJWTSecretForTests()
	defer os.Unsetenv("JWT_SECRET")

	t.Run("handles concurrent requests", func(t *testing.T) {
		tokenPair, err := auth.GenerateTokenPair("concurrent-user", "concurrent@test.com")
		require.NoError(t, err)

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			assert.Equal(t, "concurrent-user", userID)
			w.WriteHeader(http.StatusOK)
		})

		var wg sync.WaitGroup
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				req := httptest.NewRequest(http.MethodGet, "/test", nil)
				req.Header.Set("Authorization", "Bearer "+tokenPair.AccessToken)
				rr := httptest.NewRecorder()
				Auth(handler).ServeHTTP(rr, req)
				assert.Equal(t, http.StatusOK, rr.Code)
			}()
		}
		wg.Wait()
	})
}
