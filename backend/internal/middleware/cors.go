package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
)

// Default allowed origins for development
const defaultAllowedOrigins = "http://localhost:3000,http://localhost:8081,http://localhost:19006"

// Production allowed origins (only ishkul.org domains)
const productionAllowedOrigins = "https://ishkul.org,https://www.ishkul.org"

// Staging allowed origins
const stagingAllowedOrigins = "https://staging.ishkul.org"

// isProductionEnvironment checks if running in production
func isProductionEnvironment() bool {
	env := os.Getenv("ENVIRONMENT")
	return env == "production"
}

// isProductionDomain checks if the origin is the production ishkul.org domain
func isProductionDomain(origin string) bool {
	return origin == "https://ishkul.org" || origin == "https://www.ishkul.org"
}

// isStagingDomain checks if the origin is the staging ishkul.org domain
func isStagingDomain(origin string) bool {
	return origin == "https://staging.ishkul.org"
}

// isVercelPreviewDomain checks if the origin is a Vercel preview deployment
// Only allowed in non-production environments (PR deployments)
func isVercelPreviewDomain(origin string) bool {
	if !strings.HasPrefix(origin, "https://") {
		return false
	}
	domain := strings.TrimPrefix(origin, "https://")

	// Vercel production domain for the project
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
			isProduction := isProductionEnvironment()

			// Normalize origin by removing trailing slash for comparison
			normalizedOrigin := strings.TrimSuffix(origin, "/")

			if isProduction {
				// PRODUCTION: Allow ishkul.org, www.ishkul.org, and staging.ishkul.org
				if isProductionDomain(normalizedOrigin) {
					allowed = true
					log.Printf("[CORS] Production: Allowing origin: %s", origin)
				}
				// Also allow staging domain in production backend
				if !allowed && isStagingDomain(normalizedOrigin) {
					allowed = true
					log.Printf("[CORS] Production: Allowing staging origin: %s", origin)
				}
			} else {
				// NON-PRODUCTION (PR deployments, development):
				// Allow Vercel preview domains + localhost for development

				// Check Vercel preview domains
				if isVercelPreviewDomain(normalizedOrigin) {
					allowed = true
					log.Printf("[CORS] Preview: Allowing Vercel domain: %s", origin)
				}

				// Check production domains (also allowed in preview for testing)
				if !allowed && isProductionDomain(normalizedOrigin) {
					allowed = true
					log.Printf("[CORS] Preview: Allowing production domain: %s", origin)
				}

				// Check staging domain
				if !allowed && isStagingDomain(normalizedOrigin) {
					allowed = true
					log.Printf("[CORS] Preview: Allowing staging domain: %s", origin)
				}

				// Check localhost/development origins
				if !allowed {
					allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
					if allowedOrigins == "" {
						allowedOrigins = defaultAllowedOrigins
					}

					origins := strings.Split(allowedOrigins, ",")
					for _, o := range origins {
						trimmed := strings.TrimSuffix(strings.TrimSpace(o), "/")
						if trimmed == normalizedOrigin {
							allowed = true
							log.Printf("[CORS] Development: Allowing origin: %s (matched: %s)", origin, o)
							break
						}
					}
				}
			}

			// Set the origin header if allowed
			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			} else {
				log.Printf("[CORS] Rejected origin: %s (production=%v)", origin, isProduction)
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
