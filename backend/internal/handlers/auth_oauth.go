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
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/idtoken"
)

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
