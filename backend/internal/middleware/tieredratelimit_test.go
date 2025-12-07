package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestTieredRateLimiter_GetTierForPath(t *testing.T) {
	trl := DefaultTieredRateLimiter()

	tests := []struct {
		path     string
		expected EndpointTier
	}{
		{"/health", TierHealth},
		{"/api/auth/login", TierAuth},
		{"/api/auth/register", TierAuth},
		{"/api/auth/refresh", TierAuth},
		{"/api/me/next-step", TierExpensive},
		{"/api/courses", TierExpensive},
		{"/api/courses/123", TierExpensive},
		{"/api/webhooks/stripe", TierWebhook},
		{"/api/me", TierStandard},
		{"/api/me/profile", TierStandard},
		{"/api/unknown", TierStandard},
	}

	for _, tt := range tests {
		got := trl.getTierForPath(tt.path)
		if got != tt.expected {
			t.Errorf("getTierForPath(%s) = %v, want %v", tt.path, got, tt.expected)
		}
	}
}

func TestTieredRateLimiter_SetEndpointTier(t *testing.T) {
	trl := DefaultTieredRateLimiter()

	// Add custom tier
	trl.SetEndpointTier("/api/custom", TierExpensive)

	got := trl.getTierForPath("/api/custom")
	if got != TierExpensive {
		t.Errorf("Expected TierExpensive for /api/custom, got %v", got)
	}
}

func TestTieredRateLimiter_HealthTierBypassesLimit(t *testing.T) {
	configs := map[EndpointTier]TierConfig{
		TierHealth: {RPS: 0, Burst: 0}, // Unlimited
	}
	trl := NewTieredRateLimiter(configs)

	handler := trl.Limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Make many requests - all should pass
	for i := 0; i < 100; i++ {
		req := httptest.NewRequest("GET", "/health", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Request %d to health endpoint should pass, got %d", i, rr.Code)
		}
	}
}

func TestTieredRateLimiter_LimitByTier(t *testing.T) {
	configs := map[EndpointTier]TierConfig{
		TierAuth:     {RPS: 2, Burst: 2},
		TierStandard: {RPS: 5, Burst: 5},
	}
	trl := NewTieredRateLimiter(configs)

	handler := trl.Limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Test auth endpoint rate limit (should allow 2, then reject)
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest("GET", "/api/auth/login", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if i < 2 && rr.Code != http.StatusOK {
			t.Errorf("Auth request %d should pass, got %d", i, rr.Code)
		}
		if i >= 2 && rr.Code != http.StatusTooManyRequests {
			t.Errorf("Auth request %d should be rate limited, got %d", i, rr.Code)
		}
	}
}

func TestTieredRateLimiter_LimitForTier(t *testing.T) {
	configs := map[EndpointTier]TierConfig{
		TierExpensive: {RPS: 1, Burst: 1},
	}
	trl := NewTieredRateLimiter(configs)

	handler := trl.LimitForTier(TierExpensive)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// First request should pass
	req := httptest.NewRequest("GET", "/any-path", nil)
	req.RemoteAddr = "192.168.1.2:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("First request should pass, got %d", rr.Code)
	}

	// Second request should be rate limited
	req = httptest.NewRequest("GET", "/any-path", nil)
	req.RemoteAddr = "192.168.1.2:12345"
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Second request should be rate limited, got %d", rr.Code)
	}
}

func TestTieredRateLimiter_DifferentIPsHaveSeparateLimits(t *testing.T) {
	configs := map[EndpointTier]TierConfig{
		TierStandard: {RPS: 1, Burst: 1},
	}
	trl := NewTieredRateLimiter(configs)

	handler := trl.Limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Request from first IP
	req := httptest.NewRequest("GET", "/api/test", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Request from IP1 should pass, got %d", rr.Code)
	}

	// Request from second IP should also pass
	req = httptest.NewRequest("GET", "/api/test", nil)
	req.RemoteAddr = "10.0.0.2:12345"
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Request from IP2 should pass, got %d", rr.Code)
	}
}

func TestTieredRateLimiter_RateLimitHeaders(t *testing.T) {
	configs := map[EndpointTier]TierConfig{
		TierStandard: {RPS: 1, Burst: 1},
	}
	trl := NewTieredRateLimiter(configs)

	handler := trl.Limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// First request
	req := httptest.NewRequest("GET", "/api/test", nil)
	req.RemoteAddr = "10.0.0.3:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Check tier header on successful response
	if rr.Header().Get("X-RateLimit-Tier") != "standard" {
		t.Errorf("Expected X-RateLimit-Tier header to be 'standard', got '%s'", rr.Header().Get("X-RateLimit-Tier"))
	}

	// Second request (rate limited)
	req = httptest.NewRequest("GET", "/api/test", nil)
	req.RemoteAddr = "10.0.0.3:12345"
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Check rate limit headers
	if rr.Header().Get("Retry-After") != "1" {
		t.Errorf("Expected Retry-After header to be '1', got '%s'", rr.Header().Get("Retry-After"))
	}
	if rr.Header().Get("X-RateLimit-Remaining") != "0" {
		t.Errorf("Expected X-RateLimit-Remaining to be '0', got '%s'", rr.Header().Get("X-RateLimit-Remaining"))
	}
}

func TestEndpointTier_String(t *testing.T) {
	tests := []struct {
		tier     EndpointTier
		expected string
	}{
		{TierStandard, "standard"},
		{TierAuth, "auth"},
		{TierExpensive, "expensive"},
		{TierWebhook, "webhook"},
		{TierHealth, "health"},
		{EndpointTier(99), "unknown"},
	}

	for _, tt := range tests {
		if got := tt.tier.String(); got != tt.expected {
			t.Errorf("EndpointTier(%d).String() = %s, want %s", tt.tier, got, tt.expected)
		}
	}
}

func TestDefaultTierConfigs(t *testing.T) {
	configs := DefaultTierConfigs()

	// Verify all tiers have configs
	tiers := []EndpointTier{TierStandard, TierAuth, TierExpensive, TierWebhook, TierHealth}
	for _, tier := range tiers {
		if _, ok := configs[tier]; !ok {
			t.Errorf("Missing config for tier %v", tier)
		}
	}

	// Verify reasonable defaults
	if configs[TierAuth].RPS >= configs[TierStandard].RPS {
		t.Error("Auth tier should have stricter limits than standard")
	}

	if configs[TierExpensive].RPS >= configs[TierAuth].RPS {
		t.Error("Expensive tier should have stricter limits than auth")
	}

	if configs[TierHealth].RPS != 0 {
		t.Error("Health tier should have unlimited RPS (0)")
	}
}

func TestTieredRateLimiter_VisitorCleanup(t *testing.T) {
	configs := map[EndpointTier]TierConfig{
		TierStandard: {RPS: 10, Burst: 10},
	}
	trl := NewTieredRateLimiter(configs)

	// Create a visitor
	handler := trl.Limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/api/test", nil)
	req.RemoteAddr = "10.0.0.4:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Verify visitor was created
	trl.mu.RLock()
	_, exists := trl.visitors["10.0.0.4"]
	trl.mu.RUnlock()

	if !exists {
		t.Error("Visitor should be created after request")
	}

	// Cleanup happens in background, so we just verify it doesn't panic
	time.Sleep(10 * time.Millisecond)
}
