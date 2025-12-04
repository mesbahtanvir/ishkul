package middleware

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

// IPBlocker manages IP-based blocking for rate limit violators
type IPBlocker struct {
	mu              sync.RWMutex
	violations      map[string]*violationRecord
	blocklist       map[string]time.Time // IP -> block expiry time
	maxViolations   int                  // Number of violations before blocking
	blockDuration   time.Duration        // How long to block an IP
	violationWindow time.Duration        // Time window for counting violations
}

type violationRecord struct {
	count     int
	firstSeen time.Time
	lastSeen  time.Time
}

// NewIPBlocker creates a new IP blocker with the specified configuration
func NewIPBlocker(maxViolations int, blockDuration, violationWindow time.Duration) *IPBlocker {
	blocker := &IPBlocker{
		violations:      make(map[string]*violationRecord),
		blocklist:       make(map[string]time.Time),
		maxViolations:   maxViolations,
		blockDuration:   blockDuration,
		violationWindow: violationWindow,
	}

	// Start background cleanup goroutines
	go blocker.cleanupExpiredBlocks()
	go blocker.cleanupStaleViolations()

	log.Printf("IP blocker configured: max violations=%d, block duration=%v, violation window=%v",
		maxViolations, blockDuration, violationWindow)

	return blocker
}

// DefaultIPBlocker creates an IP blocker with configuration from environment variables
// Defaults: 10 violations within 5 minutes results in 15-minute block
func DefaultIPBlocker() *IPBlocker {
	maxViolations := getEnvInt("IP_BLOCK_MAX_VIOLATIONS", 10)
	blockDurationMinutes := getEnvInt("IP_BLOCK_DURATION_MINUTES", 15)
	violationWindowMinutes := getEnvInt("IP_BLOCK_VIOLATION_WINDOW_MINUTES", 5)

	return NewIPBlocker(
		maxViolations,
		time.Duration(blockDurationMinutes)*time.Minute,
		time.Duration(violationWindowMinutes)*time.Minute,
	)
}

// IsBlocked checks if an IP is currently blocked
func (b *IPBlocker) IsBlocked(ip string) bool {
	b.mu.RLock()
	defer b.mu.RUnlock()

	expiry, blocked := b.blocklist[ip]
	if !blocked {
		return false
	}

	// Check if block has expired
	if time.Now().After(expiry) {
		return false // Will be cleaned up by background goroutine
	}

	return true
}

// RecordViolation records a rate limit violation for an IP
// Returns true if the IP should now be blocked
func (b *IPBlocker) RecordViolation(ip string) bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()

	record, exists := b.violations[ip]
	if !exists {
		// Check if single violation exceeds threshold (maxViolations=1)
		if b.maxViolations <= 1 {
			b.blocklist[ip] = now.Add(b.blockDuration)
			log.Printf("IP %s blocked for %v after 1 violation", ip, b.blockDuration)
			return true
		}
		b.violations[ip] = &violationRecord{
			count:     1,
			firstSeen: now,
			lastSeen:  now,
		}
		return false
	}

	// Check if we should reset the violation window
	if now.Sub(record.firstSeen) > b.violationWindow {
		// Window expired, start fresh
		record.count = 1
		record.firstSeen = now
		record.lastSeen = now
		return false
	}

	// Increment violation count
	record.count++
	record.lastSeen = now

	// Check if threshold exceeded
	if record.count >= b.maxViolations {
		// Block the IP
		b.blocklist[ip] = now.Add(b.blockDuration)
		// Clear violations
		delete(b.violations, ip)
		log.Printf("IP %s blocked for %v after %d violations", ip, b.blockDuration, record.count)
		return true
	}

	return false
}

// Unblock manually unblocks an IP
func (b *IPBlocker) Unblock(ip string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.blocklist, ip)
	delete(b.violations, ip)
	log.Printf("IP %s manually unblocked", ip)
}

// GetBlockedIPs returns a list of currently blocked IPs
func (b *IPBlocker) GetBlockedIPs() map[string]time.Time {
	b.mu.RLock()
	defer b.mu.RUnlock()

	result := make(map[string]time.Time, len(b.blocklist))
	now := time.Now()
	for ip, expiry := range b.blocklist {
		if expiry.After(now) {
			result[ip] = expiry
		}
	}
	return result
}

// GetBlockExpiry returns when an IP's block expires, or zero time if not blocked
func (b *IPBlocker) GetBlockExpiry(ip string) time.Time {
	b.mu.RLock()
	defer b.mu.RUnlock()

	expiry, blocked := b.blocklist[ip]
	if !blocked || time.Now().After(expiry) {
		return time.Time{}
	}
	return expiry
}

// Stats returns statistics about blocked IPs
func (b *IPBlocker) Stats() (blockedCount, violationCount int) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	now := time.Now()
	for _, expiry := range b.blocklist {
		if expiry.After(now) {
			blockedCount++
		}
	}
	violationCount = len(b.violations)
	return
}

// Block middleware that rejects requests from blocked IPs
func (b *IPBlocker) Block(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)

		if b.IsBlocked(ip) {
			expiry := b.GetBlockExpiry(ip)
			retryAfter := int(time.Until(expiry).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}

			w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
			w.Header().Set("X-Block-Reason", "rate-limit-violation")
			http.Error(w, "Your IP has been temporarily blocked due to excessive requests.", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// cleanupExpiredBlocks removes expired blocks from the blocklist
func (b *IPBlocker) cleanupExpiredBlocks() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		b.mu.Lock()
		now := time.Now()
		for ip, expiry := range b.blocklist {
			if now.After(expiry) {
				delete(b.blocklist, ip)
				log.Printf("IP %s block expired, removed from blocklist", ip)
			}
		}
		b.mu.Unlock()
	}
}

// cleanupStaleViolations removes old violation records
func (b *IPBlocker) cleanupStaleViolations() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		b.mu.Lock()
		now := time.Now()
		for ip, record := range b.violations {
			if now.Sub(record.lastSeen) > b.violationWindow*2 {
				delete(b.violations, ip)
			}
		}
		b.mu.Unlock()
	}
}

// Environment variable helpers for IP blocker configuration
func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	d, err := time.ParseDuration(val)
	if err != nil {
		log.Printf("Warning: invalid duration for %s, using default %v", key, defaultVal)
		return defaultVal
	}
	return d
}
