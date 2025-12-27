package handlers

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

// getTokenUsage retrieves token usage for a user for a specific period
func getTokenUsage(ctx context.Context, fs *firestore.Client, userID, period string) (*models.TokenUsage, error) {
	doc, err := Collection(fs, "users").Doc(userID).Collection("tokenUsage").Doc(period).Get(ctx)
	if err != nil {
		return nil, err
	}

	var usage models.TokenUsage
	if err := doc.DataTo(&usage); err != nil {
		return nil, err
	}

	return &usage, nil
}

// IncrementTokenUsage increments the token usage for a user for both daily and weekly periods
// Returns the new total tokens used (daily) and whether the user can continue generating
func IncrementTokenUsage(ctx context.Context, userID string, tier string, inputTokens, outputTokens int64) (int64, bool, error) {
	fs := firebase.GetFirestore()
	if fs == nil {
		return 0, false, fmt.Errorf("database not available")
	}

	dailyPeriod := models.GetTodayPeriod()
	weeklyPeriod := models.GetCurrentWeekPeriod()
	now := time.Now().UTC()

	var dailyTotal int64

	// Use transaction to safely increment both daily and weekly usage
	err := fs.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		usageCol := Collection(fs, "users").Doc(userID).Collection("tokenUsage")
		dailyRef := usageCol.Doc(dailyPeriod)
		weeklyRef := usageCol.Doc(weeklyPeriod)

		// Get or create daily usage
		dailyDoc, err := tx.Get(dailyRef)
		var dailyUsage models.TokenUsage
		if err != nil {
			// Document doesn't exist, create it
			dailyUsage = *models.NewTokenUsage(dailyPeriod)
		} else {
			if err := dailyDoc.DataTo(&dailyUsage); err != nil {
				return err
			}
		}

		// Get or create weekly usage
		weeklyDoc, err := tx.Get(weeklyRef)
		var weeklyUsage models.TokenUsage
		if err != nil {
			weeklyUsage = *models.NewTokenUsage(weeklyPeriod)
		} else {
			if err := weeklyDoc.DataTo(&weeklyUsage); err != nil {
				return err
			}
		}

		// Increment both
		dailyUsage.InputTokens += inputTokens
		dailyUsage.OutputTokens += outputTokens
		dailyUsage.TotalTokens += inputTokens + outputTokens
		dailyUsage.LastUpdate = now

		weeklyUsage.InputTokens += inputTokens
		weeklyUsage.OutputTokens += outputTokens
		weeklyUsage.TotalTokens += inputTokens + outputTokens
		weeklyUsage.LastUpdate = now

		dailyTotal = dailyUsage.TotalTokens

		// Write both
		if err := tx.Set(dailyRef, dailyUsage); err != nil {
			return err
		}
		return tx.Set(weeklyRef, weeklyUsage)
	})

	if err != nil {
		return 0, false, err
	}

	dailyLimit := models.GetDailyTokenLimit(tier)
	canContinue := dailyTotal < dailyLimit

	return dailyTotal, canContinue, nil
}

// CheckCanGenerate checks if a user can generate content based on their daily and weekly token limits
// Returns: canGenerate, dailyTokensUsed, dailyLimit, weeklyTokensUsed, weeklyLimit, limitReached ("daily", "weekly", or ""), error
func CheckCanGenerate(ctx context.Context, userID string, tier string) (bool, int64, int64, int64, int64, string, error) {
	fs := firebase.GetFirestore()
	if fs == nil {
		return false, 0, 0, 0, 0, "", fmt.Errorf("database not available")
	}

	// Get daily usage
	dailyUsage, err := getTokenUsage(ctx, fs, userID, models.GetTodayPeriod())
	if err != nil {
		dailyUsage = models.NewTokenUsage(models.GetTodayPeriod())
	}

	// Get weekly usage
	weeklyUsage, err := getTokenUsage(ctx, fs, userID, models.GetCurrentWeekPeriod())
	if err != nil {
		weeklyUsage = models.NewTokenUsage(models.GetCurrentWeekPeriod())
	}

	dailyLimit := models.GetDailyTokenLimit(tier)
	weeklyLimit := models.GetWeeklyTokenLimit(tier)

	// Check which limit is reached (if any)
	limitReached := ""
	if dailyUsage.TotalTokens >= dailyLimit {
		limitReached = "daily"
	} else if weeklyUsage.TotalTokens >= weeklyLimit {
		limitReached = "weekly"
	}

	canGenerate := limitReached == ""

	return canGenerate, dailyUsage.TotalTokens, dailyLimit, weeklyUsage.TotalTokens, weeklyLimit, limitReached, nil
}

// GetUserTierAndLimits is a helper to get user tier and check limits in one call
func GetUserTierAndLimits(ctx context.Context, userID string) (string, *models.UsageLimits, error) {
	fs := firebase.GetFirestore()
	if fs == nil {
		return "", nil, fmt.Errorf("database not available")
	}

	// Get user
	userDoc, err := Collection(fs, "users").Doc(userID).Get(ctx)
	if err != nil {
		return "", nil, err
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		return "", nil, err
	}

	tier := user.GetCurrentTier()

	// Get daily token usage
	dailyUsage, err := getTokenUsage(ctx, fs, userID, models.GetTodayPeriod())
	if err != nil {
		dailyUsage = models.NewTokenUsage(models.GetTodayPeriod())
	}

	// Get weekly token usage
	weeklyUsage, err := getTokenUsage(ctx, fs, userID, models.GetCurrentWeekPeriod())
	if err != nil {
		weeklyUsage = models.NewTokenUsage(models.GetCurrentWeekPeriod())
	}

	// Count active paths
	activeCount, err := CountUserActivePaths(ctx, fs, userID)
	if err != nil {
		activeCount = 0
	}

	limits := &models.UsageLimits{
		DailyTokens: models.UsageLimit{
			Used:  dailyUsage.TotalTokens,
			Limit: models.GetDailyTokenLimit(tier),
		},
		WeeklyTokens: models.UsageLimit{
			Used:  weeklyUsage.TotalTokens,
			Limit: models.GetWeeklyTokenLimit(tier),
		},
		ActivePaths: models.UsageLimit{
			Used:  int64(activeCount),
			Limit: int64(models.GetMaxActiveCourses(tier)),
		},
	}

	return tier, limits, nil
}
