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

// ErrorResponse represents a structured error response
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Error codes for authentication
const (
	ErrCodeInvalidRequest     = "INVALID_REQUEST"
	ErrCodeInvalidCredentials = "INVALID_CREDENTIALS"
	ErrCodeEmailExists        = "EMAIL_EXISTS"
	ErrCodeWeakPassword       = "WEAK_PASSWORD"
	ErrCodeInvalidEmail       = "INVALID_EMAIL"
	ErrCodeUserNotFound       = "USER_NOT_FOUND"
	ErrCodeTooManyRequests    = "TOO_MANY_REQUESTS"
	ErrCodeServiceUnavailable = "SERVICE_UNAVAILABLE"
	ErrCodeInternalError      = "INTERNAL_ERROR"
	ErrCodeInvalidToken       = "INVALID_TOKEN"
	ErrCodeTokenExpired       = "TOKEN_EXPIRED"
	ErrCodeMissingCredentials = "MISSING_CREDENTIALS"
)

// sendErrorResponse sends a structured JSON error response
func sendErrorResponse(w http.ResponseWriter, statusCode int, code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	// Error is intentionally not handled - we're already in an error path
	// and can't do much if encoding fails after headers are written
	_ = json.NewEncoder(w).Encode(ErrorResponse{
		Code:    code,
		Message: message,
	})
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
		sendErrorResponse(w, http.StatusMethodNotAllowed, ErrCodeInvalidRequest, "Method not allowed")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidRequest, "Invalid request format")
		return
	}

	ctx := r.Context()
	var userID, email, name, picture string

	// Handle Google ID token login
	if req.GoogleIDToken != "" {
		payload, err := verifyGoogleIDToken(ctx, req.GoogleIDToken)
		if err != nil {
			sendErrorResponse(w, http.StatusUnauthorized, ErrCodeInvalidToken, "Unable to verify Google sign-in. Please try again.")
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
			// Map Firebase errors to user-friendly messages
			errMsg := err.Error()
			switch {
			case errMsg == "EMAIL_NOT_FOUND" || errMsg == "INVALID_PASSWORD" || errMsg == "INVALID_LOGIN_CREDENTIALS":
				sendErrorResponse(w, http.StatusUnauthorized, ErrCodeInvalidCredentials, "Incorrect email or password. Please check and try again.")
			case errMsg == "USER_DISABLED":
				sendErrorResponse(w, http.StatusUnauthorized, ErrCodeInvalidCredentials, "This account has been disabled. Please contact support.")
			case errMsg == "TOO_MANY_ATTEMPTS_TRY_LATER":
				sendErrorResponse(w, http.StatusTooManyRequests, ErrCodeTooManyRequests, "Too many failed attempts. Please try again later.")
			default:
				sendErrorResponse(w, http.StatusUnauthorized, ErrCodeInvalidCredentials, "Incorrect email or password. Please check and try again.")
			}
			return
		}

		userID = firebaseUser.UID
		email = firebaseUser.Email
		name = firebaseUser.DisplayName
		picture = firebaseUser.PhotoURL
	} else {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeMissingCredentials, "Please enter your email and password")
		return
	}

	// Get or create user in Firestore
	user, err := getOrCreateUser(ctx, userID, email, name, picture)
	if err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to complete sign-in. Please try again.")
		return
	}

	// Generate JWT token pair
	tokenPair, err := auth.GenerateTokenPair(userID, email)
	if err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, fmt.Sprintf("Unable to complete sign-in: %v", err))
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
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to complete sign-in. Please try again.")
		return
	}
}

// Register handles new user registration with email/password
func Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, http.StatusMethodNotAllowed, ErrCodeInvalidRequest, "Method not allowed")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidRequest, "Invalid request format")
		return
	}

	if req.Email == "" || req.Password == "" {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeMissingCredentials, "Please enter your email and password")
		return
	}

	if len(req.Password) < 6 {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeWeakPassword, "Password must be at least 6 characters")
		return
	}

	ctx := r.Context()

	// Create user in Firebase Auth
	authClient := firebase.GetAuth()
	if authClient == nil {
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeServiceUnavailable, "Unable to create account. Please try again later.")
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
			sendErrorResponse(w, http.StatusConflict, ErrCodeEmailExists, "This email is already registered. Try signing in instead.")
			return
		}
		// Check for invalid email format
		errMsg := err.Error()
		if contains(errMsg, "email") && contains(errMsg, "invalid") {
			sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidEmail, "Please enter a valid email address")
			return
		}
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to create account. Please try again.")
		return
	}

	// Create user in Firestore
	user, err := getOrCreateUser(ctx, firebaseUser.UID, req.Email, req.DisplayName, "")
	if err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to create account. Please try again.")
		return
	}

	// Generate JWT token pair
	tokenPair, err := auth.GenerateTokenPair(firebaseUser.UID, req.Email)
	if err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, fmt.Sprintf("Unable to create account: %v", err))
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
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to create account. Please try again.")
		return
	}
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsLower(s, substr))
}

func containsLower(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if equalFoldSubstr(s[i:i+len(substr)], substr) {
			return true
		}
	}
	return false
}

func equalFoldSubstr(a, b string) bool {
	for i := 0; i < len(a); i++ {
		ca, cb := a[i], b[i]
		if ca >= 'A' && ca <= 'Z' {
			ca += 'a' - 'A'
		}
		if cb >= 'A' && cb <= 'Z' {
			cb += 'a' - 'A'
		}
		if ca != cb {
			return false
		}
	}
	return true
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
		sendErrorResponse(w, http.StatusMethodNotAllowed, ErrCodeInvalidRequest, "Method not allowed")
		return
	}

	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidRequest, "Invalid request format")
		return
	}

	if req.RefreshToken == "" {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidToken, "Session expired. Please sign in again.")
		return
	}

	// Validate and refresh tokens
	tokenPair, err := auth.RefreshTokens(req.RefreshToken)
	if err != nil {
		switch err {
		case auth.ErrExpiredToken:
			sendErrorResponse(w, http.StatusUnauthorized, ErrCodeTokenExpired, "Session expired. Please sign in again.")
		case auth.ErrInvalidToken, auth.ErrInvalidTokenType:
			sendErrorResponse(w, http.StatusUnauthorized, ErrCodeInvalidToken, "Session expired. Please sign in again.")
		default:
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, fmt.Sprintf("Unable to refresh session: %v", err))
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
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to refresh session. Please sign in again.")
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
