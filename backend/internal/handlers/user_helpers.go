package handlers

import (
	"context"
	"net/http"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

// =============================================================================
// User Retrieval Helpers
// =============================================================================

// getUserFromContext retrieves the authenticated user from Firestore.
// Returns nil and writes an error response if the user cannot be retrieved.
// This consolidates the common pattern of:
//  1. Getting Firestore client
//  2. Fetching user document
//  3. Parsing user data
//
// Usage:
//
//	user := getUserFromContext(w, ctx, userID)
//	if user == nil {
//	    return // Error response already sent
//	}
func getUserFromContext(w http.ResponseWriter, ctx context.Context, userID string) *models.User {
	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return nil
	}

	userDoc, err := Collection(fs, "users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return nil
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return nil
	}

	return &user
}

// getAuthenticatedUser is a convenience function that combines getting the auth context
// and retrieving the user in one call. Returns nil values if authentication fails
// or user cannot be retrieved.
//
// Usage:
//
//	ctx, userID, user := getAuthenticatedUser(w, r)
//	if user == nil {
//	    return // Error response already sent
//	}
func getAuthenticatedUser(w http.ResponseWriter, r *http.Request) (context.Context, string, *models.User) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return ctx, "", nil
	}

	user := getUserFromContext(w, ctx, userID)
	return ctx, userID, user
}

// =============================================================================
// Method Validation Helper
// =============================================================================

// requireMethod checks if the request method matches the expected method.
// Returns true if the method matches, false otherwise (with error response sent).
//
// Usage:
//
//	if !requireMethod(w, r, http.MethodPost) {
//	    return
//	}
func requireMethod(w http.ResponseWriter, r *http.Request, method string) bool {
	if r.Method != method {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return false
	}
	return true
}

// requirePOST is a convenience wrapper for requireMethod with POST.
func requirePOST(w http.ResponseWriter, r *http.Request) bool {
	return requireMethod(w, r, http.MethodPost)
}
