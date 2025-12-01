package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
)

// Default allowed origins for development and production
const defaultAllowedOrigins = "http://localhost:3000,http://localhost:8081,http://localhost:19006,https://ishkul.vercel.app,https://www.ishkul.org,https://ishkul.org"

// isVercelDomain checks if the origin is a Vercel deployment (production or preview)
func isVercelDomain(origin string) bool {
	if !strings.HasPrefix(origin, "https://") {
		return false
	}
	domain := strings.TrimPrefix(origin, "https://")

	// Production domain
	if domain == "ishkul.vercel.app" {
		return true
	}

	// Vercel preview URLs follow patterns like:
	// - https://ishkul-xxx.vercel.app
	// - https://ishkul-xxx-my-dream-company.vercel.app
	if strings.HasPrefix(domain, "ishkul-") && strings.HasSuffix(domain, ".vercel.app") {
		return true
	}

	// Also allow any *.vercel.app subdomain for the project
	if strings.HasSuffix(domain, ".vercel.app") && strings.Contains(domain, "ishkul") {
		return true
	}

	return false
}

// CORS middleware handles Cross-Origin Resource Sharing
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Always set these headers for CORS preflight to work
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Check if origin is allowed
		if origin != "" {
			allowed := false

			// First, check if it's a Vercel domain (production or preview)
			if isVercelDomain(origin) {
				allowed = true
				log.Printf("[CORS] Allowing Vercel domain: %s", origin)
			}

			// Then check explicit allowed origins from env or default
			if !allowed {
				allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
				if allowedOrigins == "" {
					allowedOrigins = defaultAllowedOrigins
				}

				// Normalize origin by removing trailing slash for comparison
				normalizedOrigin := strings.TrimSuffix(origin, "/")

				origins := strings.Split(allowedOrigins, ",")
				for _, o := range origins {
					// Trim whitespace and trailing slash from allowed origin
					trimmed := strings.TrimSuffix(strings.TrimSpace(o), "/")
					if trimmed == normalizedOrigin {
						allowed = true
						log.Printf("[CORS] Allowing explicit origin: %s (matched: %s)", origin, o)
						break
					}
				}
			}

			// Set the origin header if allowed
			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			} else {
				log.Printf("[CORS] Rejected origin: %s", origin)
			}
		}

		// Handle preflight request
		if r.Method == "OPTIONS" {
			// For preflight, ensure we have the origin header set if it was allowed
			if w.Header().Get("Access-Control-Allow-Origin") != "" {
				w.WriteHeader(http.StatusNoContent)
			} else {
				// Origin not allowed - return 403 for preflight
				w.WriteHeader(http.StatusForbidden)
			}
			return
		}

		next.ServeHTTP(w, r)
	})
}
