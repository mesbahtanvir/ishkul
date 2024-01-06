package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"ishkul.org/backend/model"
)

func TestGetJWTToken(t *testing.T) {
	testCases := []struct {
		name          string
		email         string
		emailVerified bool
		expectError   bool
	}{
		{"Valid Email, Not Verified", "test@example.com", false, false},
		{"Empty Email, Not Verified", "", false, false},
		{"Valid Email, Verified", "test@example.com", true, false},
		{"Empty Email, Verified", "", true, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			token, err := EncodeJWTToken(model.User{Email: tc.email, EmailVerified: tc.emailVerified})
			if tc.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, token)
			}
		})
	}
}

func TestDecodeJWT(t *testing.T) {
	token, _ := EncodeJWTToken(model.User{Email: "test@example.com", EmailVerified: false})

	testCases := []struct {
		name        string
		tokenString string
		expectError bool
	}{
		{"Valid Token", token, false},
		{"Invalid Token", "random string should fail", true},
		// Add more test cases as necessary
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := DecodeJWT(tc.tokenString)
			if tc.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateToken(t *testing.T) {
	validToken, _ := EncodeJWTToken(model.User{Email: "test@example.com", EmailVerified: false})

	testCases := []struct {
		name    string
		token   string
		isValid bool
	}{
		{"Valid Token", validToken, true},
		{"Invalid Token", "invalidToken", false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, _, valid := ValidateToken(tc.token)
			assert.Equal(t, tc.isValid, valid)
		})
	}
}
