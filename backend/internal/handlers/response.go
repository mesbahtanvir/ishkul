package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// JSON writes a JSON response with the given status code
func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if data != nil {
		if err := json.NewEncoder(w).Encode(data); err != nil {
			// Log the error - we can't change status code after WriteHeader
			// but we should be aware of serialization failures
			if appLogger != nil {
				appLogger.Error("json_encode_error",
					slog.String("error", err.Error()),
					slog.Int("status_code", statusCode),
				)
			}
		}
	}
}

// JSONSuccess writes a 200 OK JSON response
func JSONSuccess(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, data)
}

// JSONCreated writes a 201 Created JSON response
func JSONCreated(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, data)
}

// JSONError writes an error response with status code and message
func JSONError(w http.ResponseWriter, statusCode int, code, message string) {
	JSON(w, statusCode, ErrorResponse{
		Code:    code,
		Message: message,
	})
}

// Common validation helpers

// RequireMethod checks if the request method matches any of the allowed methods
// Returns true if method is allowed, false if not (response is already sent)
func RequireMethod(w http.ResponseWriter, r *http.Request, allowedMethods ...string) bool {
	for _, m := range allowedMethods {
		if r.Method == m {
			return true
		}
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	return false
}

// GetUserIDOrFail returns the user ID from context, or sends 401 and returns empty string
func GetUserIDOrFail(w http.ResponseWriter, r *http.Request, getUserID func() string) string {
	userID := getUserID()
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return ""
	}
	return userID
}

// Response helpers for common patterns

// SuccessResponse creates a simple success response
func SuccessResponse(message string) map[string]interface{} {
	return map[string]interface{}{
		"success": true,
		"message": message,
	}
}
