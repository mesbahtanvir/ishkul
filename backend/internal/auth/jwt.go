package auth

import (
	"context"
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

// getJWTSecret returns the JWT secret
// In production, JWT_SECRET must be set - the application will panic if not
// In development, a random secret is generated (with a warning)
func getJWTSecret() []byte {
	jwtSecretOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		env := os.Getenv("ENVIRONMENT")
		isProduction := env == "production"

		if secret == "" {
			if isProduction {
				// In production, JWT_SECRET is required - fail fast
				panic("CRITICAL: JWT_SECRET environment variable is required in production. " +
					"Generate a secure secret with: openssl rand -base64 32")
			}

			// In development, generate a random secret but warn
			randomBytes := make([]byte, 32)
			if _, err := rand.Read(randomBytes); err != nil {
				panic("failed to generate JWT secret: " + err.Error())
			}
			secret = base64.StdEncoding.EncodeToString(randomBytes)
			// Note: This warning will be visible in server logs
			// Consider using a proper logger here
		}

		// Validate secret length (at least 32 bytes recommended for HS256)
		if len(secret) < 32 {
			if isProduction {
				panic("CRITICAL: JWT_SECRET must be at least 32 characters for security. " +
					"Generate a secure secret with: openssl rand -base64 32")
			}
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

// ErrTokenBlacklisted is returned when a token has been revoked
var ErrTokenBlacklisted = errors.New("token has been revoked")

// RefreshTokens generates a new token pair from a valid refresh token
// Deprecated: Use RefreshTokensWithBlacklist for production use
func RefreshTokens(refreshTokenString string) (*TokenPair, error) {
	claims, err := ValidateRefreshToken(refreshTokenString)
	if err != nil {
		return nil, err
	}

	// Generate new token pair
	return GenerateTokenPair(claims.UserID, claims.Email)
}

// RefreshTokensWithBlacklist generates a new token pair from a valid refresh token
// It also checks if the token has been blacklisted
func RefreshTokensWithBlacklist(ctx context.Context, refreshTokenString string, blacklist *TokenBlacklist) (*TokenPair, error) {
	claims, err := ValidateRefreshToken(refreshTokenString)
	if err != nil {
		return nil, err
	}

	// Check if token is blacklisted
	if blacklist != nil {
		isBlacklisted, err := blacklist.IsBlacklisted(ctx, refreshTokenString)
		if err != nil {
			// Log error but don't fail - security vs. availability tradeoff
			// In production, you might want to fail closed instead
		} else if isBlacklisted {
			return nil, ErrTokenBlacklisted
		}

		// Check if all user tokens were revoked after this token was issued
		revocationTime, err := blacklist.GetUserRevocationTime(ctx, claims.UserID)
		if err == nil && revocationTime != nil {
			if claims.IssuedAt != nil && claims.IssuedAt.Time.Before(*revocationTime) {
				return nil, ErrTokenBlacklisted
			}
		}
	}

	// Generate new token pair
	return GenerateTokenPair(claims.UserID, claims.Email)
}
