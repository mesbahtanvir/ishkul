package firebase

import (
	"context"
	"log/slog"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// LogQueryStart logs a Firestore query before execution (DEBUG level)
// This helps diagnose query structure and identify missing indexes
func LogQueryStart(ctx context.Context, logger *slog.Logger, collectionName string, attrs ...any) {
	logAttrs := []any{
		slog.String("operation", "query"),
		slog.String("collection", collectionName),
	}
	logAttrs = append(logAttrs, attrs...)
	logger.DebugContext(ctx, "firestore_query_start", logAttrs...)
}

// LogQueryResult logs query execution results with timing
// If error contains "index" or "composite", flags it as likely index issue
func LogQueryResult(ctx context.Context, logger *slog.Logger, collectionName string, docsReturned int, duration time.Duration, err error) {
	if err != nil {
		errorMsg := err.Error()
		isIndexError := containsAny(errorMsg, "index", "composite")

		logger.ErrorContext(ctx, "firestore_query_failed",
			slog.String("operation", "query"),
			slog.String("collection", collectionName),
			slog.String("error", errorMsg),
			slog.Bool("likely_index_missing", isIndexError),
			slog.Int64("duration_ms", duration.Milliseconds()),
		)

		if isIndexError {
			logger.WarnContext(ctx, "firestore_index_required",
				slog.String("collection", collectionName),
				slog.String("fix", "Add composite index in firebase/firestore.indexes.json and run 'firebase deploy --only firestore:indexes'"),
			)
		}
	} else {
		logger.DebugContext(ctx, "firestore_query_complete",
			slog.String("operation", "query"),
			slog.String("collection", collectionName),
			slog.Int("docs_returned", docsReturned),
			slog.Int64("duration_ms", duration.Milliseconds()),
		)
	}
}

// LogWrite logs Firestore write operations (Set, Update, Delete)
func LogWrite(ctx context.Context, logger *slog.Logger, operation string, docPath string, err error) {
	if err != nil {
		logger.ErrorContext(ctx, "firestore_write_failed",
			slog.String("operation", operation),
			slog.String("doc_path", docPath),
			slog.String("error", err.Error()),
		)
	} else {
		logger.DebugContext(ctx, "firestore_write_success",
			slog.String("operation", operation),
			slog.String("doc_path", docPath),
		)
	}
}

// LogWriteStart logs before a Firestore write operation
func LogWriteStart(ctx context.Context, logger *slog.Logger, operation string, docPath string, attrs ...any) {
	logAttrs := []any{
		slog.String("operation", operation),
		slog.String("doc_path", docPath),
	}
	logAttrs = append(logAttrs, attrs...)
	logger.DebugContext(ctx, "firestore_write_start", logAttrs...)
}

// LogTransactionStart logs the start of a Firestore transaction
func LogTransactionStart(ctx context.Context, logger *slog.Logger, transactionName string, attrs ...any) {
	logAttrs := []any{
		slog.String("operation", "transaction"),
		slog.String("transaction_name", transactionName),
	}
	logAttrs = append(logAttrs, attrs...)
	logger.DebugContext(ctx, "firestore_transaction_start", logAttrs...)
}

// LogTransactionEnd logs the completion of a Firestore transaction
func LogTransactionEnd(ctx context.Context, logger *slog.Logger, transactionName string, duration time.Duration, err error) {
	if err != nil {
		isContention := containsAny(err.Error(), "contention", "aborted")

		logger.WarnContext(ctx, "firestore_transaction_failed",
			slog.String("operation", "transaction"),
			slog.String("transaction_name", transactionName),
			slog.String("error", err.Error()),
			slog.Bool("contention", isContention),
			slog.Int64("duration_ms", duration.Milliseconds()),
		)
	} else {
		logger.InfoContext(ctx, "firestore_transaction_success",
			slog.String("operation", "transaction"),
			slog.String("transaction_name", transactionName),
			slog.Int64("duration_ms", duration.Milliseconds()),
		)
	}
}

// LogTransactionStep logs individual steps within a transaction (DEBUG level)
func LogTransactionStep(ctx context.Context, logger *slog.Logger, transactionName string, step string, err error) {
	if err != nil {
		logger.DebugContext(ctx, "firestore_transaction_step_failed",
			slog.String("operation", "transaction_step"),
			slog.String("transaction_name", transactionName),
			slog.String("step", step),
			slog.String("error", err.Error()),
		)
	} else {
		logger.DebugContext(ctx, "firestore_transaction_step_success",
			slog.String("operation", "transaction_step"),
			slog.String("transaction_name", transactionName),
			slog.String("step", step),
		)
	}
}

// LogDataToError logs errors when parsing Firestore documents with DataTo()
// This prevents silent failures when document structure doesn't match expected type
func LogDataToError(ctx context.Context, logger *slog.Logger, collection string, docID string, err error) {
	logger.WarnContext(ctx, "firestore_parse_error",
		slog.String("operation", "DataTo"),
		slog.String("collection", collection),
		slog.String("doc_id", docID),
		slog.String("error", err.Error()),
		slog.String("action", "skipping_document"),
	)
}

// LogBulkOperationStart logs the start of a bulk operation (batch write/delete)
func LogBulkOperationStart(ctx context.Context, logger *slog.Logger, operation string, collection string, batchSize int) {
	logger.InfoContext(ctx, "firestore_bulk_operation_start",
		slog.String("operation", operation),
		slog.String("collection", collection),
		slog.Int("batch_size", batchSize),
	)
}

// LogBulkOperationEnd logs the completion of a bulk operation with stats
func LogBulkOperationEnd(ctx context.Context, logger *slog.Logger, operation string, collection string, success int, errors int, duration time.Duration) {
	logger.InfoContext(ctx, "firestore_bulk_operation_complete",
		slog.String("operation", operation),
		slog.String("collection", collection),
		slog.Int("success_count", success),
		slog.Int("error_count", errors),
		slog.Int64("duration_ms", duration.Milliseconds()),
	)
}

// ExecuteQueryWithLogging executes a Firestore query with automatic logging
// This is a convenience wrapper that handles logging before/after query execution
func ExecuteQueryWithLogging(
	ctx context.Context,
	logger *slog.Logger,
	collectionName string,
	query *firestore.Query,
	queryAttrs ...any,
) *firestore.DocumentIterator {
	LogQueryStart(ctx, logger, collectionName, queryAttrs...)
	return query.Documents(ctx)
}

// IterateWithLogging wraps document iteration with automatic error logging
// Returns the number of documents successfully processed
func IterateWithLogging(
	ctx context.Context,
	logger *slog.Logger,
	collectionName string,
	iter *firestore.DocumentIterator,
	processFunc func(*firestore.DocumentSnapshot) error,
) (int, error) {
	start := time.Now()
	docsProcessed := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			LogQueryResult(ctx, logger, collectionName, docsProcessed, time.Since(start), err)
			return docsProcessed, err
		}

		if err := processFunc(doc); err != nil {
			// Log individual document processing error but continue
			logger.WarnContext(ctx, "firestore_document_processing_error",
				slog.String("collection", collectionName),
				slog.String("doc_id", doc.Ref.ID),
				slog.String("error", err.Error()),
			)
			continue
		}

		docsProcessed++
	}

	LogQueryResult(ctx, logger, collectionName, docsProcessed, time.Since(start), nil)
	return docsProcessed, nil
}

// containsAny checks if a string contains any of the specified substrings (case-insensitive)
func containsAny(s string, substrs ...string) bool {
	for _, substr := range substrs {
		if contains(s, substr) {
			return true
		}
	}
	return false
}

// contains performs case-insensitive substring search
func contains(s, substr string) bool {
	// Simple case-insensitive check without importing strings package
	sLower := toLower(s)
	substrLower := toLower(substr)
	return stringContains(sLower, substrLower)
}

// toLower converts string to lowercase
func toLower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if 'A' <= c && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}

// stringContains checks if string contains substring
func stringContains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || stringIndex(s, substr) >= 0)
}

// stringIndex finds the index of substring in string
func stringIndex(s, substr string) int {
	n := len(substr)
	if n == 0 {
		return 0
	}
	if n > len(s) {
		return -1
	}
	for i := 0; i <= len(s)-n; i++ {
		if s[i:i+n] == substr {
			return i
		}
	}
	return -1
}
