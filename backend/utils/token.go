package utils

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/dgrijalva/jwt-go"
	"golang.org/x/crypto/bcrypt"
)

var secretKey = []byte("super-secret-backend-key")

type Claims struct {
	Email    string `json:"email"`
	Verified bool   `json:"verified"`
	jwt.StandardClaims
}

// EncodeJWTToken generates a JWT token for the given email.
func EncodeJWTToken(email string, verified bool) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token expiration set to 1 day
	claims := &Claims{
		Email:    email,
		Verified: verified,
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
func ValidateToken(tokenString string) (email string, verified bool, validated bool) {
	claims, err := DecodeJWT(tokenString)
	if err != nil {
		return "", false, false
	}
	return claims.Email, claims.Verified, true
}

// ValidateToken validates the JWT token and returns the email from the claims.
func ValidateUserToken(email string, tokenString string) bool {
	claims, err := DecodeJWT(tokenString)
	if err != nil {
		return false
	}
	return claims.Email == email
}

func ValidateVerifiedUserToken(email string, tokenString string) bool {
	claims, err := DecodeJWT(tokenString)
	if err != nil {
		return false
	}
	return claims.Email == email && claims.Verified
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

func GenerateRandomVerificationCode() string {
	srand := rand.New(rand.NewSource(time.Now().UnixNano()))
	code := srand.Intn(1000000)      // generates a number in [0, 1000000)
	return fmt.Sprintf("%06d", code) // formats the number as a 6-digit code
}
