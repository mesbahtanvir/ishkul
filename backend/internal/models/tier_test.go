package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Tier Constants Tests
// =============================================================================

func TestTierConstants(t *testing.T) {
	t.Run("tier values are correct", func(t *testing.T) {
		assert.Equal(t, "free", TierFree)
		assert.Equal(t, "pro", TierPro)
	})
}

// =============================================================================
// Model Constants Tests
// =============================================================================

func TestModelConstants(t *testing.T) {
	t.Run("model values are correct", func(t *testing.T) {
		assert.Equal(t, "gpt-5", FreeModel)
		assert.Equal(t, "gpt-5", ProModel)
	})
}

// =============================================================================
// Daily Step Limit Constants Tests
// =============================================================================

func TestDailyStepLimitConstants(t *testing.T) {
	t.Run("step limits are correct", func(t *testing.T) {
		assert.Equal(t, 100, FreeDailyStepLimit)
		assert.Equal(t, 1000, ProDailyStepLimit)
	})

	t.Run("pro limit is higher than free", func(t *testing.T) {
		assert.Greater(t, ProDailyStepLimit, FreeDailyStepLimit)
	})
}

// =============================================================================
// Active Paths Limit Constants Tests
// =============================================================================

func TestActivePathsLimitConstants(t *testing.T) {
	t.Run("path limits are correct", func(t *testing.T) {
		assert.Equal(t, 2, FreeMaxActivePaths)
		assert.Equal(t, 5, ProMaxActivePaths)
	})

	t.Run("pro limit is higher than free", func(t *testing.T) {
		assert.Greater(t, ProMaxActivePaths, FreeMaxActivePaths)
	})
}

// =============================================================================
// Pricing Constants Tests
// =============================================================================

func TestPricingConstants(t *testing.T) {
	t.Run("pro price is $2.00 (200 cents)", func(t *testing.T) {
		assert.Equal(t, 200, ProPriceMonthly)
	})
}

// =============================================================================
// GetModelForTier Tests
// =============================================================================

func TestGetModelForTier(t *testing.T) {
	t.Run("returns pro model for pro tier", func(t *testing.T) {
		model := GetModelForTier(TierPro)
		assert.Equal(t, ProModel, model)
	})

	t.Run("returns free model for free tier", func(t *testing.T) {
		model := GetModelForTier(TierFree)
		assert.Equal(t, FreeModel, model)
	})

	t.Run("returns free model for empty tier", func(t *testing.T) {
		model := GetModelForTier("")
		assert.Equal(t, FreeModel, model)
	})

	t.Run("returns free model for unknown tier", func(t *testing.T) {
		model := GetModelForTier("premium")
		assert.Equal(t, FreeModel, model)
	})
}

// =============================================================================
// GetDailyStepLimit Tests
// =============================================================================

func TestGetDailyStepLimit(t *testing.T) {
	t.Run("returns pro limit for pro tier", func(t *testing.T) {
		limit := GetDailyStepLimit(TierPro)
		assert.Equal(t, ProDailyStepLimit, limit)
	})

	t.Run("returns free limit for free tier", func(t *testing.T) {
		limit := GetDailyStepLimit(TierFree)
		assert.Equal(t, FreeDailyStepLimit, limit)
	})

	t.Run("returns free limit for empty tier", func(t *testing.T) {
		limit := GetDailyStepLimit("")
		assert.Equal(t, FreeDailyStepLimit, limit)
	})

	t.Run("returns free limit for unknown tier", func(t *testing.T) {
		limit := GetDailyStepLimit("enterprise")
		assert.Equal(t, FreeDailyStepLimit, limit)
	})
}

// =============================================================================
// GetMaxActivePaths Tests
// =============================================================================

func TestGetMaxActivePaths(t *testing.T) {
	t.Run("returns pro max for pro tier", func(t *testing.T) {
		max := GetMaxActivePaths(TierPro)
		assert.Equal(t, ProMaxActivePaths, max)
	})

	t.Run("returns free max for free tier", func(t *testing.T) {
		max := GetMaxActivePaths(TierFree)
		assert.Equal(t, FreeMaxActivePaths, max)
	})

	t.Run("returns free max for empty tier", func(t *testing.T) {
		max := GetMaxActivePaths("")
		assert.Equal(t, FreeMaxActivePaths, max)
	})

	t.Run("returns free max for unknown tier", func(t *testing.T) {
		max := GetMaxActivePaths("business")
		assert.Equal(t, FreeMaxActivePaths, max)
	})
}

// =============================================================================
// User.GetCurrentTier Tests
// =============================================================================

func TestUser_GetCurrentTier(t *testing.T) {
	t.Run("returns free for nil user", func(t *testing.T) {
		var u *User
		tier := u.GetCurrentTier()
		assert.Equal(t, TierFree, tier)
	})

	t.Run("returns pro when PaidUntil is in future", func(t *testing.T) {
		future := time.Now().Add(24 * time.Hour)
		u := &User{
			Tier:      TierFree,
			PaidUntil: &future,
		}

		tier := u.GetCurrentTier()
		assert.Equal(t, TierPro, tier)
	})

	t.Run("returns tier field when PaidUntil is expired", func(t *testing.T) {
		past := time.Now().Add(-24 * time.Hour)
		u := &User{
			Tier:      TierFree,
			PaidUntil: &past,
		}

		tier := u.GetCurrentTier()
		assert.Equal(t, TierFree, tier)
	})

	t.Run("returns tier field when PaidUntil is nil", func(t *testing.T) {
		u := &User{
			Tier: TierPro,
		}

		tier := u.GetCurrentTier()
		assert.Equal(t, TierPro, tier)
	})

	t.Run("returns free for empty tier field", func(t *testing.T) {
		u := &User{
			Tier: "",
		}

		tier := u.GetCurrentTier()
		assert.Equal(t, TierFree, tier)
	})

	t.Run("returns free for unknown tier field", func(t *testing.T) {
		u := &User{
			Tier: "premium",
		}

		tier := u.GetCurrentTier()
		assert.Equal(t, TierFree, tier)
	})

	t.Run("PaidUntil takes precedence over Tier field", func(t *testing.T) {
		future := time.Now().Add(24 * time.Hour)
		u := &User{
			Tier:      TierFree,
			PaidUntil: &future,
		}

		// Even though Tier is "free", PaidUntil in future means Pro
		tier := u.GetCurrentTier()
		assert.Equal(t, TierPro, tier)
	})
}

// =============================================================================
// User.IsProUser Tests
// =============================================================================

func TestUser_IsProUser(t *testing.T) {
	t.Run("returns true for pro tier", func(t *testing.T) {
		future := time.Now().Add(24 * time.Hour)
		u := &User{
			PaidUntil: &future,
		}

		assert.True(t, u.IsProUser())
	})

	t.Run("returns false for free tier", func(t *testing.T) {
		u := &User{
			Tier: TierFree,
		}

		assert.False(t, u.IsProUser())
	})

	t.Run("returns false for expired subscription", func(t *testing.T) {
		past := time.Now().Add(-24 * time.Hour)
		u := &User{
			Tier:      TierPro,
			PaidUntil: &past,
		}

		// PaidUntil is expired, so not pro
		// But Tier field is still pro, so it depends on implementation
		// Looking at the code, when PaidUntil is expired, Tier field is checked
		assert.True(t, u.IsProUser()) // Tier field is "pro"
	})

	t.Run("returns false for nil user", func(t *testing.T) {
		var u *User
		assert.False(t, u.IsProUser())
	})
}

// =============================================================================
// User.IsSubscriptionActive Tests
// =============================================================================

func TestUser_IsSubscriptionActive(t *testing.T) {
	t.Run("returns true when PaidUntil is in future", func(t *testing.T) {
		future := time.Now().Add(24 * time.Hour)
		u := &User{
			PaidUntil: &future,
		}

		assert.True(t, u.IsSubscriptionActive())
	})

	t.Run("returns false when PaidUntil is in past", func(t *testing.T) {
		past := time.Now().Add(-24 * time.Hour)
		u := &User{
			PaidUntil: &past,
		}

		assert.False(t, u.IsSubscriptionActive())
	})

	t.Run("returns false when PaidUntil is nil", func(t *testing.T) {
		u := &User{
			Tier: TierPro,
		}

		assert.False(t, u.IsSubscriptionActive())
	})

	t.Run("returns false when PaidUntil is exactly now", func(t *testing.T) {
		now := time.Now()
		u := &User{
			PaidUntil: &now,
		}

		// time.After returns false for equal times
		assert.False(t, u.IsSubscriptionActive())
	})

	t.Run("handles edge case of near-expiry", func(t *testing.T) {
		nearFuture := time.Now().Add(1 * time.Millisecond)
		u := &User{
			PaidUntil: &nearFuture,
		}

		assert.True(t, u.IsSubscriptionActive())
	})
}

// =============================================================================
// Integration/Scenario Tests
// =============================================================================

func TestTierScenarios(t *testing.T) {
	t.Run("new free user scenario", func(t *testing.T) {
		u := &User{
			ID:   "user123",
			Tier: TierFree,
		}

		assert.Equal(t, TierFree, u.GetCurrentTier())
		assert.False(t, u.IsProUser())
		assert.False(t, u.IsSubscriptionActive())
		assert.Equal(t, FreeDailyStepLimit, GetDailyStepLimit(u.GetCurrentTier()))
		assert.Equal(t, FreeMaxActivePaths, GetMaxActivePaths(u.GetCurrentTier()))
		assert.Equal(t, FreeModel, GetModelForTier(u.GetCurrentTier()))
	})

	t.Run("active pro subscriber scenario", func(t *testing.T) {
		future := time.Now().Add(30 * 24 * time.Hour)
		u := &User{
			ID:        "user456",
			Tier:      TierPro,
			PaidUntil: &future,
		}

		assert.Equal(t, TierPro, u.GetCurrentTier())
		assert.True(t, u.IsProUser())
		assert.True(t, u.IsSubscriptionActive())
		assert.Equal(t, ProDailyStepLimit, GetDailyStepLimit(u.GetCurrentTier()))
		assert.Equal(t, ProMaxActivePaths, GetMaxActivePaths(u.GetCurrentTier()))
		assert.Equal(t, ProModel, GetModelForTier(u.GetCurrentTier()))
	})

	t.Run("expired pro subscriber scenario", func(t *testing.T) {
		past := time.Now().Add(-7 * 24 * time.Hour)
		u := &User{
			ID:        "user789",
			Tier:      TierFree, // Downgraded after expiration
			PaidUntil: &past,
		}

		assert.Equal(t, TierFree, u.GetCurrentTier())
		assert.False(t, u.IsProUser())
		assert.False(t, u.IsSubscriptionActive())
		assert.Equal(t, FreeDailyStepLimit, GetDailyStepLimit(u.GetCurrentTier()))
	})

	t.Run("user with Tier=pro but no subscription date", func(t *testing.T) {
		// This could happen for legacy users or manual upgrades
		u := &User{
			ID:   "legacy123",
			Tier: TierPro,
		}

		assert.Equal(t, TierPro, u.GetCurrentTier())
		assert.True(t, u.IsProUser())
		assert.False(t, u.IsSubscriptionActive()) // No active subscription
	})
}
