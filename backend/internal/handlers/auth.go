package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	firebaseauth "firebase.google.com/go/v4/auth"
	"github.com/mesbahtanvir/ishkul/backend/internal/auth"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/idtoken"
)

// LoginRequest represents the login request body
type LoginRequest struct {
	GoogleIDToken string `json:"googleIdToken,omitempty"`
	Email         string `json:"email,omitempty"`
	Password      string `json:"password,omitempty"`
}

// RegisterRequest represents the registration request body
type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
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

// Login handles user authentication via Google ID token or email/password
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

	ctx := r.Context()
	var userID, email, name, picture string

	// Handle Google ID token login
	if req.GoogleIDToken != "" {
		payload, err := verifyGoogleIDToken(ctx, req.GoogleIDToken)
		if err != nil {
			http.Error(w, "Invalid Google ID token: "+err.Error(), http.StatusUnauthorized)
			return
		}

		userID = payload.Subject
		email, _ = payload.Claims["email"].(string)
		name, _ = payload.Claims["name"].(string)
		picture, _ = payload.Claims["picture"].(string)
	} else if req.Email != "" && req.Password != "" {
		// Handle email/password login
		firebaseUser, err := signInWithEmailPassword(ctx, req.Email, req.Password)
		if err != nil {
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			return
		}

		userID = firebaseUser.UID
		email = firebaseUser.Email
		name = firebaseUser.DisplayName
		picture = firebaseUser.PhotoURL
	} else {
		http.Error(w, "Either googleIdToken or email/password is required", http.StatusBadRequest)
		return
	}

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

// Register handles new user registration with email/password
func Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// Create user in Firebase Auth
	authClient := firebase.GetAuth()
	if authClient == nil {
		http.Error(w, "Auth service not available", http.StatusInternalServerError)
		return
	}

	params := (&firebaseauth.UserToCreate{}).
		Email(req.Email).
		Password(req.Password).
		DisplayName(req.DisplayName).
		EmailVerified(false)

	firebaseUser, err := authClient.CreateUser(ctx, params)
	if err != nil {
		if firebaseauth.IsEmailAlreadyExists(err) {
			http.Error(w, "Email already registered", http.StatusConflict)
			return
		}
		http.Error(w, "Error creating user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create user in Firestore
	user, err := getOrCreateUser(ctx, firebaseUser.UID, req.Email, req.DisplayName, "")
	if err != nil {
		http.Error(w, "Error creating user profile: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate JWT token pair
	tokenPair, err := auth.GenerateTokenPair(firebaseUser.UID, req.Email)
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
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// FirebaseAuthResponse represents the response from Firebase Auth REST API
type FirebaseAuthResponse struct {
	IDToken      string `json:"idToken"`
	Email        string `json:"email"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    string `json:"expiresIn"`
	LocalID      string `json:"localId"`
	Registered   bool   `json:"registered"`
}

// FirebaseAuthError represents an error from Firebase Auth REST API
type FirebaseAuthError struct {
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// signInWithEmailPassword verifies email/password via Firebase Auth REST API
func signInWithEmailPassword(ctx context.Context, email, password string) (*firebaseauth.UserRecord, error) {
	apiKey := os.Getenv("FIREBASE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("FIREBASE_API_KEY not configured")
	}

	// Use Firebase Auth REST API to verify credentials
	url := fmt.Sprintf("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=%s", apiKey)

	payload := map[string]interface{}{
		"email":             email,
		"password":          password,
		"returnSecureToken": true,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		var authErr FirebaseAuthError
		if err := json.Unmarshal(body, &authErr); err == nil {
			return nil, fmt.Errorf(authErr.Error.Message)
		}
		return nil, fmt.Errorf("authentication failed")
	}

	var authResp FirebaseAuthResponse
	if err := json.Unmarshal(body, &authResp); err != nil {
		return nil, err
	}

	// Get the full user record from Firebase Admin SDK
	authClient := firebase.GetAuth()
	if authClient == nil {
		return nil, fmt.Errorf("auth service not available")
	}

	return authClient.GetUser(ctx, authResp.LocalID)
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
