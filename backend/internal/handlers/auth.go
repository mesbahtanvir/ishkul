package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	firebaseauth "firebase.google.com/go/v4/auth"
	"github.com/mesbahtanvir/ishkul/backend/internal/auth"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
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
	AccessToken   string       `json:"accessToken"`
	RefreshToken  string       `json:"refreshToken"`
	FirebaseToken string       `json:"firebaseToken"` // Custom token for Firebase client SDK
	ExpiresIn     int64        `json:"expiresIn"`
	User          *models.User `json:"user"`
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

// Error codes for learning paths
const (
	ErrCodePathCompleted = "PATH_COMPLETED"
	ErrCodePathArchived  = "PATH_ARCHIVED"
	ErrCodePathDeleted   = "PATH_DELETED"
)

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

// LogoutRequest represents the logout request body
type LogoutRequest struct {
	RefreshToken string `json:"refreshToken"`
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
		// Log the actual error server-side, but don't expose to client
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to complete sign-in. Please try again.")
		return
	}

	// Generate Firebase custom token for real-time subscriptions
	firebaseToken, err := generateFirebaseCustomToken(ctx, userID)
	if err != nil {
		// Log error but don't fail login - Firebase subscriptions are optional
		// The frontend will fall back to polling if no token is available
		firebaseToken = ""
	}

	// Set HttpOnly cookies for web clients
	// These cookies provide XSS protection by being inaccessible to JavaScript
	middleware.SetAccessTokenCookie(w, tokenPair.AccessToken, auth.AccessTokenExpiry)
	middleware.SetRefreshTokenCookie(w, tokenPair.RefreshToken, auth.RefreshTokenExpiry)

	// Send JSON response (for mobile clients and backwards compatibility)
	response := LoginResponse{
		AccessToken:   tokenPair.AccessToken,
		RefreshToken:  tokenPair.RefreshToken,
		FirebaseToken: firebaseToken,
		ExpiresIn:     tokenPair.ExpiresIn,
		User:          user,
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

	// Validate email format
	if !validateEmail(req.Email) {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidEmail, "Please enter a valid email address")
		return
	}

	// Validate password strength
	passwordResult := validatePassword(req.Password)
	if !passwordResult.Valid {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeWeakPassword, passwordResult.Message)
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
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "email") && strings.Contains(errMsg, "invalid") {
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
		// Log the actual error server-side, but don't expose to client
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to create account. Please try again.")
		return
	}

	// Generate Firebase custom token for real-time subscriptions
	firebaseToken, err := generateFirebaseCustomToken(ctx, firebaseUser.UID)
	if err != nil {
		// Log error but don't fail registration - Firebase subscriptions are optional
		firebaseToken = ""
	}

	// Set HttpOnly cookies for web clients
	middleware.SetAccessTokenCookie(w, tokenPair.AccessToken, auth.AccessTokenExpiry)
	middleware.SetRefreshTokenCookie(w, tokenPair.RefreshToken, auth.RefreshTokenExpiry)

	// Send JSON response
	response := LoginResponse{
		AccessToken:   tokenPair.AccessToken,
		RefreshToken:  tokenPair.RefreshToken,
		FirebaseToken: firebaseToken,
		ExpiresIn:     tokenPair.ExpiresIn,
		User:          user,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to create account. Please try again.")
		return
	}
}

// Refresh handles token refresh
func Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, http.StatusMethodNotAllowed, ErrCodeInvalidRequest, "Method not allowed")
		return
	}

	ctx := r.Context()

	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidRequest, "Invalid request format")
		return
	}

	if req.RefreshToken == "" {
		sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidToken, "Session expired. Please sign in again.")
		return
	}

	// Get blacklist for token validation
	var blacklist *auth.TokenBlacklist
	fs := firebase.GetFirestore()
	if fs != nil {
		blacklist = auth.NewTokenBlacklist(fs)
	}

	// Validate and refresh tokens with blacklist check
	tokenPair, err := auth.RefreshTokensWithBlacklist(ctx, req.RefreshToken, blacklist)
	if err != nil {
		switch err {
		case auth.ErrExpiredToken:
			sendErrorResponse(w, http.StatusUnauthorized, ErrCodeTokenExpired, "Session expired. Please sign in again.")
		case auth.ErrInvalidToken, auth.ErrInvalidTokenType:
			sendErrorResponse(w, http.StatusUnauthorized, ErrCodeInvalidToken, "Session expired. Please sign in again.")
		case auth.ErrTokenBlacklisted:
			sendErrorResponse(w, http.StatusUnauthorized, ErrCodeInvalidToken, "Session has been revoked. Please sign in again.")
		default:
			// Log the actual error server-side, but don't expose to client
			sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to refresh session. Please sign in again.")
		}
		return
	}

	// Set HttpOnly cookies for web clients
	middleware.SetAccessTokenCookie(w, tokenPair.AccessToken, auth.AccessTokenExpiry)
	middleware.SetRefreshTokenCookie(w, tokenPair.RefreshToken, auth.RefreshTokenExpiry)

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

// Logout handles user logout by blacklisting the refresh token and clearing cookies
func Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	var refreshToken string

	// Try to get refresh token from request body
	var req LogoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.RefreshToken != "" {
		refreshToken = req.RefreshToken
	}

	// If no token in body, try to get from cookie
	if refreshToken == "" {
		refreshToken = middleware.GetRefreshTokenFromCookie(r)
	}

	// If refresh token found, blacklist it
	if refreshToken != "" {
		// Validate token to get claims (expiration time)
		claims, err := auth.ValidateRefreshToken(refreshToken)
		if err == nil && claims != nil {
			// Get Firestore client for blacklist
			fs := firebase.GetFirestore()
			if fs != nil {
				blacklist := auth.NewTokenBlacklist(fs)
				expiresAt := claims.ExpiresAt.Time
				// Blacklist the token - ignore errors (best effort)
				_ = blacklist.BlacklistToken(ctx, refreshToken, claims.UserID, expiresAt, auth.RevocationReasonLogout)
			}
		}
	}

	// Clear auth cookies (for web clients)
	middleware.ClearAuthCookies(w)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{
		"message": "Logged out successfully",
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// generateFirebaseCustomToken creates a Firebase custom token for the given user ID.
// This token allows the frontend to authenticate with Firebase client SDK
// for real-time Firestore subscriptions.
func generateFirebaseCustomToken(ctx context.Context, userID string) (string, error) {
	authClient := firebase.GetAuth()
	if authClient == nil {
		return "", nil // Return empty token if Firebase Auth is not available
	}

	// Create custom token with no additional claims
	// The token will be valid for 1 hour (Firebase default)
	token, err := authClient.CustomToken(ctx, userID)
	if err != nil {
		return "", err
	}

	return token, nil
}
