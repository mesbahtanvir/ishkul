package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/internal/services"
	"github.com/mesbahtanvir/ishkul/backend/internal/tools"
	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
	"google.golang.org/api/iterator"
)

// Deprecated: MaxCoursesPerUser is deprecated.
// Use models.GetMaxActiveCourses(tier) instead for tier-aware path limits.
const MaxCoursesPerUser = 5

// Global cache and pre-generation service
var (
	stepCache          *cache.StepCache
	pregenerateService *services.PregenerateService
)

// Global logger instance - initialized in llm.go
var appLogger *slog.Logger

// SetLogger sets the global logger instance (called from main)
func SetAppLogger(log *slog.Logger) {
	appLogger = log
}

// CoursesHandler handles all /api/courses routes
// Routes:
//   - GET    /api/courses              -> list paths
//   - POST   /api/courses              -> create path
//   - GET    /api/courses/{id}         -> get path
//   - PATCH  /api/courses/{id}         -> update path
//   - DELETE /api/courses/{id}         -> delete path
//   - POST   /api/courses/{id}/next    -> get/generate next step (triggers pregeneration of next)
//   - POST   /api/courses/{id}/archive -> archive path
//   - POST   /api/courses/{id}/memory  -> update memory
//   - POST   /api/courses/{id}/steps/{stepId}/complete -> complete step
//   - POST   /api/courses/{id}/steps/{stepId}/view     -> view step
func CoursesHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	ctx = logger.WithUserID(ctx, userID)

	logRequest(ctx, r)

	segments := parsePath(r.URL.Path, "/api/courses")

	switch len(segments) {
	case 0:
		handleRootPath(w, r)
	case 1:
		handleSinglePath(w, r, segments[0])
	case 2:
		handlePathAction(w, r, segments[0], segments[1])
	case 4:
		handleStepAction(w, r, segments)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// parsePath extracts path segments after the given prefix
func parsePath(urlPath, prefix string) []string {
	path := strings.TrimPrefix(urlPath, prefix)
	path = strings.TrimPrefix(path, "/")
	if path == "" {
		return []string{}
	}
	return strings.Split(path, "/")
}

// logRequest logs the incoming request if logger is available
func logRequest(ctx context.Context, r *http.Request) {
	if appLogger != nil {
		logger.Info(appLogger, ctx, "courses_request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
		)
	}
}

// handleRootPath handles /api/courses
func handleRootPath(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listCourses(w, r)
	case http.MethodPost:
		createCourse(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleSinglePath handles /api/courses/{id}
func handleSinglePath(w http.ResponseWriter, r *http.Request, courseID string) {
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

// handlePathAction handles /api/courses/{id}/{action}
func handlePathAction(w http.ResponseWriter, r *http.Request, courseID, action string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Route to the appropriate handler based on action
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

// handleStepAction handles /api/courses/{id}/steps/{stepId}/{action}
func handleStepAction(w http.ResponseWriter, r *http.Request, segments []string) {
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

// normalizeCourse ensures the course has valid defaults for nil slices/maps
// This handles legacy data that may have nil steps or memory
func normalizeCourse(path *models.Course) {
	if path == nil {
		return
	}
	// Ensure Steps is never nil (Go serializes nil slices as null in JSON)
	if path.Steps == nil {
		path.Steps = []models.Step{}
	}
	// Ensure Memory is never nil
	if path.Memory == nil {
		path.Memory = &models.Memory{
			Topics: make(map[string]models.TopicMemory),
		}
	}
	// Ensure Topics map is never nil
	if path.Memory.Topics == nil {
		path.Memory.Topics = make(map[string]models.TopicMemory)
	}
}

// listCourses returns courses for the authenticated user
// Query params:
//   - status: filter by status (active, completed, archived). Default shows active + completed.
//     Deleted paths are never shown.
func listCourses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Get status filter from query params
	statusFilter := r.URL.Query().Get("status")

	// Build query based on status filter
	var query firestore.Query
	baseQuery := Collection(fs, "courses").Where("userId", "==", userID)

	switch statusFilter {
	case models.CourseStatusActive:
		query = baseQuery.Where("status", "==", models.CourseStatusActive).OrderBy("lastAccessedAt", firestore.Desc)
	case models.CourseStatusCompleted:
		query = baseQuery.Where("status", "==", models.CourseStatusCompleted).OrderBy("completedAt", firestore.Desc)
	case models.CourseStatusArchived:
		query = baseQuery.Where("status", "==", models.CourseStatusArchived).OrderBy("archivedAt", firestore.Desc)
	default:
		// Default: show all non-deleted paths, ordered by last accessed
		query = baseQuery.OrderBy("lastAccessedAt", firestore.Desc)
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	paths := []models.Course{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			http.Error(w, "Error fetching courses", http.StatusInternalServerError)
			return
		}

		var path models.Course
		if err := doc.DataTo(&path); err != nil {
			continue // Skip malformed documents
		}

		// Skip deleted paths (they should never be shown)
		if path.Status == models.CourseStatusDeleted {
			continue
		}

		// Handle legacy paths without status (treat as active)
		if path.Status == "" {
			path.Status = models.CourseStatusActive
		}

		normalizeCourse(&path)
		paths = append(paths, path)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"courses": paths,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// getCourse returns a specific course
func getCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	// Verify ownership
	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Update last accessed time (intentionally ignoring error for non-critical update)
	now := time.Now().UnixMilli()
	_, _ = Collection(fs, "courses").Doc(courseID).Update(ctx, []firestore.Update{
		{Path: "lastAccessedAt", Value: now},
	})
	path.LastAccessedAt = now

	// Normalize to ensure valid defaults
	normalizeCourse(&path)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"course": path,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// createCourse creates a new course
func createCourse(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.CourseCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Goal == "" {
		http.Error(w, "Goal is required", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Get user tier and limits
	userTier, limits, err := GetUserTierAndLimits(ctx, userID)
	if err != nil {
		// Fallback to free tier if we can't get user info
		userTier = models.TierFree
	}

	// Check if user has reached the maximum number of courses for their tier
	existingPaths, err := CountUserActivePaths(ctx, fs, userID)
	if err != nil {
		http.Error(w, "Error checking existing paths", http.StatusInternalServerError)
		return
	}

	maxPaths := models.GetMaxActiveCourses(userTier)
	if existingPaths >= maxPaths {
		// Include upgrade hint for free users
		upgradeHint := ""
		if userTier == models.TierFree {
			upgradeHint = " Upgrade to Pro for up to 5 active paths."
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"error":       fmt.Sprintf("Maximum of %d active courses allowed.%s", maxPaths, upgradeHint),
			"code":        "COURSE_LIMIT_REACHED",
			"canUpgrade":  userTier == models.TierFree,
			"currentTier": userTier,
			"limits":      limits,
		})
		return
	}

	now := time.Now().UnixMilli()
	courseID := uuid.New().String()

	path := models.Course{
		ID:               courseID,
		UserID:           userID,
		Goal:             req.Goal,
		Emoji:            req.Emoji,
		Status:           models.CourseStatusActive,
		OutlineStatus:    models.OutlineStatusGenerating, // Outline is being generated
		Progress:         0,
		LessonsCompleted: 0,
		TotalLessons:     0, // Will be set when outline is ready
		Steps:            []models.Step{},
		Memory: &models.Memory{
			Topics: make(map[string]models.TopicMemory),
		},
		CreatedAt:      now,
		UpdatedAt:      now,
		LastAccessedAt: now,
	}

	if _, err := Collection(fs, "courses").Doc(courseID).Set(ctx, path); err != nil {
		http.Error(w, "Error creating course", http.StatusInternalServerError)
		return
	}

	// Generate course outline in the background
	// NOTE: First step pregeneration happens AFTER outline is ready (inside this goroutine)
	go func(courseID, goal, userID string) {
		bgCtx := context.Background()
		bgFs := firebase.GetFirestore()

		if appLogger != nil {
			logger.Info(appLogger, bgCtx, "outline_generation_started",
				slog.String("path_id", courseID),
				slog.String("goal", goal),
			)
		}

		outline, err := generateCourseOutline(goal)
		if err != nil {
			if appLogger != nil {
				logger.Error(appLogger, bgCtx, "outline_generation_failed",
					slog.String("path_id", courseID),
					slog.String("error", err.Error()),
				)
			}
			// Update status to failed
			if bgFs != nil {
				_, _ = Collection(bgFs, "courses").Doc(courseID).Update(bgCtx, []firestore.Update{
					{Path: "outlineStatus", Value: models.OutlineStatusFailed},
					{Path: "updatedAt", Value: time.Now().UnixMilli()},
				})
			}
			return
		}

		// Calculate total lessons from outline
		totalTopics := countOutlineTopics(outline)

		// Initialize outline position at the start
		outlinePosition := &models.OutlinePosition{
			ModuleIndex: 0,
			TopicIndex:  0,
		}
		if len(outline.Modules) > 0 {
			// Mark first module and topic as in_progress
			outline.Modules[0].Status = "in_progress"
			outlinePosition.ModuleID = outline.Modules[0].ID
			if len(outline.Modules[0].Topics) > 0 {
				outline.Modules[0].Topics[0].Status = "in_progress"
				outlinePosition.TopicID = outline.Modules[0].Topics[0].ID
			}
		}

		// Update the path with the generated outline and set status to ready
		if bgFs != nil {
			_, updateErr := Collection(bgFs, "courses").Doc(courseID).Update(bgCtx, []firestore.Update{
				{Path: "outline", Value: outline},
				{Path: "outlinePosition", Value: outlinePosition},
				{Path: "outlineStatus", Value: models.OutlineStatusReady},
				{Path: "totalLessons", Value: totalTopics},
				{Path: "updatedAt", Value: time.Now().UnixMilli()},
			})
			if updateErr != nil {
				if appLogger != nil {
					logger.Error(appLogger, bgCtx, "outline_save_failed",
						slog.String("path_id", courseID),
						slog.String("error", updateErr.Error()),
					)
				}
				// Update status to failed
				_, _ = Collection(bgFs, "courses").Doc(courseID).Update(bgCtx, []firestore.Update{
					{Path: "outlineStatus", Value: models.OutlineStatusFailed},
					{Path: "updatedAt", Value: time.Now().UnixMilli()},
				})
				return
			}

			if appLogger != nil {
				logger.Info(appLogger, bgCtx, "outline_generation_completed",
					slog.String("path_id", courseID),
					slog.Int("modules", len(outline.Modules)),
					slog.Int("total_topics", totalTopics),
				)
			}

			// NOW trigger pre-generation of first step (outline is ready)
			if pregenerateService != nil {
				// Build path with outline for pregeneration
				pathWithOutline := models.Course{
					ID:              courseID,
					UserID:          userID,
					Goal:            goal,
					Steps:           []models.Step{},
					Outline:         outline,
					OutlinePosition: outlinePosition,
					Memory: &models.Memory{
						Topics: make(map[string]models.TopicMemory),
					},
				}

				// Get user tier for pregeneration
				userDoc, userErr := Collection(bgFs, "users").Doc(userID).Get(bgCtx)
				pregenerateTier := models.TierFree
				if userErr == nil {
					var user models.User
					if dataErr := userDoc.DataTo(&user); dataErr == nil {
						pregenerateTier = user.GetCurrentTier()
					}
				}

				pregenerateService.TriggerPregeneration(&pathWithOutline, pregenerateTier)
				if appLogger != nil {
					logger.Info(appLogger, bgCtx, "pregeneration_triggered_after_outline",
						slog.String("path_id", courseID),
						slog.String("user_tier", pregenerateTier),
					)
				}
			}
		}
	}(courseID, req.Goal, userID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"course": path,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// updateCourse updates a course
func updateCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// First verify ownership
	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var existing models.Course
	if err := doc.DataTo(&existing); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if existing.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req models.CourseUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build updates
	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
		{Path: "lastAccessedAt", Value: time.Now().UnixMilli()},
	}

	if req.Goal != nil {
		updates = append(updates, firestore.Update{Path: "goal", Value: *req.Goal})
	}
	if req.Emoji != nil {
		updates = append(updates, firestore.Update{Path: "emoji", Value: *req.Emoji})
	}
	if req.Progress != nil {
		updates = append(updates, firestore.Update{Path: "progress", Value: *req.Progress})
	}
	if req.LessonsCompleted != nil {
		updates = append(updates, firestore.Update{Path: "lessonsCompleted", Value: *req.LessonsCompleted})
	}
	if req.TotalLessons != nil {
		updates = append(updates, firestore.Update{Path: "totalLessons", Value: *req.TotalLessons})
	}

	if _, err := Collection(fs, "courses").Doc(courseID).Update(ctx, updates); err != nil {
		http.Error(w, "Error updating course", http.StatusInternalServerError)
		return
	}

	// Fetch updated document
	doc, err = Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Error fetching updated path", http.StatusInternalServerError)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	// Normalize to ensure valid defaults
	normalizeCourse(&path)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"course": path,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// deleteCourse soft deletes a course (sets status to deleted)
func deleteCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// First verify ownership
	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var existing models.Course
	if err := doc.DataTo(&existing); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if existing.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Cannot delete already deleted paths
	if existing.Status == models.CourseStatusDeleted {
		http.Error(w, "Course is already deleted", http.StatusBadRequest)
		return
	}

	// Soft delete: update status to deleted
	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.CourseStatusDeleted},
		{Path: "deletedAt", Value: now},
		{Path: "updatedAt", Value: now},
	}

	if _, err := Collection(fs, "courses").Doc(courseID).Update(ctx, updates); err != nil {
		http.Error(w, "Error deleting course", http.StatusInternalServerError)
		return
	}

	// Clear pre-generated cache for this path
	if stepCache != nil {
		stepCache.Delete(courseID, userID)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Course deleted",
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// archiveCourse archives an active course
func archiveCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Only active paths can be archived
	if path.Status != models.CourseStatusActive && path.Status != "" {
		http.Error(w, fmt.Sprintf("Cannot archive path with status '%s'. Only active paths can be archived.", path.Status), http.StatusBadRequest)
		return
	}

	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.CourseStatusArchived},
		{Path: "archivedAt", Value: now},
		{Path: "updatedAt", Value: now},
	}

	if _, err := Collection(fs, "courses").Doc(courseID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error archiving course: %v", err), http.StatusInternalServerError)
		return
	}

	// Clear pre-generated cache for this path
	if stepCache != nil {
		stepCache.Delete(courseID, userID)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Course archived",
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// unarchiveCourse restores an archived path to active status
func unarchiveCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Only archived paths can be unarchived
	if path.Status != models.CourseStatusArchived {
		http.Error(w, fmt.Sprintf("Cannot unarchive path with status '%s'. Only archived paths can be unarchived.", path.Status), http.StatusBadRequest)
		return
	}

	// Get user tier for limit checks
	userTier, limits, err := GetUserTierAndLimits(ctx, userID)
	if err != nil {
		userTier = models.TierFree
	}

	// Check if user has room for another active path
	activeCount, err := CountUserActivePaths(ctx, fs, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error checking active paths: %v", err), http.StatusInternalServerError)
		return
	}

	maxPaths := models.GetMaxActiveCourses(userTier)
	if activeCount >= maxPaths {
		upgradeHint := ""
		if userTier == models.TierFree {
			upgradeHint = " Upgrade to Pro for up to 5 active paths."
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"error":       fmt.Sprintf("Cannot unarchive: you already have %d active courses (max %d).%s", activeCount, maxPaths, upgradeHint),
			"code":        "COURSE_LIMIT_REACHED",
			"canUpgrade":  userTier == models.TierFree,
			"currentTier": userTier,
			"limits":      limits,
		})
		return
	}

	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.CourseStatusActive},
		{Path: "archivedAt", Value: firestore.Delete}, // Remove archived timestamp
		{Path: "updatedAt", Value: now},
		{Path: "lastAccessedAt", Value: now},
	}

	if _, err := Collection(fs, "courses").Doc(courseID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error unarchiving course: %v", err), http.StatusInternalServerError)
		return
	}

	// Trigger pre-generation for the unarchived path
	path.Status = models.CourseStatusActive
	if pregenerateService != nil {
		// Fetch user to get their tier for pregeneration
		userDoc, userErr := Collection(fs, "users").Doc(userID).Get(ctx)
		var user models.User
		pregenerateTier := models.TierFree // Default to free tier
		if userErr == nil {
			if dataErr := userDoc.DataTo(&user); dataErr == nil {
				pregenerateTier = user.GetCurrentTier()
			}
		}

		pregenerateService.TriggerPregeneration(&path, pregenerateTier)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Course restored to active",
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// getCurrentStep finds the current (incomplete) step or returns nil if all complete
func getCurrentStep(steps []models.Step) *models.Step {
	for i := range steps {
		if !steps[i].Completed {
			return &steps[i]
		}
	}
	return nil
}

// getPathNextStep returns the current incomplete step or generates a new one
func getPathNextStep(w http.ResponseWriter, r *http.Request, courseID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Handle legacy paths without status (treat as active)
	if path.Status == "" {
		path.Status = models.CourseStatusActive
	}

	// Block step generation for non-active paths
	switch path.Status {
	case models.CourseStatusCompleted:
		sendErrorResponse(w, http.StatusBadRequest, ErrCodePathCompleted,
			"This course is completed. You can only review existing steps.")
		return
	case models.CourseStatusArchived:
		sendErrorResponse(w, http.StatusBadRequest, ErrCodePathArchived,
			"This course is archived. Unarchive it to continue learning.")
		return
	case models.CourseStatusDeleted:
		sendErrorResponse(w, http.StatusNotFound, ErrCodePathDeleted,
			"This course has been deleted.")
		return
	}

	// Get user tier for limit checks
	userTier, limits, err := GetUserTierAndLimits(ctx, userID)
	if err != nil {
		userTier = models.TierFree
	}

	// Normalize to ensure valid defaults
	normalizeCourse(&path)

	// Update last accessed (intentionally ignoring error for non-critical update)
	now := time.Now().UnixMilli()
	_, _ = Collection(fs, "courses").Doc(courseID).Update(ctx, []firestore.Update{
		{Path: "lastAccessedAt", Value: now},
	})

	// Check for existing incomplete step
	currentStep := getCurrentStep(path.Steps)
	if currentStep != nil {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"step":      currentStep,
			"stepIndex": currentStep.Index,
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
			return
		}
		return
	}

	// Check daily step limit before generating a new step (soft block)
	canGenerate, stepsUsed, stepLimit, _ := CheckCanGenerateStep(ctx, userID, userTier)
	if !canGenerate {
		// Soft block - user can view existing steps but cannot generate new ones
		upgradeHint := ""
		if userTier == models.TierFree {
			upgradeHint = " Upgrade to Pro for 1,000 steps per day."
		}
		resetTime := models.GetDailyLimitResetTime()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"error":             fmt.Sprintf("Daily step limit reached (%d/%d).%s", stepsUsed, stepLimit, upgradeHint),
			"code":              "DAILY_STEP_LIMIT_REACHED",
			"canUpgrade":        userTier == models.TierFree,
			"currentTier":       userTier,
			"limits":            limits,
			"dailyLimitResetAt": resetTime,
			"existingSteps":     path.Steps, // Allow viewing existing steps
		})
		return
	}

	// No current step - try to get from cache first (instant response)
	var nextStep *models.Step

	if stepCache != nil {
		nextStep = stepCache.Get(courseID, userID)
		if nextStep != nil {
			// Update step index to match current path state
			nextStep.Index = len(path.Steps)
			// Remove from cache since we're using it
			stepCache.Delete(courseID, userID)
			if appLogger != nil {
				logger.Info(appLogger, ctx, "step_cache_hit",
					slog.String("path_id", courseID),
					slog.String("step_type", nextStep.Type),
				)
			}
		}
	}

	// Cache miss - generate synchronously (fallback)
	if nextStep == nil {
		var genErr error
		nextStep, genErr = generateNextStepForPath(&path)
		if genErr != nil {
			if appLogger != nil {
				logger.Error(appLogger, ctx, "failed_to_generate_next_step",
					slog.String("path_id", courseID),
					slog.String("error", genErr.Error()),
					slog.String("openai_client_nil", fmt.Sprintf("%v", openaiClient == nil)),
					slog.String("prompt_loader_nil", fmt.Sprintf("%v", promptLoader == nil)),
				)
			}
			http.Error(w, fmt.Sprintf("Failed to generate next step: %v", genErr), http.StatusInternalServerError)
			return
		}
		if appLogger != nil {
			logger.Info(appLogger, ctx, "step_cache_miss",
				slog.String("path_id", courseID),
				slog.String("step_type", nextStep.Type),
			)
		}
	}

	// Append the new step to the Steps array
	path.Steps = append(path.Steps, *nextStep)

	// Save the updated path to Firestore
	_, err = Collection(fs, "courses").Doc(courseID).Update(ctx, []firestore.Update{
		{Path: "steps", Value: path.Steps},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	if err != nil {
		// Log but don't fail - we can still return the step
		fmt.Printf("Warning: failed to save generated step: %v\n", err)
	}

	// Increment daily usage counter
	newUsage, _, usageErr := IncrementDailyUsage(ctx, userID, userTier)
	if usageErr != nil {
		if appLogger != nil {
			logger.Warn(appLogger, ctx, "failed_to_increment_daily_usage",
				slog.String("user_id", userID),
				slog.String("error", usageErr.Error()),
			)
		}
	} else if appLogger != nil {
		logger.Info(appLogger, ctx, "daily_usage_incremented",
			slog.String("user_id", userID),
			slog.Int("new_count", newUsage),
			slog.String("tier", userTier),
		)
	}

	// Always trigger pre-generation for the NEXT step (background)
	// This ensures the next call to /next will have a cached step ready
	if pregenerateService != nil {
		// Fetch user to get their tier for pregeneration
		userDoc, userErr := Collection(fs, "users").Doc(path.UserID).Get(ctx)
		var user models.User
		pregenerateTier := models.TierFree // Default to free tier
		if userErr == nil {
			if dataErr := userDoc.DataTo(&user); dataErr == nil {
				pregenerateTier = user.GetCurrentTier()
			}
		}

		// Update path with the new step for accurate pre-generation context
		pregenerateService.TriggerPregeneration(&path, pregenerateTier)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"step":      nextStep,
		"stepIndex": nextStep.Index,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// generateNextStepForPath generates the next learning step using the LLM
func generateNextStepForPath(path *models.Course) (*models.Step, error) {
	// Check if LLM is initialized
	if openaiClient == nil || promptLoader == nil {
		if appLogger != nil {
			logger.Error(appLogger, context.Background(), "llm_not_initialized",
				slog.String("path_id", path.ID),
				slog.String("openai_client_nil", fmt.Sprintf("%v", openaiClient == nil)),
				slog.String("prompt_loader_nil", fmt.Sprintf("%v", promptLoader == nil)),
			)
		}
		return nil, fmt.Errorf("LLM not initialized")
	}

	// Determine which steps to include (only since last compaction)
	recentSteps := getRecentSteps(path)

	// Build recent history string from recent steps
	recentHistory := ""
	if len(recentSteps) > 0 {
		topics := make([]string, 0, len(recentSteps))
		for _, s := range recentSteps {
			topics = append(topics, s.Topic)
		}
		// Get last 5 topics for context
		start := len(topics) - 5
		if start < 0 {
			start = 0
		}
		recentHistory = strings.Join(topics[start:], ", ")
	}

	// Build memory context (compaction summary + topics)
	memorySummary := buildMemoryContext(path)

	// Prepare variables for the prompt
	vars := prompts.Variables{
		"goal":          path.Goal,
		"historyCount":  strconv.Itoa(len(path.Steps)),
		"memory":        memorySummary,
		"recentHistory": recentHistory,
	}

	// Add outline context if available
	if path.Outline != nil && path.OutlinePosition != nil {
		moduleIdx := path.OutlinePosition.ModuleIndex
		topicIdx := path.OutlinePosition.TopicIndex

		if moduleIdx < len(path.Outline.Modules) {
			module := path.Outline.Modules[moduleIdx]
			vars["currentModule"] = module.Title

			if topicIdx < len(module.Topics) {
				topic := module.Topics[topicIdx]
				vars["currentTopic"] = topic.Title
				vars["currentTopicType"] = topic.ToolID
				vars["currentTopicDescription"] = topic.Description
			}
		}
	}

	// Load the next-step prompt template
	template, err := promptLoader.LoadByName("learning/next-step")
	if err != nil {
		return nil, fmt.Errorf("failed to load prompt template: %w", err)
	}

	// Render prompt
	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	// Call OpenAI
	completion, err := openaiClient.CreateChatCompletion(*openaiReq)
	if err != nil {
		return nil, fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned from OpenAI")
	}

	content := completion.Choices[0].Message.Content

	// Parse the JSON response into a temporary struct
	var stepData struct {
		Type           string   `json:"type"`
		Topic          string   `json:"topic"`
		Title          string   `json:"title"`
		Content        string   `json:"content,omitempty"`
		Question       string   `json:"question,omitempty"`
		Options        []string `json:"options,omitempty"`
		ExpectedAnswer string   `json:"expectedAnswer,omitempty"`
		Task           string   `json:"task,omitempty"`
		Hints          []string `json:"hints,omitempty"`
	}
	if err := json.Unmarshal([]byte(content), &stepData); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response as JSON: %w (content: %s)", err, content)
	}

	// Truncate content if too long
	if len(stepData.Content) > models.MaxStepContentLength {
		stepData.Content = stepData.Content[:models.MaxStepContentLength]
	}

	// Create the Step
	now := time.Now().UnixMilli()
	step := &models.Step{
		ID:             uuid.New().String(),
		Index:          len(path.Steps),
		Type:           stepData.Type,
		Topic:          stepData.Topic,
		Title:          stepData.Title,
		Content:        stepData.Content,
		Question:       stepData.Question,
		Options:        stepData.Options,
		ExpectedAnswer: stepData.ExpectedAnswer,
		Task:           stepData.Task,
		Hints:          stepData.Hints,
		Completed:      false,
		CreatedAt:      now,
	}

	return step, nil
}

// getRecentSteps returns steps since the last compaction (or all if no compaction)
func getRecentSteps(path *models.Course) []models.Step {
	if path.Memory == nil || path.Memory.Compaction == nil {
		return path.Steps
	}

	lastCompactedIndex := path.Memory.Compaction.LastStepIndex
	if lastCompactedIndex >= len(path.Steps) {
		return []models.Step{}
	}

	return path.Steps[lastCompactedIndex+1:]
}

// buildMemoryContext creates a string summary of the user's memory for the LLM
func buildMemoryContext(path *models.Course) string {
	if path.Memory == nil {
		return ""
	}

	var parts []string

	// Include compaction summary if available
	if path.Memory.Compaction != nil {
		parts = append(parts, fmt.Sprintf("Learning Summary: %s", path.Memory.Compaction.Summary))
		if len(path.Memory.Compaction.Strengths) > 0 {
			parts = append(parts, fmt.Sprintf("Strengths: %s", strings.Join(path.Memory.Compaction.Strengths, ", ")))
		}
		if len(path.Memory.Compaction.Weaknesses) > 0 {
			parts = append(parts, fmt.Sprintf("Weaknesses: %s", strings.Join(path.Memory.Compaction.Weaknesses, ", ")))
		}
	}

	// Include topic confidence scores
	if len(path.Memory.Topics) > 0 {
		topicScores := make([]string, 0)
		for topic, mem := range path.Memory.Topics {
			topicScores = append(topicScores, fmt.Sprintf("%s: %.0f%%", topic, mem.Confidence*100))
		}
		if len(topicScores) > 0 {
			parts = append(parts, fmt.Sprintf("Topic Confidence: %s", strings.Join(topicScores, ", ")))
		}
	}

	return strings.Join(parts, "\n")
}

// completeCurrentStep completes the current (first incomplete) step - legacy endpoint
func completeCurrentStep(w http.ResponseWriter, r *http.Request, courseID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Find current step
	currentStep := getCurrentStep(path.Steps)
	if currentStep == nil {
		http.Error(w, "No active step to complete", http.StatusBadRequest)
		return
	}

	// Parse request body for completion data
	var req models.StepComplete
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Allow empty body for simple completion
		req = models.StepComplete{}
	}

	// Complete the step
	completeStepInternal(w, r, courseID, currentStep.ID, &path, &req)
}

// completeStep marks a specific step as complete
func completeStep(w http.ResponseWriter, r *http.Request, courseID string, stepID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req models.StepComplete
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Allow empty body for simple completion
		req = models.StepComplete{}
	}

	completeStepInternal(w, r, courseID, stepID, &path, &req)
}

// completeStepInternal handles the internal logic for completing a step
func completeStepInternal(w http.ResponseWriter, r *http.Request, courseID string, stepID string, path *models.Course, req *models.StepComplete) {
	ctx := r.Context()
	fs := firebase.GetFirestore()

	// Find the step
	stepIndex := -1
	for i := range path.Steps {
		if path.Steps[i].ID == stepID {
			stepIndex = i
			break
		}
	}

	if stepIndex == -1 {
		http.Error(w, "Step not found", http.StatusNotFound)
		return
	}

	// If step is already completed, return success with current state (idempotent)
	if path.Steps[stepIndex].Completed {
		courseCompleted := path.Status == models.CourseStatusCompleted
		nextStepNeeded := !courseCompleted && path.Status == models.CourseStatusActive

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"course":          path,
			"completedStep":   path.Steps[stepIndex],
			"nextStepNeeded":  nextStepNeeded,
			"courseCompleted": courseCompleted,
		}); err != nil {
			http.Error(w, fmt.Sprintf("Error encoding response: %v", err), http.StatusInternalServerError)
		}
		return
	}

	now := time.Now().UnixMilli()

	// Update step
	path.Steps[stepIndex].Completed = true
	path.Steps[stepIndex].CompletedAt = now
	if req.UserAnswer != "" {
		path.Steps[stepIndex].UserAnswer = req.UserAnswer
	}
	if req.Score > 0 {
		path.Steps[stepIndex].Score = req.Score
	}

	// Calculate new progress
	completedCount := 0
	for _, s := range path.Steps {
		if s.Completed {
			completedCount++
		}
	}

	newProgress := 0
	if path.TotalLessons > 0 {
		newProgress = (completedCount * 100) / path.TotalLessons
		if newProgress > 100 {
			newProgress = 100
		}
	}

	// Update memory for this topic
	if path.Memory == nil {
		path.Memory = &models.Memory{Topics: make(map[string]models.TopicMemory)}
	}
	topic := path.Steps[stepIndex].Topic
	topicMem := path.Memory.Topics[topic]
	topicMem.TimesTested++
	topicMem.LastReviewed = time.Now().Format(time.RFC3339)
	// Update confidence based on score
	if req.Score > 0 {
		// Weighted average with existing confidence
		if topicMem.Confidence == 0 {
			topicMem.Confidence = req.Score / 100.0
		} else {
			topicMem.Confidence = (topicMem.Confidence + (req.Score / 100.0)) / 2
		}
	}
	path.Memory.Topics[topic] = topicMem

	// Check if compaction is needed
	stepsSinceCompaction := completedCount
	if path.Memory.Compaction != nil {
		stepsSinceCompaction = completedCount - path.Memory.Compaction.LastStepIndex - 1
	}

	if stepsSinceCompaction >= models.CompactionInterval {
		// Trigger compaction
		if err := compactMemory(path, completedCount-1); err != nil {
			fmt.Printf("Warning: memory compaction failed: %v\n", err)
		}
	}

	// Advance outline position and link step to topic
	outlineModified := advanceOutlinePosition(path, &path.Steps[stepIndex], req.Score)

	// Check if path should be auto-completed
	// Path is completed when progress reaches 100% and all quiz/test steps are passed
	courseCompleted := false
	if newProgress >= 100 {
		courseCompleted = isPathReadyForCompletion(path)
	}

	// Update the path in Firestore
	updates := []firestore.Update{
		{Path: "steps", Value: path.Steps},
		{Path: "lessonsCompleted", Value: completedCount},
		{Path: "progress", Value: newProgress},
		{Path: "memory", Value: path.Memory},
		{Path: "updatedAt", Value: now},
		{Path: "lastAccessedAt", Value: now},
	}

	// Include outline updates if modified
	if outlineModified {
		updates = append(updates,
			firestore.Update{Path: "outline", Value: path.Outline},
			firestore.Update{Path: "outlinePosition", Value: path.OutlinePosition},
		)
	}

	// If path is completed, update status
	if courseCompleted {
		updates = append(updates,
			firestore.Update{Path: "status", Value: models.CourseStatusCompleted},
			firestore.Update{Path: "completedAt", Value: now},
		)
		path.Status = models.CourseStatusCompleted
		path.CompletedAt = now

		if appLogger != nil {
			logger.Info(appLogger, ctx, "learning_path_auto_completed",
				slog.String("path_id", courseID),
				slog.String("goal", path.Goal),
				slog.Int("total_steps", len(path.Steps)),
			)
		}
	}

	if _, err := Collection(fs, "courses").Doc(courseID).Update(ctx, updates); err != nil {
		http.Error(w, "Error updating course", http.StatusInternalServerError)
		return
	}

	// Fetch updated path
	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Error fetching updated path", http.StatusInternalServerError)
		return
	}

	if err := doc.DataTo(path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	// Normalize to ensure valid defaults
	normalizeCourse(path)

	// Trigger pre-generation for the next step in the background
	// But only if the path is still active (not completed)
	nextStepNeeded := !courseCompleted && path.Status == models.CourseStatusActive
	if nextStepNeeded && pregenerateService != nil {
		// Fetch user to get their tier for pregeneration
		userDoc, userErr := Collection(fs, "users").Doc(path.UserID).Get(ctx)
		var user models.User
		pregenerateTier := models.TierFree // Default to free tier
		if userErr == nil {
			if dataErr := userDoc.DataTo(&user); dataErr == nil {
				pregenerateTier = user.GetCurrentTier()
			}
		}

		pregenerateService.TriggerPregeneration(path, pregenerateTier)
		if appLogger != nil {
			logger.Info(appLogger, ctx, "pregeneration_triggered_on_complete",
				slog.String("path_id", courseID),
				slog.Int("completed_step_index", stepIndex),
				slog.String("user_tier", pregenerateTier),
			)
		}
	}

	// Clear cache if path is completed
	if courseCompleted && stepCache != nil {
		stepCache.Delete(courseID, path.UserID)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"course":          path,
		"completedStep":   path.Steps[stepIndex],
		"nextStepNeeded":  nextStepNeeded,
		"courseCompleted": courseCompleted,
	}); err != nil {
		http.Error(w, fmt.Sprintf("Error encoding response: %v", err), http.StatusInternalServerError)
		return
	}
}

// isPathReadyForCompletion checks if all steps are completed and quizzes are passed
func isPathReadyForCompletion(path *models.Course) bool {
	if len(path.Steps) == 0 {
		return false
	}

	for _, step := range path.Steps {
		if !step.Completed {
			return false
		}
		// For quiz steps, check if they have a passing score (>= 70%)
		if step.Type == "quiz" && step.Score < 70 {
			return false
		}
	}

	return true
}

// advanceOutlinePosition links the completed step to the current outline topic,
// marks the topic as completed, and advances the position to the next topic.
// Returns true if the outline was modified and needs to be saved.
func advanceOutlinePosition(path *models.Course, step *models.Step, score float64) bool {
	if path.Outline == nil || path.OutlinePosition == nil {
		return false
	}

	moduleIdx := path.OutlinePosition.ModuleIndex
	topicIdx := path.OutlinePosition.TopicIndex

	// Validate bounds
	if moduleIdx >= len(path.Outline.Modules) {
		return false
	}
	module := &path.Outline.Modules[moduleIdx]
	if topicIdx >= len(module.Topics) {
		return false
	}

	// Link the step to the current topic
	topic := &module.Topics[topicIdx]
	topic.StepID = step.ID
	topic.Status = "completed"
	topic.Performance = &models.TopicPerformance{
		Score:       score,
		CompletedAt: time.Now().UnixMilli(),
	}

	// Mark module as in_progress if not already
	if module.Status == "" || module.Status == "pending" {
		module.Status = "in_progress"
	}

	// Check if all topics in this module are completed
	allTopicsCompleted := true
	for _, t := range module.Topics {
		if t.Status != "completed" && t.Status != "skipped" {
			allTopicsCompleted = false
			break
		}
	}
	if allTopicsCompleted {
		module.Status = "completed"
	}

	// Advance to the next topic
	if topicIdx+1 < len(module.Topics) {
		// Move to next topic in same module
		path.OutlinePosition.TopicIndex = topicIdx + 1
		path.OutlinePosition.TopicID = module.Topics[topicIdx+1].ID
		// Mark next topic as in_progress
		module.Topics[topicIdx+1].Status = "in_progress"
	} else {
		// Move to next module
		if moduleIdx+1 < len(path.Outline.Modules) {
			nextModule := &path.Outline.Modules[moduleIdx+1]
			path.OutlinePosition.ModuleIndex = moduleIdx + 1
			path.OutlinePosition.ModuleID = nextModule.ID
			path.OutlinePosition.TopicIndex = 0
			if len(nextModule.Topics) > 0 {
				path.OutlinePosition.TopicID = nextModule.Topics[0].ID
				nextModule.Topics[0].Status = "in_progress"
			}
			nextModule.Status = "in_progress"
		}
		// If no more modules, position stays at end (course complete)
	}

	return true
}

// viewStep records that a user viewed a completed step (updates lastReviewed)
func viewStep(w http.ResponseWriter, r *http.Request, courseID string, stepID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Find the step
	var step *models.Step
	for i := range path.Steps {
		if path.Steps[i].ID == stepID {
			step = &path.Steps[i]
			break
		}
	}

	if step == nil {
		http.Error(w, "Step not found", http.StatusNotFound)
		return
	}

	// Update memory lastReviewed for this topic
	if path.Memory == nil {
		path.Memory = &models.Memory{Topics: make(map[string]models.TopicMemory)}
	}

	now := time.Now()
	topicMem := path.Memory.Topics[step.Topic]
	topicMem.LastReviewed = now.Format(time.RFC3339)
	path.Memory.Topics[step.Topic] = topicMem

	updates := []firestore.Update{
		{Path: "memory.topics." + step.Topic, Value: topicMem},
		{Path: "lastAccessedAt", Value: now.UnixMilli()},
	}

	if _, err := Collection(fs, "courses").Doc(courseID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error updating memory: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"step":    step,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// inferCategory determines the course category from the goal text
func inferCategory(goal string) string {
	goalLower := strings.ToLower(goal)

	// Programming/coding keywords
	programmingKeywords := []string{"python", "javascript", "java", "go", "golang", "rust", "c++", "c#",
		"typescript", "ruby", "php", "swift", "kotlin", "programming", "coding", "code", "developer",
		"software", "algorithm", "data structure", "web development", "backend", "frontend", "api",
		"react", "vue", "angular", "node", "django", "flask", "spring", "docker", "kubernetes"}
	for _, kw := range programmingKeywords {
		if strings.Contains(goalLower, kw) {
			return "programming"
		}
	}

	// Language learning keywords
	languageKeywords := []string{"spanish", "french", "german", "japanese", "chinese", "mandarin",
		"korean", "italian", "portuguese", "arabic", "russian", "hindi", "language", "vocabulary",
		"grammar", "speaking", "conversation", "fluent", "learn english", "esl"}
	for _, kw := range languageKeywords {
		if strings.Contains(goalLower, kw) {
			return "language"
		}
	}

	// Data science keywords
	dataKeywords := []string{"data science", "machine learning", "deep learning", "ai", "artificial intelligence",
		"statistics", "analytics", "data analysis", "pandas", "numpy", "tensorflow", "pytorch", "ml"}
	for _, kw := range dataKeywords {
		if strings.Contains(goalLower, kw) {
			return "data-science"
		}
	}

	// Business keywords
	businessKeywords := []string{"business", "marketing", "management", "finance", "accounting",
		"entrepreneurship", "startup", "leadership", "sales", "strategy", "mba", "product management"}
	for _, kw := range businessKeywords {
		if strings.Contains(goalLower, kw) {
			return "business"
		}
	}

	// Math keywords
	mathKeywords := []string{"math", "mathematics", "calculus", "algebra", "geometry", "trigonometry",
		"linear algebra", "probability", "equations"}
	for _, kw := range mathKeywords {
		if strings.Contains(goalLower, kw) {
			return "mathematics"
		}
	}

	// Science keywords
	scienceKeywords := []string{"physics", "chemistry", "biology", "science", "astronomy", "geology"}
	for _, kw := range scienceKeywords {
		if strings.Contains(goalLower, kw) {
			return "science"
		}
	}

	// Design keywords
	designKeywords := []string{"design", "ui", "ux", "user interface", "user experience", "graphic",
		"figma", "photoshop", "illustrator", "sketch"}
	for _, kw := range designKeywords {
		if strings.Contains(goalLower, kw) {
			return "design"
		}
	}

	// Default to general education
	return "general"
}

// generateCourseOutline generates a course outline using the LLM
func generateCourseOutline(goal string) (*models.CourseOutline, error) {
	if openaiClient == nil || promptLoader == nil {
		return nil, fmt.Errorf("LLM not initialized")
	}

	// Get tool descriptions from the registry
	toolDescriptions := tools.GetToolDescriptions()

	// Infer course category from the goal
	category := inferCategory(goal)

	vars := prompts.Variables{
		"goal":             goal,
		"toolDescriptions": toolDescriptions,
		"category":         category,
	}

	// Load the course-outline prompt template
	template, err := promptLoader.LoadByName("learning/course-outline")
	if err != nil {
		return nil, fmt.Errorf("failed to load course-outline prompt: %w", err)
	}

	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := openaiClient.CreateChatCompletion(*openaiReq)
	if err != nil {
		return nil, fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned from OpenAI")
	}

	content := completion.Choices[0].Message.Content

	// Parse the JSON response
	var outlineData struct {
		Title            string   `json:"title"`
		Description      string   `json:"description"`
		EstimatedMinutes int      `json:"estimatedMinutes"`
		Prerequisites    []string `json:"prerequisites"`
		LearningOutcomes []string `json:"learningOutcomes"`
		Modules          []struct {
			ID               string   `json:"id"`
			Title            string   `json:"title"`
			Description      string   `json:"description"`
			EstimatedMinutes int      `json:"estimatedMinutes"`
			LearningOutcomes []string `json:"learningOutcomes"`
			Topics           []struct {
				ID               string   `json:"id"`
				Title            string   `json:"title"`
				ToolID           string   `json:"toolId"`
				EstimatedMinutes int      `json:"estimatedMinutes"`
				Description      string   `json:"description"`
				Prerequisites    []string `json:"prerequisites"`
			} `json:"topics"`
		} `json:"modules"`
		Metadata struct {
			Difficulty string   `json:"difficulty"`
			Category   string   `json:"category"`
			Tags       []string `json:"tags"`
		} `json:"metadata"`
	}

	if err := json.Unmarshal([]byte(content), &outlineData); err != nil {
		return nil, fmt.Errorf("failed to parse outline response as JSON: %w (content: %s)", err, content)
	}

	// Convert to CourseOutline model
	outline := &models.CourseOutline{
		Title:            outlineData.Title,
		Description:      outlineData.Description,
		EstimatedMinutes: outlineData.EstimatedMinutes,
		Prerequisites:    outlineData.Prerequisites,
		LearningOutcomes: outlineData.LearningOutcomes,
		Metadata: models.OutlineMetadata{
			Difficulty: outlineData.Metadata.Difficulty,
			Category:   outlineData.Metadata.Category,
			Tags:       outlineData.Metadata.Tags,
		},
		GeneratedAt: time.Now().UnixMilli(),
		Modules:     make([]models.OutlineModule, 0, len(outlineData.Modules)),
	}

	// Convert modules and topics
	for _, m := range outlineData.Modules {
		module := models.OutlineModule{
			ID:               m.ID,
			Title:            m.Title,
			Description:      m.Description,
			EstimatedMinutes: m.EstimatedMinutes,
			LearningOutcomes: m.LearningOutcomes,
			Status:           "pending",
			Topics:           make([]models.OutlineTopic, 0, len(m.Topics)),
		}

		for _, t := range m.Topics {
			topic := models.OutlineTopic{
				ID:               t.ID,
				Title:            t.Title,
				ToolID:           t.ToolID,
				EstimatedMinutes: t.EstimatedMinutes,
				Description:      t.Description,
				Prerequisites:    t.Prerequisites,
				Status:           "pending",
			}
			module.Topics = append(module.Topics, topic)
		}

		outline.Modules = append(outline.Modules, module)
	}

	return outline, nil
}

// countOutlineTopics returns the total number of topics in an outline
func countOutlineTopics(outline *models.CourseOutline) int {
	if outline == nil {
		return 0
	}
	count := 0
	for _, m := range outline.Modules {
		count += len(m.Topics)
	}
	return count
}

// compactMemory uses LLM to summarize learning progress
func compactMemory(path *models.Course, upToStepIndex int) error {
	if openaiClient == nil || promptLoader == nil {
		return fmt.Errorf("LLM not initialized")
	}

	// Gather steps to compact
	stepsToCompact := path.Steps[:upToStepIndex+1]

	// Build step summaries
	stepSummaries := make([]string, 0, len(stepsToCompact))
	for _, s := range stepsToCompact {
		summary := fmt.Sprintf("- %s (%s): %s", s.Type, s.Topic, s.Title)
		if s.Score > 0 {
			summary += fmt.Sprintf(" [Score: %.0f%%]", s.Score)
		}
		stepSummaries = append(stepSummaries, summary)
	}

	// Previous compaction summary (if any)
	previousSummary := ""
	if path.Memory != nil && path.Memory.Compaction != nil {
		previousSummary = path.Memory.Compaction.Summary
	}

	vars := prompts.Variables{
		"goal":            path.Goal,
		"previousSummary": previousSummary,
		"steps":           strings.Join(stepSummaries, "\n"),
		"stepCount":       strconv.Itoa(len(stepsToCompact)),
	}

	// Load the compact-memory prompt template
	template, err := promptLoader.LoadByName("learning/compact-memory")
	if err != nil {
		return fmt.Errorf("failed to load compact-memory prompt: %w", err)
	}

	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := openaiClient.CreateChatCompletion(*openaiReq)
	if err != nil {
		return fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return fmt.Errorf("no completion returned from OpenAI")
	}

	content := completion.Choices[0].Message.Content

	// Parse the compaction result
	var compactionResult struct {
		Summary         string   `json:"summary"`
		Strengths       []string `json:"strengths"`
		Weaknesses      []string `json:"weaknesses"`
		Recommendations []string `json:"recommendations"`
	}
	if err := json.Unmarshal([]byte(content), &compactionResult); err != nil {
		return fmt.Errorf("failed to parse compaction response: %w (content: %s)", err, content)
	}

	// Update memory with compaction
	if path.Memory == nil {
		path.Memory = &models.Memory{Topics: make(map[string]models.TopicMemory)}
	}

	path.Memory.Compaction = &models.Compaction{
		Summary:         compactionResult.Summary,
		Strengths:       compactionResult.Strengths,
		Weaknesses:      compactionResult.Weaknesses,
		Recommendations: compactionResult.Recommendations,
		LastStepIndex:   upToStepIndex,
		CompactedAt:     time.Now().UnixMilli(),
	}

	return nil
}

// UpdatePathMemoryRequest represents the request to update path memory
type UpdatePathMemoryRequest struct {
	Topic       string  `json:"topic"`
	Confidence  float64 `json:"confidence"`
	TimesTested int     `json:"timesTested"`
}

// updatePathMemory updates memory for a specific topic in a course
func updatePathMemory(w http.ResponseWriter, r *http.Request, courseID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdatePathMemoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Topic == "" {
		http.Error(w, "Topic is required", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Verify ownership
	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	var path models.Course
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, "Error reading course", http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	now := time.Now()
	topicMemory := models.TopicMemory{
		Confidence:   req.Confidence,
		LastReviewed: now.Format(time.RFC3339),
		TimesTested:  req.TimesTested,
	}

	updates := []firestore.Update{
		{Path: "memory.topics." + req.Topic, Value: topicMemory},
		{Path: "updatedAt", Value: now.UnixMilli()},
		{Path: "lastAccessedAt", Value: now.UnixMilli()},
	}

	if _, err := Collection(fs, "courses").Doc(courseID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error updating memory: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"topic":   req.Topic,
		"memory":  topicMemory,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
