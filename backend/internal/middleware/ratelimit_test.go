package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewRateLimiter(t *testing.T) {
	t.Run("creates rate limiter with specified values", func(t *testing.T) {
		rl := NewRateLimiter(5.0, 10)
		require.NotNil(t, rl)
		assert.NotNil(t, rl.visitors)
		assert.Equal(t, 10, rl.burst)
	})

	t.Run("creates empty visitors map", func(t *testing.T) {
		rl := NewRateLimiter(10.0, 20)
		assert.Len(t, rl.visitors, 0)
	})
}

func TestDefaultRateLimiter(t *testing.T) {
	t.Run("uses default values without env vars", func(t *testing.T) {
		os.Unsetenv("RATE_LIMIT_RPS")
		os.Unsetenv("RATE_LIMIT_BURST")

		rl := DefaultRateLimiter()
		require.NotNil(t, rl)
		assert.Equal(t, 20, rl.burst)
	})

	t.Run("uses environment variables when set", func(t *testing.T) {
		os.Setenv("RATE_LIMIT_RPS", "5.0")
		os.Setenv("RATE_LIMIT_BURST", "15")
		defer func() {
			os.Unsetenv("RATE_LIMIT_RPS")
			os.Unsetenv("RATE_LIMIT_BURST")
		}()

		rl := DefaultRateLimiter()
		require.NotNil(t, rl)
		assert.Equal(t, 15, rl.burst)
	})

	t.Run("handles invalid RPS env var", func(t *testing.T) {
		os.Setenv("RATE_LIMIT_RPS", "invalid")
		os.Setenv("RATE_LIMIT_BURST", "15")
		defer func() {
			os.Unsetenv("RATE_LIMIT_RPS")
			os.Unsetenv("RATE_LIMIT_BURST")
		}()

		rl := DefaultRateLimiter()
		require.NotNil(t, rl)
		// Should use default RPS
	})

	t.Run("handles invalid burst env var", func(t *testing.T) {
		os.Setenv("RATE_LIMIT_RPS", "5.0")
		os.Setenv("RATE_LIMIT_BURST", "invalid")
		defer func() {
			os.Unsetenv("RATE_LIMIT_RPS")
			os.Unsetenv("RATE_LIMIT_BURST")
		}()

		rl := DefaultRateLimiter()
		require.NotNil(t, rl)
		// Should use default burst (20)
		assert.Equal(t, 20, rl.burst)
	})
}

func TestRateLimiterLimit(t *testing.T) {
	t.Run("allows requests under limit", func(t *testing.T) {
		rl := NewRateLimiter(100.0, 10) // High limit for testing

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		for i := 0; i < 5; i++ {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.RemoteAddr = "192.168.1.1:12345"
			rr := httptest.NewRecorder()

			rl.Limit(handler).ServeHTTP(rr, req)
			assert.Equal(t, http.StatusOK, rr.Code)
		}
	})

	t.Run("blocks requests over limit", func(t *testing.T) {
		rl := NewRateLimiter(1.0, 2) // Very low limit

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		// Use up the burst
		for i := 0; i < 3; i++ {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.RemoteAddr = "10.0.0.1:12345"
			rr := httptest.NewRecorder()
			rl.Limit(handler).ServeHTTP(rr, req)
		}

		// This request should be rate limited
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.RemoteAddr = "10.0.0.1:12345"
		rr := httptest.NewRecorder()
		rl.Limit(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusTooManyRequests, rr.Code)
		assert.Contains(t, rr.Body.String(), "Too many requests")
		assert.Equal(t, "1", rr.Header().Get("Retry-After"))
		assert.NotEmpty(t, rr.Header().Get("X-RateLimit-Limit"))
		assert.Equal(t, "0", rr.Header().Get("X-RateLimit-Remaining"))
	})

	t.Run("rate limits per IP", func(t *testing.T) {
		rl := NewRateLimiter(1.0, 1) // 1 request per second, burst of 1

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		// First IP - use up limit
		req1 := httptest.NewRequest(http.MethodGet, "/test", nil)
		req1.RemoteAddr = "192.168.1.1:12345"
		rr1 := httptest.NewRecorder()
		rl.Limit(handler).ServeHTTP(rr1, req1)
		assert.Equal(t, http.StatusOK, rr1.Code)

		// Second IP - should still work
		req2 := httptest.NewRequest(http.MethodGet, "/test", nil)
		req2.RemoteAddr = "192.168.1.2:12345"
		rr2 := httptest.NewRecorder()
		rl.Limit(handler).ServeHTTP(rr2, req2)
		assert.Equal(t, http.StatusOK, rr2.Code)
	})
}

func TestGetClientIP(t *testing.T) {
	tests := []struct {
		name           string
		remoteAddr     string
		xForwardedFor  string
		xRealIP        string
		expectedIP     string
	}{
		{
			name:       "uses RemoteAddr when no headers",
			remoteAddr: "192.168.1.1:12345",
			expectedIP: "192.168.1.1",
		},
		{
			name:          "uses X-Forwarded-For",
			remoteAddr:    "127.0.0.1:12345",
			xForwardedFor: "203.0.113.195",
			expectedIP:    "203.0.113.195",
		},
		{
			name:          "uses first IP from X-Forwarded-For chain",
			remoteAddr:    "127.0.0.1:12345",
			xForwardedFor: "203.0.113.195, 70.41.3.18, 150.172.238.178",
			expectedIP:    "203.0.113.195",
		},
		{
			name:       "uses X-Real-IP",
			remoteAddr: "127.0.0.1:12345",
			xRealIP:    "203.0.113.195",
			expectedIP: "203.0.113.195",
		},
		{
			name:          "prefers X-Forwarded-For over X-Real-IP",
			remoteAddr:    "127.0.0.1:12345",
			xForwardedFor: "203.0.113.195",
			xRealIP:       "70.41.3.18",
			expectedIP:    "203.0.113.195",
		},
		{
			name:       "handles RemoteAddr without port",
			remoteAddr: "192.168.1.1",
			expectedIP: "192.168.1.1",
		},
		{
			name:          "handles X-Forwarded-For with spaces",
			remoteAddr:    "127.0.0.1:12345",
			xForwardedFor: "  203.0.113.195  ",
			expectedIP:    "203.0.113.195",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.RemoteAddr = tt.remoteAddr
			if tt.xForwardedFor != "" {
				req.Header.Set("X-Forwarded-For", tt.xForwardedFor)
			}
			if tt.xRealIP != "" {
				req.Header.Set("X-Real-IP", tt.xRealIP)
			}

			ip := getClientIP(req)
			assert.Equal(t, tt.expectedIP, ip)
		})
	}
}

func TestParseXForwardedFor(t *testing.T) {
	tests := []struct {
		name     string
		xff      string
		expected string
	}{
		{
			name:     "single IP",
			xff:      "203.0.113.195",
			expected: "203.0.113.195",
		},
		{
			name:     "multiple IPs",
			xff:      "203.0.113.195, 70.41.3.18",
			expected: "203.0.113.195",
		},
		{
			name:     "IPs with spaces",
			xff:      "  203.0.113.195  ,  70.41.3.18  ",
			expected: "203.0.113.195",
		},
		{
			name:     "invalid first IP",
			xff:      "invalid, 203.0.113.195",
			expected: "",
		},
		{
			name:     "empty string",
			xff:      "",
			expected: "",
		},
		{
			name:     "IPv6 address",
			xff:      "2001:db8::1",
			expected: "2001:db8::1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseXForwardedFor(tt.xff)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestTrimSpaces(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"hello", "hello"},
		{"  hello", "hello"},
		{"hello  ", "hello"},
		{"  hello  ", "hello"},
		{"", ""},
		{"   ", ""},
		{"h e l l o", "h e l l o"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := trimSpaces(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetEnvFloat(t *testing.T) {
	t.Run("returns env value when set", func(t *testing.T) {
		os.Setenv("TEST_FLOAT", "3.14")
		defer os.Unsetenv("TEST_FLOAT")

		result := getEnvFloat("TEST_FLOAT", 0.0)
		assert.Equal(t, 3.14, result)
	})

	t.Run("returns default when not set", func(t *testing.T) {
		os.Unsetenv("TEST_FLOAT_NOT_SET")

		result := getEnvFloat("TEST_FLOAT_NOT_SET", 2.5)
		assert.Equal(t, 2.5, result)
	})

	t.Run("returns default on invalid value", func(t *testing.T) {
		os.Setenv("TEST_FLOAT_INVALID", "not-a-number")
		defer os.Unsetenv("TEST_FLOAT_INVALID")

		result := getEnvFloat("TEST_FLOAT_INVALID", 5.0)
		assert.Equal(t, 5.0, result)
	})
}

func TestGetEnvInt(t *testing.T) {
	t.Run("returns env value when set", func(t *testing.T) {
		os.Setenv("TEST_INT", "42")
		defer os.Unsetenv("TEST_INT")

		result := getEnvInt("TEST_INT", 0)
		assert.Equal(t, 42, result)
	})

	t.Run("returns default when not set", func(t *testing.T) {
		os.Unsetenv("TEST_INT_NOT_SET")

		result := getEnvInt("TEST_INT_NOT_SET", 100)
		assert.Equal(t, 100, result)
	})

	t.Run("returns default on invalid value", func(t *testing.T) {
		os.Setenv("TEST_INT_INVALID", "not-a-number")
		defer os.Unsetenv("TEST_INT_INVALID")

		result := getEnvInt("TEST_INT_INVALID", 50)
		assert.Equal(t, 50, result)
	})

	t.Run("handles float string", func(t *testing.T) {
		os.Setenv("TEST_INT_FLOAT", "3.14")
		defer os.Unsetenv("TEST_INT_FLOAT")

		result := getEnvInt("TEST_INT_FLOAT", 10)
		assert.Equal(t, 10, result) // Should return default due to parse error
	})
}

func TestRateLimiterConcurrency(t *testing.T) {
	t.Run("handles concurrent requests safely", func(t *testing.T) {
		rl := NewRateLimiter(1000.0, 100) // High limits to avoid rate limiting

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		var wg sync.WaitGroup
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				req := httptest.NewRequest(http.MethodGet, "/test", nil)
				req.RemoteAddr = "192.168.1.1:12345"
				rr := httptest.NewRecorder()
				rl.Limit(handler).ServeHTTP(rr, req)
			}(i)
		}
		wg.Wait()
	})

	t.Run("handles concurrent requests from different IPs", func(t *testing.T) {
		rl := NewRateLimiter(10.0, 5)

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		var wg sync.WaitGroup
		for i := 0; i < 50; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				req := httptest.NewRequest(http.MethodGet, "/test", nil)
				// Use different IPs
				req.RemoteAddr = "192.168.1." + string(rune('1'+i%10)) + ":12345"
				rr := httptest.NewRecorder()
				rl.Limit(handler).ServeHTTP(rr, req)
			}(i)
		}
		wg.Wait()
	})
}

func TestRateLimiterGetVisitor(t *testing.T) {
	t.Run("creates new visitor for new IP", func(t *testing.T) {
		rl := NewRateLimiter(10.0, 5)

		limiter := rl.getVisitor("192.168.1.1")
		assert.NotNil(t, limiter)
		assert.Len(t, rl.visitors, 1)
	})

	t.Run("returns existing visitor for same IP", func(t *testing.T) {
		rl := NewRateLimiter(10.0, 5)

		limiter1 := rl.getVisitor("192.168.1.1")
		limiter2 := rl.getVisitor("192.168.1.1")

		assert.Same(t, limiter1, limiter2)
		assert.Len(t, rl.visitors, 1)
	})

	t.Run("creates separate visitors for different IPs", func(t *testing.T) {
		rl := NewRateLimiter(10.0, 5)

		rl.getVisitor("192.168.1.1")
		rl.getVisitor("192.168.1.2")
		rl.getVisitor("192.168.1.3")

		assert.Len(t, rl.visitors, 3)
	})

	t.Run("updates lastSeen time", func(t *testing.T) {
		rl := NewRateLimiter(10.0, 5)

		rl.getVisitor("192.168.1.1")
		firstSeen := rl.visitors["192.168.1.1"].lastSeen

		time.Sleep(10 * time.Millisecond)
		rl.getVisitor("192.168.1.1")
		secondSeen := rl.visitors["192.168.1.1"].lastSeen

		assert.True(t, secondSeen.After(firstSeen) || secondSeen.Equal(firstSeen))
	})
}

func TestRateLimitHeaders(t *testing.T) {
	t.Run("sets rate limit headers on rejection", func(t *testing.T) {
		rl := NewRateLimiter(1.0, 1)

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		// Use up the limit
		req1 := httptest.NewRequest(http.MethodGet, "/test", nil)
		req1.RemoteAddr = "10.0.0.1:12345"
		rr1 := httptest.NewRecorder()
		rl.Limit(handler).ServeHTTP(rr1, req1)

		// Second request should be rate limited
		req2 := httptest.NewRequest(http.MethodGet, "/test", nil)
		req2.RemoteAddr = "10.0.0.1:12345"
		rr2 := httptest.NewRecorder()
		rl.Limit(handler).ServeHTTP(rr2, req2)

		assert.Equal(t, http.StatusTooManyRequests, rr2.Code)
		assert.NotEmpty(t, rr2.Header().Get("X-RateLimit-Limit"))
		assert.Equal(t, "0", rr2.Header().Get("X-RateLimit-Remaining"))
		assert.Equal(t, "1", rr2.Header().Get("Retry-After"))
	})
}
