package auth

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// hashToken Tests
// =============================================================================

func TestHashToken(t *testing.T) {
	t.Run("returns consistent hash for same input", func(t *testing.T) {
		token := "test-token-12345"
		hash1 := hashToken(token)
		hash2 := hashToken(token)

		assert.Equal(t, hash1, hash2, "same token should produce same hash")
	})

	t.Run("returns different hash for different inputs", func(t *testing.T) {
		hash1 := hashToken("token-1")
		hash2 := hashToken("token-2")

		assert.NotEqual(t, hash1, hash2, "different tokens should produce different hashes")
	})

	t.Run("returns hex-encoded SHA-256 hash", func(t *testing.T) {
		hash := hashToken("test")

		// SHA-256 produces 32 bytes, hex-encoded = 64 characters
		assert.Len(t, hash, 64, "hash should be 64 hex characters")

		// Check it's valid hex
		for _, c := range hash {
			assert.True(t, (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'),
				"hash should only contain hex characters")
		}
	})

	t.Run("handles empty string", func(t *testing.T) {
		hash := hashToken("")

		assert.Len(t, hash, 64, "empty string should still produce valid hash")
		assert.NotEmpty(t, hash)
	})

	t.Run("handles special characters", func(t *testing.T) {
		hash := hashToken("token-with-special!@#$%^&*()chars")

		assert.Len(t, hash, 64, "special characters should produce valid hash")
	})

	t.Run("handles long tokens", func(t *testing.T) {
		longToken := ""
		for i := 0; i < 1000; i++ {
			longToken += "a"
		}
		hash := hashToken(longToken)

		assert.Len(t, hash, 64, "long token should produce same length hash")
	})
}

// =============================================================================
// NewTokenBlacklist Tests
// =============================================================================

func TestNewTokenBlacklist(t *testing.T) {
	t.Run("creates instance with nil client", func(t *testing.T) {
		blacklist := NewTokenBlacklist(nil)

		require.NotNil(t, blacklist)
		assert.Nil(t, blacklist.client)
	})
}

// =============================================================================
// TokenBlacklist Methods with nil client (graceful degradation)
// =============================================================================

func TestTokenBlacklistWithNilClient(t *testing.T) {
	blacklist := NewTokenBlacklist(nil)

	t.Run("BlacklistToken returns nil error with nil client", func(t *testing.T) {
		ctx := testContext()
		err := blacklist.BlacklistToken(ctx, "test-token", "user-123", testTime(), RevocationReasonLogout)

		assert.NoError(t, err, "should gracefully handle nil client")
	})

	t.Run("IsBlacklisted returns false with nil client", func(t *testing.T) {
		ctx := testContext()
		isBlacklisted, err := blacklist.IsBlacklisted(ctx, "test-token")

		assert.NoError(t, err)
		assert.False(t, isBlacklisted, "should return false when client is nil")
	})

	t.Run("BlacklistAllUserTokens returns nil error with nil client", func(t *testing.T) {
		ctx := testContext()
		err := blacklist.BlacklistAllUserTokens(ctx, "user-123", RevocationReasonSecurityConcern)

		assert.NoError(t, err, "should gracefully handle nil client")
	})

	t.Run("GetUserRevocationTime returns nil with nil client", func(t *testing.T) {
		ctx := testContext()
		revocationTime, err := blacklist.GetUserRevocationTime(ctx, "user-123")

		assert.NoError(t, err)
		assert.Nil(t, revocationTime, "should return nil when client is nil")
	})

	t.Run("CleanupExpiredTokens returns 0 with nil client", func(t *testing.T) {
		ctx := testContext()
		count, err := blacklist.CleanupExpiredTokens(ctx)

		assert.NoError(t, err)
		assert.Equal(t, 0, count, "should return 0 when client is nil")
	})
}

// =============================================================================
// isNotFoundError Tests
// =============================================================================

func TestIsNotFoundError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name:     "nil error returns false",
			err:      nil,
			expected: false,
		},
		{
			name:     "error containing NotFound",
			err:      &testError{msg: "some NotFound error"},
			expected: true,
		},
		{
			name:     "error containing not found",
			err:      &testError{msg: "document not found"},
			expected: true,
		},
		{
			name:     "exact rpc NotFound error",
			err:      &testError{msg: "rpc error: code = NotFound desc = Document not found"},
			expected: true,
		},
		{
			name:     "unrelated error",
			err:      &testError{msg: "connection timeout"},
			expected: false,
		},
		{
			name:     "permission denied error",
			err:      &testError{msg: "permission denied"},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isNotFoundError(tt.err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// contains Tests
// =============================================================================

func TestContains(t *testing.T) {
	tests := []struct {
		name     string
		s        string
		substr   string
		expected bool
	}{
		{
			name:     "exact match",
			s:        "hello",
			substr:   "hello",
			expected: true,
		},
		{
			name:     "substring at beginning",
			s:        "hello world",
			substr:   "hello",
			expected: true,
		},
		{
			name:     "substring at end",
			s:        "hello world",
			substr:   "world",
			expected: true,
		},
		{
			name:     "substring in middle",
			s:        "hello world test",
			substr:   "world",
			expected: true,
		},
		{
			name:     "substring not found",
			s:        "hello world",
			substr:   "foo",
			expected: false,
		},
		{
			name:     "empty string and empty substring",
			s:        "",
			substr:   "",
			expected: true,
		},
		{
			name:     "empty substring in non-empty string",
			s:        "hello",
			substr:   "",
			expected: true,
		},
		{
			name:     "non-empty substring in empty string",
			s:        "",
			substr:   "hello",
			expected: false,
		},
		{
			name:     "substring longer than string",
			s:        "hi",
			substr:   "hello",
			expected: false,
		},
		{
			name:     "case sensitive - no match",
			s:        "Hello World",
			substr:   "hello",
			expected: false,
		},
		{
			name:     "special characters",
			s:        "test@email.com",
			substr:   "@email",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := contains(tt.s, tt.substr)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// searchInString Tests
// =============================================================================

func TestSearchInString(t *testing.T) {
	tests := []struct {
		name     string
		s        string
		substr   string
		expected bool
	}{
		{
			name:     "finds substring at start",
			s:        "hello world",
			substr:   "hello",
			expected: true,
		},
		{
			name:     "finds substring at end",
			s:        "hello world",
			substr:   "world",
			expected: true,
		},
		{
			name:     "finds single character",
			s:        "hello",
			substr:   "e",
			expected: true,
		},
		{
			name:     "does not find missing substring",
			s:        "hello",
			substr:   "xyz",
			expected: false,
		},
		{
			name:     "empty substring always found",
			s:        "hello",
			substr:   "",
			expected: true,
		},
		{
			name:     "exact match",
			s:        "test",
			substr:   "test",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := searchInString(tt.s, tt.substr)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// BlacklistedToken Struct Tests
// =============================================================================

func TestBlacklistedTokenStruct(t *testing.T) {
	t.Run("struct has correct fields", func(t *testing.T) {
		now := testTime()
		token := BlacklistedToken{
			TokenHash: "abc123",
			UserID:    "user-456",
			ExpiresAt: now,
			RevokedAt: now,
			Reason:    RevocationReasonLogout,
		}

		assert.Equal(t, "abc123", token.TokenHash)
		assert.Equal(t, "user-456", token.UserID)
		assert.Equal(t, now, token.ExpiresAt)
		assert.Equal(t, now, token.RevokedAt)
		assert.Equal(t, RevocationReasonLogout, token.Reason)
	})
}

// =============================================================================
// Constants Tests
// =============================================================================

func TestRevocationReasonConstants(t *testing.T) {
	t.Run("revocation reasons are defined", func(t *testing.T) {
		assert.Equal(t, "logout", RevocationReasonLogout)
		assert.Equal(t, "security_concern", RevocationReasonSecurityConcern)
		assert.Equal(t, "password_change", RevocationReasonPasswordChange)
	})

	t.Run("blacklist collection is defined", func(t *testing.T) {
		assert.Equal(t, "token_blacklist", blacklistCollection)
	})
}

// =============================================================================
// Test Helpers
// =============================================================================

func testContext() context.Context {
	return context.Background()
}

func testTime() time.Time {
	return time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
}

// testError is a simple error type for testing
type testError struct {
	msg string
}

func (e *testError) Error() string {
	return e.msg
}
