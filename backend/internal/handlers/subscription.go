package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/stripe/stripe-go/v81"
	portalsession "github.com/stripe/stripe-go/v81/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/ephemeralkey"
	"github.com/stripe/stripe-go/v81/subscription"
	"github.com/stripe/stripe-go/v81/webhook"
)

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
	userDoc, err := fs.Collection("users").Doc(userID).Get(ctx)
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

	// Get daily usage
	dailyUsage, err := getDailyUsage(ctx, fs, userID)
	if err != nil {
		// If no usage doc exists, default to 0
		dailyUsage = &models.DailyUsage{
			Date:      models.GetTodayDateString(),
			StepsUsed: 0,
		}
	}

	// Count active learning paths
	activePathCount, err := CountUserActivePaths(ctx, fs, userID)
	if err != nil {
		activePathCount = 0
	}

	// Build limits
	dailyLimit := models.GetDailyStepLimit(tier)
	pathLimit := models.GetMaxActivePaths(tier)

	status := models.SubscriptionStatus{
		Tier:   tier,
		Status: user.SubscriptionStatus,
		Limits: models.UsageLimits{
			DailySteps: models.UsageLimit{
				Used:  dailyUsage.StepsUsed,
				Limit: dailyLimit,
			},
			ActivePaths: models.UsageLimit{
				Used:  activePathCount,
				Limit: pathLimit,
			},
		},
		CanUpgrade:       tier == models.TierFree,
		CanGenerateSteps: dailyUsage.StepsUsed < dailyLimit,
		CanCreatePath:    activePathCount < pathLimit,
	}

	// Set paid until if applicable
	if user.PaidUntil != nil {
		status.PaidUntil = user.PaidUntil
	}

	// Set daily limit reset time
	resetTime := models.GetDailyLimitResetTime()
	status.DailyLimitResetAt = &resetTime

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// CreateCheckoutSession creates a Stripe checkout session for subscription
func CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.CheckoutSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.SuccessURL == "" || req.CancelURL == "" {
		http.Error(w, "successUrl and cancelUrl are required", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Get user data
	userDoc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	// Check if already Pro
	if user.IsProUser() {
		http.Error(w, "User already has an active Pro subscription", http.StatusBadRequest)
		return
	}

	// Get or create Stripe customer
	stripeCustomerID := user.StripeCustomerID
	if stripeCustomerID == "" {
		// Validate email before creating Stripe customer
		if user.Email == "" {
			if appLogger != nil {
				logger.Error(appLogger, ctx, "stripe_customer_creation_failed_no_email",
					slog.String("user_id", userID),
				)
			}
			http.Error(w, "User email is required for subscription", http.StatusBadRequest)
			return
		}

		// Create new Stripe customer
		params := &stripe.CustomerParams{
			Email: stripe.String(user.Email),
			Metadata: map[string]string{
				"user_id": userID,
			},
		}
		// Only set name if available (it's optional for Stripe)
		if user.DisplayName != "" {
			params.Name = stripe.String(user.DisplayName)
		}

		c, err := customer.New(params)
		if err != nil {
			if appLogger != nil {
				logger.Error(appLogger, ctx, "stripe_customer_creation_failed",
					slog.String("user_id", userID),
					slog.String("email", user.Email),
					slog.String("error", err.Error()),
				)
			}
			http.Error(w, "Failed to create customer: "+err.Error(), http.StatusInternalServerError)
			return
		}
		stripeCustomerID = c.ID

		// Save customer ID to user
		_, err = fs.Collection("users").Doc(userID).Update(ctx, []firestore.Update{
			{Path: "stripeCustomerId", Value: stripeCustomerID},
			{Path: "updatedAt", Value: time.Now()},
		})
		if err != nil {
			if appLogger != nil {
				logger.Warn(appLogger, ctx, "failed_to_save_stripe_customer_id",
					slog.String("user_id", userID),
					slog.String("error", err.Error()),
				)
			}
		}
	}

	// Get price ID from environment
	priceID := os.Getenv("STRIPE_PRO_PRICE_ID")
	if priceID == "" {
		http.Error(w, "Stripe price not configured", http.StatusInternalServerError)
		return
	}

	// Create checkout session
	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(stripeCustomerID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(req.SuccessURL),
		CancelURL:  stripe.String(req.CancelURL),
		Metadata: map[string]string{
			"user_id": userID,
		},
		SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
			Metadata: map[string]string{
				"user_id": userID,
			},
		},
	}

	// Add 7-day free trial for users who haven't used it before
	// Trial ends without auto-renew - user must explicitly choose to continue
	if !user.HasUsedTrial {
		params.SubscriptionData.TrialPeriodDays = stripe.Int64(7)
		// Set trial to NOT auto-convert to paid subscription
		params.SubscriptionData.TrialSettings = &stripe.CheckoutSessionSubscriptionDataTrialSettingsParams{
			EndBehavior: &stripe.CheckoutSessionSubscriptionDataTrialSettingsEndBehaviorParams{
				MissingPaymentMethod: stripe.String("cancel"),
			},
		}
	}

	session, err := checkoutsession.New(params)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "stripe_checkout_session_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
		http.Error(w, "Failed to create checkout session", http.StatusInternalServerError)
		return
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "checkout_session_created",
			slog.String("user_id", userID),
			slog.String("session_id", session.ID),
		)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models.CheckoutSessionResponse{
		CheckoutURL: session.URL,
		SessionID:   session.ID,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// GetPaymentSheetParams returns the parameters needed for the native payment sheet
func GetPaymentSheetParams(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
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
	userDoc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	// Check if already Pro
	if user.IsProUser() {
		http.Error(w, "User already has an active Pro subscription", http.StatusBadRequest)
		return
	}

	// Get or create Stripe customer
	stripeCustomerID := user.StripeCustomerID
	if stripeCustomerID == "" {
		if user.Email == "" {
			http.Error(w, "User email is required for subscription", http.StatusBadRequest)
			return
		}

		params := &stripe.CustomerParams{
			Email: stripe.String(user.Email),
			Metadata: map[string]string{
				"user_id": userID,
			},
		}
		if user.DisplayName != "" {
			params.Name = stripe.String(user.DisplayName)
		}

		c, err := customer.New(params)
		if err != nil {
			if appLogger != nil {
				logger.Error(appLogger, ctx, "stripe_customer_creation_failed",
					slog.String("user_id", userID),
					slog.String("error", err.Error()),
				)
			}
			http.Error(w, "Failed to create customer", http.StatusInternalServerError)
			return
		}
		stripeCustomerID = c.ID

		// Save customer ID to user
		_, _ = fs.Collection("users").Doc(userID).Update(ctx, []firestore.Update{
			{Path: "stripeCustomerId", Value: stripeCustomerID},
			{Path: "updatedAt", Value: time.Now()},
		})
	}

	// Create ephemeral key for the customer
	ephemeralKeyParams := &stripe.EphemeralKeyParams{
		Customer:      stripe.String(stripeCustomerID),
		StripeVersion: stripe.String("2024-12-18.acacia"),
	}
	ek, err := ephemeralkey.New(ephemeralKeyParams)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "ephemeral_key_creation_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
		http.Error(w, "Failed to create ephemeral key", http.StatusInternalServerError)
		return
	}

	// Get price ID from environment
	priceID := os.Getenv("STRIPE_PRO_PRICE_ID")
	if priceID == "" {
		http.Error(w, "Stripe price not configured", http.StatusInternalServerError)
		return
	}

	// Create subscription with payment_behavior set to allow incomplete
	subParams := &stripe.SubscriptionParams{
		Customer: stripe.String(stripeCustomerID),
		Items: []*stripe.SubscriptionItemsParams{
			{
				Price: stripe.String(priceID),
			},
		},
		PaymentBehavior: stripe.String("default_incomplete"),
		PaymentSettings: &stripe.SubscriptionPaymentSettingsParams{
			SaveDefaultPaymentMethod: stripe.String("on_subscription"),
		},
	}
	subParams.AddExpand("latest_invoice.payment_intent")
	subParams.AddMetadata("user_id", userID)

	sub, err := subscription.New(subParams)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "subscription_creation_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
		http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
		return
	}

	// Get the client secret from the payment intent
	var clientSecret string
	if sub.LatestInvoice != nil && sub.LatestInvoice.PaymentIntent != nil {
		clientSecret = sub.LatestInvoice.PaymentIntent.ClientSecret
	}

	if clientSecret == "" {
		http.Error(w, "Failed to get payment intent", http.StatusInternalServerError)
		return
	}

	// Get publishable key
	publishableKey := os.Getenv("STRIPE_PUBLISHABLE_KEY")
	if publishableKey == "" {
		http.Error(w, "Stripe publishable key not configured", http.StatusInternalServerError)
		return
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "payment_sheet_params_created",
			slog.String("user_id", userID),
			slog.String("subscription_id", sub.ID),
		)
	}

	// Return the parameters needed for the payment sheet
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"paymentIntent":  clientSecret,
		"ephemeralKey":   ek.Secret,
		"customer":       stripeCustomerID,
		"publishableKey": publishableKey,
		"subscriptionId": sub.ID,
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// CancelSubscription cancels the user's subscription at period end
func CancelSubscription(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
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
	userDoc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	if user.StripeSubscriptionID == "" {
		http.Error(w, "No active subscription found", http.StatusBadRequest)
		return
	}

	// Cancel subscription at period end (not immediately)
	params := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	}

	sub, err := subscription.Update(user.StripeSubscriptionID, params)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "stripe_subscription_cancel_failed",
				slog.String("user_id", userID),
				slog.String("subscription_id", user.StripeSubscriptionID),
				slog.String("error", err.Error()),
			)
		}
		http.Error(w, "Failed to cancel subscription", http.StatusInternalServerError)
		return
	}

	// Update user's subscription status in Firestore
	_, err = fs.Collection("users").Doc(userID).Update(ctx, []firestore.Update{
		{Path: "subscriptionStatus", Value: models.SubscriptionStatusCanceled},
		{Path: "updatedAt", Value: time.Now()},
	})
	if err != nil {
		if appLogger != nil {
			logger.Warn(appLogger, ctx, "failed_to_update_subscription_status",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "subscription_canceled_by_user",
			slog.String("user_id", userID),
			slog.String("subscription_id", user.StripeSubscriptionID),
			slog.Bool("cancel_at_period_end", sub.CancelAtPeriodEnd),
		)
	}

	// Return success with cancellation details
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"success":           true,
		"cancelAtPeriodEnd": sub.CancelAtPeriodEnd,
		"currentPeriodEnd":  time.Unix(sub.CurrentPeriodEnd, 0).Format(time.RFC3339),
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// CreatePortalSession creates a Stripe customer portal session
func CreatePortalSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
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
	userDoc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	if user.StripeCustomerID == "" {
		http.Error(w, "No subscription found", http.StatusBadRequest)
		return
	}

	// Get return URL from request body or use default
	var req struct {
		ReturnURL string `json:"returnUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Allow empty body
		req.ReturnURL = os.Getenv("APP_URL")
		if req.ReturnURL == "" {
			req.ReturnURL = "https://ishkul.org"
		}
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(user.StripeCustomerID),
		ReturnURL: stripe.String(req.ReturnURL),
	}

	session, err := portalsession.New(params)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "stripe_portal_session_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
		http.Error(w, "Failed to create portal session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models.PortalSessionResponse{
		PortalURL: session.URL,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// VerifyCheckoutSession verifies a completed checkout session and syncs the subscription
// This is the industry-standard approach to handle the race condition between
// Stripe webhooks and user navigation after checkout completion.
func VerifyCheckoutSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.VerifyCheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.SessionID == "" {
		http.Error(w, "sessionId is required", http.StatusBadRequest)
		return
	}

	// Retrieve the checkout session from Stripe
	session, err := checkoutsession.Get(req.SessionID, nil)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "verify_checkout_session_failed",
				slog.String("user_id", userID),
				slog.String("session_id", req.SessionID),
				slog.String("error", err.Error()),
			)
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(models.VerifyCheckoutResponse{
			Success: false,
			Tier:    models.TierFree,
			Message: "Failed to retrieve checkout session",
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
		}
		return
	}

	// Verify the session belongs to this user
	if session.Metadata["user_id"] != userID {
		if appLogger != nil {
			logger.Warn(appLogger, ctx, "verify_checkout_session_user_mismatch",
				slog.String("user_id", userID),
				slog.String("session_user_id", session.Metadata["user_id"]),
			)
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(models.VerifyCheckoutResponse{
			Success: false,
			Tier:    models.TierFree,
			Message: "Session does not belong to this user",
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
		}
		return
	}

	// Check if checkout was completed successfully
	if session.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
		if appLogger != nil {
			logger.Info(appLogger, ctx, "verify_checkout_not_paid",
				slog.String("user_id", userID),
				slog.String("payment_status", string(session.PaymentStatus)),
			)
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(models.VerifyCheckoutResponse{
			Success: false,
			Tier:    models.TierFree,
			Message: "Payment not completed",
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
		}
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Update user subscription status - this ensures status is updated
	// even if webhook hasn't arrived yet
	updates := []firestore.Update{
		{Path: "tier", Value: models.TierPro},
		{Path: "subscriptionStatus", Value: models.SubscriptionStatusActive},
		{Path: "updatedAt", Value: time.Now()},
	}

	if session.Subscription != nil {
		updates = append(updates, firestore.Update{
			Path: "stripeSubscriptionId", Value: session.Subscription.ID,
		})

		// Fetch subscription to get paidUntil date
		sub, err := subscription.Get(session.Subscription.ID, nil)
		if err == nil {
			paidUntil := time.Unix(sub.CurrentPeriodEnd, 0)
			updates = append(updates, firestore.Update{
				Path: "paidUntil", Value: paidUntil,
			})
		}
	}

	_, err = fs.Collection("users").Doc(userID).Update(ctx, updates)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "verify_checkout_update_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(models.VerifyCheckoutResponse{
			Success: false,
			Tier:    models.TierFree,
			Message: "Failed to update subscription status",
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
		}
		return
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "subscription_verified_and_activated",
			slog.String("user_id", userID),
			slog.String("session_id", req.SessionID),
		)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models.VerifyCheckoutResponse{
		Success: true,
		Tier:    models.TierPro,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

// HandleStripeWebhook processes Stripe webhook events
func HandleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	// Verify webhook signature
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		if appLogger != nil {
			logger.Warn(appLogger, ctx, "stripe_webhook_secret_not_configured")
		}
		http.Error(w, "Webhook not configured", http.StatusInternalServerError)
		return
	}

	event, err := webhook.ConstructEvent(body, r.Header.Get("Stripe-Signature"), webhookSecret)
	if err != nil {
		if appLogger != nil {
			logger.Warn(appLogger, ctx, "stripe_webhook_signature_invalid",
				slog.String("error", err.Error()),
			)
		}
		http.Error(w, "Invalid signature", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "stripe_webhook_received",
			slog.String("event_type", string(event.Type)),
			slog.String("event_id", event.ID),
		)
	}

	// Handle different event types
	switch event.Type {
	case "checkout.session.completed":
		handleCheckoutCompleted(ctx, fs, &event)

	case "customer.subscription.created":
		handleSubscriptionCreated(ctx, fs, &event)

	case "customer.subscription.updated":
		handleSubscriptionUpdated(ctx, fs, &event)

	case "customer.subscription.deleted":
		handleSubscriptionDeleted(ctx, fs, &event)

	case "invoice.payment_failed":
		handlePaymentFailed(ctx, fs, &event)

	case "invoice.payment_succeeded":
		handlePaymentSucceeded(ctx, fs, &event)
	}

	// Return 200 OK
	w.WriteHeader(http.StatusOK)
}

func handleCheckoutCompleted(ctx context.Context, fs *firestore.Client, event *stripe.Event) {
	var session stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "webhook_checkout_parse_error",
				slog.String("error", err.Error()),
			)
		}
		return
	}

	userID := session.Metadata["user_id"]
	if userID == "" {
		if appLogger != nil {
			logger.Warn(appLogger, ctx, "webhook_checkout_no_user_id")
		}
		return
	}

	// Update user with subscription info
	updates := []firestore.Update{
		{Path: "tier", Value: models.TierPro},
		{Path: "subscriptionStatus", Value: models.SubscriptionStatusActive},
		{Path: "updatedAt", Value: time.Now()},
	}

	if session.Subscription != nil {
		updates = append(updates, firestore.Update{
			Path: "stripeSubscriptionId", Value: session.Subscription.ID,
		})

		// Fetch full subscription to get paidUntil date
		sub, err := subscription.Get(session.Subscription.ID, nil)
		if err != nil {
			if appLogger != nil {
				logger.Warn(appLogger, ctx, "webhook_checkout_subscription_fetch_failed",
					slog.String("subscription_id", session.Subscription.ID),
					slog.String("error", err.Error()),
				)
			}
			// Continue with update even if we can't get paidUntil
		} else {
			paidUntil := time.Unix(sub.CurrentPeriodEnd, 0)
			updates = append(updates, firestore.Update{
				Path: "paidUntil", Value: paidUntil,
			})
		}
	}

	_, err := fs.Collection("users").Doc(userID).Update(ctx, updates)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "webhook_checkout_update_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
		return
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "subscription_activated_via_checkout",
			slog.String("user_id", userID),
		)
	}
}

func handleSubscriptionCreated(ctx context.Context, fs *firestore.Client, event *stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return
	}

	userID := sub.Metadata["user_id"]
	if userID == "" {
		// Try to find user by customer ID
		userID = findUserByStripeCustomer(ctx, fs, sub.Customer.ID)
		if userID == "" {
			return
		}
	}

	paidUntil := time.Unix(sub.CurrentPeriodEnd, 0)

	updates := []firestore.Update{
		{Path: "tier", Value: models.TierPro},
		{Path: "subscriptionStatus", Value: string(sub.Status)},
		{Path: "stripeSubscriptionId", Value: sub.ID},
		{Path: "paidUntil", Value: paidUntil},
		{Path: "updatedAt", Value: time.Now()},
	}

	_, err := fs.Collection("users").Doc(userID).Update(ctx, updates)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "webhook_subscription_created_update_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
	}
}

func handleSubscriptionUpdated(ctx context.Context, fs *firestore.Client, event *stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return
	}

	userID := sub.Metadata["user_id"]
	if userID == "" {
		userID = findUserByStripeCustomer(ctx, fs, sub.Customer.ID)
		if userID == "" {
			return
		}
	}

	paidUntil := time.Unix(sub.CurrentPeriodEnd, 0)

	// Determine tier based on subscription status
	tier := models.TierPro
	if sub.Status == stripe.SubscriptionStatusCanceled ||
		sub.Status == stripe.SubscriptionStatusUnpaid {
		tier = models.TierFree
	}

	updates := []firestore.Update{
		{Path: "tier", Value: tier},
		{Path: "subscriptionStatus", Value: string(sub.Status)},
		{Path: "paidUntil", Value: paidUntil},
		{Path: "updatedAt", Value: time.Now()},
	}

	_, err := fs.Collection("users").Doc(userID).Update(ctx, updates)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "webhook_subscription_updated_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "subscription_updated",
			slog.String("user_id", userID),
			slog.String("status", string(sub.Status)),
			slog.String("tier", tier),
		)
	}
}

func handleSubscriptionDeleted(ctx context.Context, fs *firestore.Client, event *stripe.Event) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return
	}

	userID := sub.Metadata["user_id"]
	if userID == "" {
		userID = findUserByStripeCustomer(ctx, fs, sub.Customer.ID)
		if userID == "" {
			return
		}
	}

	// Downgrade to free tier
	updates := []firestore.Update{
		{Path: "tier", Value: models.TierFree},
		{Path: "subscriptionStatus", Value: models.SubscriptionStatusCanceled},
		{Path: "updatedAt", Value: time.Now()},
	}

	_, err := fs.Collection("users").Doc(userID).Update(ctx, updates)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "webhook_subscription_deleted_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "subscription_canceled",
			slog.String("user_id", userID),
		)
	}
}

func handlePaymentFailed(ctx context.Context, fs *firestore.Client, event *stripe.Event) {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		return
	}

	if invoice.Customer == nil {
		return
	}

	userID := findUserByStripeCustomer(ctx, fs, invoice.Customer.ID)
	if userID == "" {
		return
	}

	updates := []firestore.Update{
		{Path: "subscriptionStatus", Value: models.SubscriptionStatusPastDue},
		{Path: "updatedAt", Value: time.Now()},
	}

	_, err := fs.Collection("users").Doc(userID).Update(ctx, updates)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "webhook_payment_failed_update_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}
	}

	if appLogger != nil {
		logger.Warn(appLogger, ctx, "payment_failed",
			slog.String("user_id", userID),
		)
	}
}

func handlePaymentSucceeded(ctx context.Context, fs *firestore.Client, event *stripe.Event) {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		return
	}

	if invoice.Customer == nil {
		return
	}

	userID := findUserByStripeCustomer(ctx, fs, invoice.Customer.ID)
	if userID == "" {
		return
	}

	// Reactivate subscription if it was past due
	userDoc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		return
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		return
	}

	if user.SubscriptionStatus == models.SubscriptionStatusPastDue {
		updates := []firestore.Update{
			{Path: "subscriptionStatus", Value: models.SubscriptionStatusActive},
			{Path: "tier", Value: models.TierPro},
			{Path: "updatedAt", Value: time.Now()},
		}

		_, err = fs.Collection("users").Doc(userID).Update(ctx, updates)
		if err != nil {
			if appLogger != nil {
				logger.Error(appLogger, ctx, "webhook_payment_succeeded_update_failed",
					slog.String("user_id", userID),
					slog.String("error", err.Error()),
				)
			}
		}

		if appLogger != nil {
			logger.Info(appLogger, ctx, "subscription_reactivated_after_payment",
				slog.String("user_id", userID),
			)
		}
	}
}

func findUserByStripeCustomer(ctx context.Context, fs *firestore.Client, customerID string) string {
	iter := fs.Collection("users").Where("stripeCustomerId", "==", customerID).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil {
		return ""
	}

	return doc.Ref.ID
}

// getDailyUsage retrieves the daily usage for a user
func getDailyUsage(ctx context.Context, fs *firestore.Client, userID string) (*models.DailyUsage, error) {
	today := models.GetTodayDateString()
	doc, err := fs.Collection("users").Doc(userID).Collection("usage").Doc(today).Get(ctx)
	if err != nil {
		return nil, err
	}

	var usage models.DailyUsage
	if err := doc.DataTo(&usage); err != nil {
		return nil, err
	}

	return &usage, nil
}

// IncrementDailyUsage increments the daily step count for a user
// Returns the new usage count and whether the user can continue generating steps
func IncrementDailyUsage(ctx context.Context, userID string, tier string) (int, bool, error) {
	fs := firebase.GetFirestore()
	if fs == nil {
		return 0, false, fmt.Errorf("database not available")
	}

	today := models.GetTodayDateString()
	usageRef := fs.Collection("users").Doc(userID).Collection("usage").Doc(today)

	// Use transaction to safely increment
	var newCount int
	err := fs.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(usageRef)
		if err != nil {
			// Document doesn't exist, create it
			newCount = 1
			return tx.Set(usageRef, models.DailyUsage{
				Date:       today,
				StepsUsed:  1,
				LastUpdate: time.Now().UTC(),
			})
		}

		var usage models.DailyUsage
		if err := doc.DataTo(&usage); err != nil {
			return err
		}

		newCount = usage.StepsUsed + 1
		return tx.Update(usageRef, []firestore.Update{
			{Path: "stepsUsed", Value: newCount},
			{Path: "lastUpdate", Value: time.Now().UTC()},
		})
	})

	if err != nil {
		return 0, false, err
	}

	limit := models.GetDailyStepLimit(tier)
	canContinue := newCount < limit

	return newCount, canContinue, nil
}

// CheckCanGenerateStep checks if a user can generate a new step based on their daily limit
func CheckCanGenerateStep(ctx context.Context, userID string, tier string) (bool, int, int, error) {
	fs := firebase.GetFirestore()
	if fs == nil {
		return false, 0, 0, fmt.Errorf("database not available")
	}

	usage, err := getDailyUsage(ctx, fs, userID)
	if err != nil {
		// No usage doc = 0 steps used today
		usage = &models.DailyUsage{StepsUsed: 0}
	}

	limit := models.GetDailyStepLimit(tier)
	canGenerate := usage.StepsUsed < limit

	return canGenerate, usage.StepsUsed, limit, nil
}

// GetUserTierAndLimits is a helper to get user tier and check limits in one call
func GetUserTierAndLimits(ctx context.Context, userID string) (string, *models.UsageLimits, error) {
	fs := firebase.GetFirestore()
	if fs == nil {
		return "", nil, fmt.Errorf("database not available")
	}

	// Get user
	userDoc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		return "", nil, err
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		return "", nil, err
	}

	tier := user.GetCurrentTier()

	// Get daily usage
	usage, err := getDailyUsage(ctx, fs, userID)
	if err != nil {
		usage = &models.DailyUsage{StepsUsed: 0}
	}

	// Count active paths
	activeCount, err := CountUserActivePaths(ctx, fs, userID)
	if err != nil {
		activeCount = 0
	}

	limits := &models.UsageLimits{
		DailySteps: models.UsageLimit{
			Used:  usage.StepsUsed,
			Limit: models.GetDailyStepLimit(tier),
		},
		ActivePaths: models.UsageLimit{
			Used:  activeCount,
			Limit: models.GetMaxActivePaths(tier),
		},
	}

	return tier, limits, nil
}

