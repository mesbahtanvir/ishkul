package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// =============================================================================
// SecurityHeaders Tests
// =============================================================================

func TestSecurityHeaders(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	t.Run("sets Strict-Transport-Security header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		hsts := rr.Header().Get("Strict-Transport-Security")
		assert.NotEmpty(t, hsts)
		assert.Contains(t, hsts, "max-age=31536000")
		assert.Contains(t, hsts, "includeSubDomains")
		assert.Contains(t, hsts, "preload")
	})

	t.Run("sets X-Frame-Options header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		assert.Equal(t, "DENY", rr.Header().Get("X-Frame-Options"))
	})

	t.Run("sets X-Content-Type-Options header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		assert.Equal(t, "nosniff", rr.Header().Get("X-Content-Type-Options"))
	})

	t.Run("sets X-XSS-Protection header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		assert.Equal(t, "1; mode=block", rr.Header().Get("X-XSS-Protection"))
	})

	t.Run("sets Referrer-Policy header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		assert.Equal(t, "strict-origin-when-cross-origin", rr.Header().Get("Referrer-Policy"))
	})

	t.Run("sets Permissions-Policy header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		policy := rr.Header().Get("Permissions-Policy")
		assert.NotEmpty(t, policy)
		assert.Contains(t, policy, "geolocation=()")
		assert.Contains(t, policy, "microphone=()")
		assert.Contains(t, policy, "camera=()")
	})

	t.Run("sets Content-Security-Policy header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		csp := rr.Header().Get("Content-Security-Policy")
		assert.NotEmpty(t, csp)
		assert.Contains(t, csp, "default-src 'self'")
	})

	t.Run("sets Cache-Control headers for API endpoints", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		cacheControl := rr.Header().Get("Cache-Control")
		assert.NotEmpty(t, cacheControl)
		assert.Contains(t, cacheControl, "no-store")
		assert.Contains(t, cacheControl, "no-cache")
		assert.Contains(t, cacheControl, "must-revalidate")
		assert.Contains(t, cacheControl, "private")

		assert.Equal(t, "no-cache", rr.Header().Get("Pragma"))
		assert.Equal(t, "0", rr.Header().Get("Expires"))
	})

	t.Run("does not set Cache-Control for non-API endpoints", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		assert.Empty(t, rr.Header().Get("Cache-Control"))
		assert.Empty(t, rr.Header().Get("Pragma"))
		assert.Empty(t, rr.Header().Get("Expires"))
	})

	t.Run("calls next handler", func(t *testing.T) {
		called := false
		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(testHandler).ServeHTTP(rr, req)

		assert.True(t, called, "next handler should be called")
		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("works with POST requests", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/data", nil)
		rr := httptest.NewRecorder()

		SecurityHeaders(handler).ServeHTTP(rr, req)

		assert.NotEmpty(t, rr.Header().Get("Strict-Transport-Security"))
		assert.NotEmpty(t, rr.Header().Get("Content-Security-Policy"))
	})

	t.Run("works with all HTTP methods", func(t *testing.T) {
		methods := []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/test", nil)
				rr := httptest.NewRecorder()

				SecurityHeaders(handler).ServeHTTP(rr, req)

				assert.NotEmpty(t, rr.Header().Get("X-Frame-Options"))
			})
		}
	})
}

// =============================================================================
// buildCSP Tests
// =============================================================================

func TestBuildCSP(t *testing.T) {
	t.Run("includes default-src directive", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "default-src 'self'")
	})

	t.Run("includes script-src directive", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "script-src 'self'")
	})

	t.Run("includes style-src directive with unsafe-inline", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "style-src 'self' 'unsafe-inline'")
	})

	t.Run("includes img-src directive", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "img-src 'self' data: https:")
	})

	t.Run("includes font-src directive", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "font-src 'self' https://fonts.gstatic.com")
	})

	t.Run("includes connect-src directive with Firebase endpoints", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "connect-src")
		assert.Contains(t, csp, "identitytoolkit.googleapis.com")
		assert.Contains(t, csp, "securetoken.googleapis.com")
		assert.Contains(t, csp, "firestore.googleapis.com")
	})

	t.Run("includes frame-ancestors directive", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "frame-ancestors 'none'")
	})

	t.Run("includes base-uri directive", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "base-uri 'self'")
	})

	t.Run("includes form-action directive", func(t *testing.T) {
		csp := buildCSP()
		assert.Contains(t, csp, "form-action 'self'")
	})

	t.Run("uses semicolon separators", func(t *testing.T) {
		csp := buildCSP()
		directives := strings.Split(csp, "; ")
		assert.Greater(t, len(directives), 1, "CSP should have multiple directives")
	})
}

// =============================================================================
// SecureRedirect Tests
// =============================================================================

func TestSecureRedirect(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	t.Run("does not redirect in development", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "development")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Forwarded-Proto", "http")
		rr := httptest.NewRecorder()

		SecureRedirect(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code, "should not redirect in development")
	})

	t.Run("redirects HTTP to HTTPS in production", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "production")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Host = "ishkul.org"
		req.Header.Set("X-Forwarded-Proto", "http")
		rr := httptest.NewRecorder()

		SecureRedirect(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusMovedPermanently, rr.Code)
		location := rr.Header().Get("Location")
		assert.Equal(t, "https://ishkul.org/test", location)
	})

	t.Run("does not redirect HTTPS requests in production", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "production")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Host = "ishkul.org"
		req.Header.Set("X-Forwarded-Proto", "https")
		rr := httptest.NewRecorder()

		SecureRedirect(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code, "should not redirect HTTPS requests")
	})

	t.Run("does not redirect when X-Forwarded-Proto not set in production", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "production")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Host = "ishkul.org"
		rr := httptest.NewRecorder()

		SecureRedirect(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code, "should not redirect when header is not set")
	})

	t.Run("preserves request URI in redirect", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "production")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		req := httptest.NewRequest(http.MethodGet, "/api/users?page=1&limit=10", nil)
		req.Host = "ishkul.org"
		req.Header.Set("X-Forwarded-Proto", "http")
		rr := httptest.NewRecorder()

		SecureRedirect(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusMovedPermanently, rr.Code)
		location := rr.Header().Get("Location")
		assert.Equal(t, "https://ishkul.org/api/users?page=1&limit=10", location)
	})

	t.Run("calls next handler when not redirecting", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "production")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		called := false
		testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Host = "ishkul.org"
		req.Header.Set("X-Forwarded-Proto", "https")
		rr := httptest.NewRecorder()

		SecureRedirect(testHandler).ServeHTTP(rr, req)

		assert.True(t, called, "next handler should be called")
	})

	t.Run("handles empty environment variable", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Unsetenv("ENVIRONMENT")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Forwarded-Proto", "http")
		rr := httptest.NewRecorder()

		SecureRedirect(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code, "should not redirect when environment not set")
	})

	t.Run("works with staging environment", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "staging")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Forwarded-Proto", "http")
		rr := httptest.NewRecorder()

		SecureRedirect(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code, "should not redirect in staging")
	})
}

// =============================================================================
// Integration Tests
// =============================================================================

func TestSecurityMiddlewareChain(t *testing.T) {
	t.Run("SecurityHeaders and SecureRedirect can be chained", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "production")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		finalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		// Chain the middleware
		handler := SecurityHeaders(SecureRedirect(finalHandler))

		// Test HTTPS request
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.Host = "ishkul.org"
		req.Header.Set("X-Forwarded-Proto", "https")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.NotEmpty(t, rr.Header().Get("Strict-Transport-Security"))
		assert.NotEmpty(t, rr.Header().Get("Content-Security-Policy"))
		assert.NotEmpty(t, rr.Header().Get("Cache-Control"))
	})

	t.Run("SecurityHeaders are set before redirect", func(t *testing.T) {
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENVIRONMENT", "production")
		defer os.Setenv("ENVIRONMENT", originalEnv)

		finalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		// Chain: SecurityHeaders -> SecureRedirect -> finalHandler
		handler := SecurityHeaders(SecureRedirect(finalHandler))

		// Test HTTP request (should redirect)
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Host = "ishkul.org"
		req.Header.Set("X-Forwarded-Proto", "http")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusMovedPermanently, rr.Code)
		// Security headers should still be set even on redirect
		assert.NotEmpty(t, rr.Header().Get("Strict-Transport-Security"))
	})
}
