package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/mesbahtanvir/ishkul/backend/internal/auth"
)

type contextKey string

const (
	UserIDKey    contextKey = "userID"
	UserEmailKey contextKey = "userEmail"
)

// Auth middleware validates JWT session tokens
// It checks for tokens in the following order:
// 1. Authorization header (Bearer token)
// 2. HttpOnly cookie (for web clients)
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var token string

		// First, try to get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			// Extract token from "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
			}
		}

		// If no header token, try to get from HttpOnly cookie
		if token == "" {
			token = GetAccessTokenFromCookie(r)
		}

		// If still no token, reject the request
		if token == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		// Validate JWT session token
		claims, err := auth.ValidateAccessToken(token)
		if err != nil {
			switch err {
			case auth.ErrExpiredToken:
				http.Error(w, "Token expired", http.StatusUnauthorized)
			case auth.ErrInvalidToken, auth.ErrInvalidTokenType:
				http.Error(w, "Invalid token", http.StatusUnauthorized)
			default:
				http.Error(w, "Authentication failed", http.StatusUnauthorized)
			}
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UserEmailKey, claims.Email)

		// Call next handler with updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) string {
	if userID, ok := ctx.Value(UserIDKey).(string); ok {
		return userID
	}
	return ""
}

// GetUserEmail extracts user email from context
func GetUserEmail(ctx context.Context) string {
	if email, ok := ctx.Value(UserEmailKey).(string); ok {
		return email
	}
	return ""
}
