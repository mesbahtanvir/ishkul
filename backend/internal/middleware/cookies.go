package middleware

import (
	"net/http"
	"os"
	"time"
)

const (
	// AccessTokenCookieName is the name of the access token cookie
	AccessTokenCookieName = "ishkul_access_token"
	// RefreshTokenCookieName is the name of the refresh token cookie
	RefreshTokenCookieName = "ishkul_refresh_token"
	// CSRFTokenCookieName is the name of the CSRF token cookie
	CSRFTokenCookieName = "ishkul_csrf_token"
	// CSRFHeaderName is the header name for CSRF token validation
	CSRFHeaderName = "X-CSRF-Token"
)

// CookieConfig holds configuration for secure cookies
type CookieConfig struct {
	Domain   string
	Secure   bool
	SameSite http.SameSite
}

// GetCookieConfig returns the appropriate cookie configuration based on environment
func GetCookieConfig() CookieConfig {
	env := os.Getenv("ENVIRONMENT")
	isProduction := env == "production"

	config := CookieConfig{
		Secure:   isProduction,
		SameSite: http.SameSiteLaxMode,
	}

	// In production, set domain to allow cookies across subdomains
	if isProduction {
		config.Domain = os.Getenv("COOKIE_DOMAIN") // e.g., ".ishkul.org"
		config.SameSite = http.SameSiteStrictMode
	}

	return config
}

// SetAccessTokenCookie sets the access token as an HttpOnly cookie
func SetAccessTokenCookie(w http.ResponseWriter, token string, expiresIn time.Duration) {
	config := GetCookieConfig()

	http.SetCookie(w, &http.Cookie{
		Name:     AccessTokenCookieName,
		Value:    token,
		Path:     "/",
		Domain:   config.Domain,
		MaxAge:   int(expiresIn.Seconds()),
		HttpOnly: true, // Prevents JavaScript access (XSS protection)
		Secure:   config.Secure,
		SameSite: config.SameSite,
	})
}

// SetRefreshTokenCookie sets the refresh token as an HttpOnly cookie
func SetRefreshTokenCookie(w http.ResponseWriter, token string, expiresIn time.Duration) {
	config := GetCookieConfig()

	http.SetCookie(w, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    token,
		Path:     "/api/auth/refresh", // Only sent to refresh endpoint
		Domain:   config.Domain,
		MaxAge:   int(expiresIn.Seconds()),
		HttpOnly: true,
		Secure:   config.Secure,
		SameSite: config.SameSite,
	})
}

// ClearAuthCookies removes both auth cookies (for logout)
func ClearAuthCookies(w http.ResponseWriter) {
	config := GetCookieConfig()

	// Clear access token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     AccessTokenCookieName,
		Value:    "",
		Path:     "/",
		Domain:   config.Domain,
		MaxAge:   -1, // Delete cookie
		HttpOnly: true,
		Secure:   config.Secure,
		SameSite: config.SameSite,
	})

	// Clear refresh token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    "",
		Path:     "/api/auth/refresh",
		Domain:   config.Domain,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   config.Secure,
		SameSite: config.SameSite,
	})
}

// GetAccessTokenFromCookie extracts the access token from the cookie
func GetAccessTokenFromCookie(r *http.Request) string {
	cookie, err := r.Cookie(AccessTokenCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

// GetRefreshTokenFromCookie extracts the refresh token from the cookie
func GetRefreshTokenFromCookie(r *http.Request) string {
	cookie, err := r.Cookie(RefreshTokenCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

// SetCSRFTokenCookie sets a non-HttpOnly CSRF token cookie
// This cookie IS accessible to JavaScript so it can be read and sent as a header
func SetCSRFTokenCookie(w http.ResponseWriter, token string) {
	config := GetCookieConfig()

	http.SetCookie(w, &http.Cookie{
		Name:     CSRFTokenCookieName,
		Value:    token,
		Path:     "/",
		Domain:   config.Domain,
		MaxAge:   86400 * 7, // 7 days
		HttpOnly: false,     // Must be accessible to JavaScript
		Secure:   config.Secure,
		SameSite: config.SameSite,
	})
}

// ValidateCSRFToken checks that the CSRF header matches the cookie
func ValidateCSRFToken(r *http.Request) bool {
	cookie, err := r.Cookie(CSRFTokenCookieName)
	if err != nil {
		return false
	}

	header := r.Header.Get(CSRFHeaderName)
	if header == "" {
		return false
	}

	return cookie.Value == header
}
