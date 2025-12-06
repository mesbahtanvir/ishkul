package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Subscription Status Constants Tests
// =============================================================================

func TestSubscriptionStatusConstants(t *testing.T) {
	t.Run("status values are correct", func(t *testing.T) {
		assert.Equal(t, "active", SubscriptionStatusActive)
		assert.Equal(t, "canceled", SubscriptionStatusCanceled)
		assert.Equal(t, "past_due", SubscriptionStatusPastDue)
		assert.Equal(t, "trialing", SubscriptionStatusTrialing)
	})
}

// =============================================================================
// DailyUsage Tests
// =============================================================================

func TestDailyUsage(t *testing.T) {
	t.Run("struct fields are correctly initialized", func(t *testing.T) {
		usage := DailyUsage{
			Date:       "2024-01-15",
			StepsUsed:  25,
			LastUpdate: time.Now(),
		}

		assert.Equal(t, "2024-01-15", usage.Date)
		assert.Equal(t, 25, usage.StepsUsed)
		assert.False(t, usage.LastUpdate.IsZero())
	})

	t.Run("zero values", func(t *testing.T) {
		usage := DailyUsage{}

		assert.Equal(t, "", usage.Date)
		assert.Equal(t, 0, usage.StepsUsed)
		assert.True(t, usage.LastUpdate.IsZero())
	})
}

// =============================================================================
// NewDailyUsage Tests
// =============================================================================

func TestNewDailyUsage(t *testing.T) {
	t.Run("creates usage with today's date", func(t *testing.T) {
		usage := NewDailyUsage()

		expectedDate := time.Now().UTC().Format("2006-01-02")
		assert.Equal(t, expectedDate, usage.Date)
	})

	t.Run("initializes with zero steps", func(t *testing.T) {
		usage := NewDailyUsage()

		assert.Equal(t, 0, usage.StepsUsed)
	})

	t.Run("sets LastUpdate to current time", func(t *testing.T) {
		before := time.Now().UTC().Add(-time.Second)
		usage := NewDailyUsage()
		after := time.Now().UTC().Add(time.Second)

		assert.True(t, usage.LastUpdate.After(before))
		assert.True(t, usage.LastUpdate.Before(after))
	})
}

// =============================================================================
// GetTodayDateString Tests
// =============================================================================

func TestGetTodayDateString(t *testing.T) {
	t.Run("returns today's date in correct format", func(t *testing.T) {
		dateStr := GetTodayDateString()

		// Verify format by parsing
		parsed, err := time.Parse("2006-01-02", dateStr)
		assert.NoError(t, err)
		assert.Equal(t, time.Now().UTC().Year(), parsed.Year())
		assert.Equal(t, time.Now().UTC().Month(), parsed.Month())
		assert.Equal(t, time.Now().UTC().Day(), parsed.Day())
	})

	t.Run("uses UTC timezone", func(t *testing.T) {
		dateStr := GetTodayDateString()
		expected := time.Now().UTC().Format("2006-01-02")

		assert.Equal(t, expected, dateStr)
	})
}

// =============================================================================
// GetDailyLimitResetTime Tests
// =============================================================================

func TestGetDailyLimitResetTime(t *testing.T) {
	t.Run("returns next midnight UTC", func(t *testing.T) {
		resetTime := GetDailyLimitResetTime()

		// Should be midnight (00:00:00)
		assert.Equal(t, 0, resetTime.Hour())
		assert.Equal(t, 0, resetTime.Minute())
		assert.Equal(t, 0, resetTime.Second())
		assert.Equal(t, 0, resetTime.Nanosecond())
	})

	t.Run("returns time in UTC", func(t *testing.T) {
		resetTime := GetDailyLimitResetTime()

		assert.Equal(t, time.UTC, resetTime.Location())
	})

	t.Run("returns tomorrow's date", func(t *testing.T) {
		resetTime := GetDailyLimitResetTime()
		tomorrow := time.Now().UTC().AddDate(0, 0, 1)

		assert.Equal(t, tomorrow.Year(), resetTime.Year())
		assert.Equal(t, tomorrow.Month(), resetTime.Month())
		assert.Equal(t, tomorrow.Day(), resetTime.Day())
	})

	t.Run("is always in the future", func(t *testing.T) {
		resetTime := GetDailyLimitResetTime()

		assert.True(t, resetTime.After(time.Now()))
	})
}

// =============================================================================
// UsageLimits Tests
// =============================================================================

func TestUsageLimits(t *testing.T) {
	t.Run("struct fields are correctly set", func(t *testing.T) {
		limits := UsageLimits{
			DailySteps: UsageLimit{
				Used:  50,
				Limit: 100,
			},
			ActivePaths: UsageLimit{
				Used:  1,
				Limit: 2,
			},
		}

		assert.Equal(t, 50, limits.DailySteps.Used)
		assert.Equal(t, 100, limits.DailySteps.Limit)
		assert.Equal(t, 1, limits.ActivePaths.Used)
		assert.Equal(t, 2, limits.ActivePaths.Limit)
	})
}

// =============================================================================
// UsageLimit Tests
// =============================================================================

func TestUsageLimit(t *testing.T) {
	t.Run("handles zero usage", func(t *testing.T) {
		limit := UsageLimit{
			Used:  0,
			Limit: 100,
		}

		assert.Equal(t, 0, limit.Used)
		assert.Equal(t, 100, limit.Limit)
	})

	t.Run("handles at-limit usage", func(t *testing.T) {
		limit := UsageLimit{
			Used:  100,
			Limit: 100,
		}

		assert.Equal(t, limit.Used, limit.Limit)
	})

	t.Run("handles over-limit usage", func(t *testing.T) {
		// This could happen in edge cases
		limit := UsageLimit{
			Used:  105,
			Limit: 100,
		}

		assert.Greater(t, limit.Used, limit.Limit)
	})
}

// =============================================================================
// SubscriptionStatus Tests
// =============================================================================

func TestSubscriptionStatus(t *testing.T) {
	t.Run("all fields can be set", func(t *testing.T) {
		paidUntil := time.Now().Add(30 * 24 * time.Hour)
		resetAt := time.Now().Add(24 * time.Hour)

		status := SubscriptionStatus{
			Tier:   TierPro,
			Status: SubscriptionStatusActive,
			Limits: UsageLimits{
				DailySteps:  UsageLimit{Used: 25, Limit: 1000},
				ActivePaths: UsageLimit{Used: 2, Limit: 5},
			},
			PaidUntil:         &paidUntil,
			CanUpgrade:        false,
			CanGenerateSteps:  true,
			CanCreatePath:     true,
			DailyLimitResetAt: &resetAt,
		}

		assert.Equal(t, TierPro, status.Tier)
		assert.Equal(t, SubscriptionStatusActive, status.Status)
		assert.Equal(t, 25, status.Limits.DailySteps.Used)
		assert.True(t, status.CanGenerateSteps)
		assert.True(t, status.CanCreatePath)
		assert.False(t, status.CanUpgrade)
	})

	t.Run("handles free tier status", func(t *testing.T) {
		status := SubscriptionStatus{
			Tier: TierFree,
			Limits: UsageLimits{
				DailySteps:  UsageLimit{Used: 99, Limit: 100},
				ActivePaths: UsageLimit{Used: 2, Limit: 2},
			},
			CanUpgrade:       true,
			CanGenerateSteps: true,
			CanCreatePath:    false, // At limit
		}

		assert.Equal(t, TierFree, status.Tier)
		assert.True(t, status.CanUpgrade)
		assert.True(t, status.CanGenerateSteps)
		assert.False(t, status.CanCreatePath)
	})

	t.Run("handles at daily limit", func(t *testing.T) {
		resetAt := time.Now().Add(6 * time.Hour)
		status := SubscriptionStatus{
			Tier: TierFree,
			Limits: UsageLimits{
				DailySteps: UsageLimit{Used: 100, Limit: 100},
			},
			CanGenerateSteps:  false, // At limit
			DailyLimitResetAt: &resetAt,
		}

		assert.False(t, status.CanGenerateSteps)
		assert.NotNil(t, status.DailyLimitResetAt)
	})
}

// =============================================================================
// CheckoutSessionRequest Tests
// =============================================================================

func TestCheckoutSessionRequest(t *testing.T) {
	t.Run("struct fields are correctly set", func(t *testing.T) {
		req := CheckoutSessionRequest{
			SuccessURL: "https://example.com/success",
			CancelURL:  "https://example.com/cancel",
		}

		assert.Equal(t, "https://example.com/success", req.SuccessURL)
		assert.Equal(t, "https://example.com/cancel", req.CancelURL)
	})
}

// =============================================================================
// CheckoutSessionResponse Tests
// =============================================================================

func TestCheckoutSessionResponse(t *testing.T) {
	t.Run("struct fields are correctly set", func(t *testing.T) {
		resp := CheckoutSessionResponse{
			CheckoutURL: "https://checkout.stripe.com/session/123",
			SessionID:   "cs_test_123",
		}

		assert.Equal(t, "https://checkout.stripe.com/session/123", resp.CheckoutURL)
		assert.Equal(t, "cs_test_123", resp.SessionID)
	})
}

// =============================================================================
// PortalSessionResponse Tests
// =============================================================================

func TestPortalSessionResponse(t *testing.T) {
	t.Run("struct fields are correctly set", func(t *testing.T) {
		resp := PortalSessionResponse{
			PortalURL: "https://billing.stripe.com/portal/123",
		}

		assert.Equal(t, "https://billing.stripe.com/portal/123", resp.PortalURL)
	})
}

// =============================================================================
// VerifyCheckoutRequest Tests
// =============================================================================

func TestVerifyCheckoutRequest(t *testing.T) {
	t.Run("struct fields are correctly set", func(t *testing.T) {
		req := VerifyCheckoutRequest{
			SessionID: "cs_test_456",
		}

		assert.Equal(t, "cs_test_456", req.SessionID)
	})
}

// =============================================================================
// VerifyCheckoutResponse Tests
// =============================================================================

func TestVerifyCheckoutResponse(t *testing.T) {
	t.Run("successful verification", func(t *testing.T) {
		resp := VerifyCheckoutResponse{
			Success: true,
			Tier:    TierPro,
			Message: "",
		}

		assert.True(t, resp.Success)
		assert.Equal(t, TierPro, resp.Tier)
		assert.Empty(t, resp.Message)
	})

	t.Run("failed verification with message", func(t *testing.T) {
		resp := VerifyCheckoutResponse{
			Success: false,
			Tier:    TierFree,
			Message: "Payment not completed",
		}

		assert.False(t, resp.Success)
		assert.Equal(t, TierFree, resp.Tier)
		assert.Equal(t, "Payment not completed", resp.Message)
	})
}

// =============================================================================
// Integration/Scenario Tests
// =============================================================================

func TestSubscriptionScenarios(t *testing.T) {
	t.Run("free user approaching limit", func(t *testing.T) {
		resetAt := GetDailyLimitResetTime()
		status := SubscriptionStatus{
			Tier:   TierFree,
			Status: "", // Free users don't have subscription status
			Limits: UsageLimits{
				DailySteps:  UsageLimit{Used: 95, Limit: FreeDailyStepLimit},
				ActivePaths: UsageLimit{Used: 1, Limit: FreeMaxActivePaths},
			},
			CanUpgrade:        true,
			CanGenerateSteps:  true, // Still under limit
			CanCreatePath:     true, // Still under limit
			DailyLimitResetAt: &resetAt,
		}

		assert.Equal(t, 5, status.Limits.DailySteps.Limit-status.Limits.DailySteps.Used)
		assert.True(t, status.CanGenerateSteps)
		assert.True(t, status.CanUpgrade)
	})

	t.Run("pro user with active subscription", func(t *testing.T) {
		paidUntil := time.Now().Add(25 * 24 * time.Hour)
		status := SubscriptionStatus{
			Tier:      TierPro,
			Status:    SubscriptionStatusActive,
			PaidUntil: &paidUntil,
			Limits: UsageLimits{
				DailySteps:  UsageLimit{Used: 150, Limit: ProDailyStepLimit},
				ActivePaths: UsageLimit{Used: 3, Limit: ProMaxActivePaths},
			},
			CanUpgrade:       false, // Already pro
			CanGenerateSteps: true,
			CanCreatePath:    true,
		}

		assert.Equal(t, 850, status.Limits.DailySteps.Limit-status.Limits.DailySteps.Used)
		assert.False(t, status.CanUpgrade)
		assert.True(t, status.PaidUntil.After(time.Now()))
	})

	t.Run("canceled subscription still active", func(t *testing.T) {
		paidUntil := time.Now().Add(10 * 24 * time.Hour)
		status := SubscriptionStatus{
			Tier:      TierPro,
			Status:    SubscriptionStatusCanceled,
			PaidUntil: &paidUntil,
			Limits: UsageLimits{
				DailySteps:  UsageLimit{Used: 0, Limit: ProDailyStepLimit},
				ActivePaths: UsageLimit{Used: 4, Limit: ProMaxActivePaths},
			},
			CanUpgrade:       true, // Can re-subscribe
			CanGenerateSteps: true,
			CanCreatePath:    true,
		}

		assert.Equal(t, SubscriptionStatusCanceled, status.Status)
		assert.True(t, status.PaidUntil.After(time.Now())) // Still has access
		assert.True(t, status.CanUpgrade)
	})

	t.Run("past due subscription", func(t *testing.T) {
		status := SubscriptionStatus{
			Tier:             TierPro,
			Status:           SubscriptionStatusPastDue,
			CanUpgrade:       false,
			CanGenerateSteps: false, // Blocked until payment
			CanCreatePath:    false,
		}

		assert.Equal(t, SubscriptionStatusPastDue, status.Status)
		assert.False(t, status.CanGenerateSteps)
	})
}
