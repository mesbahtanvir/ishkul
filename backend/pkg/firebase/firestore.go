package firebase

import (
	"context"
	"log"
	"os"

	"cloud.google.com/go/firestore"
)

var firestoreClient *firestore.Client

// collectionPrefix is used to isolate data in preview/staging environments
// Set via FIRESTORE_COLLECTION_PREFIX environment variable
var collectionPrefix string

// InitializeFirestore initializes Firestore client
func InitializeFirestore(ctx context.Context) error {
	var err error
	firestoreClient, err = app.Firestore(ctx)
	if err != nil {
		return err
	}

	// Check for collection prefix (used in preview deployments)
	collectionPrefix = os.Getenv("FIRESTORE_COLLECTION_PREFIX")
	if collectionPrefix != "" {
		log.Printf("Using Firestore collection prefix: %s", collectionPrefix)
	}

	return nil
}

// GetFirestore returns the Firestore client
func GetFirestore() *firestore.Client {
	return firestoreClient
}

// GetCollectionPrefix returns the current collection prefix
func GetCollectionPrefix() string {
	return collectionPrefix
}

// Collection returns a collection reference with the appropriate prefix applied
// This should be used instead of direct fs.Collection() calls for environment isolation
func Collection(name string) *firestore.CollectionRef {
	if firestoreClient == nil {
		return nil
	}
	return firestoreClient.Collection(collectionPrefix + name)
}

// CloseFirestore closes the Firestore client
func CloseFirestore() error {
	if firestoreClient != nil {
		return firestoreClient.Close()
	}
	return nil
}

// DeleteCollectionWithPrefix deletes all documents in collections with the current prefix
// Used for cleanup in preview environments
func DeleteCollectionWithPrefix(ctx context.Context) error {
	if collectionPrefix == "" {
		log.Println("No collection prefix set, skipping cleanup")
		return nil
	}

	if firestoreClient == nil {
		return nil
	}

	// Delete documents from prefixed collections
	collections := []string{"users", "learning_paths"}
	for _, col := range collections {
		prefixedCol := collectionPrefix + col
		log.Printf("Cleaning up collection: %s", prefixedCol)

		iter := firestoreClient.Collection(prefixedCol).Documents(ctx)
		batch := firestoreClient.Batch()
		batchSize := 0
		maxBatchSize := 500 // Firestore batch limit

		for {
			doc, err := iter.Next()
			if err != nil {
				break
			}
			batch.Delete(doc.Ref)
			batchSize++

			if batchSize >= maxBatchSize {
				if _, err := batch.Commit(ctx); err != nil {
					log.Printf("Error committing batch delete: %v", err)
				}
				batch = firestoreClient.Batch()
				batchSize = 0
			}
		}

		if batchSize > 0 {
			if _, err := batch.Commit(ctx); err != nil {
				log.Printf("Error committing final batch delete: %v", err)
			}
		}
	}

	log.Printf("Cleanup completed for prefix: %s", collectionPrefix)
	return nil
}
