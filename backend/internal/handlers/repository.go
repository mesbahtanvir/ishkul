package handlers

import (
	"context"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/iterator"
)

// CountUserActivePaths counts only active paths (not completed, archived, or deleted)
// This is a shared function used by both learning_paths and subscription handlers
func CountUserActivePaths(ctx context.Context, fs *firestore.Client, userID string) (int, error) {
	iter := fs.Collection("learning_paths").
		Where("userId", "==", userID).
		Where("status", "==", models.PathStatusActive).
		Documents(ctx)
	defer iter.Stop()

	count := 0
	for {
		_, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return 0, err
		}
		count++
	}

	return count, nil
}

// GetFirestoreOrFail returns the Firestore client or sends a 500 error
// Returns nil if Firestore is not available (response already sent)
func GetFirestoreOrFail(w interface{ Write([]byte) (int, error) }) *firestore.Client {
	fs := firebase.GetFirestore()
	if fs == nil {
		return nil
	}
	return fs
}
