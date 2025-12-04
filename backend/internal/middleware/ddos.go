package middleware

import (
	"log"
	"net/http"
	"strconv"
	"time"
)

// DDoSProtection combines all DDoS protection components into a single manager
type DDoSProtection struct {
	IPBlocker      *IPBlocker
	CircuitBreaker *CircuitBreaker
	RateLimiter    *TieredRateLimiter
	Fingerprinter  *RequestFingerprinter
}

// NewDDoSProtection creates a complete DDoS protection system with default configuration
func NewDDoSProtection() *DDoSProtection {
	ddos := &DDoSProtection{
		IPBlocker:      DefaultIPBlocker(),
		CircuitBreaker: DefaultCircuitBreaker(),
		RateLimiter:    DefaultTieredRateLimiter(),
		Fingerprinter:  NewRequestFingerprinter(),
	}

	log.Println("DDoS protection system initialized")
	return ddos
}

// Protect returns the combined DDoS protection middleware
// Order: IP Block Check -> Circuit Breaker -> Fingerprint -> Rate Limit
func (d *DDoSProtection) Protect(next http.Handler) http.Handler {
	// Chain middleware in order (innermost first)
	handler := next

	// Rate limiting is innermost - applied per request
	handler = d.RateLimiter.Limit(handler)

	// Fingerprinting for distributed attack detection
	handler = d.Fingerprinter.Fingerprint(handler)

	// Circuit breaker for global load protection
	handler = d.CircuitBreaker.Protect(handler)

	// IP blocking is outermost - rejects blocked IPs immediately
	handler = d.IPBlocker.Block(handler)

	return handler
}

// ProtectWithViolationTracking wraps a handler with the full protection stack
// and tracks rate limit violations for IP blocking
func (d *DDoSProtection) ProtectWithViolationTracking(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)

		// Check if IP is blocked
		if d.IPBlocker.IsBlocked(ip) {
			expiry := d.IPBlocker.GetBlockExpiry(ip)
			retryAfter := int(time.Until(expiry).Seconds())
			if retryAfter < 1 {
				retryAfter = 60
			}
			w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
			w.Header().Set("X-Block-Reason", "rate-limit-violation")
			http.Error(w, "Your IP has been temporarily blocked due to excessive requests.", http.StatusForbidden)
			return
		}

		// Check circuit breaker
		if !d.CircuitBreaker.Allow() {
			http.Error(w, "Service temporarily unavailable due to high load.", http.StatusServiceUnavailable)
			return
		}
		defer d.CircuitBreaker.Done(true)

		// Wrap response to detect rate limit responses
		rw := &violationResponseWriter{
			ResponseWriter: w,
			ip:             ip,
			blocker:        d.IPBlocker,
		}

		// Apply fingerprinting and rate limiting
		handler := d.Fingerprinter.Fingerprint(d.RateLimiter.Limit(next))
		handler.ServeHTTP(rw, r)
	})
}

// violationResponseWriter tracks rate limit violations for IP blocking
type violationResponseWriter struct {
	http.ResponseWriter
	ip          string
	blocker     *IPBlocker
	wroteHeader bool
}

func (vrw *violationResponseWriter) WriteHeader(code int) {
	if !vrw.wroteHeader {
		vrw.wroteHeader = true
		// Track rate limit violations
		if code == http.StatusTooManyRequests {
			if vrw.blocker.RecordViolation(vrw.ip) {
				// IP was blocked, update response
				code = http.StatusForbidden
				vrw.Header().Set("X-Block-Reason", "rate-limit-violation")
			}
		}
	}
	vrw.ResponseWriter.WriteHeader(code)
}

func (vrw *violationResponseWriter) Write(b []byte) (int, error) {
	if !vrw.wroteHeader {
		vrw.WriteHeader(http.StatusOK)
	}
	return vrw.ResponseWriter.Write(b)
}

// Stats returns statistics from all DDoS protection components
func (d *DDoSProtection) Stats() map[string]interface{} {
	blockedCount, violationCount := d.IPBlocker.Stats()

	return map[string]interface{}{
		"ip_blocker": map[string]interface{}{
			"blocked_ips":   blockedCount,
			"pending_violations": violationCount,
		},
		"circuit_breaker": d.CircuitBreaker.Stats(),
		"fingerprinter":   d.Fingerprinter.Stats(),
	}
}

// ProtectAuth returns middleware specifically for auth endpoints with violation tracking
func (d *DDoSProtection) ProtectAuth(next http.Handler) http.Handler {
	return d.IPBlocker.Block(
		d.CircuitBreaker.Protect(
			d.Fingerprinter.Fingerprint(
				d.RateLimiter.LimitForTier(TierAuth)(
					d.trackViolations(next),
				),
			),
		),
	)
}

// ProtectExpensive returns middleware for expensive operations (like LLM calls)
func (d *DDoSProtection) ProtectExpensive(next http.Handler) http.Handler {
	return d.IPBlocker.Block(
		d.CircuitBreaker.Protect(
			d.Fingerprinter.Fingerprint(
				d.RateLimiter.LimitForTier(TierExpensive)(
					d.trackViolations(next),
				),
			),
		),
	)
}

// ProtectStandard returns middleware for standard API endpoints
func (d *DDoSProtection) ProtectStandard(next http.Handler) http.Handler {
	return d.IPBlocker.Block(
		d.CircuitBreaker.Protect(
			d.Fingerprinter.Fingerprint(
				d.RateLimiter.LimitForTier(TierStandard)(
					d.trackViolations(next),
				),
			),
		),
	)
}

// ProtectWebhook returns middleware for webhook endpoints
func (d *DDoSProtection) ProtectWebhook(next http.Handler) http.Handler {
	return d.IPBlocker.Block(
		d.CircuitBreaker.Protect(
			d.RateLimiter.LimitForTier(TierWebhook)(next),
		),
	)
}

// trackViolations wraps a handler to track rate limit violations
func (d *DDoSProtection) trackViolations(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rw := &violationResponseWriter{
			ResponseWriter: w,
			ip:             getClientIP(r),
			blocker:        d.IPBlocker,
		}
		next.ServeHTTP(rw, r)
	})
}
