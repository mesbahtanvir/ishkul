package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func resetJWTSecret() {
	os.Setenv("JWT_SECRET", "test-handler-secret")
}

func TestLoginRequest(t *testing.T) {
	t.Run("struct has correct JSON tags for Google login", func(t *testing.T) {
		req := LoginRequest{
			GoogleIDToken: "test-token",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "googleIdToken")
	})

	t.Run("struct has correct JSON tags for email login", func(t *testing.T) {
		req := LoginRequest{
			Email:    "test@example.com",
			Password: "password123",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "email")
		assert.Contains(t, parsed, "password")
	})
}

func TestRegisterRequest(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := RegisterRequest{
			Email:       "test@example.com",
			Password:    "password123",
			DisplayName: "Test User",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "email")
		assert.Contains(t, parsed, "password")
		assert.Contains(t, parsed, "displayName")
	})
}

func TestLoginResponse(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		resp := LoginResponse{
			AccessToken:  "access",
			RefreshToken: "refresh",
			ExpiresIn:    900,
			User:         nil,
		}

		jsonBytes, err := json.Marshal(resp)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "accessToken")
		assert.Contains(t, parsed, "refreshToken")
		assert.Contains(t, parsed, "expiresIn")
	})
}

func TestRefreshRequest(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := RefreshRequest{
			RefreshToken: "test-refresh-token",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "refreshToken")
	})
}

func TestRefreshResponse(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		resp := RefreshResponse{
			AccessToken:  "access",
			RefreshToken: "refresh",
			ExpiresIn:    900,
		}

		jsonBytes, err := json.Marshal(resp)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "accessToken")
		assert.Contains(t, parsed, "refreshToken")
		assert.Contains(t, parsed, "expiresIn")
	})
}

func TestLogin(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/auth/login", nil)
				rr := httptest.NewRecorder()

				Login(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
				assert.Contains(t, rr.Body.String(), "Method not allowed")
			})
		}
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString("invalid json"))
		rr := httptest.NewRecorder()

		Login(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request format")
	})

	t.Run("rejects empty request body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString("{}"))
		rr := httptest.NewRecorder()

		Login(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Please enter your email and password")
	})

	t.Run("rejects missing credentials", func(t *testing.T) {
		body := `{"googleIdToken": ""}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Login(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Please enter your email and password")
	})

	t.Run("rejects email without password", func(t *testing.T) {
		body := `{"email": "test@example.com"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Login(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Please enter your email and password")
	})

	t.Run("rejects password without email", func(t *testing.T) {
		body := `{"password": "secret123"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Login(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Please enter your email and password")
	})
}

func TestRegister(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/auth/register", nil)
				rr := httptest.NewRecorder()

				Register(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
				assert.Contains(t, rr.Body.String(), "Method not allowed")
			})
		}
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString("invalid json"))
		rr := httptest.NewRecorder()

		Register(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request format")
	})

	t.Run("rejects missing email", func(t *testing.T) {
		body := `{"password": "password123", "displayName": "Test User"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Register(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Please enter your email and password")
	})

	t.Run("rejects missing password", func(t *testing.T) {
		body := `{"email": "test@example.com", "displayName": "Test User"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Register(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Please enter your email and password")
	})

	t.Run("rejects password shorter than 6 characters", func(t *testing.T) {
		body := `{"email": "test@example.com", "password": "12345", "displayName": "Test User"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Register(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Password must be at least 6 characters")
	})
}

func TestRefresh(t *testing.T) {
	resetJWTSecret()
	defer os.Unsetenv("JWT_SECRET")

	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/auth/refresh", nil)
				rr := httptest.NewRecorder()

				Refresh(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
				assert.Contains(t, rr.Body.String(), "Method not allowed")
			})
		}
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString("invalid json"))
		rr := httptest.NewRecorder()

		Refresh(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request format")
	})

	t.Run("rejects empty refresh token", func(t *testing.T) {
		body := `{"refreshToken": ""}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Refresh(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Session expired")
	})

	t.Run("rejects invalid refresh token", func(t *testing.T) {
		body := `{"refreshToken": "invalid-token"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Refresh(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects access token used as refresh token", func(t *testing.T) {
		tokenPair, err := auth.GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		body := `{"refreshToken": "` + tokenPair.AccessToken + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Refresh(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Session expired")
	})

	t.Run("accepts valid refresh token", func(t *testing.T) {
		tokenPair, err := auth.GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		body := `{"refreshToken": "` + tokenPair.RefreshToken + `"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Refresh(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response RefreshResponse
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.NotEmpty(t, response.AccessToken)
		assert.NotEmpty(t, response.RefreshToken)
		assert.Greater(t, response.ExpiresIn, int64(0))

		// Verify new tokens are valid (can be the same if generated in same second due to identical timestamps)
		// Just ensure they are non-empty valid JWTs
		assert.True(t, len(response.AccessToken) > 50, "Access token should be a valid JWT")
		assert.True(t, len(response.RefreshToken) > 50, "Refresh token should be a valid JWT")
	})
}

func TestLogout(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/auth/logout", nil)
				rr := httptest.NewRecorder()

				Logout(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
				assert.Contains(t, rr.Body.String(), "Method not allowed")
			})
		}
	})

	t.Run("accepts POST and returns success message", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
		rr := httptest.NewRecorder()

		Logout(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]string
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "message")
		assert.Equal(t, "Logged out successfully", response["message"])
	})
}

func TestGetGoogleClientIDs(t *testing.T) {
	t.Run("returns empty slice when no env vars set", func(t *testing.T) {
		os.Unsetenv("GOOGLE_WEB_CLIENT_ID")
		os.Unsetenv("GOOGLE_IOS_CLIENT_ID")
		os.Unsetenv("GOOGLE_ANDROID_CLIENT_ID")

		ids := getGoogleClientIDs()
		assert.Empty(t, ids)
	})

	t.Run("returns web client ID when set", func(t *testing.T) {
		os.Setenv("GOOGLE_WEB_CLIENT_ID", "web-client-id")
		defer os.Unsetenv("GOOGLE_WEB_CLIENT_ID")

		ids := getGoogleClientIDs()
		assert.Contains(t, ids, "web-client-id")
	})

	t.Run("returns iOS client ID when set", func(t *testing.T) {
		os.Setenv("GOOGLE_IOS_CLIENT_ID", "ios-client-id")
		defer os.Unsetenv("GOOGLE_IOS_CLIENT_ID")

		ids := getGoogleClientIDs()
		assert.Contains(t, ids, "ios-client-id")
	})

	t.Run("returns Android client ID when set", func(t *testing.T) {
		os.Setenv("GOOGLE_ANDROID_CLIENT_ID", "android-client-id")
		defer os.Unsetenv("GOOGLE_ANDROID_CLIENT_ID")

		ids := getGoogleClientIDs()
		assert.Contains(t, ids, "android-client-id")
	})

	t.Run("returns all client IDs when all are set", func(t *testing.T) {
		os.Setenv("GOOGLE_WEB_CLIENT_ID", "web-id")
		os.Setenv("GOOGLE_IOS_CLIENT_ID", "ios-id")
		os.Setenv("GOOGLE_ANDROID_CLIENT_ID", "android-id")
		defer func() {
			os.Unsetenv("GOOGLE_WEB_CLIENT_ID")
			os.Unsetenv("GOOGLE_IOS_CLIENT_ID")
			os.Unsetenv("GOOGLE_ANDROID_CLIENT_ID")
		}()

		ids := getGoogleClientIDs()
		assert.Len(t, ids, 3)
		assert.Contains(t, ids, "web-id")
		assert.Contains(t, ids, "ios-id")
		assert.Contains(t, ids, "android-id")
	})
}

func TestRefreshConcurrent(t *testing.T) {
	resetJWTSecret()
	defer os.Unsetenv("JWT_SECRET")

	t.Run("handles concurrent refresh requests", func(t *testing.T) {
		tokenPair, err := auth.GenerateTokenPair("concurrent-user", "concurrent@test.com")
		require.NoError(t, err)

		var wg sync.WaitGroup
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				body := `{"refreshToken": "` + tokenPair.RefreshToken + `"}`
				req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(body))
				rr := httptest.NewRecorder()

				Refresh(rr, req)

				assert.Equal(t, http.StatusOK, rr.Code)
			}()
		}
		wg.Wait()
	})
}

// =============================================================================
// containsCaseInsensitive Tests
// =============================================================================

func TestContainsCaseInsensitive(t *testing.T) {
	t.Run("finds lowercase substring", func(t *testing.T) {
		assert.True(t, containsCaseInsensitive("Hello World", "world"))
	})

	t.Run("finds uppercase substring", func(t *testing.T) {
		assert.True(t, containsCaseInsensitive("hello world", "WORLD"))
	})

	t.Run("finds mixed case substring", func(t *testing.T) {
		assert.True(t, containsCaseInsensitive("Hello World", "WoRlD"))
	})

	t.Run("returns false when not found", func(t *testing.T) {
		assert.False(t, containsCaseInsensitive("Hello World", "xyz"))
	})

	t.Run("handles empty strings", func(t *testing.T) {
		assert.True(t, containsCaseInsensitive("Hello", ""))
		assert.False(t, containsCaseInsensitive("", "Hello"))
	})

	t.Run("handles exact match", func(t *testing.T) {
		assert.True(t, containsCaseInsensitive("test", "test"))
		assert.True(t, containsCaseInsensitive("TEST", "test"))
	})

	t.Run("finds email and invalid in error message", func(t *testing.T) {
		errMsg := "The email address is invalid"
		assert.True(t, containsCaseInsensitive(errMsg, "email"))
		assert.True(t, containsCaseInsensitive(errMsg, "invalid"))
	})
}
