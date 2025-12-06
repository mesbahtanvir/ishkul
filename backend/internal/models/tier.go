package models

import "time"

// Tier constants
const (
	TierFree = "free"
	TierPro  = "pro"
)

// Model constants for each tier
const (
	FreeModel = "gpt-5"
	ProModel  = "gpt-5"
)

// Daily step limits
const (
	FreeDailyStepLimit = 100
	ProDailyStepLimit  = 1000
)

// Active course limits
const (
	FreeMaxActiveCourses = 2
	ProMaxActiveCourses  = 5
)

// Stripe pricing (in cents)
const (
	ProPriceMonthly = 200 // $2.00
)

// GetModelForTier returns the appropriate AI model for the given tier
func GetModelForTier(tier string) string {
	if tier == TierPro {
		return ProModel
	}
	return FreeModel
}

// GetDailyStepLimit returns the daily step limit for the given tier
func GetDailyStepLimit(tier string) int {
	if tier == TierPro {
		return ProDailyStepLimit
	}
	return FreeDailyStepLimit
}

// GetMaxActiveCourses returns the max active courses for the given tier
func GetMaxActiveCourses(tier string) int {
	if tier == TierPro {
		return ProMaxActiveCourses
	}
	return FreeMaxActiveCourses
}

// GetCurrentTier returns the user's current tier based on subscription status
// Returns "pro" if PaidUntil is set and in the future, otherwise returns Tier
func (u *User) GetCurrentTier() string {
	if u == nil {
		return TierFree
	}

	// If PaidUntil is set and hasn't expired, user is Pro
	if u.PaidUntil != nil && u.PaidUntil.After(time.Now()) {
		return TierPro
	}

	// Otherwise, return the Tier field (default to free if empty)
	if u.Tier == TierPro || u.Tier == TierFree {
		return u.Tier
	}
	return TierFree
}

// IsProUser returns true if the user currently has Pro tier access
func (u *User) IsProUser() bool {
	return u.GetCurrentTier() == TierPro
}

// IsSubscriptionActive returns true if user has an active paid subscription
func (u *User) IsSubscriptionActive() bool {
	return u.PaidUntil != nil && u.PaidUntil.After(time.Now())
}
