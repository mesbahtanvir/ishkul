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
	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
	"google.golang.org/api/iterator"
)

// Deprecated: MaxLearningPathsPerUser is deprecated.
// Use models.GetMaxActivePaths(tier) instead for tier-aware path limits.
const MaxLearningPathsPerUser = 5

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

// LearningPathsHandler handles all /api/learning-paths routes
// Routes:
//   - GET    /api/learning-paths              -> list paths
//   - POST   /api/learning-paths              -> create path
//   - GET    /api/learning-paths/{id}         -> get path
//   - PATCH  /api/learning-paths/{id}         -> update path
//   - DELETE /api/learning-paths/{id}         -> delete path
//   - POST   /api/learning-paths/{id}/next    -> get/generate next step (triggers pregeneration of next)
//   - POST   /api/learning-paths/{id}/archive -> archive path
//   - POST   /api/learning-paths/{id}/memory  -> update memory
//   - POST   /api/learning-paths/{id}/steps/{stepId}/complete -> complete step
//   - POST   /api/learning-paths/{id}/steps/{stepId}/view     -> view step
func LearningPathsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	ctx = logger.WithUserID(ctx, userID)

	logRequest(ctx, r)

	segments := parsePath(r.URL.Path, "/api/learning-paths")

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
		logger.Info(appLogger, ctx, "learning_paths_request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
		)
	}
}

// handleRootPath handles /api/learning-paths
func handleRootPath(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listLearningPaths(w, r)
	case http.MethodPost:
		createLearningPath(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleSinglePath handles /api/learning-paths/{id}
func handleSinglePath(w http.ResponseWriter, r *http.Request, pathID string) {
	switch r.Method {
	case http.MethodGet:
		getLearningPath(w, r, pathID)
	case http.MethodPatch, http.MethodPut:
		updateLearningPath(w, r, pathID)
	case http.MethodDelete:
		deleteLearningPath(w, r, pathID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handlePathAction handles /api/learning-paths/{id}/{action}
func handlePathAction(w http.ResponseWriter, r *http.Request, pathID, action string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Route to the appropriate handler based on action
	switch action {
	case "next", "session": // "session" kept for backward compatibility
		getPathNextStep(w, r, pathID)
	case "complete": // Legacy endpoint - complete the current step
		completeCurrentStep(w, r, pathID)
	case "archive":
		archiveLearningPath(w, r, pathID)
	case "unarchive":
		unarchiveLearningPath(w, r, pathID)
	case "memory":
		updatePathMemory(w, r, pathID)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// handleStepAction handles /api/learning-paths/{id}/steps/{stepId}/{action}
func handleStepAction(w http.ResponseWriter, r *http.Request, segments []string) {
	if segments[1] != "steps" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pathID, stepID, action := segments[0], segments[2], segments[3]

	switch action {
	case "complete":
		completeStep(w, r, pathID, stepID)
	case "view":
		viewStep(w, r, pathID, stepID)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// normalizeLearningPath ensures the learning path has valid defaults for nil slices/maps
// This handles legacy data that may have nil steps or memory
func normalizeLearningPath(path *models.LearningPath) {
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

// listLearningPaths returns learning paths for the authenticated user
// Query params:
//   - status: filter by status (active, completed, archived). Default shows active + completed.
//     Deleted paths are never shown.
func listLearningPaths(w http.ResponseWriter, r *http.Request) {
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
	baseQuery := fs.Collection("learning_paths").Where("userId", "==", userID)

	switch statusFilter {
	case models.PathStatusActive:
		query = baseQuery.Where("status", "==", models.PathStatusActive).OrderBy("lastAccessedAt", firestore.Desc)
	case models.PathStatusCompleted:
		query = baseQuery.Where("status", "==", models.PathStatusCompleted).OrderBy("completedAt", firestore.Desc)
	case models.PathStatusArchived:
		query = baseQuery.Where("status", "==", models.PathStatusArchived).OrderBy("archivedAt", firestore.Desc)
	default:
		// Default: show all non-deleted paths, ordered by last accessed
		query = baseQuery.OrderBy("lastAccessedAt", firestore.Desc)
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	paths := []models.LearningPath{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			http.Error(w, fmt.Sprintf("Error fetching learning paths: %v", err), http.StatusInternalServerError)
			return
		}

		var path models.LearningPath
		if err := doc.DataTo(&path); err != nil {
			continue // Skip malformed documents
		}

		// Skip deleted paths (they should never be shown)
		if path.Status == models.PathStatusDeleted {
			continue
		}

		// Handle legacy paths without status (treat as active)
		if path.Status == "" {
			path.Status = models.PathStatusActive
		}

		normalizeLearningPath(&path)
		paths = append(paths, path)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"paths": paths,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// getLearningPath returns a specific learning path
func getLearningPath(w http.ResponseWriter, r *http.Request, pathID string) {
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

	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Verify ownership
	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Update last accessed time (intentionally ignoring error for non-critical update)
	now := time.Now().UnixMilli()
	_, _ = fs.Collection("learning_paths").Doc(pathID).Update(ctx, []firestore.Update{
		{Path: "lastAccessedAt", Value: now},
	})
	path.LastAccessedAt = now

	// Normalize to ensure valid defaults
	normalizeLearningPath(&path)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"path": path,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// createLearningPath creates a new learning path
func createLearningPath(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.LearningPathCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.Goal == "" || req.Level == "" {
		http.Error(w, "Goal and level are required", http.StatusBadRequest)
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

	// Check if user has reached the maximum number of learning paths for their tier
	existingPaths, err := CountUserActivePaths(ctx, fs, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error checking existing paths: %v", err), http.StatusInternalServerError)
		return
	}

	maxPaths := models.GetMaxActivePaths(userTier)
	if existingPaths >= maxPaths {
		// Include upgrade hint for free users
		upgradeHint := ""
		if userTier == models.TierFree {
			upgradeHint = " Upgrade to Pro for up to 5 active paths."
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"error":       fmt.Sprintf("Maximum of %d active learning paths allowed.%s", maxPaths, upgradeHint),
			"code":        "PATH_LIMIT_REACHED",
			"canUpgrade":  userTier == models.TierFree,
			"currentTier": userTier,
			"limits":      limits,
		})
		return
	}

	now := time.Now().UnixMilli()
	pathID := uuid.New().String()

	path := models.LearningPath{
		ID:               pathID,
		UserID:           userID,
		Goal:             req.Goal,
		Level:            req.Level,
		Emoji:            req.Emoji,
		Status:           models.PathStatusActive,
		Progress:         0,
		LessonsCompleted: 0,
		TotalLessons:     10, // Default estimate
		Steps:            []models.Step{},
		Memory: &models.Memory{
			Topics: make(map[string]models.TopicMemory),
		},
		CreatedAt:      now,
		UpdatedAt:      now,
		LastAccessedAt: now,
	}

	if _, err := fs.Collection("learning_paths").Doc(pathID).Set(ctx, path); err != nil {
		http.Error(w, fmt.Sprintf("Error creating learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Generate course outline in the background
	go func(pathID, goal, level, userID string) {
		bgCtx := context.Background()

		if appLogger != nil {
			logger.Info(appLogger, bgCtx, "outline_generation_started",
				slog.String("path_id", pathID),
				slog.String("goal", goal),
			)
		}

		outline, err := generateCourseOutline(goal, level)
		if err != nil {
			if appLogger != nil {
				logger.Error(appLogger, bgCtx, "outline_generation_failed",
					slog.String("path_id", pathID),
					slog.String("error", err.Error()),
				)
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
			outlinePosition.ModuleID = outline.Modules[0].ID
			if len(outline.Modules[0].Topics) > 0 {
				outlinePosition.TopicID = outline.Modules[0].Topics[0].ID
			}
		}

		// Update the path with the generated outline
		bgFs := firebase.GetFirestore()
		if bgFs != nil {
			_, updateErr := bgFs.Collection("learning_paths").Doc(pathID).Update(bgCtx, []firestore.Update{
				{Path: "outline", Value: outline},
				{Path: "outlinePosition", Value: outlinePosition},
				{Path: "totalLessons", Value: totalTopics},
				{Path: "updatedAt", Value: time.Now().UnixMilli()},
			})
			if updateErr != nil {
				if appLogger != nil {
					logger.Error(appLogger, bgCtx, "outline_save_failed",
						slog.String("path_id", pathID),
						slog.String("error", updateErr.Error()),
					)
				}
			} else if appLogger != nil {
				logger.Info(appLogger, bgCtx, "outline_generation_completed",
					slog.String("path_id", pathID),
					slog.Int("modules", len(outline.Modules)),
					slog.Int("total_topics", totalTopics),
				)
			}
		}
	}(pathID, req.Goal, req.Level, userID)

	// Trigger pre-generation of the first step in the background
	if pregenerateService != nil {
		// Fetch user to get their tier for pregeneration
		userDoc, userErr := fs.Collection("users").Doc(userID).Get(ctx)
		var user models.User
		pregenerateTier := models.TierFree // Default to free tier
		if userErr == nil {
			if dataErr := userDoc.DataTo(&user); dataErr == nil {
				pregenerateTier = user.GetCurrentTier()
			}
		}

		pregenerateService.TriggerPregeneration(&path, pregenerateTier)
		if appLogger != nil {
			logger.Info(appLogger, ctx, "pregeneration_triggered_on_create",
				slog.String("path_id", pathID),
				slog.String("goal", path.Goal),
				slog.String("user_tier", userTier),
			)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"path": path,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// updateLearningPath updates a learning path
func updateLearningPath(w http.ResponseWriter, r *http.Request, pathID string) {
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
	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var existing models.LearningPath
	if err := doc.DataTo(&existing); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	if existing.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req models.LearningPathUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
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
	if req.Level != nil {
		updates = append(updates, firestore.Update{Path: "level", Value: *req.Level})
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

	if _, err := fs.Collection("learning_paths").Doc(pathID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error updating learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Fetch updated document
	doc, err = fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error fetching updated path: %v", err), http.StatusInternalServerError)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Normalize to ensure valid defaults
	normalizeLearningPath(&path)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"path": path,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// deleteLearningPath soft deletes a learning path (sets status to deleted)
func deleteLearningPath(w http.ResponseWriter, r *http.Request, pathID string) {
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
	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var existing models.LearningPath
	if err := doc.DataTo(&existing); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	if existing.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Cannot delete already deleted paths
	if existing.Status == models.PathStatusDeleted {
		http.Error(w, "Learning path is already deleted", http.StatusBadRequest)
		return
	}

	// Soft delete: update status to deleted
	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.PathStatusDeleted},
		{Path: "deletedAt", Value: now},
		{Path: "updatedAt", Value: now},
	}

	if _, err := fs.Collection("learning_paths").Doc(pathID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error deleting learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Clear pre-generated cache for this path
	if stepCache != nil {
		stepCache.Delete(pathID, userID)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Learning path deleted",
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// archiveLearningPath archives an active learning path
func archiveLearningPath(w http.ResponseWriter, r *http.Request, pathID string) {
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

	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Only active paths can be archived
	if path.Status != models.PathStatusActive && path.Status != "" {
		http.Error(w, fmt.Sprintf("Cannot archive path with status '%s'. Only active paths can be archived.", path.Status), http.StatusBadRequest)
		return
	}

	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.PathStatusArchived},
		{Path: "archivedAt", Value: now},
		{Path: "updatedAt", Value: now},
	}

	if _, err := fs.Collection("learning_paths").Doc(pathID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error archiving learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Clear pre-generated cache for this path
	if stepCache != nil {
		stepCache.Delete(pathID, userID)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Learning path archived",
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// unarchiveLearningPath restores an archived path to active status
func unarchiveLearningPath(w http.ResponseWriter, r *http.Request, pathID string) {
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

	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Only archived paths can be unarchived
	if path.Status != models.PathStatusArchived {
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

	maxPaths := models.GetMaxActivePaths(userTier)
	if activeCount >= maxPaths {
		upgradeHint := ""
		if userTier == models.TierFree {
			upgradeHint = " Upgrade to Pro for up to 5 active paths."
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"error":       fmt.Sprintf("Cannot unarchive: you already have %d active learning paths (max %d).%s", activeCount, maxPaths, upgradeHint),
			"code":        "PATH_LIMIT_REACHED",
			"canUpgrade":  userTier == models.TierFree,
			"currentTier": userTier,
			"limits":      limits,
		})
		return
	}

	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.PathStatusActive},
		{Path: "archivedAt", Value: firestore.Delete}, // Remove archived timestamp
		{Path: "updatedAt", Value: now},
		{Path: "lastAccessedAt", Value: now},
	}

	if _, err := fs.Collection("learning_paths").Doc(pathID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error unarchiving learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Trigger pre-generation for the unarchived path
	path.Status = models.PathStatusActive
	if pregenerateService != nil {
		// Fetch user to get their tier for pregeneration
		userDoc, userErr := fs.Collection("users").Doc(userID).Get(ctx)
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
		"message": "Learning path restored to active",
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
func getPathNextStep(w http.ResponseWriter, r *http.Request, pathID string) {
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

	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	if path.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Handle legacy paths without status (treat as active)
	if path.Status == "" {
		path.Status = models.PathStatusActive
	}

	// Block step generation for non-active paths
	switch path.Status {
	case models.PathStatusCompleted:
		sendErrorResponse(w, http.StatusBadRequest, ErrCodePathCompleted,
			"This learning path is completed. You can only review existing steps.")
		return
	case models.PathStatusArchived:
		sendErrorResponse(w, http.StatusBadRequest, ErrCodePathArchived,
			"This learning path is archived. Unarchive it to continue learning.")
		return
	case models.PathStatusDeleted:
		sendErrorResponse(w, http.StatusNotFound, ErrCodePathDeleted,
			"This learning path has been deleted.")
		return
	}

	// Get user tier for limit checks
	userTier, limits, err := GetUserTierAndLimits(ctx, userID)
	if err != nil {
		userTier = models.TierFree
	}

	// Normalize to ensure valid defaults
	normalizeLearningPath(&path)

	// Update last accessed (intentionally ignoring error for non-critical update)
	now := time.Now().UnixMilli()
	_, _ = fs.Collection("learning_paths").Doc(pathID).Update(ctx, []firestore.Update{
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
		nextStep = stepCache.Get(pathID, userID)
		if nextStep != nil {
			// Update step index to match current path state
			nextStep.Index = len(path.Steps)
			// Remove from cache since we're using it
			stepCache.Delete(pathID, userID)
			if appLogger != nil {
				logger.Info(appLogger, ctx, "step_cache_hit",
					slog.String("path_id", pathID),
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
					slog.String("path_id", pathID),
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
				slog.String("path_id", pathID),
				slog.String("step_type", nextStep.Type),
			)
		}
	}

	// Append the new step to the Steps array
	path.Steps = append(path.Steps, *nextStep)

	// Save the updated path to Firestore
	_, err = fs.Collection("learning_paths").Doc(pathID).Update(ctx, []firestore.Update{
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
		userDoc, userErr := fs.Collection("users").Doc(path.UserID).Get(ctx)
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
func generateNextStepForPath(path *models.LearningPath) (*models.Step, error) {
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
		"level":         path.Level,
		"historyCount":  strconv.Itoa(len(path.Steps)),
		"memory":        memorySummary,
		"recentHistory": recentHistory,
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
func getRecentSteps(path *models.LearningPath) []models.Step {
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
func buildMemoryContext(path *models.LearningPath) string {
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
func completeCurrentStep(w http.ResponseWriter, r *http.Request, pathID string) {
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

	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
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
	completeStepInternal(w, r, pathID, currentStep.ID, &path, &req)
}

// completeStep marks a specific step as complete
func completeStep(w http.ResponseWriter, r *http.Request, pathID string, stepID string) {
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

	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
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

	completeStepInternal(w, r, pathID, stepID, &path, &req)
}

// completeStepInternal handles the internal logic for completing a step
func completeStepInternal(w http.ResponseWriter, r *http.Request, pathID string, stepID string, path *models.LearningPath, req *models.StepComplete) {
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
		pathCompleted := path.Status == models.PathStatusCompleted
		nextStepNeeded := !pathCompleted && path.Status == models.PathStatusActive

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"path":           path,
			"completedStep":  path.Steps[stepIndex],
			"nextStepNeeded": nextStepNeeded,
			"pathCompleted":  pathCompleted,
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

	// Check if path should be auto-completed
	// Path is completed when progress reaches 100% and all quiz/test steps are passed
	pathCompleted := false
	if newProgress >= 100 {
		pathCompleted = isPathReadyForCompletion(path)
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

	// If path is completed, update status
	if pathCompleted {
		updates = append(updates,
			firestore.Update{Path: "status", Value: models.PathStatusCompleted},
			firestore.Update{Path: "completedAt", Value: now},
		)
		path.Status = models.PathStatusCompleted
		path.CompletedAt = now

		if appLogger != nil {
			logger.Info(appLogger, ctx, "learning_path_auto_completed",
				slog.String("path_id", pathID),
				slog.String("goal", path.Goal),
				slog.Int("total_steps", len(path.Steps)),
			)
		}
	}

	if _, err := fs.Collection("learning_paths").Doc(pathID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error updating learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Fetch updated path
	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error fetching updated path: %v", err), http.StatusInternalServerError)
		return
	}

	if err := doc.DataTo(path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Normalize to ensure valid defaults
	normalizeLearningPath(path)

	// Trigger pre-generation for the next step in the background
	// But only if the path is still active (not completed)
	nextStepNeeded := !pathCompleted && path.Status == models.PathStatusActive
	if nextStepNeeded && pregenerateService != nil {
		// Fetch user to get their tier for pregeneration
		userDoc, userErr := fs.Collection("users").Doc(path.UserID).Get(ctx)
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
				slog.String("path_id", pathID),
				slog.Int("completed_step_index", stepIndex),
				slog.String("user_tier", pregenerateTier),
			)
		}
	}

	// Clear cache if path is completed
	if pathCompleted && stepCache != nil {
		stepCache.Delete(pathID, path.UserID)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"path":           path,
		"completedStep":  path.Steps[stepIndex],
		"nextStepNeeded": nextStepNeeded,
		"pathCompleted":  pathCompleted,
	}); err != nil {
		http.Error(w, fmt.Sprintf("Error encoding response: %v", err), http.StatusInternalServerError)
		return
	}
}

// isPathReadyForCompletion checks if all steps are completed and quizzes are passed
func isPathReadyForCompletion(path *models.LearningPath) bool {
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

// viewStep records that a user viewed a completed step (updates lastReviewed)
func viewStep(w http.ResponseWriter, r *http.Request, pathID string, stepID string) {
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

	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
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

	if _, err := fs.Collection("learning_paths").Doc(pathID).Update(ctx, updates); err != nil {
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

// generateCourseOutline generates a course outline using the LLM
func generateCourseOutline(goal, level string) (*models.CourseOutline, error) {
	if openaiClient == nil || promptLoader == nil {
		return nil, fmt.Errorf("LLM not initialized")
	}

	vars := prompts.Variables{
		"goal":  goal,
		"level": level,
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
func compactMemory(path *models.LearningPath, upToStepIndex int) error {
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
		"level":           path.Level,
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

// updatePathMemory updates memory for a specific topic in a learning path
func updatePathMemory(w http.ResponseWriter, r *http.Request, pathID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdatePathMemoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
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
	doc, err := fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Learning path not found: %v", err), http.StatusNotFound)
		return
	}

	var path models.LearningPath
	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
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

	if _, err := fs.Collection("learning_paths").Doc(pathID).Update(ctx, updates); err != nil {
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
