package firebase

import (
	"context"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"firebase.google.com/go/v4/db"
	"firebase.google.com/go/v4/storage"
	"google.golang.org/api/option"
)

var (
	app         *firebase.App
	authClient  *auth.Client
	dbClient    *db.Client
	storageClient *storage.Client
)

// Initialize initializes Firebase Admin SDK
func Initialize(ctx context.Context) error {
	// Get credentials from environment variable
	credentialsPath := os.Getenv("FIREBASE_CREDENTIALS_PATH")
	if credentialsPath == "" {
		credentialsPath = "serviceAccountKey.json"
	}

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
	opt := option.WithCredentialsFile(credentialsPath)
	var err error
	app, err = firebase.NewApp(ctx, conf, opt)
	if err != nil {
		return err
	}

	// Initialize Auth client
	authClient, err = app.Auth(ctx)
	if err != nil {
		return err
	}

	// Initialize Realtime Database client (if URL is provided)
	if databaseURL != "" {
		dbClient, err = app.Database(ctx)
		if err != nil {
			return err
		}
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

// GetDB returns the Firebase Realtime Database client
func GetDB() *db.Client {
	return dbClient
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
