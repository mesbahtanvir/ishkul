package handlers

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/mesbahtanvir/ishkul/backend/internal/auth"
)

// DevGetTestToken returns a test JWT token for development/testing
// ONLY available when ENVIRONMENT is "development"
// This endpoint should NEVER be exposed in production
func DevGetTestToken(w http.ResponseWriter, r *http.Request) {
	// Only allow in development mode
	if os.Getenv("ENVIRONMENT") != "development" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Generate a test token pair
	testUID := "dev-test-user-" + os.Getenv("USER")
	testEmail := "dev-test@example.com"

	tokenPair, err := auth.GenerateTokenPair(testUID, testEmail)
	if err != nil {
		logError(r.Context(), "dev_token_generation_failed")
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Log the token generation
	logInfo(r.Context(), "dev_test_token_generated")

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"accessToken":  tokenPair.AccessToken,
		"refreshToken": tokenPair.RefreshToken,
		"expiresIn":    tokenPair.ExpiresIn,
		"userId":       testUID,
		"email":        testEmail,
		"warning":      "This is a development-only endpoint and should never be used in production",
	}); err != nil {
		logError(r.Context(), "dev_token_encode_failed")
	}
}
