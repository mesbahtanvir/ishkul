package middleware

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// EndpointTier represents different rate limit tiers for endpoints
type EndpointTier int

const (
	TierStandard  EndpointTier = iota // Standard endpoints (10 req/s)
	TierAuth                          // Auth endpoints (5 req/s) - prevent brute force
	TierExpensive                     // Expensive operations like LLM (2 req/s)
	TierWebhook                       // Webhooks (20 req/s) - third-party services
	TierHealth                        // Health checks (unlimited)
)

func (t EndpointTier) String() string {
	switch t {
	case TierStandard:
		return "standard"
	case TierAuth:
		return "auth"
	case TierExpensive:
		return "expensive"
	case TierWebhook:
		return "webhook"
	case TierHealth:
		return "health"
	default:
		return "unknown"
	}
}

// TierConfig holds the rate limit configuration for a tier
type TierConfig struct {
	RPS   float64 // Requests per second
	Burst int     // Burst size
}

// DefaultTierConfigs returns the default configurations for each tier
func DefaultTierConfigs() map[EndpointTier]TierConfig {
	return map[EndpointTier]TierConfig{
		TierStandard: {
			RPS:   getEnvFloat("RATE_LIMIT_STANDARD_RPS", 10.0),
			Burst: getEnvInt("RATE_LIMIT_STANDARD_BURST", 20),
		},
		TierAuth: {
			RPS:   getEnvFloat("RATE_LIMIT_AUTH_RPS", 5.0),
			Burst: getEnvInt("RATE_LIMIT_AUTH_BURST", 10),
		},
		TierExpensive: {
			RPS:   getEnvFloat("RATE_LIMIT_EXPENSIVE_RPS", 2.0),
			Burst: getEnvInt("RATE_LIMIT_EXPENSIVE_BURST", 5),
		},
		TierWebhook: {
			RPS:   getEnvFloat("RATE_LIMIT_WEBHOOK_RPS", 20.0),
			Burst: getEnvInt("RATE_LIMIT_WEBHOOK_BURST", 50),
		},
		TierHealth: {
			RPS:   0, // Unlimited
			Burst: 0,
		},
	}
}

// TieredRateLimiter manages different rate limits for different endpoint tiers
type TieredRateLimiter struct {
	mu            sync.RWMutex
	configs       map[EndpointTier]TierConfig
	visitors      map[string]map[EndpointTier]*tieredVisitor
	endpointTiers map[string]EndpointTier // Path prefix -> tier mapping
}

type tieredVisitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewTieredRateLimiter creates a new tiered rate limiter
func NewTieredRateLimiter(configs map[EndpointTier]TierConfig) *TieredRateLimiter {
	trl := &TieredRateLimiter{
		configs:       configs,
		visitors:      make(map[string]map[EndpointTier]*tieredVisitor),
		endpointTiers: defaultEndpointTiers(),
	}

	// Start background cleanup
	go trl.cleanupVisitors()

	// Log configuration
	for tier, cfg := range configs {
		if cfg.RPS > 0 {
			log.Printf("Tiered rate limiter [%s]: %.2f req/s, burst: %d", tier, cfg.RPS, cfg.Burst)
		}
	}

	return trl
}

// DefaultTieredRateLimiter creates a tiered rate limiter with default configuration
func DefaultTieredRateLimiter() *TieredRateLimiter {
	return NewTieredRateLimiter(DefaultTierConfigs())
}

// defaultEndpointTiers returns the default endpoint-to-tier mapping
func defaultEndpointTiers() map[string]EndpointTier {
	return map[string]EndpointTier{
		// Health endpoints - unlimited
		"/health": TierHealth,

		// Auth endpoints - stricter limits
		"/api/auth/":         TierAuth,
		"/api/auth/login":    TierAuth,
		"/api/auth/register": TierAuth,
		"/api/auth/refresh":  TierAuth,
		"/api/auth/logout":   TierAuth,

		// Expensive operations - very strict limits
		"/api/me/next-step": TierExpensive, // LLM operations
		"/api/courses":      TierExpensive, // May involve LLM
		"/api/courses/":     TierExpensive,

		// Webhooks - higher limits for third-party services
		"/api/webhooks/":       TierWebhook,
		"/api/webhooks/stripe": TierWebhook,

		// Default - standard limits (handled by fallback)
	}
}

// SetEndpointTier configures the tier for a specific endpoint path prefix
func (trl *TieredRateLimiter) SetEndpointTier(pathPrefix string, tier EndpointTier) {
	trl.mu.Lock()
	defer trl.mu.Unlock()
	trl.endpointTiers[pathPrefix] = tier
}

// getTierForPath determines the tier for a given request path
func (trl *TieredRateLimiter) getTierForPath(path string) EndpointTier {
	trl.mu.RLock()
	defer trl.mu.RUnlock()

	// Check for exact match first
	if tier, ok := trl.endpointTiers[path]; ok {
		return tier
	}

	// Check for prefix match (longest prefix wins)
	var longestPrefix string
	var matchedTier EndpointTier = TierStandard

	for prefix, tier := range trl.endpointTiers {
		if strings.HasPrefix(path, prefix) && len(prefix) > len(longestPrefix) {
			longestPrefix = prefix
			matchedTier = tier
		}
	}

	return matchedTier
}

// getVisitor gets or creates a rate limiter for the IP and tier
func (trl *TieredRateLimiter) getVisitor(ip string, tier EndpointTier) *rate.Limiter {
	trl.mu.Lock()
	defer trl.mu.Unlock()

	cfg := trl.configs[tier]

	// Health tier has no limit
	if cfg.RPS <= 0 {
		return nil
	}

	if _, ok := trl.visitors[ip]; !ok {
		trl.visitors[ip] = make(map[EndpointTier]*tieredVisitor)
	}

	if v, ok := trl.visitors[ip][tier]; ok {
		v.lastSeen = time.Now()
		return v.limiter
	}

	limiter := rate.NewLimiter(rate.Limit(cfg.RPS), cfg.Burst)
	trl.visitors[ip][tier] = &tieredVisitor{
		limiter:  limiter,
		lastSeen: time.Now(),
	}
	return limiter
}

// cleanupVisitors removes stale visitor records
func (trl *TieredRateLimiter) cleanupVisitors() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		trl.mu.Lock()
		now := time.Now()
		for ip, tiers := range trl.visitors {
			for tier, v := range tiers {
				if now.Sub(v.lastSeen) > 3*time.Minute {
					delete(tiers, tier)
				}
			}
			if len(tiers) == 0 {
				delete(trl.visitors, ip)
			}
		}
		trl.mu.Unlock()
	}
}

// Limit creates a middleware that applies tiered rate limiting
func (trl *TieredRateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tier := trl.getTierForPath(r.URL.Path)
		cfg := trl.configs[tier]

		// Health tier bypasses rate limiting
		if cfg.RPS <= 0 {
			next.ServeHTTP(w, r)
			return
		}

		ip := getClientIP(r)
		limiter := trl.getVisitor(ip, tier)

		if limiter == nil {
			next.ServeHTTP(w, r)
			return
		}

		// Calculate reset time (1 second window for token replenishment)
		resetTime := time.Now().Add(time.Second).Unix()

		// Set rate limit headers for all responses (helps clients monitor usage)
		w.Header().Set("X-RateLimit-Limit", strconv.FormatFloat(cfg.RPS, 'f', 0, 64))
		w.Header().Set("X-RateLimit-Tier", tier.String())
		w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(resetTime, 10))

		if !limiter.Allow() {
			w.Header().Set("Retry-After", "1")
			w.Header().Set("X-RateLimit-Remaining", "0")
			http.Error(w, "Too many requests. Please slow down.", http.StatusTooManyRequests)
			return
		}

		// Approximate remaining tokens (tokens replenish continuously)
		remaining := int(limiter.Tokens())
		if remaining < 0 {
			remaining = 0
		}
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

		next.ServeHTTP(w, r)
	})
}

// LimitForTier creates a middleware with a specific tier (useful for wrapping specific handlers)
func (trl *TieredRateLimiter) LimitForTier(tier EndpointTier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cfg := trl.configs[tier]

			if cfg.RPS <= 0 {
				next.ServeHTTP(w, r)
				return
			}

			ip := getClientIP(r)
			limiter := trl.getVisitor(ip, tier)

			if limiter == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Calculate reset time (1 second window for token replenishment)
			resetTime := time.Now().Add(time.Second).Unix()

			// Set rate limit headers for all responses
			w.Header().Set("X-RateLimit-Limit", strconv.FormatFloat(cfg.RPS, 'f', 0, 64))
			w.Header().Set("X-RateLimit-Tier", tier.String())
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(resetTime, 10))

			if !limiter.Allow() {
				w.Header().Set("Retry-After", "1")
				w.Header().Set("X-RateLimit-Remaining", "0")
				http.Error(w, "Too many requests. Please slow down.", http.StatusTooManyRequests)
				return
			}

			// Approximate remaining tokens
			remaining := int(limiter.Tokens())
			if remaining < 0 {
				remaining = 0
			}
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

			next.ServeHTTP(w, r)
		})
	}
}
