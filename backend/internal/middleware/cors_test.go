package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsVercelPreviewDomain(t *testing.T) {
	tests := []struct {
		name     string
		origin   string
		expected bool
	}{
		{
			name:     "vercel production domain",
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
			result := isVercelPreviewDomain(tt.origin)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsProductionDomain(t *testing.T) {
	tests := []struct {
		name     string
		origin   string
		expected bool
	}{
		{
			name:     "ishkul.org",
			origin:   "https://ishkul.org",
			expected: true,
		},
		{
			name:     "www.ishkul.org",
			origin:   "https://www.ishkul.org",
			expected: true,
		},
		{
			name:     "http ishkul.org",
			origin:   "http://ishkul.org",
			expected: false,
		},
		{
			name:     "vercel domain",
			origin:   "https://ishkul.vercel.app",
			expected: false,
		},
		{
			name:     "other domain",
			origin:   "https://example.com",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isProductionDomain(tt.origin)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsStagingEnvironment(t *testing.T) {
	originalEnv := os.Getenv("ENVIRONMENT")
	defer os.Setenv("ENVIRONMENT", originalEnv)

	tests := []struct {
		name     string
		envValue string
		expected bool
	}{
		{
			name:     "staging environment",
			envValue: "staging",
			expected: true,
		},
		{
			name:     "production environment",
			envValue: "production",
			expected: false,
		},
		{
			name:     "development environment",
			envValue: "development",
			expected: false,
		},
		{
			name:     "empty environment",
			envValue: "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("ENVIRONMENT", tt.envValue)
			result := isStagingEnvironment()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsStagingDomain(t *testing.T) {
	tests := []struct {
		name     string
		origin   string
		expected bool
	}{
		{
			name:     "staging.ishkul.org",
			origin:   "https://staging.ishkul.org",
			expected: true,
		},
		{
			name:     "http staging.ishkul.org",
			origin:   "http://staging.ishkul.org",
			expected: false,
		},
		{
			name:     "production domain",
			origin:   "https://ishkul.org",
			expected: false,
		},
		{
			name:     "www staging subdomain",
			origin:   "https://www.staging.ishkul.org",
			expected: false,
		},
		{
			name:     "vercel domain",
			origin:   "https://ishkul.vercel.app",
			expected: false,
		},
		{
			name:     "other domain",
			origin:   "https://example.com",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isStagingDomain(tt.origin)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCORSMiddleware(t *testing.T) {
	// Ensure non-production environment for these tests
	originalEnv := os.Getenv("ENVIRONMENT")
	os.Setenv("ENVIRONMENT", "development")
	defer os.Setenv("ENVIRONMENT", originalEnv)

	t.Run("allows Vercel origin in non-production", func(t *testing.T) {
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

	t.Run("allows Vercel domains with custom origins in non-production", func(t *testing.T) {
		os.Setenv("ALLOWED_ORIGINS", "https://custom.example.com")
		os.Setenv("ENVIRONMENT", "development")
		defer os.Unsetenv("ALLOWED_ORIGINS")
		defer os.Unsetenv("ENVIRONMENT")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.vercel.app")
		rr := httptest.NewRecorder()

		CORS(handler).ServeHTTP(rr, req)

		// Vercel domains should be allowed in non-production
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
	t.Run("default origins constant is correct for development", func(t *testing.T) {
		assert.Contains(t, defaultAllowedOrigins, "http://localhost:3000")
		assert.Contains(t, defaultAllowedOrigins, "http://localhost:8081")
		assert.Contains(t, defaultAllowedOrigins, "http://localhost:19006")
	})

	t.Run("production origins constant is correct", func(t *testing.T) {
		assert.Contains(t, productionAllowedOrigins, "https://ishkul.org")
		assert.Contains(t, productionAllowedOrigins, "https://www.ishkul.org")
		assert.NotContains(t, productionAllowedOrigins, "vercel.app")
	})

	t.Run("staging origins constant is correct", func(t *testing.T) {
		assert.Contains(t, stagingAllowedOrigins, "https://staging.ishkul.org")
	})
}

func TestCORSProductionEnvironment(t *testing.T) {
	// Save and restore original environment
	originalEnv := os.Getenv("ENVIRONMENT")
	defer os.Setenv("ENVIRONMENT", originalEnv)

	t.Run("production allows only ishkul.org domains", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "production")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		// Test ishkul.org is allowed
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.org")
		rr := httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Equal(t, "https://ishkul.org", rr.Header().Get("Access-Control-Allow-Origin"))

		// Test www.ishkul.org is allowed
		req = httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://www.ishkul.org")
		rr = httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Equal(t, "https://www.ishkul.org", rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("production rejects staging.ishkul.org", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "production")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://staging.ishkul.org")
		rr := httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"), "Staging domain should be rejected in production")
	})

	t.Run("production rejects Vercel preview domains", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "production")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		// Vercel preview domains should be rejected in production
		vercelOrigins := []string{
			"https://ishkul.vercel.app",
			"https://ishkul-abc123.vercel.app",
			"https://ishkul-pr-42.vercel.app",
		}

		for _, origin := range vercelOrigins {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.Header.Set("Origin", origin)
			rr := httptest.NewRecorder()
			CORS(handler).ServeHTTP(rr, req)
			assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"), "Origin %s should be rejected in production", origin)
		}
	})

	t.Run("production rejects localhost", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "production")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		rr := httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("non-production allows Vercel preview domains", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "development")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		vercelOrigins := []string{
			"https://ishkul.vercel.app",
			"https://ishkul-abc123.vercel.app",
			"https://ishkul-pr-42.vercel.app",
		}

		for _, origin := range vercelOrigins {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.Header.Set("Origin", origin)
			rr := httptest.NewRecorder()
			CORS(handler).ServeHTTP(rr, req)
			assert.Equal(t, origin, rr.Header().Get("Access-Control-Allow-Origin"), "Origin %s should be allowed in development", origin)
		}
	})

	t.Run("non-production also allows production domains", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "development")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.org")
		rr := httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Equal(t, "https://ishkul.org", rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("development allows staging domain", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "development")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://staging.ishkul.org")
		rr := httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Equal(t, "https://staging.ishkul.org", rr.Header().Get("Access-Control-Allow-Origin"))
	})
}

func TestCORSStagingEnvironment(t *testing.T) {
	// Save and restore original environment
	originalEnv := os.Getenv("ENVIRONMENT")
	defer os.Setenv("ENVIRONMENT", originalEnv)

	t.Run("staging allows only staging.ishkul.org", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "staging")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://staging.ishkul.org")
		rr := httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Equal(t, "https://staging.ishkul.org", rr.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("staging rejects production domain ishkul.org", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "staging")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://ishkul.org")
		rr := httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"), "Production domain should be rejected in staging")
	})

	t.Run("staging rejects Vercel preview domains", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "staging")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		vercelOrigins := []string{
			"https://ishkul.vercel.app",
			"https://ishkul-abc123.vercel.app",
		}

		for _, origin := range vercelOrigins {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.Header.Set("Origin", origin)
			rr := httptest.NewRecorder()
			CORS(handler).ServeHTTP(rr, req)
			assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"), "Vercel domain %s should be rejected in staging", origin)
		}
	})

	t.Run("staging rejects localhost", func(t *testing.T) {
		os.Setenv("ENVIRONMENT", "staging")

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		rr := httptest.NewRecorder()
		CORS(handler).ServeHTTP(rr, req)
		assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"), "Localhost should be rejected in staging")
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
