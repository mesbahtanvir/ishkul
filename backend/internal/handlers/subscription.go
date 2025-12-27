package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/stripe/stripe-go/v81"
)

// productionRedirectHosts contains the list of hosts allowed in production
var productionRedirectHosts = []string{
	"ishkul.vercel.app",
	"ishkul.org",
	"www.ishkul.org",
	"ishkul-org.web.app", // Firebase hosting
}

// developmentRedirectHosts contains additional hosts allowed only in development
var developmentRedirectHosts = []string{
	"localhost",
	"127.0.0.1",
}

// isDevEnvironment returns true if running in development mode
func isDevEnvironment() bool {
	env := os.Getenv("ENVIRONMENT")
	return env == "" || env == "development"
}

// getAllowedRedirectHosts returns the list of allowed redirect hosts based on environment
func getAllowedRedirectHosts() []string {
	hosts := make([]string, len(productionRedirectHosts))
	copy(hosts, productionRedirectHosts)

	// Only allow localhost/127.0.0.1 in development
	if isDevEnvironment() {
		hosts = append(hosts, developmentRedirectHosts...)
	}

	return hosts
}

// isValidRedirectURL validates that a redirect URL is safe to use
// It ensures the URL is well-formed, uses HTTPS (except for localhost in dev), and belongs to an allowed host
func isValidRedirectURL(rawURL string) bool {
	if rawURL == "" {
		return false
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}

	// Must have a scheme
	if u.Scheme == "" {
		return false
	}

	host := strings.ToLower(u.Hostname())
	isDev := isDevEnvironment()

	// Allow http only for localhost/127.0.0.1 in development, otherwise require https
	if host == "localhost" || host == "127.0.0.1" {
		// Only allow localhost in development
		if !isDev {
			return false
		}
		if u.Scheme != "http" && u.Scheme != "https" {
			return false
		}
	} else {
		if u.Scheme != "https" {
			return false
		}
	}

	// Check against allowed hosts (environment-aware)
	allowedHosts := getAllowedRedirectHosts()
	for _, allowed := range allowedHosts {
		if host == allowed {
			return true
		}
	}

	// Also check environment variable for additional allowed hosts
	additionalHosts := os.Getenv("ALLOWED_REDIRECT_HOSTS")
	if additionalHosts != "" {
		for _, h := range strings.Split(additionalHosts, ",") {
			if strings.TrimSpace(strings.ToLower(h)) == host {
				return true
			}
		}
	}

	return false
}

// InitializeStripe sets up the Stripe client with the API key
func InitializeStripe() error {
	apiKey := os.Getenv("STRIPE_SECRET_KEY")
	if apiKey == "" {
		return fmt.Errorf("STRIPE_SECRET_KEY environment variable not set")
	}
	stripe.Key = apiKey
	return nil
}

// GetSubscriptionStatus returns the current subscription status and usage limits
func GetSubscriptionStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Get user data
	userDoc, err := Collection(fs, "users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	// Get current tier
	tier := user.GetCurrentTier()

	// Get token usage (daily and weekly)
	dailyUsage, err := getTokenUsage(ctx, fs, userID, models.GetTodayPeriod())
	if err != nil {
		dailyUsage = models.NewTokenUsage(models.GetTodayPeriod())
	}
	weeklyUsage, err := getTokenUsage(ctx, fs, userID, models.GetCurrentWeekPeriod())
	if err != nil {
		weeklyUsage = models.NewTokenUsage(models.GetCurrentWeekPeriod())
	}

	// Count active learning paths
	activePathCount, err := CountUserActivePaths(ctx, fs, userID)
	if err != nil {
		activePathCount = 0
	}

	// Build limits
	dailyTokenLimit := models.GetDailyTokenLimit(tier)
	weeklyTokenLimit := models.GetWeeklyTokenLimit(tier)
	pathLimit := models.GetMaxActiveCourses(tier)

	// Determine if any limit is reached
	canGenerate := dailyUsage.TotalTokens < dailyTokenLimit && weeklyUsage.TotalTokens < weeklyTokenLimit
	limitReached := ""
	if dailyUsage.TotalTokens >= dailyTokenLimit {
		limitReached = "daily"
	} else if weeklyUsage.TotalTokens >= weeklyTokenLimit {
		limitReached = "weekly"
	}

	status := models.SubscriptionStatus{
		Tier:   tier,
		Status: user.SubscriptionStatus,
		Limits: models.UsageLimits{
			DailyTokens: models.UsageLimit{
				Used:  dailyUsage.TotalTokens,
				Limit: dailyTokenLimit,
			},
			WeeklyTokens: models.UsageLimit{
				Used:  weeklyUsage.TotalTokens,
				Limit: weeklyTokenLimit,
			},
			ActivePaths: models.UsageLimit{
				Used:  int64(activePathCount),
				Limit: int64(pathLimit),
			},
		},
		CanUpgrade:    tier == models.TierFree,
		CanGenerate:   canGenerate,
		CanCreatePath: activePathCount < pathLimit,
		LimitReached:  limitReached,
	}

	// Set paid until if applicable
	if user.PaidUntil != nil {
		status.PaidUntil = user.PaidUntil
	}

	// Set limit reset times
	dailyResetTime := models.GetDailyResetTime()
	weeklyResetTime := models.GetWeeklyResetTime()
	status.DailyLimitResetAt = &dailyResetTime
	status.WeeklyLimitResetAt = &weeklyResetTime

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
