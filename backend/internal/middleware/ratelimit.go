package middleware

import (
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// RateLimiter manages per-IP rate limiting
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	limit    rate.Limit
	burst    int
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter creates a new rate limiter with the specified requests per second and burst size
func NewRateLimiter(rps float64, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		limit:    rate.Limit(rps),
		burst:    burst,
	}

	// Start background cleanup of stale visitors
	go rl.cleanupVisitors()

	return rl
}

// DefaultRateLimiter creates a rate limiter with configuration from environment variables
// Defaults: 10 requests per second with burst of 20
func DefaultRateLimiter() *RateLimiter {
	rps := getEnvFloat("RATE_LIMIT_RPS", 10.0)
	burst := getEnvInt("RATE_LIMIT_BURST", 20)

	log.Printf("Rate limiter configured: %.2f requests/second, burst: %d", rps, burst)

	return NewRateLimiter(rps, burst)
}

// getVisitor retrieves or creates a rate limiter for the given IP
func (rl *RateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(rl.limit, rl.burst)
		rl.visitors[ip] = &visitor{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// cleanupVisitors removes visitors that haven't been seen for 3 minutes
func (rl *RateLimiter) cleanupVisitors() {
	for {
		time.Sleep(time.Minute)

		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// Limit is the middleware that rate limits requests per IP
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)
		limiter := rl.getVisitor(ip)

		if !limiter.Allow() {
			w.Header().Set("Retry-After", "1")
			w.Header().Set("X-RateLimit-Limit", strconv.FormatFloat(float64(rl.limit), 'f', 0, 64))
			w.Header().Set("X-RateLimit-Remaining", "0")
			http.Error(w, "Too many requests. Please slow down.", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getClientIP extracts the client IP address from the request
// It checks X-Forwarded-For and X-Real-IP headers for proxied requests
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (common for load balancers/proxies)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// X-Forwarded-For can contain multiple IPs, the first one is the client
		if ip := parseXForwardedFor(xff); ip != "" {
			return ip
		}
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		if ip := net.ParseIP(xri); ip != nil {
			return xri
		}
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// parseXForwardedFor parses the X-Forwarded-For header and returns the first valid IP
func parseXForwardedFor(xff string) string {
	// Split by comma and get the first IP (client IP)
	for i := 0; i < len(xff); i++ {
		if xff[i] == ',' {
			ip := trimSpaces(xff[:i])
			if net.ParseIP(ip) != nil {
				return ip
			}
			break
		}
	}

	// If no comma, the whole string is the IP
	ip := trimSpaces(xff)
	if net.ParseIP(ip) != nil {
		return ip
	}
	return ""
}

// trimSpaces removes leading and trailing spaces from a string
func trimSpaces(s string) string {
	start := 0
	end := len(s)
	for start < end && s[start] == ' ' {
		start++
	}
	for end > start && s[end-1] == ' ' {
		end--
	}
	return s[start:end]
}

// getEnvFloat gets a float64 from environment variable or returns default
func getEnvFloat(key string, defaultVal float64) float64 {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	f, err := strconv.ParseFloat(val, 64)
	if err != nil {
		log.Printf("Warning: invalid value for %s, using default %.2f", key, defaultVal)
		return defaultVal
	}
	return f
}

// getEnvInt gets an int from environment variable or returns default
func getEnvInt(key string, defaultVal int) int {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		log.Printf("Warning: invalid value for %s, using default %d", key, defaultVal)
		return defaultVal
	}
	return i
}
