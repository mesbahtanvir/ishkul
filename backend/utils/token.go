package utils

import (
	"time"

	"github.com/dgrijalva/jwt-go"
	"golang.org/x/crypto/bcrypt"
)

var secretKey = []byte("super-secret-backend-key")

type Claims struct {
	Email string `json:"email"`
	jwt.StandardClaims
}

// EncodeJWTToken generates a JWT token for the given email.
func EncodeJWTToken(email string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token expiration set to 1 day
	claims := &Claims{
		Email: email,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secretKey)
}

// DecodeJWT decodes a JWT token and returns the claims.
func DecodeJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}

	_, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return secretKey, nil
	})

	if err != nil {
		return nil, err
	}

	return claims, nil
}

// ValidateToken validates the JWT token and returns the email from the claims.
func ValidateToken(tokenString string) (string, bool) {
	claims, err := DecodeJWT(tokenString)
	if err != nil {
		return "", false
	}
	return claims.Email, true
}

// HashPassword takes a plain text password and returns a hashed version.
func HashPassword(password string) (string, error) {
	// Generate a hashed version of the password
	// DefaultCost is usually a good balance of security and performance
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		// If there's an error, return an empty string and the error
		return "", err
	}
	// Return the hashed password as a string
	return string(hashedPassword), nil
}
