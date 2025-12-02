package models

import "time"

const (
	TierFree = "free"
	TierPro  = "pro"
)

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
