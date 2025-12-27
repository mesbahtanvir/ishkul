package firebase

import (
	"context"
	"log"
	"log/slog"
	"os"
	"time"

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
	logger := slog.Default()

	if collectionPrefix == "" {
		logger.InfoContext(ctx, "bulk_delete_skipped",
			slog.String("reason", "no_collection_prefix"),
		)
		return nil
	}

	if firestoreClient == nil {
		return nil
	}

	// Delete documents from prefixed collections using BulkWriter
	collections := []string{"users", "courses"}
	for _, col := range collections {
		start := time.Now()
		prefixedCol := collectionPrefix + col

		logger.InfoContext(ctx, "bulk_delete_start",
			slog.String("operation", "delete"),
			slog.String("collection", prefixedCol),
		)

		// Use BulkWriter for efficient bulk deletes (replaces deprecated Batch API)
		bulkWriter := firestoreClient.BulkWriter(ctx)
		iter := firestoreClient.Collection(prefixedCol).Documents(ctx)
		totalDeleted := 0
		totalErrors := 0

		for {
			doc, err := iter.Next()
			if err != nil {
				break
			}
			_, err = bulkWriter.Delete(doc.Ref)
			if err != nil {
				logger.WarnContext(ctx, "bulk_delete_doc_failed",
					slog.String("doc_path", doc.Ref.Path),
					slog.String("error", err.Error()),
				)
				totalErrors++
				continue
			}
			totalDeleted++
		}

		// Flush and close the bulk writer
		bulkWriter.End()

		logger.InfoContext(ctx, "bulk_delete_complete",
			slog.String("operation", "delete"),
			slog.String("collection", prefixedCol),
			slog.Int("success_count", totalDeleted),
			slog.Int("error_count", totalErrors),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
	}

	logger.InfoContext(ctx, "bulk_delete_all_complete",
		slog.String("prefix", collectionPrefix),
	)
	return nil
}
