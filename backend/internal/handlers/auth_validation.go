package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"unicode"
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
