package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode"

	firebaseauth "firebase.google.com/go/v4/auth"
	"github.com/mesbahtanvir/ishkul/backend/internal/auth"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
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

// Error codes for learning paths
const (
	ErrCodePathCompleted = "PATH_COMPLETED"
	ErrCodePathArchived  = "PATH_ARCHIVED"
	ErrCodePathDeleted   = "PATH_DELETED"
)

// Password requirements
const (
	MinPasswordLength = 12
	MaxPasswordLength = 128
)

// emailRegex is a simple regex for basic email format validation
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// PasswordValidationResult contains the result of password validation
type PasswordValidationResult struct {
	Valid    bool
	Message  string
	Feedback []string
}

// validatePassword checks if a password meets security requirements:
// - Minimum 12 characters
// - Maximum 128 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one digit
// - At least one special character
func validatePassword(password string) PasswordValidationResult {
	var feedback []string

	// Check length
	if len(password) < MinPasswordLength {
		feedback = append(feedback, fmt.Sprintf("at least %d characters", MinPasswordLength))
	}
	if len(password) > MaxPasswordLength {
		return PasswordValidationResult{
			Valid:   false,
			Message: fmt.Sprintf("Password must be at most %d characters", MaxPasswordLength),
		}
	}

	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		feedback = append(feedback, "one uppercase letter")
	}
	if !hasLower {
		feedback = append(feedback, "one lowercase letter")
	}
	if !hasDigit {
		feedback = append(feedback, "one number")
	}
	if !hasSpecial {
		feedback = append(feedback, "one special character (!@#$%^&*)")
	}

	if len(feedback) > 0 {
		return PasswordValidationResult{
			Valid:    false,
			Message:  "Password must contain: " + strings.Join(feedback, ", "),
			Feedback: feedback,
		}
	}

	return PasswordValidationResult{Valid: true}
}

// validateEmail checks if an email address has a valid format
func validateEmail(email string) bool {
	if len(email) > 254 {
		return false
	}
	return emailRegex.MatchString(email)
}

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
		// Log the actual error server-side, but don't expose to client
		sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Unable to complete sign-in. Please try again.")
		return
	}

	// Set HttpOnly cookies for web clients
	// These cookies provide XSS protection by being inaccessible to JavaScript
	middleware.SetAccessTokenCookie(w, tokenPair.AccessToken, auth.AccessTokenExpiry)
	middleware.SetRefreshTokenCookie(w, tokenPair.RefreshToken, auth.RefreshTokenExpiry)

	// Send JSON response (for mobile clients and backwards compatibility)
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

	// Set HttpOnly cookies for web clients
	middleware.SetAccessTokenCookie(w, tokenPair.AccessToken, auth.AccessTokenExpiry)
	middleware.SetRefreshTokenCookie(w, tokenPair.RefreshToken, auth.RefreshTokenExpiry)

	// Send JSON response
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
			return nil, fmt.Errorf("%s", authErr.Error.Message)
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

	// SECURITY: Require at least one client ID to be configured
	// This prevents token acceptance without proper audience validation
	if len(clientIDs) == 0 {
		return nil, fmt.Errorf("no Google client IDs configured: authentication is not available")
	}

	// Try to verify against each client ID
	for _, clientID := range clientIDs {
		payload, err := idtoken.Validate(ctx, idToken, clientID)
		if err == nil {
			return payload, nil
		}
	}

	return nil, fmt.Errorf("invalid audience: token does not match any configured client ID")
}

// getOrCreateUser gets an existing user or creates a new one
func getOrCreateUser(ctx context.Context, userID, email, displayName, photoURL string) (*models.User, error) {
	fs := firebase.GetFirestore()
	if fs == nil {
		return nil, fmt.Errorf("firestore client not available")
	}

	docRef := Collection(fs, "users").Doc(userID)
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

// LogoutRequest represents the logout request body
type LogoutRequest struct {
	RefreshToken string `json:"refreshToken"`
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
