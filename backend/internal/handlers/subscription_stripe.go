package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/stripe/stripe-go/v81"
	portalsession "github.com/stripe/stripe-go/v81/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/ephemeralkey"
	"github.com/stripe/stripe-go/v81/subscription"
)

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

	// Validate redirect URLs to prevent open redirect attacks
	if !isValidRedirectURL(req.SuccessURL) {
		http.Error(w, "Invalid successUrl: must be HTTPS and from an allowed domain", http.StatusBadRequest)
		return
	}
	if !isValidRedirectURL(req.CancelURL) {
		http.Error(w, "Invalid cancelUrl: must be HTTPS and from an allowed domain", http.StatusBadRequest)
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
			logError(ctx, "stripe_customer_creation_failed_no_email",
				slog.String("user_id", userID),
			)
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
			logError(ctx, "stripe_customer_creation_failed",
				slog.String("user_id", userID),
				slog.String("email", user.Email),
				slog.String("error", err.Error()),
			)
			// Don't expose internal error details to client
			http.Error(w, "Failed to create customer. Please try again.", http.StatusInternalServerError)
			return
		}
		stripeCustomerID = c.ID

		// Save customer ID to user
		_, err = Collection(fs, "users").Doc(userID).Update(ctx, []firestore.Update{
			{Path: "stripeCustomerId", Value: stripeCustomerID},
			{Path: "updatedAt", Value: time.Now()},
		})
		if err != nil {
			logWarn(ctx, "failed_to_save_stripe_customer_id",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
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
		logError(ctx, "stripe_checkout_session_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
		http.Error(w, "Failed to create checkout session", http.StatusInternalServerError)
		return
	}

	logInfo(ctx, "checkout_session_created",
		slog.String("user_id", userID),
		slog.String("session_id", session.ID),
	)

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
			logError(ctx, "stripe_customer_creation_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
			http.Error(w, "Failed to create customer", http.StatusInternalServerError)
			return
		}
		stripeCustomerID = c.ID

		// Save customer ID to user
		_, _ = Collection(fs, "users").Doc(userID).Update(ctx, []firestore.Update{
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
		logError(ctx, "ephemeral_key_creation_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
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
		logError(ctx, "subscription_creation_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
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

	logInfo(ctx, "payment_sheet_params_created",
		slog.String("user_id", userID),
		slog.String("subscription_id", sub.ID),
	)

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
		logError(ctx, "stripe_subscription_cancel_failed",
			slog.String("user_id", userID),
			slog.String("subscription_id", user.StripeSubscriptionID),
			slog.String("error", err.Error()),
		)
		http.Error(w, "Failed to cancel subscription", http.StatusInternalServerError)
		return
	}

	// Update user's subscription status in Firestore
	_, err = Collection(fs, "users").Doc(userID).Update(ctx, []firestore.Update{
		{Path: "subscriptionStatus", Value: models.SubscriptionStatusCanceled},
		{Path: "updatedAt", Value: time.Now()},
	})
	if err != nil {
		logWarn(ctx, "failed_to_update_subscription_status",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
	}

	logInfo(ctx, "subscription_canceled_by_user",
		slog.String("user_id", userID),
		slog.String("subscription_id", user.StripeSubscriptionID),
		slog.Bool("cancel_at_period_end", sub.CancelAtPeriodEnd),
	)

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

	if user.StripeCustomerID == "" {
		http.Error(w, "No subscription found", http.StatusBadRequest)
		return
	}

	// Get return URL from request body or use default
	var req struct {
		ReturnURL string `json:"returnUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Allow empty body, use default
		req.ReturnURL = ""
	}

	// Use default URL if not provided or invalid
	if req.ReturnURL == "" || !isValidRedirectURL(req.ReturnURL) {
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
		logError(ctx, "stripe_portal_session_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
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
		logError(ctx, "verify_checkout_session_failed",
			slog.String("user_id", userID),
			slog.String("session_id", req.SessionID),
			slog.String("error", err.Error()),
		)
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
		logWarn(ctx, "verify_checkout_session_user_mismatch",
			slog.String("user_id", userID),
			slog.String("session_user_id", session.Metadata["user_id"]),
		)
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
		logInfo(ctx, "verify_checkout_not_paid",
			slog.String("user_id", userID),
			slog.String("payment_status", string(session.PaymentStatus)),
		)
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

	_, err = Collection(fs, "users").Doc(userID).Update(ctx, updates)
	if err != nil {
		logError(ctx, "verify_checkout_update_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
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

	logInfo(ctx, "subscription_verified_and_activated",
		slog.String("user_id", userID),
		slog.String("session_id", req.SessionID),
	)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models.VerifyCheckoutResponse{
		Success: true,
		Tier:    models.TierPro,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}
