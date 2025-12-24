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
// TokenUsage Tests
// =============================================================================

func TestTokenUsage(t *testing.T) {
	t.Run("struct fields are correctly initialized", func(t *testing.T) {
		usage := TokenUsage{
			Period:       "2024-01-15",
			InputTokens:  1000,
			OutputTokens: 500,
			TotalTokens:  1500,
			LastUpdate:   time.Now(),
		}

		assert.Equal(t, "2024-01-15", usage.Period)
		assert.Equal(t, int64(1000), usage.InputTokens)
		assert.Equal(t, int64(500), usage.OutputTokens)
		assert.Equal(t, int64(1500), usage.TotalTokens)
		assert.False(t, usage.LastUpdate.IsZero())
	})

	t.Run("zero values", func(t *testing.T) {
		usage := TokenUsage{}

		assert.Equal(t, "", usage.Period)
		assert.Equal(t, int64(0), usage.InputTokens)
		assert.Equal(t, int64(0), usage.OutputTokens)
		assert.Equal(t, int64(0), usage.TotalTokens)
		assert.True(t, usage.LastUpdate.IsZero())
	})
}

// =============================================================================
// NewTokenUsage Tests
// =============================================================================

func TestNewTokenUsage(t *testing.T) {
	t.Run("creates usage with specified period", func(t *testing.T) {
		period := GetTodayPeriod()
		usage := NewTokenUsage(period)

		assert.Equal(t, period, usage.Period)
	})

	t.Run("initializes with zero tokens", func(t *testing.T) {
		usage := NewTokenUsage("2024-01-15")

		assert.Equal(t, int64(0), usage.InputTokens)
		assert.Equal(t, int64(0), usage.OutputTokens)
		assert.Equal(t, int64(0), usage.TotalTokens)
	})

	t.Run("sets LastUpdate to current time", func(t *testing.T) {
		before := time.Now().UTC().Add(-time.Second)
		usage := NewTokenUsage("2024-01-15")
		after := time.Now().UTC().Add(time.Second)

		assert.True(t, usage.LastUpdate.After(before))
		assert.True(t, usage.LastUpdate.Before(after))
	})
}

// =============================================================================
// GetTodayPeriod Tests
// =============================================================================

func TestGetTodayPeriod(t *testing.T) {
	t.Run("returns today's date in correct format", func(t *testing.T) {
		period := GetTodayPeriod()

		// Verify format by parsing
		parsed, err := time.Parse("2006-01-02", period)
		assert.NoError(t, err)
		assert.Equal(t, time.Now().UTC().Year(), parsed.Year())
		assert.Equal(t, time.Now().UTC().Month(), parsed.Month())
		assert.Equal(t, time.Now().UTC().Day(), parsed.Day())
	})

	t.Run("uses UTC timezone", func(t *testing.T) {
		period := GetTodayPeriod()
		expected := time.Now().UTC().Format("2006-01-02")

		assert.Equal(t, expected, period)
	})
}

// =============================================================================
// GetDailyResetTime Tests
// =============================================================================

func TestGetDailyResetTime(t *testing.T) {
	t.Run("returns next midnight UTC", func(t *testing.T) {
		resetTime := GetDailyResetTime()

		// Should be midnight (00:00:00)
		assert.Equal(t, 0, resetTime.Hour())
		assert.Equal(t, 0, resetTime.Minute())
		assert.Equal(t, 0, resetTime.Second())
		assert.Equal(t, 0, resetTime.Nanosecond())
	})

	t.Run("returns time in UTC", func(t *testing.T) {
		resetTime := GetDailyResetTime()

		assert.Equal(t, time.UTC, resetTime.Location())
	})

	t.Run("returns tomorrow's date", func(t *testing.T) {
		resetTime := GetDailyResetTime()
		tomorrow := time.Now().UTC().AddDate(0, 0, 1)

		assert.Equal(t, tomorrow.Year(), resetTime.Year())
		assert.Equal(t, tomorrow.Month(), resetTime.Month())
		assert.Equal(t, tomorrow.Day(), resetTime.Day())
	})

	t.Run("is always in the future", func(t *testing.T) {
		resetTime := GetDailyResetTime()

		assert.True(t, resetTime.After(time.Now()))
	})
}

// =============================================================================
// GetWeeklyResetTime Tests
// =============================================================================

func TestGetWeeklyResetTime(t *testing.T) {
	t.Run("returns next Monday midnight UTC", func(t *testing.T) {
		resetTime := GetWeeklyResetTime()

		// Should be midnight (00:00:00)
		assert.Equal(t, 0, resetTime.Hour())
		assert.Equal(t, 0, resetTime.Minute())
		assert.Equal(t, 0, resetTime.Second())
		assert.Equal(t, 0, resetTime.Nanosecond())
	})

	t.Run("returns time in UTC", func(t *testing.T) {
		resetTime := GetWeeklyResetTime()

		assert.Equal(t, time.UTC, resetTime.Location())
	})

	t.Run("is always in the future", func(t *testing.T) {
		resetTime := GetWeeklyResetTime()

		assert.True(t, resetTime.After(time.Now()))
	})

	t.Run("is on a Monday", func(t *testing.T) {
		resetTime := GetWeeklyResetTime()

		assert.Equal(t, time.Monday, resetTime.Weekday())
	})
}

// =============================================================================
// UsageLimits Tests
// =============================================================================

func TestUsageLimits(t *testing.T) {
	t.Run("struct fields are correctly set", func(t *testing.T) {
		limits := UsageLimits{
			DailyTokens: UsageLimit{
				Used:  50000,
				Limit: 100000,
			},
			WeeklyTokens: UsageLimit{
				Used:  200000,
				Limit: 1000000,
			},
			ActivePaths: UsageLimit{
				Used:  1,
				Limit: 2,
			},
		}

		assert.Equal(t, int64(50000), limits.DailyTokens.Used)
		assert.Equal(t, int64(100000), limits.DailyTokens.Limit)
		assert.Equal(t, int64(200000), limits.WeeklyTokens.Used)
		assert.Equal(t, int64(1000000), limits.WeeklyTokens.Limit)
		assert.Equal(t, int64(1), limits.ActivePaths.Used)
		assert.Equal(t, int64(2), limits.ActivePaths.Limit)
	})
}

// =============================================================================
// UsageLimit Tests
// =============================================================================

func TestUsageLimit(t *testing.T) {
	t.Run("handles zero usage", func(t *testing.T) {
		limit := UsageLimit{
			Used:  0,
			Limit: 100000,
		}

		assert.Equal(t, int64(0), limit.Used)
		assert.Equal(t, int64(100000), limit.Limit)
	})

	t.Run("handles at-limit usage", func(t *testing.T) {
		limit := UsageLimit{
			Used:  100000,
			Limit: 100000,
		}

		assert.Equal(t, limit.Used, limit.Limit)
	})

	t.Run("handles over-limit usage", func(t *testing.T) {
		// This could happen in edge cases
		limit := UsageLimit{
			Used:  105000,
			Limit: 100000,
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
		dailyResetAt := time.Now().Add(24 * time.Hour)
		weeklyResetAt := time.Now().Add(7 * 24 * time.Hour)

		status := SubscriptionStatus{
			Tier:   TierPro,
			Status: SubscriptionStatusActive,
			Limits: UsageLimits{
				DailyTokens:  UsageLimit{Used: 25000, Limit: 500000},
				WeeklyTokens: UsageLimit{Used: 100000, Limit: 5000000},
				ActivePaths:  UsageLimit{Used: 2, Limit: 5},
			},
			PaidUntil:          &paidUntil,
			CanUpgrade:         false,
			CanGenerate:        true,
			CanCreatePath:      true,
			DailyLimitResetAt:  &dailyResetAt,
			WeeklyLimitResetAt: &weeklyResetAt,
		}

		assert.Equal(t, TierPro, status.Tier)
		assert.Equal(t, SubscriptionStatusActive, status.Status)
		assert.Equal(t, int64(25000), status.Limits.DailyTokens.Used)
		assert.True(t, status.CanGenerate)
		assert.True(t, status.CanCreatePath)
		assert.False(t, status.CanUpgrade)
	})

	t.Run("handles free tier status", func(t *testing.T) {
		status := SubscriptionStatus{
			Tier: TierFree,
			Limits: UsageLimits{
				DailyTokens:  UsageLimit{Used: 99000, Limit: 100000},
				WeeklyTokens: UsageLimit{Used: 500000, Limit: 1000000},
				ActivePaths:  UsageLimit{Used: 2, Limit: 2},
			},
			CanUpgrade:    true,
			CanGenerate:   true,
			CanCreatePath: false, // At limit
		}

		assert.Equal(t, TierFree, status.Tier)
		assert.True(t, status.CanUpgrade)
		assert.True(t, status.CanGenerate)
		assert.False(t, status.CanCreatePath)
	})

	t.Run("handles at daily limit", func(t *testing.T) {
		resetAt := time.Now().Add(6 * time.Hour)
		status := SubscriptionStatus{
			Tier: TierFree,
			Limits: UsageLimits{
				DailyTokens:  UsageLimit{Used: 100000, Limit: 100000},
				WeeklyTokens: UsageLimit{Used: 500000, Limit: 1000000},
			},
			CanGenerate:       false, // At limit
			LimitReached:      "daily",
			DailyLimitResetAt: &resetAt,
		}

		assert.False(t, status.CanGenerate)
		assert.Equal(t, "daily", status.LimitReached)
		assert.NotNil(t, status.DailyLimitResetAt)
	})

	t.Run("handles at weekly limit", func(t *testing.T) {
		resetAt := time.Now().Add(5 * 24 * time.Hour)
		status := SubscriptionStatus{
			Tier: TierFree,
			Limits: UsageLimits{
				DailyTokens:  UsageLimit{Used: 50000, Limit: 100000},
				WeeklyTokens: UsageLimit{Used: 1000000, Limit: 1000000},
			},
			CanGenerate:        false, // At limit
			LimitReached:       "weekly",
			WeeklyLimitResetAt: &resetAt,
		}

		assert.False(t, status.CanGenerate)
		assert.Equal(t, "weekly", status.LimitReached)
		assert.NotNil(t, status.WeeklyLimitResetAt)
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
		resetAt := GetDailyResetTime()
		status := SubscriptionStatus{
			Tier:   TierFree,
			Status: "", // Free users don't have subscription status
			Limits: UsageLimits{
				DailyTokens:  UsageLimit{Used: 95000, Limit: FreeDailyTokenLimit},
				WeeklyTokens: UsageLimit{Used: 500000, Limit: FreeWeeklyTokenLimit},
				ActivePaths:  UsageLimit{Used: 1, Limit: int64(FreeMaxActiveCourses)},
			},
			CanUpgrade:        true,
			CanGenerate:       true, // Still under limit
			CanCreatePath:     true, // Still under limit
			DailyLimitResetAt: &resetAt,
		}

		assert.Equal(t, int64(5000), status.Limits.DailyTokens.Limit-status.Limits.DailyTokens.Used)
		assert.True(t, status.CanGenerate)
		assert.True(t, status.CanUpgrade)
	})

	t.Run("pro user with active subscription", func(t *testing.T) {
		paidUntil := time.Now().Add(25 * 24 * time.Hour)
		status := SubscriptionStatus{
			Tier:      TierPro,
			Status:    SubscriptionStatusActive,
			PaidUntil: &paidUntil,
			Limits: UsageLimits{
				DailyTokens:  UsageLimit{Used: 150000, Limit: ProDailyTokenLimit},
				WeeklyTokens: UsageLimit{Used: 1000000, Limit: ProWeeklyTokenLimit},
				ActivePaths:  UsageLimit{Used: 3, Limit: int64(ProMaxActiveCourses)},
			},
			CanUpgrade:    false, // Already pro
			CanGenerate:   true,
			CanCreatePath: true,
		}

		assert.Equal(t, int64(350000), status.Limits.DailyTokens.Limit-status.Limits.DailyTokens.Used)
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
				DailyTokens:  UsageLimit{Used: 0, Limit: ProDailyTokenLimit},
				WeeklyTokens: UsageLimit{Used: 0, Limit: ProWeeklyTokenLimit},
				ActivePaths:  UsageLimit{Used: 4, Limit: int64(ProMaxActiveCourses)},
			},
			CanUpgrade:    true, // Can re-subscribe
			CanGenerate:   true,
			CanCreatePath: true,
		}

		assert.Equal(t, SubscriptionStatusCanceled, status.Status)
		assert.True(t, status.PaidUntil.After(time.Now())) // Still has access
		assert.True(t, status.CanUpgrade)
	})

	t.Run("past due subscription", func(t *testing.T) {
		status := SubscriptionStatus{
			Tier:          TierPro,
			Status:        SubscriptionStatusPastDue,
			CanUpgrade:    false,
			CanGenerate:   false, // Blocked until payment
			CanCreatePath: false,
		}

		assert.Equal(t, SubscriptionStatusPastDue, status.Status)
		assert.False(t, status.CanGenerate)
	})
}
