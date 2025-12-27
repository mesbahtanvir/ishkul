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
// Uses error classification to provide actionable suggestions
func LogQueryResult(ctx context.Context, logger *slog.Logger, collectionName string, docsReturned int, duration time.Duration, err error) {
	if err != nil {
		errorType := ClassifyFirestoreError(err)
		isCritical := IsCriticalError(errorType)

		logger.ErrorContext(ctx, "firestore_query_failed",
			slog.String("operation", "query"),
			slog.String("collection", collectionName),
			slog.String("error", err.Error()),
			slog.String("error_type", string(errorType)),
			slog.Bool("critical", isCritical),
			slog.Int64("duration_ms", duration.Milliseconds()),
		)

		// Provide actionable fix suggestions for common errors
		if errorType != ErrorTypeUnknown {
			logger.WarnContext(ctx, "firestore_error_suggestion",
				slog.String("collection", collectionName),
				slog.String("error_type", string(errorType)),
				slog.String("suggested_fix", SuggestFix(errorType, collectionName)),
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
		errorType := ClassifyFirestoreError(err)
		isCritical := IsCriticalError(errorType)

		logger.WarnContext(ctx, "firestore_transaction_failed",
			slog.String("operation", "transaction"),
			slog.String("transaction_name", transactionName),
			slog.String("error", err.Error()),
			slog.String("error_type", string(errorType)),
			slog.Bool("critical", isCritical),
			slog.Int64("duration_ms", duration.Milliseconds()),
		)

		// Provide fix suggestion for non-unknown errors
		if errorType != ErrorTypeUnknown {
			logger.WarnContext(ctx, "firestore_error_suggestion",
				slog.String("transaction_name", transactionName),
				slog.String("error_type", string(errorType)),
				slog.String("suggested_fix", SuggestFix(errorType, "")),
			)
		}
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
