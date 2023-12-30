package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetJWTToken(t *testing.T) {
	testCases := []struct {
		name        string
		email       string
		expectError bool
	}{
		{"Valid Email", "test@example.com", false},
		{"Empty Email", "", false},
		// Add more test cases as necessary
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			token, err := EncodeJWTToken(tc.email)
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
	token, _ := EncodeJWTToken("test@example.com")

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
	validToken, _ := EncodeJWTToken("test@example.com")

	testCases := []struct {
		name    string
		token   string
		isValid bool
	}{
		{"Valid Token", validToken, true},
		{"Invalid Token", "invalidToken", false},
		// Add more test cases as necessary
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, valid := ValidateToken(tc.token)
			assert.Equal(t, tc.isValid, valid)
		})
	}
}
