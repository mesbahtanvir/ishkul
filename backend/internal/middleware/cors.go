package middleware

import (
	"net/http"
	"os"
	"strings"
)

// Default allowed origins for development and production
const defaultAllowedOrigins = "http://localhost:3000,http://localhost:8081,http://localhost:19006,https://ishkul.vercel.app"

// isVercelPreviewDomain checks if the origin is a Vercel preview deployment
func isVercelPreviewDomain(origin string) bool {
	// Vercel preview URLs follow patterns like:
	// - https://ishkul-xxx.vercel.app
	// - https://ishkul-xxx-my-dream-company.vercel.app
	if !strings.HasPrefix(origin, "https://") {
		return false
	}
	domain := strings.TrimPrefix(origin, "https://")
	// Check if it's a Vercel preview deployment for ishkul
	if strings.HasPrefix(domain, "ishkul-") && strings.HasSuffix(domain, ".vercel.app") {
		return true
	}
	return false
}

// CORS middleware handles Cross-Origin Resource Sharing
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get allowed origins from environment or use default
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			allowedOrigins = defaultAllowedOrigins
		}

		origin := r.Header.Get("Origin")

		// Check if origin is allowed
		if origin != "" {
			allowed := false

			// Check explicit allowed origins
			origins := strings.Split(allowedOrigins, ",")
			for _, o := range origins {
				if strings.TrimSpace(o) == origin {
					allowed = true
					break
				}
			}

			// Also allow Vercel preview deployments
			if !allowed && isVercelPreviewDomain(origin) {
				allowed = true
			}

			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight request
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
