package auth

import (
	"os"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func resetJWTSecret() {
	jwtSecretOnce = sync.Once{}
	jwtSecret = nil
}

func TestGenerateTokenPair(t *testing.T) {
	resetJWTSecret()
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-purposes")
	defer os.Unsetenv("JWT_SECRET")

	t.Run("generates valid token pair", func(t *testing.T) {
		userID := "user123"
		email := "test@example.com"

		tokenPair, err := GenerateTokenPair(userID, email)
		require.NoError(t, err)
		assert.NotEmpty(t, tokenPair.AccessToken)
		assert.NotEmpty(t, tokenPair.RefreshToken)
		assert.Equal(t, int64(AccessTokenExpiry.Seconds()), tokenPair.ExpiresIn)
	})

	t.Run("access token contains correct claims", func(t *testing.T) {
		userID := "user456"
		email := "user@test.com"

		tokenPair, err := GenerateTokenPair(userID, email)
		require.NoError(t, err)

		claims, err := ValidateAccessToken(tokenPair.AccessToken)
		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, TokenTypeAccess, claims.TokenType)
		assert.Equal(t, "ishkul-backend", claims.Issuer)
		assert.Equal(t, userID, claims.Subject)
	})

	t.Run("refresh token contains correct claims", func(t *testing.T) {
		userID := "user789"
		email := "refresh@test.com"

		tokenPair, err := GenerateTokenPair(userID, email)
		require.NoError(t, err)

		claims, err := ValidateRefreshToken(tokenPair.RefreshToken)
		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, TokenTypeRefresh, claims.TokenType)
	})

	t.Run("generates different tokens for different users", func(t *testing.T) {
		tokenPair1, err := GenerateTokenPair("user1", "user1@test.com")
		require.NoError(t, err)

		tokenPair2, err := GenerateTokenPair("user2", "user2@test.com")
		require.NoError(t, err)

		assert.NotEqual(t, tokenPair1.AccessToken, tokenPair2.AccessToken)
		assert.NotEqual(t, tokenPair1.RefreshToken, tokenPair2.RefreshToken)
	})
}

func TestValidateToken(t *testing.T) {
	resetJWTSecret()
	os.Setenv("JWT_SECRET", "test-secret-key-for-validation")
	defer os.Unsetenv("JWT_SECRET")

	t.Run("validates valid token", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		claims, err := ValidateToken(tokenPair.AccessToken)
		require.NoError(t, err)
		assert.Equal(t, "user123", claims.UserID)
		assert.Equal(t, "test@example.com", claims.Email)
	})

	t.Run("rejects invalid token", func(t *testing.T) {
		_, err := ValidateToken("invalid-token")
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidToken, err)
	})

	t.Run("rejects tampered token", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		// Tamper with the token
		tamperedToken := tokenPair.AccessToken + "tampered"
		_, err = ValidateToken(tamperedToken)
		assert.Error(t, err)
	})

	t.Run("rejects token with wrong signing method", func(t *testing.T) {
		// Create a token with a different signing method
		claims := &Claims{
			UserID:    "user123",
			Email:     "test@example.com",
			TokenType: TokenTypeAccess,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
		tokenString, _ := token.SignedString(jwt.UnsafeAllowNoneSignatureType)

		_, err := ValidateToken(tokenString)
		assert.Error(t, err)
	})

	t.Run("rejects empty token", func(t *testing.T) {
		_, err := ValidateToken("")
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidToken, err)
	})
}

func TestValidateAccessToken(t *testing.T) {
	resetJWTSecret()
	os.Setenv("JWT_SECRET", "test-secret-key-access")
	defer os.Unsetenv("JWT_SECRET")

	t.Run("validates access token", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		claims, err := ValidateAccessToken(tokenPair.AccessToken)
		require.NoError(t, err)
		assert.Equal(t, TokenTypeAccess, claims.TokenType)
	})

	t.Run("rejects refresh token", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		_, err = ValidateAccessToken(tokenPair.RefreshToken)
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidTokenType, err)
	})

	t.Run("rejects invalid token", func(t *testing.T) {
		_, err := ValidateAccessToken("invalid")
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidToken, err)
	})
}

func TestValidateRefreshToken(t *testing.T) {
	resetJWTSecret()
	os.Setenv("JWT_SECRET", "test-secret-key-refresh")
	defer os.Unsetenv("JWT_SECRET")

	t.Run("validates refresh token", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		claims, err := ValidateRefreshToken(tokenPair.RefreshToken)
		require.NoError(t, err)
		assert.Equal(t, TokenTypeRefresh, claims.TokenType)
	})

	t.Run("rejects access token", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		_, err = ValidateRefreshToken(tokenPair.AccessToken)
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidTokenType, err)
	})
}

func TestRefreshTokens(t *testing.T) {
	resetJWTSecret()
	os.Setenv("JWT_SECRET", "test-secret-key-refresh-tokens")
	defer os.Unsetenv("JWT_SECRET")

	t.Run("refreshes tokens from valid refresh token", func(t *testing.T) {
		originalPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		newPair, err := RefreshTokens(originalPair.RefreshToken)
		require.NoError(t, err)

		assert.NotEmpty(t, newPair.AccessToken)
		assert.NotEmpty(t, newPair.RefreshToken)
		assert.Greater(t, newPair.ExpiresIn, int64(0))

		// Verify new tokens are valid
		accessClaims, err := ValidateAccessToken(newPair.AccessToken)
		require.NoError(t, err)
		assert.Equal(t, "user123", accessClaims.UserID)
		assert.Equal(t, "test@example.com", accessClaims.Email)

		refreshClaims, err := ValidateRefreshToken(newPair.RefreshToken)
		require.NoError(t, err)
		assert.Equal(t, "user123", refreshClaims.UserID)
	})

	t.Run("fails with access token", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		_, err = RefreshTokens(tokenPair.AccessToken)
		assert.Error(t, err)
		assert.Equal(t, ErrInvalidTokenType, err)
	})

	t.Run("fails with invalid token", func(t *testing.T) {
		_, err := RefreshTokens("invalid-token")
		assert.Error(t, err)
	})
}

func TestGetJWTSecret(t *testing.T) {
	t.Run("uses environment variable when set", func(t *testing.T) {
		resetJWTSecret()
		testSecret := "my-custom-secret"
		os.Setenv("JWT_SECRET", testSecret)
		defer os.Unsetenv("JWT_SECRET")

		secret := getJWTSecret()
		assert.Equal(t, []byte(testSecret), secret)
	})

	t.Run("generates random secret when not set", func(t *testing.T) {
		resetJWTSecret()
		os.Unsetenv("JWT_SECRET")

		secret := getJWTSecret()
		assert.NotEmpty(t, secret)
		// Secret should be base64 encoded 32 bytes = 44 characters
		assert.GreaterOrEqual(t, len(secret), 32)
	})

	t.Run("returns same secret on multiple calls", func(t *testing.T) {
		resetJWTSecret()
		os.Setenv("JWT_SECRET", "consistent-secret")
		defer os.Unsetenv("JWT_SECRET")

		secret1 := getJWTSecret()
		secret2 := getJWTSecret()
		assert.Equal(t, secret1, secret2)
	})
}

func TestTokenExpiry(t *testing.T) {
	resetJWTSecret()
	os.Setenv("JWT_SECRET", "test-secret-expiry")
	defer os.Unsetenv("JWT_SECRET")

	t.Run("access token has correct expiry", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		claims, err := ValidateAccessToken(tokenPair.AccessToken)
		require.NoError(t, err)

		expectedExpiry := time.Now().Add(AccessTokenExpiry)
		actualExpiry := claims.ExpiresAt.Time
		// Allow 2 second tolerance
		assert.WithinDuration(t, expectedExpiry, actualExpiry, 2*time.Second)
	})

	t.Run("refresh token has correct expiry", func(t *testing.T) {
		tokenPair, err := GenerateTokenPair("user123", "test@example.com")
		require.NoError(t, err)

		claims, err := ValidateRefreshToken(tokenPair.RefreshToken)
		require.NoError(t, err)

		expectedExpiry := time.Now().Add(RefreshTokenExpiry)
		actualExpiry := claims.ExpiresAt.Time
		// Allow 2 second tolerance
		assert.WithinDuration(t, expectedExpiry, actualExpiry, 2*time.Second)
	})
}

func TestClaims(t *testing.T) {
	t.Run("Claims struct has all required fields", func(t *testing.T) {
		claims := &Claims{
			UserID:    "user123",
			Email:     "test@example.com",
			TokenType: TokenTypeAccess,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Issuer:    "ishkul-backend",
			},
		}

		assert.Equal(t, "user123", claims.UserID)
		assert.Equal(t, "test@example.com", claims.Email)
		assert.Equal(t, TokenTypeAccess, claims.TokenType)
	})
}

func TestTokenPair(t *testing.T) {
	t.Run("TokenPair struct has all required fields", func(t *testing.T) {
		tokenPair := &TokenPair{
			AccessToken:  "access",
			RefreshToken: "refresh",
			ExpiresIn:    900,
		}

		assert.Equal(t, "access", tokenPair.AccessToken)
		assert.Equal(t, "refresh", tokenPair.RefreshToken)
		assert.Equal(t, int64(900), tokenPair.ExpiresIn)
	})
}

func TestErrors(t *testing.T) {
	t.Run("error messages are correct", func(t *testing.T) {
		assert.Equal(t, "invalid token", ErrInvalidToken.Error())
		assert.Equal(t, "token has expired", ErrExpiredToken.Error())
		assert.Equal(t, "invalid token type", ErrInvalidTokenType.Error())
	})
}

func TestConstants(t *testing.T) {
	t.Run("token types are correct", func(t *testing.T) {
		assert.Equal(t, "access", TokenTypeAccess)
		assert.Equal(t, "refresh", TokenTypeRefresh)
	})

	t.Run("token expiry times are correct", func(t *testing.T) {
		assert.Equal(t, 15*time.Minute, AccessTokenExpiry)
		assert.Equal(t, 7*24*time.Hour, RefreshTokenExpiry)
	})
}
