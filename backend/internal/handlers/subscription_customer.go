package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/customer"
)

// =============================================================================
// Customer Error Types
// =============================================================================

// CustomerError represents an error related to Stripe customer operations
type CustomerError struct {
	Code    string
	Message string
}

func (e *CustomerError) Error() string {
	return e.Message
}

// Common customer error codes
const (
	CustomerErrorEmailRequired  = "email_required"
	CustomerErrorCreationFailed = "creation_failed"
)

// =============================================================================
// Stripe Customer Service
// =============================================================================

// getOrCreateStripeCustomer returns the Stripe customer ID for a user,
// creating a new Stripe customer if one doesn't exist.
//
// This consolidates the common pattern of:
//  1. Checking if user already has a Stripe customer ID
//  2. Creating a new Stripe customer if not
//  3. Saving the customer ID to Firestore
//
// Returns the Stripe customer ID or an error if the operation fails.
func getOrCreateStripeCustomer(ctx context.Context, user *models.User, userID string) (string, error) {
	// Return existing customer ID if available
	if user.StripeCustomerID != "" {
		return user.StripeCustomerID, nil
	}

	// Email is required for Stripe customer creation
	if user.Email == "" {
		logError(ctx, "stripe_customer_creation_failed_no_email",
			slog.String("user_id", userID),
		)
		return "", &CustomerError{
			Code:    CustomerErrorEmailRequired,
			Message: "User email is required for subscription",
		}
	}

	// Create Stripe customer params
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

	// Create the customer in Stripe
	c, err := customer.New(params)
	if err != nil {
		logError(ctx, "stripe_customer_creation_failed",
			slog.String("user_id", userID),
			slog.String("email", user.Email),
			slog.String("error", err.Error()),
		)
		return "", &CustomerError{
			Code:    CustomerErrorCreationFailed,
			Message: "Failed to create customer. Please try again.",
		}
	}

	// Save customer ID to Firestore (best effort - don't fail if this errors)
	if err := saveStripeCustomerID(ctx, userID, c.ID); err != nil {
		logWarn(ctx, "failed_to_save_stripe_customer_id",
			slog.String("user_id", userID),
			slog.String("error", err.Error()),
		)
	}

	return c.ID, nil
}

// saveStripeCustomerID saves the Stripe customer ID to the user's Firestore document
func saveStripeCustomerID(ctx context.Context, userID, stripeCustomerID string) error {
	fs := firebase.GetFirestore()
	if fs == nil {
		return fmt.Errorf("firestore not available")
	}

	_, err := Collection(fs, "users").Doc(userID).Update(ctx, []firestore.Update{
		{Path: "stripeCustomerId", Value: stripeCustomerID},
		{Path: "updatedAt", Value: time.Now()},
	})

	return err
}

// =============================================================================
// Pro User Validation
// =============================================================================

// validateNotProUser checks if a user already has a Pro subscription.
// Returns an error message if the user is already Pro, nil otherwise.
func validateNotProUser(user *models.User) error {
	if user.IsProUser() {
		return fmt.Errorf("user already has an active Pro subscription")
	}
	return nil
}

// validateHasSubscription checks if a user has an active subscription.
// Returns an error message if the user has no subscription, nil otherwise.
func validateHasSubscription(user *models.User) error {
	if user.StripeSubscriptionID == "" {
		return fmt.Errorf("no active subscription found")
	}
	return nil
}

// validateHasStripeCustomer checks if a user has a Stripe customer ID.
// Returns an error message if the user has no customer ID, nil otherwise.
func validateHasStripeCustomer(user *models.User) error {
	if user.StripeCustomerID == "" {
		return fmt.Errorf("no subscription found")
	}
	return nil
}
