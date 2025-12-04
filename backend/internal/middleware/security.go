package middleware

import (
	"net/http"
	"os"
	"strings"
)

// SecurityHeaders adds security-related HTTP headers to responses
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Strict-Transport-Security (HSTS)
		// Forces browsers to use HTTPS for all future requests
		// max-age=31536000 = 1 year, includeSubDomains applies to all subdomains
		// preload allows inclusion in browser HSTS preload lists
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

		// X-Frame-Options
		// Prevents clickjacking by disallowing embedding in iframes
		w.Header().Set("X-Frame-Options", "DENY")

		// X-Content-Type-Options
		// Prevents MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// X-XSS-Protection
		// Legacy XSS protection (still useful for older browsers)
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Referrer-Policy
		// Controls how much referrer information is shared
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions-Policy (formerly Feature-Policy)
		// Restricts browser features
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Content-Security-Policy
		// Restricts resource loading to prevent XSS and data injection attacks
		csp := buildCSP()
		w.Header().Set("Content-Security-Policy", csp)

		// Cache-Control for sensitive endpoints
		// Prevent caching of authenticated responses
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
		}

		next.ServeHTTP(w, r)
	})
}

// buildCSP constructs the Content-Security-Policy header
func buildCSP() string {
	env := os.Getenv("ENVIRONMENT")
	isProduction := env == "production"

	// Base CSP directives
	directives := []string{
		"default-src 'self'",
		"script-src 'self'",
		"style-src 'self' 'unsafe-inline'", // unsafe-inline needed for some UI frameworks
		"img-src 'self' data: https:",
		"font-src 'self' https://fonts.gstatic.com",
		"connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	}

	// Add report-uri in production for CSP violation reporting
	if isProduction {
		// You can add a CSP reporting endpoint here
		// directives = append(directives, "report-uri /api/csp-report")
	}

	return strings.Join(directives, "; ")
}

// SecureRedirect ensures HTTPS is used in production
func SecureRedirect(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		env := os.Getenv("ENVIRONMENT")
		isProduction := env == "production"

		// Check if request is not HTTPS in production
		if isProduction {
			// Check X-Forwarded-Proto header (set by load balancers like Cloud Run)
			proto := r.Header.Get("X-Forwarded-Proto")
			if proto == "http" {
				// Redirect to HTTPS
				httpsURL := "https://" + r.Host + r.RequestURI
				http.Redirect(w, r, httpsURL, http.StatusMovedPermanently)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
