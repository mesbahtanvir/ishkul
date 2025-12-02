package models

import "time"

// Subscription status constants
const (
	SubscriptionStatusActive   = "active"
	SubscriptionStatusCanceled = "canceled"
	SubscriptionStatusPastDue  = "past_due"
	SubscriptionStatusTrialing = "trialing"
)

// DailyUsage tracks a user's daily step consumption
// Stored in Firestore at: users/{userId}/usage/{date}
type DailyUsage struct {
	Date       string    `json:"date" firestore:"date"`             // Format: "2006-01-02"
	StepsUsed  int       `json:"stepsUsed" firestore:"stepsUsed"`   // Number of steps generated today
	LastUpdate time.Time `json:"lastUpdate" firestore:"lastUpdate"` // Last time this was updated
}

// UsageLimits represents the current usage and limits for a user
type UsageLimits struct {
	DailySteps  UsageLimit `json:"dailySteps"`
	ActivePaths UsageLimit `json:"activePaths"`
}

// UsageLimit represents a single limit with current usage
type UsageLimit struct {
	Used  int `json:"used"`
	Limit int `json:"limit"`
}

// SubscriptionStatus represents the full subscription status response
type SubscriptionStatus struct {
	Tier              string      `json:"tier"`
	Status            string      `json:"status,omitempty"` // active, canceled, past_due, trialing
	PaidUntil         *time.Time  `json:"paidUntil,omitempty"`
	Limits            UsageLimits `json:"limits"`
	CanUpgrade        bool        `json:"canUpgrade"`
	CanGenerateSteps  bool        `json:"canGenerateSteps"`            // false if daily limit reached
	CanCreatePath     bool        `json:"canCreatePath"`               // false if path limit reached
	DailyLimitResetAt *time.Time  `json:"dailyLimitResetAt,omitempty"` // When the daily limit resets (midnight UTC)
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
	Success bool   `json:"success"`          // Whether the checkout was successful
	Tier    string `json:"tier"`             // Current tier after verification
	Message string `json:"message,omitempty"` // Optional message (e.g., error details)
}

// NewDailyUsage creates a new DailyUsage for today
func NewDailyUsage() *DailyUsage {
	now := time.Now().UTC()
	return &DailyUsage{
		Date:       now.Format("2006-01-02"),
		StepsUsed:  0,
		LastUpdate: now,
	}
}

// GetTodayDateString returns today's date as a string in the format used for usage tracking
func GetTodayDateString() string {
	return time.Now().UTC().Format("2006-01-02")
}

// GetDailyLimitResetTime returns when the daily limit resets (next midnight UTC)
func GetDailyLimitResetTime() time.Time {
	now := time.Now().UTC()
	tomorrow := now.AddDate(0, 0, 1)
	return time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 0, 0, 0, 0, time.UTC)
}
