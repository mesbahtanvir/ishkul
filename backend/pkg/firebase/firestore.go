package firebase

import (
	"context"

	"cloud.google.com/go/firestore"
)

var firestoreClient *firestore.Client

// InitializeFirestore initializes Firestore client
func InitializeFirestore(ctx context.Context) error {
	var err error
	firestoreClient, err = app.Firestore(ctx)
	if err != nil {
		return err
	}
	return nil
}

// GetFirestore returns the Firestore client
func GetFirestore() *firestore.Client {
	return firestoreClient
}

// CloseFirestore closes the Firestore client
func CloseFirestore() error {
	if firestoreClient != nil {
		return firestoreClient.Close()
	}
	return nil
}
