package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsVercelDomain(t *testing.T) {
	tests := []struct {
		name     string
		origin   string
		expected bool
	}{
		{
			name:     "production domain",
			origin:   "https://ishkul.vercel.app",
			expected: true,
		},
		{
			name:     "preview deployment",
			origin:   "https://ishkul-abc123.vercel.app",
			expected: true,
		},
		{
			name:     "preview with team name",
			origin:   "https://ishkul-abc123-my-dream-company.vercel.app",
			expected: true,
		},
		{
			name:     "another ishkul subdomain",
			origin:   "https://my-ishkul-app.vercel.app",
			expected: true,
		},
		{
			name:     "non-vercel domain",
			origin:   "https://example.com",
			expected: false,
		},
		{
			name:     "http instead of https",
			origin:   "http://ishkul.vercel.app",
			expected: false,
		},
		{
			name:     "vercel but not ishkul",
			origin:   "https://other-app.vercel.app",
			expected: false,
		},
		{
			name:     "empty origin",
			origin:   "",
			expected: false,
		},
		{
			name:     "just https://",
			origin:   "https://",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isVercelDomain(tt.origin)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCORSMiddleware(t *testing.T) {
	t.Run("allows production origin", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.vercel.app")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Equal(t, "https://ishkul.vercel.app", rr.Header().Get("Access-Control-Allow-Origin"))
		assert.Equal(t, "true", rr.Header().Get("Access-Control-Allow-Credentials"))
		assert.Equal(t, "Origin", rr.Header().Get("Vary"))
	})

	t.Run("allows localhost development origins", func(t *testing.T) {
		localhostOrigins := []string{
			"http://localhost:3000",
			"http://localhost:8081",
			"http://localhost:19006",
		}

		for _, origin := range localhostOrigins {
			t.Run(origin, func(t *testing.T) {
				handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusOK)
				})

				req := httptest.NewRequest(http.MethodGet, "/test", nil)
				req.Header.Set("Origin", origin)
				rr := httptest.NewRecorder()

				CORS(handler).ServeHTTP(rr, req)

				assert.Equal(t, origin, rr.Header().Get("Access-Control-Allow-Origin"))
			})
		}
	})

	t.Run("allows Vercel preview deployments", func(t *testing.T) {
		previewOrigins := []string{
			"https://ishkul-abc123.vercel.app",
			"https://ishkul-feature-branch.vercel.app",
			"https://ishkul-pr-42-my-dream-company.vercel.app",
		}

		for _, origin := range previewOrigins {
			t.Run(origin, func(t *testing.T) {
				handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusOK)
				})

				req := httptest.NewRequest(http.MethodGet, "/test", nil)
				req.Header.Set("Origin", origin)
				rr := httptest.NewRecorder()

				CORS(handler).ServeHTTP(rr, req)

				assert.Equal(t, origin, rr.Header().Get("Access-Control-Allow-Origin"))
			})
		}
	})

	t.Run("rejects unknown origins", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://malicious-site.com")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("handles OPTIONS preflight request for allowed origin", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called for preflight")
		})

		req := httptest.NewRequest(http.MethodOptions, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.vercel.app")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusNoContent, rr.Code)
		assert.Equal(t, "https://ishkul.vercel.app", rr.Header().Get("Access-Control-Allow-Origin"))
		assert.Contains(t, rr.Header().Get("Access-Control-Allow-Methods"), "GET")
		assert.Contains(t, rr.Header().Get("Access-Control-Allow-Methods"), "POST")
		assert.Contains(t, rr.Header().Get("Access-Control-Allow-Methods"), "PUT")
		assert.Contains(t, rr.Header().Get("Access-Control-Allow-Methods"), "DELETE")
	})

	t.Run("rejects OPTIONS preflight for unknown origin", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Handler should not be called for preflight")
		})

		req := httptest.NewRequest(http.MethodOptions, "/test", nil)
		req.Header.Set("Origin", "https://malicious-site.com")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusForbidden, rr.Code)
	})

	t.Run("handles request without Origin header", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("allows origin with trailing slash", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000/")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Equal(t, "http://localhost:3000/", rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("sets required CORS headers", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.vercel.app")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.NotEmpty(t, rr.Header().Get("Access-Control-Allow-Methods"))
		assert.NotEmpty(t, rr.Header().Get("Access-Control-Allow-Headers"))
		assert.Equal(t, "true", rr.Header().Get("Access-Control-Allow-Credentials"))
		assert.Equal(t, "3600", rr.Header().Get("Access-Control-Max-Age"))
	})

	t.Run("allows Authorization header", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.vercel.app")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Contains(t, rr.Header().Get("Access-Control-Allow-Headers"), "Authorization")
	})
}

func TestCORSWithCustomOrigins(t *testing.T) {
	t.Run("uses ALLOWED_ORIGINS environment variable", func(t *testing.T) {
		os.Setenv("ALLOWED_ORIGINS", "https://custom.example.com,https://another.example.com")
		defer os.Unsetenv("ALLOWED_ORIGINS")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://custom.example.com")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Equal(t, "https://custom.example.com", rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("still allows Vercel domains with custom origins set", func(t *testing.T) {
		os.Setenv("ALLOWED_ORIGINS", "https://custom.example.com")
		defer os.Unsetenv("ALLOWED_ORIGINS")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.vercel.app")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		// Vercel domains should still be allowed
		assert.Equal(t, "https://ishkul.vercel.app", rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("handles whitespace in ALLOWED_ORIGINS", func(t *testing.T) {
		os.Setenv("ALLOWED_ORIGINS", " https://custom.example.com , https://another.example.com ")
		defer os.Unsetenv("ALLOWED_ORIGINS")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://custom.example.com")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		assert.Equal(t, "https://custom.example.com", rr.Header().Get("Access-Control-Allow-Origin"))
	})
}

func TestCORSDefaultAllowedOrigins(t *testing.T) {
	t.Run("default origins constant is correct", func(t *testing.T) {
		assert.Contains(t, defaultAllowedOrigins, "http://localhost:3000")
		assert.Contains(t, defaultAllowedOrigins, "http://localhost:8081")
		assert.Contains(t, defaultAllowedOrigins, "http://localhost:19006")
		assert.Contains(t, defaultAllowedOrigins, "https://ishkul.vercel.app")
	})
}

func TestCORSAllMethods(t *testing.T) {
	methods := []string{
		http.MethodGet,
		http.MethodPost,
		http.MethodPut,
		http.MethodDelete,
		http.MethodPatch,
	}

	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			req := httptest.NewRequest(method, "/test", nil)
			req.Header.Set("Origin", "https://ishkul.vercel.app")
			rr := httptest.NewRecorder()

			CORS(handler).ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, "https://ishkul.vercel.app", rr.Header().Get("Access-Control-Allow-Origin"))
		})
	}
}
