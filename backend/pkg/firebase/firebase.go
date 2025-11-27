package firebase

import (
	"context"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"firebase.google.com/go/v4/storage"
	"google.golang.org/api/option"
)

var (
	app           *firebase.App
	authClient    *auth.Client
	storageClient *storage.Client
)

// Initialize initializes Firebase Admin SDK
func Initialize(ctx context.Context) error {
	// Get database URL from environment
	databaseURL := os.Getenv("FIREBASE_DATABASE_URL")
	if databaseURL == "" {
		log.Println("Warning: FIREBASE_DATABASE_URL not set")
	}

	// Get storage bucket from environment
	storageBucket := os.Getenv("FIREBASE_STORAGE_BUCKET")
	if storageBucket == "" {
		log.Println("Warning: FIREBASE_STORAGE_BUCKET not set")
	}

	// Configure Firebase
	conf := &firebase.Config{
		DatabaseURL:   databaseURL,
		StorageBucket: storageBucket,
	}

	// Initialize app
	// On Cloud Run, use Application Default Credentials (no explicit key file needed)
	// For local development, set GOOGLE_APPLICATION_CREDENTIALS environment variable
	var opt option.ClientOption
	credentialsPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if credentialsPath != "" {
		opt = option.WithCredentialsFile(credentialsPath)
		log.Printf("Using credentials file: %s", credentialsPath)
	} else {
		log.Println("Using Application Default Credentials (Cloud Run/GCP)")
	}

	var err error
	if opt != nil {
		app, err = firebase.NewApp(ctx, conf, opt)
	} else {
		// Use default credentials (Cloud Run, GKE, etc.)
		app, err = firebase.NewApp(ctx, conf)
	}
	if err != nil {
		return err
	}

	// Initialize Auth client
	authClient, err = app.Auth(ctx)
	if err != nil {
		return err
	}

	// Initialize Storage client (if bucket is provided)
	if storageBucket != "" {
		storageClient, err = app.Storage(ctx)
		if err != nil {
			return err
		}
	}

	// Initialize Firestore
	if err := InitializeFirestore(ctx); err != nil {
		return err
	}

	log.Println("Firebase initialized successfully")
	return nil
}

// GetAuth returns the Firebase Auth client
func GetAuth() *auth.Client {
	return authClient
}

// GetStorage returns the Firebase Storage client
func GetStorage() *storage.Client {
	return storageClient
}

// Cleanup performs cleanup operations
func Cleanup() {
	if err := CloseFirestore(); err != nil {
		log.Printf("Error closing Firestore: %v", err)
	}
	log.Println("Firebase cleanup completed")
}
