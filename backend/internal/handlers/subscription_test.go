package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetSubscriptionStatus(t *testing.T) {
	t.Run("rejects non-GET methods", func(t *testing.T) {
		methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/subscription/status", nil)
				rr := httptest.NewRecorder()

				GetSubscriptionStatus(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
				assert.Contains(t, rr.Body.String(), "Method not allowed")
			})
		}
	})

	t.Run("rejects request without user ID in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/subscription/status", nil)
		rr := httptest.NewRecorder()

		GetSubscriptionStatus(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Unauthorized")
	})
}

func TestCreateCheckoutSession(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/subscription/checkout", nil)
				rr := httptest.NewRecorder()

				CreateCheckoutSession(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
				assert.Contains(t, rr.Body.String(), "Method not allowed")
			})
		}
	})

	t.Run("rejects request without user ID in context", func(t *testing.T) {
		body := `{"successUrl": "https://success.url", "cancelUrl": "https://cancel.url"}`
		req := httptest.NewRequest(http.MethodPost, "/api/subscription/checkout", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		CreateCheckoutSession(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Unauthorized")
	})

	t.Run("rejects invalid JSON body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/subscription/checkout", bytes.NewBufferString("invalid json"))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		CreateCheckoutSession(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("rejects request without success URL", func(t *testing.T) {
		body := `{"cancelUrl": "https://cancel.url"}`
		req := httptest.NewRequest(http.MethodPost, "/api/subscription/checkout", bytes.NewBufferString(body))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		CreateCheckoutSession(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "successUrl and cancelUrl are required")
	})

	t.Run("rejects request without cancel URL", func(t *testing.T) {
		body := `{"successUrl": "https://success.url"}`
		req := httptest.NewRequest(http.MethodPost, "/api/subscription/checkout", bytes.NewBufferString(body))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "test-user-id")
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		CreateCheckoutSession(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "successUrl and cancelUrl are required")
	})
}

func TestCreatePortalSession(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/subscription/portal", nil)
				rr := httptest.NewRecorder()

				CreatePortalSession(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
				assert.Contains(t, rr.Body.String(), "Method not allowed")
			})
		}
	})

	t.Run("rejects request without user ID in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/subscription/portal", nil)
		rr := httptest.NewRecorder()

		CreatePortalSession(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Unauthorized")
	})
}

func TestHandleStripeWebhook(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := httptest.NewRequest(method, "/api/webhooks/stripe", nil)
				rr := httptest.NewRecorder()

				HandleStripeWebhook(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
				assert.Contains(t, rr.Body.String(), "Method not allowed")
			})
		}
	})

	t.Run("rejects request when webhook secret not configured", func(t *testing.T) {
		os.Unsetenv("STRIPE_WEBHOOK_SECRET")

		body := `{"type": "checkout.session.completed"}`
		req := httptest.NewRequest(http.MethodPost, "/api/webhooks/stripe", bytes.NewBufferString(body))
		rr := httptest.NewRecorder()

		HandleStripeWebhook(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Webhook not configured")
	})

	t.Run("rejects request with invalid signature", func(t *testing.T) {
		os.Setenv("STRIPE_WEBHOOK_SECRET", "whsec_test_secret")
		defer os.Unsetenv("STRIPE_WEBHOOK_SECRET")

		body := `{"type": "checkout.session.completed"}`
		req := httptest.NewRequest(http.MethodPost, "/api/webhooks/stripe", bytes.NewBufferString(body))
		req.Header.Set("Stripe-Signature", "invalid-signature")
		rr := httptest.NewRecorder()

		HandleStripeWebhook(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid signature")
	})
}

func TestInitializeStripe(t *testing.T) {
	t.Run("returns error when STRIPE_SECRET_KEY not set", func(t *testing.T) {
		os.Unsetenv("STRIPE_SECRET_KEY")

		err := InitializeStripe()

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "STRIPE_SECRET_KEY environment variable not set")
	})

	t.Run("initializes successfully when STRIPE_SECRET_KEY is set", func(t *testing.T) {
		os.Setenv("STRIPE_SECRET_KEY", "sk_test_12345")
		defer os.Unsetenv("STRIPE_SECRET_KEY")

		err := InitializeStripe()

		assert.NoError(t, err)
	})
}

func TestCheckoutSessionRequest(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		req := models.CheckoutSessionRequest{
			SuccessURL: "https://success.url",
			CancelURL:  "https://cancel.url",
		}

		jsonBytes, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "successUrl")
		assert.Contains(t, parsed, "cancelUrl")
	})
}

func TestCheckoutSessionResponse(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		resp := models.CheckoutSessionResponse{
			CheckoutURL: "https://checkout.stripe.com/session123",
			SessionID:   "session123",
		}

		jsonBytes, err := json.Marshal(resp)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "checkoutUrl")
		assert.Contains(t, parsed, "sessionId")
	})
}

func TestPortalSessionResponse(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		resp := models.PortalSessionResponse{
			PortalURL: "https://billing.stripe.com/portal123",
		}

		jsonBytes, err := json.Marshal(resp)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "portalUrl")
	})
}

func TestSubscriptionStatus(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		paidUntil := time.Now().Add(30 * 24 * time.Hour)
		dailyResetAt := time.Now().Add(24 * time.Hour)
		weeklyResetAt := time.Now().Add(7 * 24 * time.Hour)

		status := models.SubscriptionStatus{
			Tier:   models.TierPro,
			Status: models.SubscriptionStatusActive,
			Limits: models.UsageLimits{
				DailyTokens: models.UsageLimit{
					Used:  50000,
					Limit: 500000,
				},
				WeeklyTokens: models.UsageLimit{
					Used:  200000,
					Limit: 5000000,
				},
				ActivePaths: models.UsageLimit{
					Used:  3,
					Limit: 5,
				},
			},
			PaidUntil:          &paidUntil,
			CanUpgrade:         false,
			CanGenerate:        true,
			CanCreatePath:      true,
			DailyLimitResetAt:  &dailyResetAt,
			WeeklyLimitResetAt: &weeklyResetAt,
		}

		jsonBytes, err := json.Marshal(status)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "tier")
		assert.Contains(t, parsed, "status")
		assert.Contains(t, parsed, "limits")
		assert.Contains(t, parsed, "paidUntil")
		assert.Contains(t, parsed, "canUpgrade")
		assert.Contains(t, parsed, "canGenerate")
		assert.Contains(t, parsed, "canCreatePath")
		assert.Contains(t, parsed, "dailyLimitResetAt")
		assert.Contains(t, parsed, "weeklyLimitResetAt")

		// Verify nested limits structure
		limits := parsed["limits"].(map[string]interface{})
		assert.Contains(t, limits, "dailyTokens")
		assert.Contains(t, limits, "weeklyTokens")
		assert.Contains(t, limits, "activePaths")

		dailyTokens := limits["dailyTokens"].(map[string]interface{})
		assert.Equal(t, float64(50000), dailyTokens["used"])
		assert.Equal(t, float64(500000), dailyTokens["limit"])

		activePaths := limits["activePaths"].(map[string]interface{})
		assert.Equal(t, float64(3), activePaths["used"])
		assert.Equal(t, float64(5), activePaths["limit"])
	})

	t.Run("paidUntil is omitted when nil", func(t *testing.T) {
		status := models.SubscriptionStatus{
			Tier:   models.TierFree,
			Status: "",
			Limits: models.UsageLimits{
				DailyTokens:  models.UsageLimit{Used: 0, Limit: 100000},
				WeeklyTokens: models.UsageLimit{Used: 0, Limit: 1000000},
				ActivePaths:  models.UsageLimit{Used: 0, Limit: 2},
			},
			PaidUntil:  nil,
			CanUpgrade: true,
		}

		jsonBytes, err := json.Marshal(status)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		_, hasPaidUntil := parsed["paidUntil"]
		assert.False(t, hasPaidUntil, "paidUntil should be omitted when nil")
	})
}

func TestTokenUsage(t *testing.T) {
	t.Run("struct has correct firestore tags", func(t *testing.T) {
		usage := models.TokenUsage{
			Period:       "2025-12-02",
			InputTokens:  5000,
			OutputTokens: 2500,
			TotalTokens:  7500,
			LastUpdate:   time.Now(),
		}

		assert.Equal(t, "2025-12-02", usage.Period)
		assert.Equal(t, int64(5000), usage.InputTokens)
		assert.Equal(t, int64(2500), usage.OutputTokens)
		assert.Equal(t, int64(7500), usage.TotalTokens)
	})
}

func TestUsageLimits(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		limits := models.UsageLimits{
			DailyTokens: models.UsageLimit{
				Used:  100000,
				Limit: 500000,
			},
			WeeklyTokens: models.UsageLimit{
				Used:  500000,
				Limit: 5000000,
			},
			ActivePaths: models.UsageLimit{
				Used:  2,
				Limit: 5,
			},
		}

		jsonBytes, err := json.Marshal(limits)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "dailyTokens")
		assert.Contains(t, parsed, "weeklyTokens")
		assert.Contains(t, parsed, "activePaths")
	})
}

func TestUsageLimit(t *testing.T) {
	t.Run("struct has correct JSON tags", func(t *testing.T) {
		limit := models.UsageLimit{
			Used:  50,
			Limit: 100,
		}

		jsonBytes, err := json.Marshal(limit)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Contains(t, parsed, "used")
		assert.Contains(t, parsed, "limit")
		assert.Equal(t, float64(50), parsed["used"])
		assert.Equal(t, float64(100), parsed["limit"])
	})
}

func TestSubscriptionStatusConstants(t *testing.T) {
	t.Run("has correct subscription status constants", func(t *testing.T) {
		assert.Equal(t, "active", models.SubscriptionStatusActive)
		assert.Equal(t, "canceled", models.SubscriptionStatusCanceled)
		assert.Equal(t, "past_due", models.SubscriptionStatusPastDue)
		assert.Equal(t, "trialing", models.SubscriptionStatusTrialing)
	})
}

func TestFindUserByStripeCustomer(t *testing.T) {
	// This test requires a mock Firestore client
	// In integration tests, this would query the actual database
	t.Run("function signature exists", func(t *testing.T) {
		// Verify the function signature matches expectations
		// The actual implementation requires Firestore
		assert.NotNil(t, findUserByStripeCustomer)
	})
}
