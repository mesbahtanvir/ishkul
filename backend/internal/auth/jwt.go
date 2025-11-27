package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrInvalidTokenType = errors.New("invalid token type")
)

// Token types
const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

// Token expiration times
const (
	AccessTokenExpiry  = 15 * time.Minute
	RefreshTokenExpiry = 7 * 24 * time.Hour // 7 days
)

// Claims represents the JWT claims
type Claims struct {
	UserID    string `json:"uid"`
	Email     string `json:"email"`
	TokenType string `json:"type"`
	jwt.RegisteredClaims
}

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"` // seconds until access token expires
}

var (
	jwtSecret     []byte
	jwtSecretOnce sync.Once
)

// getJWTSecret returns the JWT secret, generating one if not set
func getJWTSecret() []byte {
	jwtSecretOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			// Generate a random secret if not provided
			// In production, this should always be set via environment variable
			randomBytes := make([]byte, 32)
			if _, err := rand.Read(randomBytes); err != nil {
				panic("failed to generate JWT secret: " + err.Error())
			}
			secret = base64.StdEncoding.EncodeToString(randomBytes)
		}
		jwtSecret = []byte(secret)
	})
	return jwtSecret
}

// GenerateTokenPair creates a new access and refresh token pair for a user
func GenerateTokenPair(userID, email string) (*TokenPair, error) {
	now := time.Now()
	secret := getJWTSecret()

	// Generate access token
	accessClaims := &Claims{
		UserID:    userID,
		Email:     email,
		TokenType: TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "ishkul-backend",
			Subject:   userID,
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(secret)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshClaims := &Claims{
		UserID:    userID,
		Email:     email,
		TokenType: TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(RefreshTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "ishkul-backend",
			Subject:   userID,
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(secret)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(AccessTokenExpiry.Seconds()),
	}, nil
}

// ValidateToken validates a JWT token and returns its claims
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return getJWTSecret(), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateAccessToken validates an access token specifically
func ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != TokenTypeAccess {
		return nil, ErrInvalidTokenType
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token specifically
func ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != TokenTypeRefresh {
		return nil, ErrInvalidTokenType
	}

	return claims, nil
}

// RefreshTokens generates a new token pair from a valid refresh token
func RefreshTokens(refreshTokenString string) (*TokenPair, error) {
	claims, err := ValidateRefreshToken(refreshTokenString)
	if err != nil {
		return nil, err
	}

	// Generate new token pair
	return GenerateTokenPair(claims.UserID, claims.Email)
}
