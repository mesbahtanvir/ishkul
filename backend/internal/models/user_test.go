package models

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserStruct(t *testing.T) {
	t.Run("creates User with all fields", func(t *testing.T) {
		now := time.Now()
		user := User{
			ID:          "user123",
			Email:       "test@example.com",
			DisplayName: "Test User",
			PhotoURL:    "https://example.com/photo.jpg",
			CreatedAt:   now,
			UpdatedAt:   now,
			Tier:        "free",
		}

		assert.Equal(t, "user123", user.ID)
		assert.Equal(t, "test@example.com", user.Email)
		assert.Equal(t, "Test User", user.DisplayName)
		assert.Equal(t, "https://example.com/photo.jpg", user.PhotoURL)
		assert.Equal(t, "free", user.Tier)
	})

	t.Run("JSON marshaling includes all fields", func(t *testing.T) {
		user := User{
			ID:          "user123",
			Email:       "test@example.com",
			DisplayName: "Test User",
			PhotoURL:    "https://example.com/photo.jpg",
			Tier:        "pro",
		}

		jsonBytes, err := json.Marshal(user)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "user123", parsed["id"])
		assert.Equal(t, "test@example.com", parsed["email"])
		assert.Equal(t, "Test User", parsed["displayName"])
		assert.Equal(t, "https://example.com/photo.jpg", parsed["photoUrl"])
		assert.Equal(t, "pro", parsed["tier"])
	})

	t.Run("JSON omits empty optional fields", func(t *testing.T) {
		user := User{
			ID:    "user123",
			Email: "test@example.com",
		}

		jsonBytes, err := json.Marshal(user)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.NotContains(t, parsed, "photoUrl")
	})

	t.Run("JSON unmarshaling works correctly", func(t *testing.T) {
		jsonStr := `{
			"id": "user456",
			"email": "another@test.com",
			"displayName": "Another User",
			"tier": "pro"
		}`

		var user User
		err := json.Unmarshal([]byte(jsonStr), &user)
		require.NoError(t, err)

		assert.Equal(t, "user456", user.ID)
		assert.Equal(t, "another@test.com", user.Email)
		assert.Equal(t, "Another User", user.DisplayName)
		assert.Equal(t, "pro", user.Tier)
	})
}

func TestUserDocumentStruct(t *testing.T) {
	t.Run("creates UserDocument with embedded User", func(t *testing.T) {
		userDoc := UserDocument{
			User: User{
				ID:    "user123",
				Email: "test@example.com",
				Tier:  "free",
			},
		}

		assert.Equal(t, "user123", userDoc.ID)
		assert.Equal(t, "test@example.com", userDoc.Email)
		assert.Equal(t, "free", userDoc.Tier)
	})

	t.Run("JSON marshaling works correctly", func(t *testing.T) {
		userDoc := UserDocument{
			User: User{
				ID:    "user123",
				Email: "test@example.com",
			},
		}

		jsonBytes, err := json.Marshal(userDoc)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "user123", parsed["id"])
		assert.Equal(t, "test@example.com", parsed["email"])
	})
}

func TestUserWithSubscription(t *testing.T) {
	t.Run("creates User with subscription fields", func(t *testing.T) {
		paidUntil := time.Now().Add(30 * 24 * time.Hour)
		user := User{
			ID:                 "user123",
			Email:              "test@example.com",
			Tier:               "pro",
			PaidUntil:          &paidUntil,
			SubscriptionStatus: "active",
		}

		assert.Equal(t, "pro", user.Tier)
		assert.NotNil(t, user.PaidUntil)
		assert.Equal(t, "active", user.SubscriptionStatus)
	})

	t.Run("creates User with trial", func(t *testing.T) {
		trialEnds := time.Now().Add(7 * 24 * time.Hour)
		user := User{
			ID:           "user123",
			Email:        "test@example.com",
			Tier:         "pro",
			TrialEndsAt:  &trialEnds,
			HasUsedTrial: false,
		}

		assert.NotNil(t, user.TrialEndsAt)
		assert.False(t, user.HasUsedTrial)
	})
}

func TestUserSoftDelete(t *testing.T) {
	t.Run("creates User with soft delete timestamp", func(t *testing.T) {
		deletedAt := time.Now()
		user := User{
			ID:        "user123",
			Email:     "test@example.com",
			DeletedAt: &deletedAt,
		}

		assert.NotNil(t, user.DeletedAt)
	})

	t.Run("creates User with permanent delete timestamp", func(t *testing.T) {
		deletedAt := time.Now()
		permanentlyDeletedAt := time.Now().Add(30 * 24 * time.Hour)
		user := User{
			ID:                   "user123",
			Email:                "test@example.com",
			DeletedAt:            &deletedAt,
			PermanentlyDeletedAt: &permanentlyDeletedAt,
		}

		assert.NotNil(t, user.DeletedAt)
		assert.NotNil(t, user.PermanentlyDeletedAt)
	})
}
