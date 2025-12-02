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
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
	"google.golang.org/api/iterator"
)

// Global logger instance - initialized in llm.go
var appLogger *slog.Logger

// SetLogger sets the global logger instance (called from main)
func SetAppLogger(log *slog.Logger) {
	appLogger = log
}

// LearningPathsHandler handles all /api/learning-paths routes
func LearningPathsHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the path to determine the action
	// /api/learning-paths -> list/create
	// /api/learning-paths/{id} -> get/update/delete
	// /api/learning-paths/{id}/next -> get/generate next step
	// /api/learning-paths/{id}/steps/{stepId}/complete -> complete step
	// /api/learning-paths/{id}/steps/{stepId}/view -> view step (updates lastReviewed)
	// /api/learning-paths/{id}/memory -> update memory

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	// Add user ID to context for logging
	ctx = logger.WithUserID(ctx, userID)

	path := strings.TrimPrefix(r.URL.Path, "/api/learning-paths")
	path = strings.TrimPrefix(path, "/")

	// Log request if logger is available
	if appLogger != nil {
		logger.Info(appLogger, ctx, "learning_paths_request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
		)
	}

	// Root path: /api/learning-paths
	if path == "" {
		switch r.Method {
		case http.MethodGet:
			listLearningPaths(w, r)
		case http.MethodPost:
			createLearningPath(w, r)
		default:
			if appLogger != nil {
				logger.Warn(appLogger, ctx, "learning_paths_method_not_allowed",
					slog.String("method", r.Method),
				)
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Parse path segments
	segments := strings.Split(path, "/")
	pathID := segments[0]

	// /api/learning-paths/{id}
	if len(segments) == 1 {
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
		return
	}

	// /api/learning-paths/{id}/{action}
	if len(segments) == 2 {
		action := segments[1]
		switch action {
		case "next", "session": // "session" kept for backward compatibility
			if r.Method == http.MethodPost {
				getPathNextStep(w, r, pathID)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		case "complete": // Legacy endpoint - complete the current step
			if r.Method == http.MethodPost {
				completeCurrentStep(w, r, pathID)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		case "memory":
			if r.Method == http.MethodPost {
				updatePathMemory(w, r, pathID)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		default:
			http.Error(w, "Not found", http.StatusNotFound)
		}
		return
	}

	// /api/learning-paths/{id}/steps/{stepId}/{action}
	if len(segments) == 4 && segments[1] == "steps" {
		stepID := segments[2]
		action := segments[3]
		switch action {
		case "complete":
			if r.Method == http.MethodPost {
				completeStep(w, r, pathID, stepID)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		case "view":
			if r.Method == http.MethodPost {
				viewStep(w, r, pathID, stepID)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		default:
			http.Error(w, "Not found", http.StatusNotFound)
		}
		return
	}

	http.Error(w, "Not found", http.StatusNotFound)
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

// listLearningPaths returns all learning paths for the authenticated user
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

	// Query learning paths for this user
	iter := fs.Collection("learning_paths").Where("userId", "==", userID).OrderBy("lastAccessedAt", firestore.Desc).Documents(ctx)
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

	now := time.Now().UnixMilli()
	pathID := uuid.New().String()

	path := models.LearningPath{
		ID:               pathID,
		UserID:           userID,
		Goal:             req.Goal,
		Level:            req.Level,
		Emoji:            req.Emoji,
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

// deleteLearningPath deletes a learning path
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

	if _, err := fs.Collection("learning_paths").Doc(pathID).Delete(ctx); err != nil {
		http.Error(w, fmt.Sprintf("Error deleting learning path: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
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

	// No current step - generate one using LLM
	nextStep, err := generateNextStepForPath(&path)
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, ctx, "failed_to_generate_next_step",
				slog.String("path_id", pathID),
				slog.String("error", err.Error()),
				slog.String("openai_client_nil", fmt.Sprintf("%v", openaiClient == nil)),
				slog.String("prompt_loader_nil", fmt.Sprintf("%v", promptLoader == nil)),
			)
		}
		http.Error(w, fmt.Sprintf("Failed to generate next step: %v", err), http.StatusInternalServerError)
		return
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

	if path.Steps[stepIndex].Completed {
		http.Error(w, "Step already completed", http.StatusBadRequest)
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

	// Update the path in Firestore
	updates := []firestore.Update{
		{Path: "steps", Value: path.Steps},
		{Path: "lessonsCompleted", Value: completedCount},
		{Path: "progress", Value: newProgress},
		{Path: "memory", Value: path.Memory},
		{Path: "updatedAt", Value: now},
		{Path: "lastAccessedAt", Value: now},
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

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"path":           path,
		"completedStep":  path.Steps[stepIndex],
		"nextStepNeeded": true,
	}); err != nil {
		http.Error(w, fmt.Sprintf("Error encoding response: %v", err), http.StatusInternalServerError)
		return
	}
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
