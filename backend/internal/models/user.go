package models

import (
	"time"

	"github.com/mesbahtanvir/ishkul/backend/pkg/crypto"
)

// User represents a user in the system (basic profile)
type User struct {
	ID                   string     `json:"id" firestore:"id"`
	Email                string     `json:"email" firestore:"email"`
	DisplayName          string     `json:"displayName" firestore:"displayName"`
	PhotoURL             string     `json:"photoUrl,omitempty" firestore:"photoUrl,omitempty"`
	CreatedAt            time.Time  `json:"createdAt" firestore:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt" firestore:"updatedAt"`
	Tier                 string     `json:"tier" firestore:"tier"`                                                     // "free" or "pro"
	PaidUntil            *time.Time `json:"paidUntil,omitempty" firestore:"paidUntil,omitempty"`                       // Subscription expiration
	DeletedAt            *time.Time `json:"deletedAt,omitempty" firestore:"deletedAt,omitempty"`                       // Soft delete timestamp
	PermanentlyDeletedAt *time.Time `json:"permanentlyDeletedAt,omitempty" firestore:"permanentlyDeletedAt,omitempty"` // Hard delete timestamp

	// Stripe integration fields
	StripeCustomerID     string `json:"-" firestore:"stripeCustomerId,omitempty"`                              // Stripe customer ID (not exposed to client)
	StripeSubscriptionID string `json:"-" firestore:"stripeSubscriptionId,omitempty"`                          // Stripe subscription ID (not exposed to client)
	SubscriptionStatus   string `json:"subscriptionStatus,omitempty" firestore:"subscriptionStatus,omitempty"` // active, canceled, past_due, trialing

	// Trial info
	TrialEndsAt  *time.Time `json:"trialEndsAt,omitempty" firestore:"trialEndsAt,omitempty"`   // When trial ends
	HasUsedTrial bool       `json:"hasUsedTrial,omitempty" firestore:"hasUsedTrial,omitempty"` // Whether user has used trial
}

// UserDocument represents the full user document
// Note: Learning data (courses, progress) is stored in separate Course documents
type UserDocument struct {
	User

	// Legacy fields for backward compatibility (deprecated)
	// TODO: Remove after migration to new Course-based model is complete
	NextStep *NextStep      `json:"nextStep,omitempty" firestore:"nextStep,omitempty"` // Deprecated: Use CurrentPosition in Course
	History  []HistoryEntry `json:"history,omitempty" firestore:"history,omitempty"`   // Deprecated: Use LessonProgress in Course
}

// EncryptPII encrypts sensitive user fields before storing in database
// Fields encrypted: Email, DisplayName
// Returns a copy with encrypted fields
func (u *User) EncryptPII() (*User, error) {
	if !crypto.IsEnabled() {
		return u, nil
	}

	encrypted := *u

	// Encrypt email
	if u.Email != "" {
		encEmail, err := crypto.EncryptEmail(u.Email)
		if err != nil {
			return nil, err
		}
		encrypted.Email = encEmail
	}

	// Encrypt display name
	if u.DisplayName != "" {
		encName, err := crypto.EncryptPII(u.DisplayName)
		if err != nil {
			return nil, err
		}
		encrypted.DisplayName = encName
	}

	return &encrypted, nil
}

// DecryptPII decrypts sensitive user fields after reading from database
// Modifies the user in place
func (u *User) DecryptPII() error {
	if !crypto.IsEnabled() {
		return nil
	}

	// Decrypt email
	if u.Email != "" {
		decEmail, err := crypto.DecryptEmail(u.Email)
		if err != nil {
			return err
		}
		u.Email = decEmail
	}

	// Decrypt display name
	if u.DisplayName != "" {
		decName, err := crypto.DecryptPII(u.DisplayName)
		if err != nil {
			return err
		}
		u.DisplayName = decName
	}

	return nil
}

// EncryptPII encrypts sensitive user document fields
func (ud *UserDocument) EncryptPII() (*UserDocument, error) {
	encUser, err := ud.User.EncryptPII()
	if err != nil {
		return nil, err
	}

	encrypted := *ud
	encrypted.User = *encUser
	return &encrypted, nil
}

// DecryptPII decrypts sensitive user document fields
func (ud *UserDocument) DecryptPII() error {
	return ud.User.DecryptPII()
}
