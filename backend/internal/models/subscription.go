package models

import "time"

// Subscription status constants
const (
	SubscriptionStatusActive   = "active"
	SubscriptionStatusCanceled = "canceled"
	SubscriptionStatusPastDue  = "past_due"
	SubscriptionStatusTrialing = "trialing"
)

// UsageLimits represents the current usage and limits for a user
type UsageLimits struct {
	DailyTokens  UsageLimit `json:"dailyTokens"`  // Token usage for today
	WeeklyTokens UsageLimit `json:"weeklyTokens"` // Token usage for this week
	ActivePaths  UsageLimit `json:"activePaths"`  // Active course limit
}

// UsageLimit represents a single limit with current usage
type UsageLimit struct {
	Used  int64 `json:"used"`
	Limit int64 `json:"limit"`
}

// SubscriptionStatus represents the full subscription status response
type SubscriptionStatus struct {
	Tier               string      `json:"tier"`
	Status             string      `json:"status,omitempty"` // active, canceled, past_due, trialing
	PaidUntil          *time.Time  `json:"paidUntil,omitempty"`
	Limits             UsageLimits `json:"limits"`
	CanUpgrade         bool        `json:"canUpgrade"`
	CanGenerate        bool        `json:"canGenerate"`                  // false if any token limit reached
	CanCreatePath      bool        `json:"canCreatePath"`                // false if path limit reached
	LimitReached       string      `json:"limitReached,omitempty"`       // "daily", "weekly", or "system" if limit hit
	DailyLimitResetAt  *time.Time  `json:"dailyLimitResetAt,omitempty"`  // When daily limit resets (midnight UTC)
	WeeklyLimitResetAt *time.Time  `json:"weeklyLimitResetAt,omitempty"` // When weekly limit resets (Monday UTC)
}

// CheckoutSessionRequest represents a request to create a Stripe checkout session
type CheckoutSessionRequest struct {
	SuccessURL string `json:"successUrl"`
	CancelURL  string `json:"cancelUrl"`
}

// CheckoutSessionResponse represents the response with checkout URL
type CheckoutSessionResponse struct {
	CheckoutURL string `json:"checkoutUrl"`
	SessionID   string `json:"sessionId"`
}

// PortalSessionResponse represents the response with customer portal URL
type PortalSessionResponse struct {
	PortalURL string `json:"portalUrl"`
}

// VerifyCheckoutRequest represents a request to verify a checkout session
type VerifyCheckoutRequest struct {
	SessionID string `json:"sessionId"`
}

// VerifyCheckoutResponse represents the response after verifying checkout
type VerifyCheckoutResponse struct {
	Success bool   `json:"success"`           // Whether the checkout was successful
	Tier    string `json:"tier"`              // Current tier after verification
	Message string `json:"message,omitempty"` // Optional message (e.g., error details)
}

// Note: Token usage functions moved to token_usage.go
