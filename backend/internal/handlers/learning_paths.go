package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
	"google.golang.org/api/iterator"
)

// LearningPathsHandler handles all /api/learning-paths routes
func LearningPathsHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the path to determine the action
	// /api/learning-paths -> list/create
	// /api/learning-paths/{id} -> get/update/delete
	// /api/learning-paths/{id}/session -> get next step
	// /api/learning-paths/{id}/complete -> complete step
	// /api/learning-paths/{id}/memory -> update memory

	path := strings.TrimPrefix(r.URL.Path, "/api/learning-paths")
	path = strings.TrimPrefix(path, "/")

	// Root path: /api/learning-paths
	if path == "" {
		switch r.Method {
		case http.MethodGet:
			listLearningPaths(w, r)
		case http.MethodPost:
			createLearningPath(w, r)
		default:
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
		case "session":
			if r.Method == http.MethodPost {
				getPathNextStep(w, r, pathID)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		case "complete":
			if r.Method == http.MethodPost {
				completePathStep(w, r, pathID)
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

	http.Error(w, "Not found", http.StatusNotFound)
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
		Memory: &models.Memory{
			Topics: make(map[string]models.TopicMemory),
		},
		History:        []models.HistoryEntry{},
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
	if req.CurrentStep != nil {
		updates = append(updates, firestore.Update{Path: "currentStep", Value: req.CurrentStep})
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

// getPathNextStep generates or returns the next step for a learning path
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

	// Update last accessed (intentionally ignoring error for non-critical update)
	now := time.Now().UnixMilli()
	_, _ = fs.Collection("learning_paths").Doc(pathID).Update(ctx, []firestore.Update{
		{Path: "lastAccessedAt", Value: now},
	})

	// Return current step if exists
	if path.CurrentStep != nil {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"step": path.CurrentStep,
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
			return
		}
		return
	}

	// No current step - generate one using LLM
	nextStep, err := generateNextStepForPath(&path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate next step: %v", err), http.StatusInternalServerError)
		return
	}

	// Save the generated step to Firestore
	_, err = fs.Collection("learning_paths").Doc(pathID).Update(ctx, []firestore.Update{
		{Path: "currentStep", Value: nextStep},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	if err != nil {
		// Log but don't fail - we can still return the step
		fmt.Printf("Warning: failed to cache generated step: %v\n", err)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"step": nextStep,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// generateNextStepForPath generates the next learning step using the LLM
func generateNextStepForPath(path *models.LearningPath) (*models.NextStep, error) {
	// Check if LLM is initialized
	if openaiClient == nil || promptLoader == nil {
		return nil, fmt.Errorf("LLM not initialized")
	}

	// Extract history topics
	historyTopics := make([]string, 0, len(path.History))
	for _, h := range path.History {
		historyTopics = append(historyTopics, h.Topic)
	}

	// Get recent history (last 3 topics)
	recentHistory := ""
	if len(historyTopics) > 0 {
		start := len(historyTopics) - 3
		if start < 0 {
			start = 0
		}
		recentHistory = strings.Join(historyTopics[start:], ", ")
	}

	// Prepare memory summary
	memorySummary := ""
	if path.Memory != nil && len(path.Memory.Topics) > 0 {
		memoryBytes, err := json.Marshal(path.Memory)
		if err == nil {
			memorySummary = string(memoryBytes)
		}
	}

	// Prepare variables for the prompt
	vars := prompts.Variables{
		"goal":          path.Goal,
		"level":         path.Level,
		"historyCount":  strconv.Itoa(len(historyTopics)),
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

	// Parse the JSON response into NextStep
	var nextStep models.NextStep
	if err := json.Unmarshal([]byte(content), &nextStep); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response as JSON: %w (content: %s)", err, content)
	}

	return &nextStep, nil
}

// CompleteStepRequest represents the request to complete a step
type CompleteStepRequest struct {
	Type  string  `json:"type"`
	Topic string  `json:"topic"`
	Score float64 `json:"score,omitempty"`
}

// completePathStep marks the current step as complete and updates progress
func completePathStep(w http.ResponseWriter, r *http.Request, pathID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CompleteStepRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
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

	now := time.Now().UnixMilli()

	// Add history entry
	entry := models.HistoryEntry{
		Type:      req.Type,
		Topic:     req.Topic,
		Score:     req.Score,
		Timestamp: now,
	}

	// Calculate new progress
	newLessonsCompleted := path.LessonsCompleted + 1
	newProgress := 0
	if path.TotalLessons > 0 {
		newProgress = (newLessonsCompleted * 100) / path.TotalLessons
		if newProgress > 100 {
			newProgress = 100
		}
	}

	// Update the path
	updates := []firestore.Update{
		{Path: "history", Value: firestore.ArrayUnion(entry)},
		{Path: "lessonsCompleted", Value: newLessonsCompleted},
		{Path: "progress", Value: newProgress},
		{Path: "currentStep", Value: nil}, // Clear current step
		{Path: "updatedAt", Value: now},
		{Path: "lastAccessedAt", Value: now},
	}

	if _, err := fs.Collection("learning_paths").Doc(pathID).Update(ctx, updates); err != nil {
		http.Error(w, fmt.Sprintf("Error updating learning path: %v", err), http.StatusInternalServerError)
		return
	}

	// Fetch updated path
	doc, err = fs.Collection("learning_paths").Doc(pathID).Get(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error fetching updated path: %v", err), http.StatusInternalServerError)
		return
	}

	if err := doc.DataTo(&path); err != nil {
		http.Error(w, fmt.Sprintf("Error reading learning path: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"path":     path,
		"nextStep": nil, // Frontend should request next step separately
	}); err != nil {
		http.Error(w, fmt.Sprintf("Error encoding response: %v", err), http.StatusInternalServerError)
		return
	}
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
