package middleware

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func TestCircuitBreaker_Allow(t *testing.T) {
	cb := NewCircuitBreaker(10, 100, time.Second)

	// Should allow requests when circuit is closed
	if !cb.Allow() {
		t.Error("Circuit breaker should allow requests when closed")
	}
	cb.Done(true)
}

func TestCircuitBreaker_ConcurrentLimit(t *testing.T) {
	cb := NewCircuitBreaker(5, 1000, time.Second)

	// Acquire 5 slots
	for i := 0; i < 5; i++ {
		if !cb.Allow() {
			t.Errorf("Should allow request %d", i+1)
		}
	}

	// 6th request should be rejected (and trips circuit)
	if cb.Allow() {
		t.Error("Should reject request when concurrent limit reached")
	}

	// Circuit is now open, release all slots
	for i := 0; i < 5; i++ {
		cb.Done(true)
	}

	// Circuit is open, so requests are rejected
	if cb.State() != CircuitOpen {
		t.Errorf("Expected CircuitOpen, got %v", cb.State())
	}

	// After reset, should allow again
	cb.Reset()
	if !cb.Allow() {
		t.Error("Should allow request after reset")
	}
	cb.Done(true)
}

func TestCircuitBreaker_RPSLimit(t *testing.T) {
	cb := NewCircuitBreaker(100, 5, time.Second)

	// Exhaust RPS limit
	for i := 0; i < 5; i++ {
		if !cb.Allow() {
			t.Errorf("Should allow request %d within RPS limit", i+1)
		}
		cb.Done(true)
	}

	// Next request should be rejected
	if cb.Allow() {
		t.Error("Should reject request when RPS limit exceeded")
	}

	// Wait for window to reset
	time.Sleep(1100 * time.Millisecond)

	// Should allow again
	if !cb.Allow() {
		t.Error("Should allow request after window reset")
	}
	cb.Done(true)
}

func TestCircuitBreaker_StateTransitions(t *testing.T) {
	cb := NewCircuitBreaker(2, 1000, 100*time.Millisecond)

	// Should start closed
	if cb.State() != CircuitClosed {
		t.Errorf("Expected CircuitClosed, got %v", cb.State())
	}

	// Exhaust concurrent limit to trip circuit
	cb.Allow()
	cb.Allow()
	cb.Allow() // This should trip the circuit

	if cb.State() != CircuitOpen {
		t.Errorf("Expected CircuitOpen, got %v", cb.State())
	}

	// Wait for open timeout
	time.Sleep(150 * time.Millisecond)

	// Next Allow() should transition to half-open
	cb.Allow()
	if cb.State() != CircuitHalfOpen {
		t.Errorf("Expected CircuitHalfOpen, got %v", cb.State())
	}
}

func TestCircuitBreaker_Reset(t *testing.T) {
	cb := NewCircuitBreaker(1, 1000, time.Second)

	// Trip the circuit
	cb.Allow()
	cb.Allow() // This trips it

	if cb.State() != CircuitOpen {
		t.Errorf("Expected CircuitOpen, got %v", cb.State())
	}

	// Manual reset
	cb.Reset()

	if cb.State() != CircuitClosed {
		t.Errorf("Expected CircuitClosed after reset, got %v", cb.State())
	}
}

func TestCircuitBreaker_Stats(t *testing.T) {
	cb := NewCircuitBreaker(10, 100, time.Second)

	// Make some requests
	for i := 0; i < 5; i++ {
		cb.Allow()
		cb.Done(true)
	}

	stats := cb.Stats()

	if stats["total_requests"].(int64) != 5 {
		t.Errorf("Expected 5 total requests, got %v", stats["total_requests"])
	}

	if stats["success_requests"].(int64) != 5 {
		t.Errorf("Expected 5 successful requests, got %v", stats["success_requests"])
	}

	if stats["state"].(string) != "closed" {
		t.Errorf("Expected state 'closed', got %v", stats["state"])
	}
}

func TestCircuitBreaker_ProtectMiddleware(t *testing.T) {
	cb := NewCircuitBreaker(10, 100, time.Second)

	handler := cb.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}
}

func TestCircuitBreaker_ProtectMiddleware_Open(t *testing.T) {
	cb := NewCircuitBreaker(1, 1000, time.Second)

	handler := cb.Protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Trip the circuit
	cb.Allow()
	cb.Allow()

	// Request should be rejected
	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusServiceUnavailable && rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected status 503 or 429, got %d", rr.Code)
	}
}

func TestCircuitBreaker_Concurrent(t *testing.T) {
	cb := NewCircuitBreaker(100, 10000, time.Second)

	var wg sync.WaitGroup
	success := 0
	var mu sync.Mutex

	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if cb.Allow() {
				mu.Lock()
				success++
				mu.Unlock()
				cb.Done(true)
			}
		}()
	}

	wg.Wait()

	// All should succeed as we're within limits
	if success != 200 {
		t.Errorf("Expected 200 successful requests, got %d", success)
	}
}

func TestCircuitState_String(t *testing.T) {
	tests := []struct {
		state    CircuitState
		expected string
	}{
		{CircuitClosed, "closed"},
		{CircuitOpen, "open"},
		{CircuitHalfOpen, "half-open"},
		{CircuitState(99), "unknown"},
	}

	for _, tt := range tests {
		if got := tt.state.String(); got != tt.expected {
			t.Errorf("CircuitState(%d).String() = %s, want %s", tt.state, got, tt.expected)
		}
	}
}
