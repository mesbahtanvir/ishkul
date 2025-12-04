package middleware

import (
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// RequestFingerprinter detects distributed attacks by fingerprinting requests
// based on characteristics like User-Agent, Accept headers, and behavior patterns
type RequestFingerprinter struct {
	mu               sync.RWMutex
	fingerprints     map[string]*fingerprintRecord
	suspiciousAgents map[string]bool

	// Configuration
	maxRequestsPerFingerprint int64
	fingerprintWindow         time.Duration
	suspiciousThreshold       int // Number of IPs with same fingerprint to be suspicious
}

type fingerprintRecord struct {
	ips          map[string]bool
	limiter      *rate.Limiter
	lastSeen     time.Time
	requestCount int64
}

// NewRequestFingerprinter creates a new request fingerprinter
func NewRequestFingerprinter() *RequestFingerprinter {
	rf := &RequestFingerprinter{
		fingerprints:              make(map[string]*fingerprintRecord),
		suspiciousAgents:          defaultSuspiciousAgents(),
		maxRequestsPerFingerprint: int64(getEnvInt("FINGERPRINT_MAX_REQUESTS", 100)),
		fingerprintWindow:         time.Duration(getEnvInt("FINGERPRINT_WINDOW_MINUTES", 5)) * time.Minute,
		suspiciousThreshold:       getEnvInt("FINGERPRINT_SUSPICIOUS_THRESHOLD", 10),
	}

	go rf.cleanup()

	log.Printf("Request fingerprinter configured: max requests/fingerprint=%d, window=%v, suspicious threshold=%d IPs",
		rf.maxRequestsPerFingerprint, rf.fingerprintWindow, rf.suspiciousThreshold)

	return rf
}

// defaultSuspiciousAgents returns known suspicious User-Agent patterns
func defaultSuspiciousAgents() map[string]bool {
	return map[string]bool{
		// Empty or missing
		"":  true,
		"-": true,

		// Known attack tools (legitimate pentest tools, but block in production)
		"python-requests": true,
		"python-urllib":   true,
		"curl":            true,
		"wget":            true,
		"httpie":          true,
		"postman":         true, // Usually fine, but can be used for attacks

		// Common bot patterns
		"bot":     true,
		"crawler": true,
		"spider":  true,
		"scraper": true,

		// Suspicious patterns
		"scanner":  true,
		"nikto":    true,
		"sqlmap":   true,
		"nmap":     true,
		"masscan":  true,
		"zap":      true,
		"burp":     true,
		"acunetix": true,
		"nessus":   true,
	}
}

// GenerateFingerprint creates a fingerprint from request characteristics
func (rf *RequestFingerprinter) GenerateFingerprint(r *http.Request) string {
	// Collect fingerprint components
	components := []string{
		r.Header.Get("User-Agent"),
		r.Header.Get("Accept"),
		r.Header.Get("Accept-Language"),
		r.Header.Get("Accept-Encoding"),
		// Don't include IP - we want to detect distributed attacks with same fingerprint
	}

	// Sort headers for consistent fingerprinting
	var headerKeys []string
	for key := range r.Header {
		// Skip headers that vary per request
		if key == "Authorization" || key == "Cookie" || key == "X-Request-Id" ||
			key == "X-Forwarded-For" || key == "X-Real-Ip" || key == "Content-Length" {
			continue
		}
		headerKeys = append(headerKeys, key)
	}
	sort.Strings(headerKeys)

	// Create fingerprint hash
	data := strings.Join(components, "|") + "|" + strings.Join(headerKeys, ",")
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:16]) // Use first 16 bytes for shorter fingerprint
}

// IsSuspiciousAgent checks if the User-Agent matches known attack patterns
func (rf *RequestFingerprinter) IsSuspiciousAgent(userAgent string) bool {
	ua := strings.ToLower(userAgent)

	rf.mu.RLock()
	defer rf.mu.RUnlock()

	for pattern := range rf.suspiciousAgents {
		if pattern == "" && ua == "" {
			return true
		}
		if pattern != "" && strings.Contains(ua, pattern) {
			return true
		}
	}
	return false
}

// RecordRequest records a request and returns whether it appears to be part of a distributed attack
func (rf *RequestFingerprinter) RecordRequest(r *http.Request) (fingerprint string, suspicious bool, distributed bool) {
	fingerprint = rf.GenerateFingerprint(r)
	ip := getClientIP(r)
	userAgent := r.Header.Get("User-Agent")

	rf.mu.Lock()
	defer rf.mu.Unlock()

	// Check for suspicious User-Agent
	suspicious = rf.IsSuspiciousAgentLocked(userAgent)

	record, exists := rf.fingerprints[fingerprint]
	if !exists {
		// Create new record with rate limiter
		rps := float64(rf.maxRequestsPerFingerprint) / rf.fingerprintWindow.Seconds()
		record = &fingerprintRecord{
			ips:      make(map[string]bool),
			limiter:  rate.NewLimiter(rate.Limit(rps), int(rf.maxRequestsPerFingerprint/10)),
			lastSeen: time.Now(),
		}
		rf.fingerprints[fingerprint] = record
	}

	// Update record
	record.ips[ip] = true
	record.lastSeen = time.Now()
	record.requestCount++

	// Check for distributed attack pattern (many IPs with same fingerprint)
	if len(record.ips) >= rf.suspiciousThreshold {
		distributed = true
	}

	return
}

// IsSuspiciousAgentLocked checks User-Agent without locking (caller must hold lock)
func (rf *RequestFingerprinter) IsSuspiciousAgentLocked(userAgent string) bool {
	ua := strings.ToLower(userAgent)

	for pattern := range rf.suspiciousAgents {
		if pattern == "" && ua == "" {
			return true
		}
		if pattern != "" && strings.Contains(ua, pattern) {
			return true
		}
	}
	return false
}

// Allow checks if a request with this fingerprint should be allowed
func (rf *RequestFingerprinter) Allow(fingerprint string) bool {
	rf.mu.RLock()
	defer rf.mu.RUnlock()

	record, exists := rf.fingerprints[fingerprint]
	if !exists {
		return true
	}

	return record.limiter.Allow()
}

// Stats returns fingerprinting statistics
func (rf *RequestFingerprinter) Stats() map[string]interface{} {
	rf.mu.RLock()
	defer rf.mu.RUnlock()

	var totalIPs int
	var totalRequests int64
	var distributedFingerprints int

	for _, record := range rf.fingerprints {
		totalIPs += len(record.ips)
		totalRequests += record.requestCount
		if len(record.ips) >= rf.suspiciousThreshold {
			distributedFingerprints++
		}
	}

	return map[string]interface{}{
		"unique_fingerprints":      len(rf.fingerprints),
		"total_ips":                totalIPs,
		"total_requests":           totalRequests,
		"distributed_fingerprints": distributedFingerprints,
	}
}

// cleanup removes stale fingerprint records
func (rf *RequestFingerprinter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rf.mu.Lock()
		now := time.Now()
		for fp, record := range rf.fingerprints {
			if now.Sub(record.lastSeen) > rf.fingerprintWindow*2 {
				delete(rf.fingerprints, fp)
			}
		}
		rf.mu.Unlock()
	}
}

// AddSuspiciousAgent adds a User-Agent pattern to the suspicious list
func (rf *RequestFingerprinter) AddSuspiciousAgent(pattern string) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	rf.suspiciousAgents[strings.ToLower(pattern)] = true
}

// Fingerprint is the middleware that applies fingerprint-based protection
func (rf *RequestFingerprinter) Fingerprint(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fingerprint, suspicious, distributed := rf.RecordRequest(r)

		// Add fingerprint info to headers (for debugging/monitoring)
		w.Header().Set("X-Request-Fingerprint", fingerprint[:8]) // Short version

		// Block suspicious User-Agents in production
		if suspicious && getEnvBool("BLOCK_SUSPICIOUS_AGENTS", false) {
			log.Printf("Blocked suspicious User-Agent: %s from IP %s", r.Header.Get("User-Agent"), getClientIP(r))
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Apply rate limiting per fingerprint (for distributed attacks)
		if distributed && !rf.Allow(fingerprint) {
			log.Printf("Distributed attack detected: fingerprint=%s from IP %s", fingerprint[:8], getClientIP(r))
			w.Header().Set("Retry-After", "60")
			http.Error(w, "Too many requests from similar clients.", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getEnvBool gets a boolean from environment variable
func getEnvBool(key string, defaultVal bool) bool {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	val = strings.ToLower(strings.TrimSpace(val))
	return val == "true" || val == "1" || val == "yes"
}
