package handlers

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/subscription"
	"github.com/stripe/stripe-go/v81/webhook"
)

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
		logWarn(ctx, "stripe_webhook_secret_not_configured")
		http.Error(w, "Webhook not configured", http.StatusInternalServerError)
		return
	}

	event, err := webhook.ConstructEvent(body, r.Header.Get("Stripe-Signature"), webhookSecret)
	if err != nil {
		logWarn(ctx, "stripe_webhook_signature_invalid",
			slog.String("error", err.Error()),
		)
		http.Error(w, "Invalid signature", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	logInfo(ctx, "stripe_webhook_received",
		slog.String("event_type", string(event.Type)),
		slog.String("event_id", event.ID),
	)

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
		logError(ctx, "webhook_checkout_parse_error",
			slog.String("error", err.Error()),
		)
		return
	}

	userID := session.Metadata["user_id"]
	if userID == "" {
		logWarn(ctx, "webhook_checkout_no_user_id")
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
			logWarn(ctx, "webhook_checkout_subscription_fetch_failed",
				slog.String("subscription_id", session.Subscription.ID),
				slog.String("error", err.Error()),
			)
			// Continue with update even if we can't get paidUntil
		} else {
			paidUntil := time.Unix(sub.CurrentPeriodEnd, 0)
			updates = append(updates, firestore.Update{
				Path: "paidUntil", Value: paidUntil,
			})
		}
	}

	_, err := Collection(fs, "users").Doc(userID).Update(ctx, updates)
	if err != nil {
		logError(ctx, "webhook_checkout_update_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
		return
	}

	logInfo(ctx, "subscription_activated_via_checkout",
		slog.String("user_id", userID),
	)
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

	_, err := Collection(fs, "users").Doc(userID).Update(ctx, updates)
	if err != nil {
		logError(ctx, "webhook_subscription_created_update_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
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

	_, err := Collection(fs, "users").Doc(userID).Update(ctx, updates)
	if err != nil {
		logError(ctx, "webhook_subscription_updated_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
	}

	logInfo(ctx, "subscription_updated",
		slog.String("user_id", userID),
		slog.String("status", string(sub.Status)),
		slog.String("tier", tier),
	)
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

	_, err := Collection(fs, "users").Doc(userID).Update(ctx, updates)
	if err != nil {
		logError(ctx, "webhook_subscription_deleted_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
	}

	logInfo(ctx, "subscription_canceled",
		slog.String("user_id", userID),
	)
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

	_, err := Collection(fs, "users").Doc(userID).Update(ctx, updates)
	if err != nil {
		logError(ctx, "webhook_payment_failed_update_failed",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
	}

	logWarn(ctx, "payment_failed",
		slog.String("user_id", userID),
	)
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
	userDoc, err := Collection(fs, "users").Doc(userID).Get(ctx)
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

		_, err = Collection(fs, "users").Doc(userID).Update(ctx, updates)
		if err != nil {
			logError(ctx, "webhook_payment_succeeded_update_failed",
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
		}

		logInfo(ctx, "subscription_reactivated_after_payment",
			slog.String("user_id", userID),
		)
	}
}

func findUserByStripeCustomer(ctx context.Context, fs *firestore.Client, customerID string) string {
	iter := Collection(fs, "users").Where("stripeCustomerId", "==", customerID).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil {
		return ""
	}

	return doc.Ref.ID
}
