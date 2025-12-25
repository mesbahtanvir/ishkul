package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

// =============================================================================
// Request Context Helpers
// =============================================================================

// RequestContext holds common request data extracted from the HTTP request.
// This reduces repetitive extraction of userID and firestore client.
type RequestContext struct {
	Ctx     context.Context
	UserID  string
	FS      *firestore.Client
	Request *http.Request
}

// GetRequestContext extracts common request data and validates authentication.
// Returns nil and sends error response if validation fails.
func GetRequestContext(w http.ResponseWriter, r *http.Request) *RequestContext {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	if userID == "" {
		SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return nil
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		SendError(w, http.StatusInternalServerError, "DB_UNAVAILABLE", "Database not available")
		return nil
	}

	return &RequestContext{
		Ctx:     ctx,
		UserID:  userID,
		FS:      fs,
		Request: r,
	}
}

// GetAuthContext extracts user auth context without DB check.
// Used when input validation should happen before DB operations.
// Returns empty userID if not authenticated.
func GetAuthContext(w http.ResponseWriter, r *http.Request) (context.Context, string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	if userID == "" {
		SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return nil, ""
	}

	return ctx, userID
}

// GetFirestoreClient gets the Firestore client with error handling.
// Returns nil and sends error response if DB is not available.
func GetFirestoreClient(w http.ResponseWriter) *firestore.Client {
	fs := firebase.GetFirestore()
	if fs == nil {
		SendError(w, http.StatusInternalServerError, "DB_UNAVAILABLE", "Database not available")
		return nil
	}
	return fs
}

// =============================================================================
// Response Helpers
// =============================================================================

// SendJSON writes a JSON response with the given status code.
func SendJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		// Log error but can't send response since headers are already sent
		if appLogger != nil {
			logger.Error(appLogger, context.Background(), "json_encode_error",
				slog.String("error", err.Error()),
			)
		}
	}
}

// SendSuccess writes a success JSON response with status 200.
func SendSuccess(w http.ResponseWriter, data interface{}) {
	SendJSON(w, http.StatusOK, data)
}

// SendCreated writes a success JSON response with status 201.
func SendCreated(w http.ResponseWriter, data interface{}) {
	SendJSON(w, http.StatusCreated, data)
}

// SendError writes an error JSON response with structured error information.
func SendError(w http.ResponseWriter, statusCode int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error": message,
		"code":  code,
	})
}

// SendErrorResponse is an alias for sendErrorResponse for package-level access.
// Deprecated: Use SendError instead.
func SendErrorResponse(w http.ResponseWriter, statusCode int, code, message string) {
	sendErrorResponse(w, statusCode, code, message)
}

// =============================================================================
// Course Helpers
// =============================================================================

// NormalizeCourse ensures the course has valid defaults for nil slices/maps.
func NormalizeCourse(course *models.Course) {
	if course == nil {
		return
	}

	// Ensure Outline sections have valid defaults
	if course.Outline != nil {
		for i := range course.Outline.Sections {
			if course.Outline.Sections[i].Lessons == nil {
				course.Outline.Sections[i].Lessons = []models.Lesson{}
			}
		}
	}
}

// GetCourseByID fetches a course and verifies ownership.
// Returns the course or nil if not found/forbidden (error response already sent).
func GetCourseByID(w http.ResponseWriter, rc *RequestContext, courseID string) *models.Course {
	doc, err := Collection(rc.FS, "courses").Doc(courseID).Get(rc.Ctx)
	if err != nil {
		SendError(w, http.StatusNotFound, "NOT_FOUND", "Course not found")
		return nil
	}

	var course models.Course
	if err := doc.DataTo(&course); err != nil {
		SendError(w, http.StatusInternalServerError, "READ_ERROR", "Error reading course")
		return nil
	}

	if course.UserID != rc.UserID {
		SendError(w, http.StatusForbidden, "FORBIDDEN", "Forbidden")
		return nil
	}

	return &course
}

// =============================================================================
// Path Parsing
// =============================================================================

// ParsePathSegments extracts path segments after the given prefix.
func ParsePathSegments(urlPath, prefix string) []string {
	path := strings.TrimPrefix(urlPath, prefix)
	path = strings.TrimPrefix(path, "/")
	if path == "" {
		return []string{}
	}
	return strings.Split(path, "/")
}

// =============================================================================
// Logging
// =============================================================================

// LogRequest logs the incoming request if logger is available.
func LogRequest(ctx context.Context, r *http.Request) {
	if appLogger != nil {
		logger.Info(appLogger, ctx, "courses_request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
		)
	}
}

// =============================================================================
// Category Inference
// =============================================================================

// InferCategory determines the course category from the goal text.
func InferCategory(goal string) string {
	goalLower := strings.ToLower(goal)

	categoryKeywords := map[string][]string{
		"programming": {
			"python", "javascript", "java", "go", "golang", "rust", "c++", "c#",
			"typescript", "ruby", "php", "swift", "kotlin", "programming", "coding",
			"code", "developer", "software", "algorithm", "data structure",
			"web development", "backend", "frontend", "api", "react", "vue",
			"angular", "node", "django", "flask", "spring", "docker", "kubernetes",
		},
		"language": {
			"spanish", "french", "german", "japanese", "chinese", "mandarin",
			"korean", "italian", "portuguese", "arabic", "russian", "hindi",
			"language", "vocabulary", "grammar", "speaking", "conversation",
			"fluent", "learn english", "esl",
		},
		"data-science": {
			"data science", "machine learning", "deep learning", "ai",
			"artificial intelligence", "statistics", "analytics", "data analysis",
			"pandas", "numpy", "tensorflow", "pytorch", "ml",
		},
		"business": {
			"business", "marketing", "management", "finance", "accounting",
			"entrepreneurship", "startup", "leadership", "sales", "strategy",
			"mba", "product management",
		},
		"mathematics": {
			"math", "mathematics", "calculus", "algebra", "geometry",
			"trigonometry", "linear algebra", "probability", "equations",
		},
		"science": {
			"physics", "chemistry", "biology", "science", "astronomy", "geology",
		},
		"design": {
			"design", "ui", "ux", "user interface", "user experience", "graphic",
			"figma", "photoshop", "illustrator", "sketch",
		},
	}

	for category, keywords := range categoryKeywords {
		for _, kw := range keywords {
			if strings.Contains(goalLower, kw) {
				return category
			}
		}
	}

	return "general"
}
