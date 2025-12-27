package firebase

import (
	"fmt"
	"strings"
)

// FirestoreErrorType categorizes common Firestore errors
type FirestoreErrorType string

const (
	ErrorTypeIndexMissing FirestoreErrorType = "index_missing"
	ErrorTypePermission   FirestoreErrorType = "permission_denied"
	ErrorTypeNotFound     FirestoreErrorType = "not_found"
	ErrorTypeTimeout      FirestoreErrorType = "timeout"
	ErrorTypeInvalidData  FirestoreErrorType = "invalid_data"
	ErrorTypeContention   FirestoreErrorType = "contention"
	ErrorTypeUnknown      FirestoreErrorType = "unknown"
)

// ClassifyFirestoreError categorizes Firestore errors for better logging
// Returns the error type and whether it's a critical error
func ClassifyFirestoreError(err error) FirestoreErrorType {
	if err == nil {
		return ""
	}

	errMsg := strings.ToLower(err.Error())

	switch {
	case strings.Contains(errMsg, "index") || strings.Contains(errMsg, "composite"):
		return ErrorTypeIndexMissing
	case strings.Contains(errMsg, "permission") || strings.Contains(errMsg, "denied"):
		return ErrorTypePermission
	case strings.Contains(errMsg, "not found"):
		return ErrorTypeNotFound
	case strings.Contains(errMsg, "timeout") || strings.Contains(errMsg, "deadline"):
		return ErrorTypeTimeout
	case strings.Contains(errMsg, "invalid") || strings.Contains(errMsg, "malformed"):
		return ErrorTypeInvalidData
	case strings.Contains(errMsg, "contention") || strings.Contains(errMsg, "aborted"):
		return ErrorTypeContention
	default:
		return ErrorTypeUnknown
	}
}

// SuggestFix provides actionable suggestions based on error type
func SuggestFix(errorType FirestoreErrorType, collection string) string {
	switch errorType {
	case ErrorTypeIndexMissing:
		return fmt.Sprintf("Add composite index for %s in firebase/firestore.indexes.json and run 'firebase deploy --only firestore:indexes'", collection)
	case ErrorTypePermission:
		return "Check Firestore security rules in firebase/firestore.rules"
	case ErrorTypeNotFound:
		return "Verify document exists or handle missing documents gracefully"
	case ErrorTypeTimeout:
		return "Query may be too complex or database overloaded. Consider pagination or simpler query."
	case ErrorTypeContention:
		return "Transaction conflict detected. This is expected under high concurrency and will be retried automatically."
	case ErrorTypeInvalidData:
		return "Check document structure matches expected schema"
	default:
		return "Check Cloud Logging for more details"
	}
}

// IsCriticalError returns true if the error requires immediate attention
func IsCriticalError(errorType FirestoreErrorType) bool {
	switch errorType {
	case ErrorTypeIndexMissing, ErrorTypePermission, ErrorTypeTimeout:
		return true
	case ErrorTypeContention, ErrorTypeNotFound:
		return false // Expected in normal operations
	default:
		return false
	}
}
