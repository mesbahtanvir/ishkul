package middleware

import (
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// CircuitState represents the state of the circuit breaker
type CircuitState int

const (
	CircuitClosed   CircuitState = iota // Normal operation
	CircuitOpen                         // Rejecting requests
	CircuitHalfOpen                     // Testing if service has recovered
)

func (s CircuitState) String() string {
	switch s {
	case CircuitClosed:
		return "closed"
	case CircuitOpen:
		return "open"
	case CircuitHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// CircuitBreaker implements the circuit breaker pattern for global load protection
type CircuitBreaker struct {
	mu sync.RWMutex

	// Configuration
	maxConcurrent     int64         // Maximum concurrent requests
	maxRequestsPerSec int64         // Maximum requests per second (global)
	openTimeout       time.Duration // How long to wait before testing recovery
	halfOpenMaxReqs   int64         // Max requests to let through in half-open state

	// State
	state           CircuitState
	concurrentCount int64
	requestCount    int64 // Requests in current window
	lastWindowStart time.Time
	openedAt        time.Time
	halfOpenReqs    int64

	// Metrics
	totalRequests   int64
	rejectedCount   int64
	successCount    int64
	circuitOpenings int64
}

// NewCircuitBreaker creates a new circuit breaker with the specified configuration
func NewCircuitBreaker(maxConcurrent, maxRequestsPerSec int64, openTimeout time.Duration) *CircuitBreaker {
	cb := &CircuitBreaker{
		maxConcurrent:     maxConcurrent,
		maxRequestsPerSec: maxRequestsPerSec,
		openTimeout:       openTimeout,
		halfOpenMaxReqs:   5, // Allow 5 test requests when half-open
		state:             CircuitClosed,
		lastWindowStart:   time.Now(),
	}

	// Start background goroutine to reset request count window
	go cb.resetRequestWindow()

	log.Printf("Circuit breaker configured: max concurrent=%d, max RPS=%d, open timeout=%v",
		maxConcurrent, maxRequestsPerSec, openTimeout)

	return cb
}

// DefaultCircuitBreaker creates a circuit breaker with configuration from environment variables
func DefaultCircuitBreaker() *CircuitBreaker {
	maxConcurrent := int64(getEnvInt("CIRCUIT_MAX_CONCURRENT", 100))
	maxRPS := int64(getEnvInt("CIRCUIT_MAX_RPS", 500))
	openTimeoutSec := getEnvInt("CIRCUIT_OPEN_TIMEOUT_SECONDS", 30)

	return NewCircuitBreaker(maxConcurrent, maxRPS, time.Duration(openTimeoutSec)*time.Second)
}

// Allow checks if a request should be allowed through
func (cb *CircuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	atomic.AddInt64(&cb.totalRequests, 1)

	switch cb.state {
	case CircuitOpen:
		// Check if we should transition to half-open
		if time.Since(cb.openedAt) > cb.openTimeout {
			cb.state = CircuitHalfOpen
			cb.halfOpenReqs = 0
			log.Printf("Circuit breaker transitioned to half-open state")
		} else {
			atomic.AddInt64(&cb.rejectedCount, 1)
			return false
		}
		fallthrough

	case CircuitHalfOpen:
		// Only allow limited requests through
		if cb.halfOpenReqs >= cb.halfOpenMaxReqs {
			atomic.AddInt64(&cb.rejectedCount, 1)
			return false
		}
		cb.halfOpenReqs++
	}

	// Check concurrent request limit
	if atomic.LoadInt64(&cb.concurrentCount) >= cb.maxConcurrent {
		cb.trip("concurrent limit exceeded")
		atomic.AddInt64(&cb.rejectedCount, 1)
		return false
	}

	// Check requests per second limit
	if cb.requestCount >= cb.maxRequestsPerSec {
		cb.trip("RPS limit exceeded")
		atomic.AddInt64(&cb.rejectedCount, 1)
		return false
	}

	// Allow the request
	atomic.AddInt64(&cb.concurrentCount, 1)
	cb.requestCount++
	return true
}

// Done signals that a request has completed
func (cb *CircuitBreaker) Done(success bool) {
	atomic.AddInt64(&cb.concurrentCount, -1)

	if success {
		atomic.AddInt64(&cb.successCount, 1)

		cb.mu.Lock()
		if cb.state == CircuitHalfOpen {
			// Successful request in half-open state, potentially close the circuit
			if atomic.LoadInt64(&cb.successCount) > 0 && cb.halfOpenReqs >= cb.halfOpenMaxReqs {
				cb.state = CircuitClosed
				log.Printf("Circuit breaker transitioned to closed state (recovered)")
			}
		}
		cb.mu.Unlock()
	}
}

// trip opens the circuit breaker
func (cb *CircuitBreaker) trip(reason string) {
	if cb.state == CircuitClosed {
		cb.state = CircuitOpen
		cb.openedAt = time.Now()
		atomic.AddInt64(&cb.circuitOpenings, 1)
		log.Printf("Circuit breaker opened: %s", reason)
	}
}

// resetRequestWindow resets the per-second request count
func (cb *CircuitBreaker) resetRequestWindow() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for range ticker.C {
		cb.mu.Lock()
		cb.requestCount = 0
		cb.lastWindowStart = time.Now()
		cb.mu.Unlock()
	}
}

// State returns the current circuit state
func (cb *CircuitBreaker) State() CircuitState {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.state
}

// Stats returns circuit breaker statistics
func (cb *CircuitBreaker) Stats() map[string]interface{} {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	return map[string]interface{}{
		"state":             cb.state.String(),
		"concurrent":        atomic.LoadInt64(&cb.concurrentCount),
		"max_concurrent":    cb.maxConcurrent,
		"rps_current":       cb.requestCount,
		"max_rps":           cb.maxRequestsPerSec,
		"total_requests":    atomic.LoadInt64(&cb.totalRequests),
		"rejected_requests": atomic.LoadInt64(&cb.rejectedCount),
		"success_requests":  atomic.LoadInt64(&cb.successCount),
		"circuit_openings":  atomic.LoadInt64(&cb.circuitOpenings),
	}
}

// Reset manually resets the circuit breaker to closed state
func (cb *CircuitBreaker) Reset() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.state = CircuitClosed
	cb.halfOpenReqs = 0
	atomic.StoreInt64(&cb.concurrentCount, 0)
	cb.requestCount = 0
	log.Printf("Circuit breaker manually reset to closed state")
}

// Protect is the middleware that implements circuit breaker protection
func (cb *CircuitBreaker) Protect(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !cb.Allow() {
			state := cb.State()
			w.Header().Set("Retry-After", "5")
			w.Header().Set("X-Circuit-State", state.String())

			if state == CircuitOpen {
				http.Error(w, "Service temporarily unavailable due to high load. Please try again later.", http.StatusServiceUnavailable)
			} else {
				http.Error(w, "Server is busy. Please try again shortly.", http.StatusTooManyRequests)
			}
			return
		}

		// Track success/failure for circuit breaker logic
		success := true
		defer func() {
			if recovered := recover(); recovered != nil {
				success = false
				cb.Done(success)
				panic(recovered) // Re-panic after recording
			}
			cb.Done(success)
		}()

		// Create a response wrapper to detect errors
		rw := &circuitResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)

		// 5xx errors indicate service problems
		if rw.statusCode >= 500 {
			success = false
		}
	})
}

// circuitResponseWriter wraps http.ResponseWriter to capture status code
type circuitResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *circuitResponseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
