package models

import "time"

// Token limits by tier (input + output combined)
const (
	// Daily limits
	FreeDailyTokenLimit int64 = 100_000 // 100K tokens/day for free tier
	ProDailyTokenLimit  int64 = 500_000 // 500K tokens/day for pro tier

	// Weekly limits
	FreeWeeklyTokenLimit int64 = 1_000_000 // 1M tokens/week for free tier
	ProWeeklyTokenLimit  int64 = 5_000_000 // 5M tokens/week for pro tier

	// System-wide limit
	SystemDailyTokenLimit int64 = 10_000_000 // 10M tokens/day system-wide
)

// TokenUsage tracks token consumption for a specific period
// Stored in Firestore at: users/{userId}/tokenUsage/{period} or system/tokenUsage/{period}
type TokenUsage struct {
	Period       string    `json:"period" firestore:"period"`             // Format: "2006-01-02" for daily, "2006-W01" for weekly
	InputTokens  int64     `json:"inputTokens" firestore:"inputTokens"`   // Input tokens used
	OutputTokens int64     `json:"outputTokens" firestore:"outputTokens"` // Output tokens used
	TotalTokens  int64     `json:"totalTokens" firestore:"totalTokens"`   // Combined total
	LastUpdate   time.Time `json:"lastUpdate" firestore:"lastUpdate"`     // Last time this was updated
}

// TokenLimits represents the current token usage and limits for a user
type TokenLimits struct {
	Daily  TokenLimit `json:"daily"`
	Weekly TokenLimit `json:"weekly"`
}

// TokenLimit represents a single token limit with current usage
type TokenLimit struct {
	Used  int64 `json:"used"`
	Limit int64 `json:"limit"`
}

// TokenLimitStatus contains the full token status response
type TokenLimitStatus struct {
	Tier          string      `json:"tier"`
	Limits        TokenLimits `json:"limits"`
	CanGenerate   bool        `json:"canGenerate"`            // false if any limit reached
	LimitReached  string      `json:"limitReached,omitempty"` // "daily", "weekly", or "system"
	DailyResetAt  *time.Time  `json:"dailyResetAt,omitempty"`
	WeeklyResetAt *time.Time  `json:"weeklyResetAt,omitempty"`
}

// GenerationPermission contains the result of a token limit check.
// Used by queue processors to determine if content generation is permitted.
type GenerationPermission struct {
	Allowed      bool   // Whether generation is permitted
	DailyUsed    int64  // Tokens used today
	DailyLimit   int64  // Daily token limit for user's tier
	WeeklyUsed   int64  // Tokens used this week
	WeeklyLimit  int64  // Weekly token limit for user's tier
	LimitReached string // Which limit was reached: "daily", "weekly", or "" if none
}

// IsAllowed returns true if generation is permitted.
func (p *GenerationPermission) IsAllowed() bool {
	return p.Allowed
}

// NewTokenUsage creates a new TokenUsage for a period
func NewTokenUsage(period string) *TokenUsage {
	return &TokenUsage{
		Period:       period,
		InputTokens:  0,
		OutputTokens: 0,
		TotalTokens:  0,
		LastUpdate:   time.Now().UTC(),
	}
}

// GetTodayPeriod returns today's date as a period string
func GetTodayPeriod() string {
	return time.Now().UTC().Format("2006-01-02")
}

// GetCurrentWeekPeriod returns the current ISO week as a period string
func GetCurrentWeekPeriod() string {
	year, week := time.Now().UTC().ISOWeek()
	return time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, (week-1)*7).Format("2006-W01")
}

// GetDailyTokenLimit returns the daily token limit for a given tier
func GetDailyTokenLimit(tier string) int64 {
	if tier == TierPro {
		return ProDailyTokenLimit
	}
	return FreeDailyTokenLimit
}

// GetWeeklyTokenLimit returns the weekly token limit for a given tier
func GetWeeklyTokenLimit(tier string) int64 {
	if tier == TierPro {
		return ProWeeklyTokenLimit
	}
	return FreeWeeklyTokenLimit
}

// GetDailyResetTime returns when the daily limit resets (next midnight UTC)
func GetDailyResetTime() time.Time {
	now := time.Now().UTC()
	tomorrow := now.AddDate(0, 0, 1)
	return time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 0, 0, 0, 0, time.UTC)
}

// GetWeeklyResetTime returns when the weekly limit resets (next Monday midnight UTC)
func GetWeeklyResetTime() time.Time {
	now := time.Now().UTC()
	daysUntilMonday := (8 - int(now.Weekday())) % 7
	if daysUntilMonday == 0 {
		daysUntilMonday = 7
	}
	nextMonday := now.AddDate(0, 0, daysUntilMonday)
	return time.Date(nextMonday.Year(), nextMonday.Month(), nextMonday.Day(), 0, 0, 0, 0, time.UTC)
}

// AddTokens adds tokens to the usage and returns the new total
func (u *TokenUsage) AddTokens(input, output int64) {
	u.InputTokens += input
	u.OutputTokens += output
	u.TotalTokens = u.InputTokens + u.OutputTokens
	u.LastUpdate = time.Now().UTC()
}

// IsWithinLimit checks if the usage is within the given limit
func (u *TokenUsage) IsWithinLimit(limit int64) bool {
	return u.TotalTokens < limit
}

// RemainingTokens returns how many tokens are remaining before hitting the limit
func (u *TokenUsage) RemainingTokens(limit int64) int64 {
	remaining := limit - u.TotalTokens
	if remaining < 0 {
		return 0
	}
	return remaining
}
