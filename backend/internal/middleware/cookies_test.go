package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// GetCookieConfig Tests
// =============================================================================

func TestGetCookieConfig(t *testing.T) {
	t.Run("development environment config", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "development")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		config := GetCookieConfig()

		assert.False(t, config.Secure, "Secure should be false in development")
		assert.Equal(t, http.SameSiteLaxMode, config.SameSite, "SameSite should be Lax in development")
		assert.Empty(t, config.Domain, "Domain should be empty in development")
	})

	t.Run("production environment config", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		originalDomain := os.Getenv("COOKIE_DOMAIN")
		os.Setenv("ENVIRONMENT", "production")
		os.Setenv("COOKIE_DOMAIN", ".ishkul.org")
		defer func() {
			os.Setenv("ENVIRONMENT", originalEnv)
			if originalDomain != "" {
				os.Setenv("COOKIE_DOMAIN", originalDomain)
			} else {
				os.Unsetenv("COOKIE_DOMAIN")
			}
		}()

		config := GetCookieConfig()

		assert.True(t, config.Secure, "Secure should be true in production")
		assert.Equal(t, http.SameSiteStrictMode, config.SameSite, "SameSite should be Strict in production")
		assert.Equal(t, ".ishkul.org", config.Domain, "Domain should be set from COOKIE_DOMAIN")
	})

	t.Run("staging environment config", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "staging")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		config := GetCookieConfig()

		assert.False(t, config.Secure, "Secure should be false in non-production")
		assert.Equal(t, http.SameSiteLaxMode, config.SameSite, "SameSite should be Lax in non-production")
	})

	t.Run("empty environment defaults to development behavior", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Unsetenv("ENVIRONMENT")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		config := GetCookieConfig()

		assert.False(t, config.Secure, "Secure should be false when ENVIRONMENT not set")
		assert.Equal(t, http.SameSiteLaxMode, config.SameSite)
	})
}

// =============================================================================
// SetAccessTokenCookie Tests
// =============================================================================

func TestSetAccessTokenCookie(t *testing.T) {
	t.Run("sets cookie with correct attributes in development", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "development")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		w := httptest.NewRecorder()
		token := "test-access-token"
		expiresIn := 15 * time.Minute

		SetAccessTokenCookie(w, token, expiresIn)

		cookies := w.Result().Cookies()
		require.Len(t, cookies, 1)

		cookie := cookies[0]
		assert.Equal(t, AccessTokenCookieName, cookie.Name)
		assert.Equal(t, token, cookie.Value)
		assert.Equal(t, "/", cookie.Path)
		assert.Equal(t, int(expiresIn.Seconds()), cookie.MaxAge)
		assert.True(t, cookie.HttpOnly, "Cookie should be HttpOnly")
		assert.False(t, cookie.Secure, "Cookie should not be Secure in development")
	})

	t.Run("sets cookie with correct attributes in production", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		originalDomain := os.Getenv("COOKIE_DOMAIN")
		os.Setenv("ENVIRONMENT", "production")
		os.Setenv("COOKIE_DOMAIN", ".ishkul.org")
		defer func() {
			os.Setenv("ENVIRONMENT", originalEnv)
			if originalDomain != "" {
				os.Setenv("COOKIE_DOMAIN", originalDomain)
			} else {
				os.Unsetenv("COOKIE_DOMAIN")
			}
		}()

		w := httptest.NewRecorder()
		token := "test-access-token"
		expiresIn := 15 * time.Minute

		SetAccessTokenCookie(w, token, expiresIn)

		cookies := w.Result().Cookies()
		require.Len(t, cookies, 1)

		cookie := cookies[0]
		assert.Equal(t, AccessTokenCookieName, cookie.Name)
		assert.True(t, cookie.HttpOnly, "Cookie should be HttpOnly")
		assert.True(t, cookie.Secure, "Cookie should be Secure in production")
		assert.Contains(t, cookie.Domain, "ishkul.org")
		assert.Equal(t, http.SameSiteStrictMode, cookie.SameSite)
	})

	t.Run("handles different expiration durations", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "development")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		testCases := []time.Duration{
			1 * time.Minute,
			30 * time.Minute,
			1 * time.Hour,
			24 * time.Hour,
		}

		for _, duration := range testCases {
			w := httptest.NewRecorder()
			SetAccessTokenCookie(w, "token", duration)

			cookies := w.Result().Cookies()
			require.Len(t, cookies, 1)
			assert.Equal(t, int(duration.Seconds()), cookies[0].MaxAge)
		}
	})
}

// =============================================================================
// SetRefreshTokenCookie Tests
// =============================================================================

func TestSetRefreshTokenCookie(t *testing.T) {
	t.Run("sets cookie with restricted path", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "development")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		w := httptest.NewRecorder()
		token := "test-refresh-token"
		expiresIn := 7 * 24 * time.Hour

		SetRefreshTokenCookie(w, token, expiresIn)

		cookies := w.Result().Cookies()
		require.Len(t, cookies, 1)

		cookie := cookies[0]
		assert.Equal(t, RefreshTokenCookieName, cookie.Name)
		assert.Equal(t, token, cookie.Value)
		assert.Equal(t, "/api/auth/refresh", cookie.Path, "Refresh token should only be sent to refresh endpoint")
		assert.True(t, cookie.HttpOnly, "Cookie should be HttpOnly")
	})

	t.Run("sets correct attributes in production", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		originalDomain := os.Getenv("COOKIE_DOMAIN")
		os.Setenv("ENVIRONMENT", "production")
		os.Setenv("COOKIE_DOMAIN", ".ishkul.org")
		defer func() {
			os.Setenv("ENVIRONMENT", originalEnv)
			if originalDomain != "" {
				os.Setenv("COOKIE_DOMAIN", originalDomain)
			} else {
				os.Unsetenv("COOKIE_DOMAIN")
			}
		}()

		w := httptest.NewRecorder()
		SetRefreshTokenCookie(w, "refresh-token", 7*24*time.Hour)

		cookies := w.Result().Cookies()
		require.Len(t, cookies, 1)

		cookie := cookies[0]
		assert.Equal(t, RefreshTokenCookieName, cookie.Name)
		assert.True(t, cookie.Secure, "Cookie should be Secure in production")
		assert.Equal(t, http.SameSiteStrictMode, cookie.SameSite)
		assert.Contains(t, cookie.Domain, "ishkul.org")
	})
}

// =============================================================================
// ClearAuthCookies Tests
// =============================================================================

func TestClearAuthCookies(t *testing.T) {
	t.Run("clears both auth cookies", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "development")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		w := httptest.NewRecorder()

		ClearAuthCookies(w)

		cookies := w.Result().Cookies()
		assert.Len(t, cookies, 2, "Should set two cookies to clear")

		// Find access token cookie
		var accessCookie, refreshCookie *http.Cookie
		for _, c := range cookies {
			if c.Name == AccessTokenCookieName {
				accessCookie = c
			}
			if c.Name == RefreshTokenCookieName {
				refreshCookie = c
			}
		}

		require.NotNil(t, accessCookie)
		require.NotNil(t, refreshCookie)

		assert.Empty(t, accessCookie.Value, "Access cookie value should be empty")
		assert.Equal(t, -1, accessCookie.MaxAge, "Access cookie MaxAge should be -1 to delete")
		assert.Equal(t, "/", accessCookie.Path)

		assert.Empty(t, refreshCookie.Value, "Refresh cookie value should be empty")
		assert.Equal(t, -1, refreshCookie.MaxAge, "Refresh cookie MaxAge should be -1 to delete")
		assert.Equal(t, "/api/auth/refresh", refreshCookie.Path)
	})

	t.Run("sets correct attributes in production", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		originalDomain := os.Getenv("COOKIE_DOMAIN")
		os.Setenv("ENVIRONMENT", "production")
		os.Setenv("COOKIE_DOMAIN", ".ishkul.org")
		defer func() {
			os.Setenv("ENVIRONMENT", originalEnv)
			if originalDomain != "" {
				os.Setenv("COOKIE_DOMAIN", originalDomain)
			} else {
				os.Unsetenv("COOKIE_DOMAIN")
			}
		}()

		w := httptest.NewRecorder()

		ClearAuthCookies(w)

		cookies := w.Result().Cookies()
		for _, c := range cookies {
			assert.True(t, c.Secure, "Cookie %s should be Secure in production", c.Name)
			assert.Contains(t, c.Domain, "ishkul.org")
		}
	})
}

// =============================================================================
// GetAccessTokenFromCookie Tests
// =============================================================================

func TestGetAccessTokenFromCookie(t *testing.T) {
	t.Run("returns token when cookie exists", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  AccessTokenCookieName,
			Value: "test-access-token",
		})

		token := GetAccessTokenFromCookie(req)

		assert.Equal(t, "test-access-token", token)
	})

	t.Run("returns empty string when cookie does not exist", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)

		token := GetAccessTokenFromCookie(req)

		assert.Empty(t, token)
	})

	t.Run("returns empty string when different cookie exists", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  "other_cookie",
			Value: "some-value",
		})

		token := GetAccessTokenFromCookie(req)

		assert.Empty(t, token)
	})

	t.Run("handles empty cookie value", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  AccessTokenCookieName,
			Value: "",
		})

		token := GetAccessTokenFromCookie(req)

		assert.Empty(t, token)
	})
}

// =============================================================================
// GetRefreshTokenFromCookie Tests
// =============================================================================

func TestGetRefreshTokenFromCookie(t *testing.T) {
	t.Run("returns token when cookie exists", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/refresh", nil)
		req.AddCookie(&http.Cookie{
			Name:  RefreshTokenCookieName,
			Value: "test-refresh-token",
		})

		token := GetRefreshTokenFromCookie(req)

		assert.Equal(t, "test-refresh-token", token)
	})

	t.Run("returns empty string when cookie does not exist", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/refresh", nil)

		token := GetRefreshTokenFromCookie(req)

		assert.Empty(t, token)
	})

	t.Run("returns empty string when different cookie exists", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/refresh", nil)
		req.AddCookie(&http.Cookie{
			Name:  AccessTokenCookieName,
			Value: "access-token",
		})

		token := GetRefreshTokenFromCookie(req)

		assert.Empty(t, token)
	})
}

// =============================================================================
// SetCSRFTokenCookie Tests
// =============================================================================

func TestSetCSRFTokenCookie(t *testing.T) {
	t.Run("sets non-HttpOnly CSRF cookie", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "development")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		w := httptest.NewRecorder()
		token := "csrf-token-12345"

		SetCSRFTokenCookie(w, token)

		cookies := w.Result().Cookies()
		require.Len(t, cookies, 1)

		cookie := cookies[0]
		assert.Equal(t, CSRFTokenCookieName, cookie.Name)
		assert.Equal(t, token, cookie.Value)
		assert.Equal(t, "/", cookie.Path)
		assert.False(t, cookie.HttpOnly, "CSRF cookie must NOT be HttpOnly (needs JS access)")
		assert.Equal(t, 86400*7, cookie.MaxAge, "CSRF cookie should last 7 days")
	})

	t.Run("sets correct attributes in production", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		originalDomain := os.Getenv("COOKIE_DOMAIN")
		os.Setenv("ENVIRONMENT", "production")
		os.Setenv("COOKIE_DOMAIN", ".ishkul.org")
		defer func() {
			os.Setenv("ENVIRONMENT", originalEnv)
			if originalDomain != "" {
				os.Setenv("COOKIE_DOMAIN", originalDomain)
			} else {
				os.Unsetenv("COOKIE_DOMAIN")
			}
		}()

		w := httptest.NewRecorder()
		SetCSRFTokenCookie(w, "csrf-token")

		cookies := w.Result().Cookies()
		require.Len(t, cookies, 1)

		cookie := cookies[0]
		assert.True(t, cookie.Secure, "CSRF cookie should be Secure in production")
		assert.Equal(t, http.SameSiteStrictMode, cookie.SameSite)
		assert.False(t, cookie.HttpOnly, "CSRF cookie must NOT be HttpOnly")
	})
}

// =============================================================================
// ValidateCSRFToken Tests
// =============================================================================

func TestValidateCSRFToken(t *testing.T) {
	t.Run("returns true when cookie and header match", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  CSRFTokenCookieName,
			Value: "csrf-token-12345",
		})
		req.Header.Set(CSRFHeaderName, "csrf-token-12345")

		valid := ValidateCSRFToken(req)

		assert.True(t, valid)
	})

	t.Run("returns false when header missing", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  CSRFTokenCookieName,
			Value: "csrf-token-12345",
		})

		valid := ValidateCSRFToken(req)

		assert.False(t, valid)
	})

	t.Run("returns false when cookie missing", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", nil)
		req.Header.Set(CSRFHeaderName, "csrf-token-12345")

		valid := ValidateCSRFToken(req)

		assert.False(t, valid)
	})

	t.Run("returns false when cookie and header do not match", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  CSRFTokenCookieName,
			Value: "csrf-token-12345",
		})
		req.Header.Set(CSRFHeaderName, "different-token")

		valid := ValidateCSRFToken(req)

		assert.False(t, valid)
	})

	t.Run("returns false when both are empty", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  CSRFTokenCookieName,
			Value: "",
		})
		req.Header.Set(CSRFHeaderName, "")

		valid := ValidateCSRFToken(req)

		// Empty header should return false
		assert.False(t, valid)
	})

	t.Run("is case sensitive", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", nil)
		req.AddCookie(&http.Cookie{
			Name:  CSRFTokenCookieName,
			Value: "CSRF-Token",
		})
		req.Header.Set(CSRFHeaderName, "csrf-token")

		valid := ValidateCSRFToken(req)

		assert.False(t, valid, "CSRF validation should be case sensitive")
	})
}

// =============================================================================
// Constants Tests
// =============================================================================

func TestCookieConstants(t *testing.T) {
	t.Run("cookie names are defined", func(t *testing.T) {
		assert.Equal(t, "ishkul_access_token", AccessTokenCookieName)
		assert.Equal(t, "ishkul_refresh_token", RefreshTokenCookieName)
		assert.Equal(t, "ishkul_csrf_token", CSRFTokenCookieName)
	})

	t.Run("CSRF header name is defined", func(t *testing.T) {
		assert.Equal(t, "X-CSRF-Token", CSRFHeaderName)
	})
}
