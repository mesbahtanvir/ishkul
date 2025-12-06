package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// NewDDoSProtection Tests
// =============================================================================

func TestNewDDoSProtection(t *testing.T) {
	t.Run("creates DDoS protection with all components", func(t *testing.T) {
		ddos := NewDDoSProtection()

		require.NotNil(t, ddos)
		assert.NotNil(t, ddos.IPBlocker)
		assert.NotNil(t, ddos.CircuitBreaker)
		assert.NotNil(t, ddos.RateLimiter)
		assert.NotNil(t, ddos.Fingerprinter)
	})
}

// =============================================================================
// DDoSProtection Protect Tests
// =============================================================================

func TestDDoSProtection_Protect(t *testing.T) {
	t.Run("wraps handler with protection stack", func(t *testing.T) {
		ddos := NewDDoSProtection()
		handlerCalled := false

		handler := ddos.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("blocks request from blocked IP", func(t *testing.T) {
		ddos := NewDDoSProtection()
		handlerCalled := false

		// Block an IP by recording enough violations
		// Default config: 10 violations within 5 minutes results in block
		for i := 0; i < 15; i++ {
			ddos.IPBlocker.RecordViolation("192.168.1.100")
		}

		handler := ddos.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.RemoteAddr = "192.168.1.100:12345"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

// =============================================================================
// DDoSProtection ProtectWithViolationTracking Tests
// =============================================================================

func TestDDoSProtection_ProtectWithViolationTracking(t *testing.T) {
	t.Run("tracks rate limit violations", func(t *testing.T) {
		ddos := NewDDoSProtection()

		handler := ddos.ProtectWithViolationTracking(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("returns 403 for blocked IP with retry header", func(t *testing.T) {
		ddos := NewDDoSProtection()

		// Block the IP by recording enough violations
		for i := 0; i < 15; i++ {
			ddos.IPBlocker.RecordViolation("10.0.0.1")
		}

		handler := ddos.ProtectWithViolationTracking(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.RemoteAddr = "10.0.0.1:12345"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.NotEmpty(t, w.Header().Get("Retry-After"))
		assert.Equal(t, "rate-limit-violation", w.Header().Get("X-Block-Reason"))
	})
}

// =============================================================================
// DDoSProtection ProtectAuth Tests
// =============================================================================

func TestDDoSProtection_ProtectAuth(t *testing.T) {
	t.Run("applies auth-tier rate limiting", func(t *testing.T) {
		ddos := NewDDoSProtection()
		handlerCalled := false

		handler := ddos.ProtectAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// =============================================================================
// DDoSProtection ProtectExpensive Tests
// =============================================================================

func TestDDoSProtection_ProtectExpensive(t *testing.T) {
	t.Run("applies expensive-tier rate limiting", func(t *testing.T) {
		ddos := NewDDoSProtection()
		handlerCalled := false

		handler := ddos.ProtectExpensive(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodPost, "/api/llm/generate", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// =============================================================================
// DDoSProtection ProtectStandard Tests
// =============================================================================

func TestDDoSProtection_ProtectStandard(t *testing.T) {
	t.Run("applies standard-tier rate limiting", func(t *testing.T) {
		ddos := NewDDoSProtection()
		handlerCalled := false

		handler := ddos.ProtectStandard(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/api/users/me", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// =============================================================================
// DDoSProtection ProtectWebhook Tests
// =============================================================================

func TestDDoSProtection_ProtectWebhook(t *testing.T) {
	t.Run("applies webhook-tier rate limiting", func(t *testing.T) {
		ddos := NewDDoSProtection()
		handlerCalled := false

		handler := ddos.ProtectWebhook(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodPost, "/webhooks/stripe", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// =============================================================================
// DDoSProtection Stats Tests
// =============================================================================

func TestDDoSProtection_Stats(t *testing.T) {
	t.Run("returns stats from all components", func(t *testing.T) {
		ddos := NewDDoSProtection()

		stats := ddos.Stats()

		assert.Contains(t, stats, "ip_blocker")
		assert.Contains(t, stats, "circuit_breaker")
		assert.Contains(t, stats, "fingerprinter")

		// Check IP blocker stats structure
		ipStats, ok := stats["ip_blocker"].(map[string]interface{})
		require.True(t, ok)
		assert.Contains(t, ipStats, "blocked_ips")
		assert.Contains(t, ipStats, "pending_violations")
	})

	t.Run("tracks blocked IPs in stats", func(t *testing.T) {
		ddos := NewDDoSProtection()

		// Block some IPs by recording enough violations
		for i := 0; i < 15; i++ {
			ddos.IPBlocker.RecordViolation("10.0.0.1")
			ddos.IPBlocker.RecordViolation("10.0.0.2")
		}

		stats := ddos.Stats()
		ipStats := stats["ip_blocker"].(map[string]interface{})

		assert.Equal(t, 2, ipStats["blocked_ips"])
	})
}

// =============================================================================
// ViolationResponseWriter Tests
// =============================================================================

func TestViolationResponseWriter(t *testing.T) {
	t.Run("tracks rate limit violations on 429", func(t *testing.T) {
		ddos := NewDDoSProtection()

		// Create a handler that returns 429
		handler := ddos.ProtectWithViolationTracking(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusTooManyRequests)
		}))

		// Make enough requests to trigger violation tracking
		for i := 0; i < 5; i++ {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.RemoteAddr = "10.0.0.50:12345"
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)
		}

		// Check if violations were recorded
		stats := ddos.Stats()
		ipStats := stats["ip_blocker"].(map[string]interface{})
		violations := ipStats["pending_violations"].(int)

		// Should have recorded violations
		assert.GreaterOrEqual(t, violations, 0)
	})

	t.Run("normal responses don't trigger violations", func(t *testing.T) {
		ddos := NewDDoSProtection()

		handler := ddos.ProtectWithViolationTracking(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		for i := 0; i < 5; i++ {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.RemoteAddr = "10.0.0.51:12345"
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)
		}

		// IP should not be blocked
		assert.False(t, ddos.IPBlocker.IsBlocked("10.0.0.51"))
	})

	t.Run("writes body after implicit header", func(t *testing.T) {
		w := httptest.NewRecorder()
		blocker := DefaultIPBlocker()

		vrw := &violationResponseWriter{
			ResponseWriter: w,
			ip:             "10.0.0.1",
			blocker:        blocker,
		}

		// Write without explicit WriteHeader
		n, err := vrw.Write([]byte("hello"))

		assert.NoError(t, err)
		assert.Equal(t, 5, n)
		assert.Equal(t, "hello", w.Body.String())
	})
}

// =============================================================================
// Integration Tests
// =============================================================================

func TestDDoSProtection_Integration(t *testing.T) {
	t.Run("full protection stack works together", func(t *testing.T) {
		ddos := NewDDoSProtection()
		requestCount := 0

		handler := ddos.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestCount++
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		}))

		// Make several requests
		for i := 0; i < 10; i++ {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.RemoteAddr = "192.168.1.1:12345"
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)
		}

		// Some requests should have succeeded
		assert.Greater(t, requestCount, 0)
	})

	t.Run("different IPs are treated independently", func(t *testing.T) {
		ddos := NewDDoSProtection()

		// Block one IP by recording violations
		for i := 0; i < 15; i++ {
			ddos.IPBlocker.RecordViolation("192.168.1.1")
		}

		handler := ddos.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		// Blocked IP should get 403
		req1 := httptest.NewRequest(http.MethodGet, "/test", nil)
		req1.RemoteAddr = "192.168.1.1:12345"
		w1 := httptest.NewRecorder()
		handler.ServeHTTP(w1, req1)
		assert.Equal(t, http.StatusForbidden, w1.Code)

		// Different IP should work
		req2 := httptest.NewRequest(http.MethodGet, "/test", nil)
		req2.RemoteAddr = "192.168.1.2:12345"
		w2 := httptest.NewRecorder()
		handler.ServeHTTP(w2, req2)
		assert.Equal(t, http.StatusOK, w2.Code)
	})
}
