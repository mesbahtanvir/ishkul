package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

type contextKey string

const (
	UserIDKey contextKey = "userID"
	UserKey   contextKey = "user"
)

// Auth middleware validates Firebase authentication token
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		token := parts[1]

		// Verify token with Firebase
		authClient := firebase.GetAuth()
		decodedToken, err := authClient.VerifyIDToken(r.Context(), token)
		if err != nil {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Add user ID to context
		ctx := context.WithValue(r.Context(), UserIDKey, decodedToken.UID)
		ctx = context.WithValue(ctx, UserKey, decodedToken)

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
