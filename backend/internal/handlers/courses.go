// Package handlers provides HTTP handlers for the Ishkul API.
//
// The courses handlers are organized into focused modules:
//   - courses.go (this file): Main router and configuration
//   - courses_crud.go: CRUD operations (list, get, create, update, delete, archive)
//   - courses_steps.go: Step operations (next, complete, view, generation)
//   - courses_outline.go: Outline generation and position management
//   - courses_memory.go: Memory management and compaction
//   - courses_helpers.go: Shared utilities and helper functions
package handlers

import (
	"log/slog"
	"net/http"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/services"
	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

// =============================================================================
// Configuration Constants
// =============================================================================

// Deprecated: MaxCoursesPerUser is deprecated.
// Use models.GetMaxActiveCourses(tier) instead for tier-aware path limits.
const MaxCoursesPerUser = 5

// =============================================================================
// Global State
// =============================================================================

// Global cache and pre-generation service
var (
	blockCache         *cache.BlockCache
	pregenerateService *services.PregenerateService
)

// Global logger instance - initialized in llm.go
var appLogger *slog.Logger

// SetAppLogger sets the global logger instance (called from main).
func SetAppLogger(log *slog.Logger) {
	appLogger = log
}

// =============================================================================
// Main Router
// =============================================================================

// CoursesHandler handles all /api/courses routes.
//
// Routes:
//   - GET    /api/courses              -> list courses
//   - POST   /api/courses              -> create course
//   - GET    /api/courses/{id}         -> get course
//   - PATCH  /api/courses/{id}         -> update course
//   - DELETE /api/courses/{id}         -> delete course
//   - POST   /api/courses/{id}/next    -> get/generate next step
//   - POST   /api/courses/{id}/archive -> archive course
//   - POST   /api/courses/{id}/memory  -> update memory
//   - POST   /api/courses/{id}/steps/{stepId}/complete -> complete step
//   - POST   /api/courses/{id}/steps/{stepId}/view     -> view step
//
// Lesson routes (3-stage generation):
//   - GET    /api/courses/{id}/lessons/{lessonId}                           -> get lesson
//   - POST   /api/courses/{id}/lessons/{lessonId}/generate-blocks           -> generate blocks
//   - POST   /api/courses/{id}/lessons/{lessonId}/blocks/{blockId}/generate -> generate content
//   - POST   /api/courses/{id}/lessons/{lessonId}/blocks/{blockId}/complete -> complete block
func CoursesHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	ctx = logger.WithUserID(ctx, userID)

	LogRequest(ctx, r)

	segments := ParsePathSegments(r.URL.Path, "/api/courses")

	// Route to lessons handler if applicable
	if len(segments) >= 3 && segments[1] == "lessons" {
		LessonsHandler(w, r, segments[0], segments[2:])
		return
	}

	// Route based on path segments
	switch len(segments) {
	case 0:
		routeRootPath(w, r)
	case 1:
		routeSingleCourse(w, r, segments[0])
	case 2:
		routeCourseAction(w, r, segments[0], segments[1])
	case 4:
		routeStepAction(w, r, segments)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// =============================================================================
// Route Handlers
// =============================================================================

// routeRootPath handles /api/courses (collection operations).
func routeRootPath(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listCourses(w, r)
	case http.MethodPost:
		createCourse(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// routeSingleCourse handles /api/courses/{id} (resource operations).
func routeSingleCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	switch r.Method {
	case http.MethodGet:
		getCourse(w, r, courseID)
	case http.MethodPatch, http.MethodPut:
		updateCourse(w, r, courseID)
	case http.MethodDelete:
		deleteCourse(w, r, courseID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// routeCourseAction handles /api/courses/{id}/{action} (course actions).
func routeCourseAction(w http.ResponseWriter, r *http.Request, courseID, action string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	switch action {
	case "next", "session": // "session" kept for backward compatibility
		getPathNextStep(w, r, courseID)
	case "complete": // Legacy endpoint - complete the current step
		completeCurrentStep(w, r, courseID)
	case "archive":
		archiveCourse(w, r, courseID)
	case "unarchive":
		unarchiveCourse(w, r, courseID)
	case "memory":
		updatePathMemory(w, r, courseID)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// routeStepAction handles /api/courses/{id}/steps/{stepId}/{action} (step actions).
func routeStepAction(w http.ResponseWriter, r *http.Request, segments []string) {
	if segments[1] != "steps" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	courseID, stepID, action := segments[0], segments[2], segments[3]

	switch action {
	case "complete":
		completeStep(w, r, courseID, stepID)
	case "view":
		viewStep(w, r, courseID, stepID)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}
