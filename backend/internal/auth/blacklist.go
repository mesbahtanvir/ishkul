package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"cloud.google.com/go/firestore"
)

// BlacklistedToken represents a blacklisted refresh token in Firestore
type BlacklistedToken struct {
	TokenHash string    `firestore:"tokenHash"`
	UserID    string    `firestore:"userId"`
	ExpiresAt time.Time `firestore:"expiresAt"`
	RevokedAt time.Time `firestore:"revokedAt"`
	Reason    string    `firestore:"reason"`
}

const (
	blacklistCollection = "token_blacklist"
	// RevocationReasonLogout is the reason for logout-based revocation
	RevocationReasonLogout = "logout"
	// RevocationReasonSecurityConcern is the reason for security-based revocation
	RevocationReasonSecurityConcern = "security_concern"
	// RevocationReasonPasswordChange is the reason for password change revocation
	RevocationReasonPasswordChange = "password_change"
)

// TokenBlacklist provides methods for managing blacklisted tokens
type TokenBlacklist struct {
	client *firestore.Client
}

// NewTokenBlacklist creates a new TokenBlacklist instance
func NewTokenBlacklist(client *firestore.Client) *TokenBlacklist {
	return &TokenBlacklist{client: client}
}

// hashToken creates a SHA-256 hash of a token for storage
// We store hashes instead of raw tokens for security
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// BlacklistToken adds a token to the blacklist
func (b *TokenBlacklist) BlacklistToken(ctx context.Context, token string, userID string, expiresAt time.Time, reason string) error {
	if b.client == nil {
		// If no Firestore client, skip blacklisting (graceful degradation)
		return nil
	}

	tokenHash := hashToken(token)

	blacklistedToken := BlacklistedToken{
		TokenHash: tokenHash,
		UserID:    userID,
		ExpiresAt: expiresAt,
		RevokedAt: time.Now(),
		Reason:    reason,
	}

	// Use token hash as document ID for efficient lookup
	_, err := b.client.Collection(blacklistCollection).Doc(tokenHash).Set(ctx, blacklistedToken)
	return err
}

// IsBlacklisted checks if a token is in the blacklist
func (b *TokenBlacklist) IsBlacklisted(ctx context.Context, token string) (bool, error) {
	if b.client == nil {
		// If no Firestore client, assume not blacklisted (graceful degradation)
		return false, nil
	}

	tokenHash := hashToken(token)

	doc, err := b.client.Collection(blacklistCollection).Doc(tokenHash).Get(ctx)
	if err != nil {
		// Document not found means token is not blacklisted
		if isNotFoundError(err) {
			return false, nil
		}
		return false, err
	}

	// Token is blacklisted if document exists
	return doc.Exists(), nil
}

// BlacklistAllUserTokens invalidates all tokens for a user (useful for password change, security events)
func (b *TokenBlacklist) BlacklistAllUserTokens(ctx context.Context, userID string, reason string) error {
	if b.client == nil {
		return nil
	}

	// Store a special marker that invalidates all tokens issued before this time
	marker := BlacklistedToken{
		TokenHash: "user_revocation_" + userID,
		UserID:    userID,
		ExpiresAt: time.Now().Add(RefreshTokenExpiry), // Expires when old refresh tokens would expire
		RevokedAt: time.Now(),
		Reason:    reason,
	}

	_, err := b.client.Collection(blacklistCollection).Doc("user_revocation_"+userID).Set(ctx, marker)
	return err
}

// GetUserRevocationTime returns the time when all user tokens were revoked, if any
func (b *TokenBlacklist) GetUserRevocationTime(ctx context.Context, userID string) (*time.Time, error) {
	if b.client == nil {
		return nil, nil
	}

	doc, err := b.client.Collection(blacklistCollection).Doc("user_revocation_" + userID).Get(ctx)
	if err != nil {
		if isNotFoundError(err) {
			return nil, nil
		}
		return nil, err
	}

	var marker BlacklistedToken
	if err := doc.DataTo(&marker); err != nil {
		return nil, err
	}

	return &marker.RevokedAt, nil
}

// CleanupExpiredTokens removes expired tokens from the blacklist
// This should be called periodically (e.g., via Cloud Scheduler)
func (b *TokenBlacklist) CleanupExpiredTokens(ctx context.Context) (int, error) {
	if b.client == nil {
		return 0, nil
	}

	now := time.Now()
	query := b.client.Collection(blacklistCollection).Where("expiresAt", "<", now).Limit(500)

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		return 0, err
	}

	// Use BulkWriter for batch deletion (replaces deprecated Batch API)
	bulkWriter := b.client.BulkWriter(ctx)
	for _, doc := range docs {
		_, _ = bulkWriter.Delete(doc.Ref) // Errors are collected and handled by Flush
	}

	bulkWriter.End()
	bulkWriter.Flush()

	return len(docs), nil
}

// isNotFoundError checks if the error is a "not found" error from Firestore
func isNotFoundError(err error) bool {
	// Check for Firestore's NotFound status
	return err != nil && (err.Error() == "rpc error: code = NotFound desc = Document not found" ||
		contains(err.Error(), "NotFound") ||
		contains(err.Error(), "not found"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchInString(s, substr)
}

func searchInString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
