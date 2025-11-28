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
	t.Run("struct has correct JSON tags", func(t *testing.T) {
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
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("rejects empty request body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString("{}"))
		rr := httptest.NewRecorder()

		Login(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Google ID token is required")
	})

	t.Run("rejects missing googleIdToken", func(t *testing.T) {
		body := `{"googleIdToken": ""}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Login(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Google ID token is required")
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
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("rejects empty refresh token", func(t *testing.T) {
		body := `{"refreshToken": ""}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		Refresh(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Refresh token is required")
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
		assert.Contains(t, rr.Body.String(), "Invalid refresh token")
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

		// New tokens should be different from original
		assert.NotEqual(t, tokenPair.AccessToken, response.AccessToken)
		assert.NotEqual(t, tokenPair.RefreshToken, response.RefreshToken)
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
