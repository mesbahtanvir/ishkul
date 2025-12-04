package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestIPBlocker_RecordViolation(t *testing.T) {
	blocker := NewIPBlocker(3, time.Minute, time.Minute)

	ip := "192.168.1.1"

	// First two violations should not block
	for i := 0; i < 2; i++ {
		blocked := blocker.RecordViolation(ip)
		if blocked {
			t.Errorf("IP should not be blocked after %d violations", i+1)
		}
	}

	// Third violation should trigger block
	blocked := blocker.RecordViolation(ip)
	if !blocked {
		t.Error("IP should be blocked after 3 violations")
	}

	// Verify IP is blocked
	if !blocker.IsBlocked(ip) {
		t.Error("IsBlocked should return true for blocked IP")
	}
}

func TestIPBlocker_IsBlocked(t *testing.T) {
	blocker := NewIPBlocker(1, 100*time.Millisecond, time.Minute)

	ip := "192.168.1.2"

	// Initially not blocked
	if blocker.IsBlocked(ip) {
		t.Error("IP should not be blocked initially")
	}

	// Trigger block
	blocker.RecordViolation(ip)
	if !blocker.IsBlocked(ip) {
		t.Error("IP should be blocked after violation")
	}

	// Wait for block to expire
	time.Sleep(150 * time.Millisecond)
	if blocker.IsBlocked(ip) {
		t.Error("IP should no longer be blocked after expiry")
	}
}

func TestIPBlocker_ViolationWindowReset(t *testing.T) {
	blocker := NewIPBlocker(3, time.Minute, 100*time.Millisecond)

	ip := "192.168.1.3"

	// Record two violations
	blocker.RecordViolation(ip)
	blocker.RecordViolation(ip)

	// Wait for window to expire
	time.Sleep(150 * time.Millisecond)

	// Third violation should not block (window reset)
	blocked := blocker.RecordViolation(ip)
	if blocked {
		t.Error("Violation window should have reset")
	}
}

func TestIPBlocker_Unblock(t *testing.T) {
	blocker := NewIPBlocker(1, time.Minute, time.Minute)

	ip := "192.168.1.4"

	blocker.RecordViolation(ip)
	if !blocker.IsBlocked(ip) {
		t.Error("IP should be blocked")
	}

	blocker.Unblock(ip)
	if blocker.IsBlocked(ip) {
		t.Error("IP should be unblocked after manual unblock")
	}
}

func TestIPBlocker_GetBlockedIPs(t *testing.T) {
	blocker := NewIPBlocker(1, time.Minute, time.Minute)

	ips := []string{"10.0.0.1", "10.0.0.2", "10.0.0.3"}
	for _, ip := range ips {
		blocker.RecordViolation(ip)
	}

	blocked := blocker.GetBlockedIPs()
	if len(blocked) != 3 {
		t.Errorf("Expected 3 blocked IPs, got %d", len(blocked))
	}

	for _, ip := range ips {
		if _, ok := blocked[ip]; !ok {
			t.Errorf("IP %s should be in blocked list", ip)
		}
	}
}

func TestIPBlocker_Stats(t *testing.T) {
	blocker := NewIPBlocker(2, time.Minute, time.Minute)

	// Block 2 IPs
	blocker.RecordViolation("10.0.0.1")
	blocker.RecordViolation("10.0.0.1")
	blocker.RecordViolation("10.0.0.2")
	blocker.RecordViolation("10.0.0.2")

	// One IP with pending violation
	blocker.RecordViolation("10.0.0.3")

	blockedCount, violationCount := blocker.Stats()
	if blockedCount != 2 {
		t.Errorf("Expected 2 blocked IPs, got %d", blockedCount)
	}
	if violationCount != 1 {
		t.Errorf("Expected 1 IP with pending violations, got %d", violationCount)
	}
}

func TestIPBlocker_BlockMiddleware(t *testing.T) {
	blocker := NewIPBlocker(1, time.Minute, time.Minute)

	// Create a test handler
	handler := blocker.Block(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	}))

	// First request should pass
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.5:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	// Block the IP
	blocker.RecordViolation("192.168.1.5")

	// Request from blocked IP should be rejected
	req = httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.5:12345"
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", rr.Code)
	}

	// Request from different IP should pass
	req = httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.6:12345"
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200 for different IP, got %d", rr.Code)
	}
}

func TestIPBlocker_XForwardedFor(t *testing.T) {
	blocker := NewIPBlocker(1, time.Minute, time.Minute)

	handler := blocker.Block(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Block IP via X-Forwarded-For
	blocker.RecordViolation("10.20.30.40")

	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "10.20.30.40")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("Expected status 403 for blocked X-Forwarded-For IP, got %d", rr.Code)
	}
}

func TestIPBlocker_GetBlockExpiry(t *testing.T) {
	blocker := NewIPBlocker(1, time.Minute, time.Minute)

	ip := "192.168.1.7"

	// Not blocked - should return zero time
	expiry := blocker.GetBlockExpiry(ip)
	if !expiry.IsZero() {
		t.Error("Expected zero time for non-blocked IP")
	}

	// Block and check expiry
	blocker.RecordViolation(ip)
	expiry = blocker.GetBlockExpiry(ip)
	if expiry.IsZero() {
		t.Error("Expected non-zero time for blocked IP")
	}

	// Expiry should be roughly 1 minute from now
	remaining := time.Until(expiry)
	if remaining < 50*time.Second || remaining > 70*time.Second {
		t.Errorf("Expected expiry around 1 minute, got %v", remaining)
	}
}
