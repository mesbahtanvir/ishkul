package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/auth"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/idtoken"
)

// LoginRequest represents the login request body
type LoginRequest struct {
	GoogleIDToken string `json:"googleIdToken"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	ExpiresIn    int64        `json:"expiresIn"`
	User         *models.User `json:"user"`
}

// RefreshRequest represents the refresh token request body
type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// RefreshResponse represents the refresh response
type RefreshResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
}

// getGoogleClientIDs returns the valid Google OAuth client IDs
func getGoogleClientIDs() []string {
	clientIDs := []string{}

	// Web client ID
	if webClientID := os.Getenv("GOOGLE_WEB_CLIENT_ID"); webClientID != "" {
		clientIDs = append(clientIDs, webClientID)
	}

	// iOS client ID
	if iosClientID := os.Getenv("GOOGLE_IOS_CLIENT_ID"); iosClientID != "" {
		clientIDs = append(clientIDs, iosClientID)
	}

	// Android client ID
	if androidClientID := os.Getenv("GOOGLE_ANDROID_CLIENT_ID"); androidClientID != "" {
		clientIDs = append(clientIDs, androidClientID)
	}

	return clientIDs
}

// Login handles user authentication via Google ID token
func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.GoogleIDToken == "" {
		http.Error(w, "Google ID token is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// Verify Google ID token
	payload, err := verifyGoogleIDToken(ctx, req.GoogleIDToken)
	if err != nil {
		http.Error(w, "Invalid Google ID token: "+err.Error(), http.StatusUnauthorized)
		return
	}

	// Extract user info from token payload
	userID := payload.Subject
	email, _ := payload.Claims["email"].(string)
	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	// Get or create user in Firestore
	user, err := getOrCreateUser(ctx, userID, email, name, picture)
	if err != nil {
		http.Error(w, "Error creating user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate JWT token pair
	tokenPair, err := auth.GenerateTokenPair(userID, email)
	if err != nil {
		http.Error(w, "Error generating tokens", http.StatusInternalServerError)
		return
	}

	// Send response
	response := LoginResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
		User:         user,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// verifyGoogleIDToken verifies a Google ID token and returns its payload
func verifyGoogleIDToken(ctx context.Context, idToken string) (*idtoken.Payload, error) {
	clientIDs := getGoogleClientIDs()

	// Try to verify against each client ID
	for _, clientID := range clientIDs {
		payload, err := idtoken.Validate(ctx, idToken, clientID)
		if err == nil {
			return payload, nil
		}
	}

	// If no client IDs configured, try without audience validation
	// This is less secure but allows testing
	if len(clientIDs) == 0 {
		payload, err := idtoken.Validate(ctx, idToken, "")
		if err != nil {
			return nil, err
		}
		return payload, nil
	}

	return nil, fmt.Errorf("invalid audience: token does not match any configured client ID")
}

// getOrCreateUser gets an existing user or creates a new one
func getOrCreateUser(ctx context.Context, userID, email, displayName, photoURL string) (*models.User, error) {
	fs := firebase.GetFirestore()
	if fs == nil {
		return nil, fmt.Errorf("firestore client not available")
	}

	docRef := fs.Collection("users").Doc(userID)
	doc, err := docRef.Get(ctx)

	now := time.Now()
	var user models.User

	if err != nil || !doc.Exists() {
		// Create new user
		user = models.User{
			ID:          userID,
			Email:       email,
			DisplayName: displayName,
			PhotoURL:    photoURL,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
	} else {
		// Update existing user
		if err := doc.DataTo(&user); err != nil {
			return nil, err
		}
		// Update fields that might have changed
		user.Email = email
		user.DisplayName = displayName
		user.PhotoURL = photoURL
		user.UpdatedAt = now
	}

	// Save user
	if _, err := docRef.Set(ctx, user); err != nil {
		return nil, err
	}

	return &user, nil
}

// Refresh handles token refresh
func Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.RefreshToken == "" {
		http.Error(w, "Refresh token is required", http.StatusBadRequest)
		return
	}

	// Validate and refresh tokens
	tokenPair, err := auth.RefreshTokens(req.RefreshToken)
	if err != nil {
		switch err {
		case auth.ErrExpiredToken:
			http.Error(w, "Refresh token expired", http.StatusUnauthorized)
		case auth.ErrInvalidToken, auth.ErrInvalidTokenType:
			http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		default:
			http.Error(w, "Error refreshing tokens", http.StatusInternalServerError)
		}
		return
	}

	response := RefreshResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// Logout handles user logout (client-side token deletion)
// In a production system, you might want to blacklist the refresh token
func Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// For now, logout is handled client-side by deleting tokens
	// In production, you could:
	// 1. Add the refresh token to a blacklist
	// 2. Store refresh tokens in database and delete on logout
	// 3. Use short-lived access tokens only

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{
		"message": "Logged out successfully",
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
