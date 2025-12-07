package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

// GetContext returns the user's learning context
func GetContext(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

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

	doc, err := Collection(fs, "user_contexts").Doc(userID).Get(ctx)
	if err != nil {
		// Return empty context if not found
		newContext := models.NewUserContext(userID)
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"context": newContext,
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
		}
		return
	}

	var userContext models.UserContext
	if err := doc.DataTo(&userContext); err != nil {
		http.Error(w, "Error reading context data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"context": userContext,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

// UpdateContextRequest represents the request to update context with new input
type UpdateContextRequest struct {
	PreviousContext models.ParsedContext `json:"previousContext"`
	NewInput        string               `json:"newInput"`
}

// UpdateContext parses new user input and merges it with existing context
func UpdateContext(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdateContextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.NewInput == "" {
		http.Error(w, "newInput is required", http.StatusBadRequest)
		return
	}

	// Check if LLM is available
	if llmRouter == nil || promptLoader == nil {
		http.Error(w, "LLM service not available", http.StatusServiceUnavailable)
		return
	}

	// Call LLM to parse and merge context
	response, err := parseContextWithLLM(ctx, req.PreviousContext, req.NewInput)
	if err != nil {
		if appLogger != nil {
			logger.ErrorWithErr(appLogger, ctx, "context_parse_failed", err)
		}
		http.Error(w, "Failed to parse context: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

// ApplyContextRequest represents the request to save confirmed context
type ApplyContextRequest struct {
	Context models.UserContext `json:"context"`
}

// ApplyContext saves the confirmed context update
func ApplyContext(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ApplyContextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Ensure userID is set
	req.Context.UserID = userID
	req.Context.UpdatedAt = time.Now()
	if req.Context.CreatedAt.IsZero() {
		req.Context.CreatedAt = time.Now()
	}

	docRef := Collection(fs, "user_contexts").Doc(userID)
	if _, err := docRef.Set(ctx, req.Context); err != nil {
		http.Error(w, "Error saving context", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"context": req.Context,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

// GetDerivedContext returns the auto-calculated context from user activity
func GetDerivedContext(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

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

	// Calculate derived context from learning paths
	derived, err := calculateDerivedContext(ctx, fs, userID)
	if err != nil {
		http.Error(w, "Error calculating derived context", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"derived": derived,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

// GetContextSummary returns the AI-ready context summary
func GetContextSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

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

	doc, err := Collection(fs, "user_contexts").Doc(userID).Get(ctx)
	if err != nil {
		// Return empty summary if context not found
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"summary": "",
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
		}
		return
	}

	var userContext models.UserContext
	if err := doc.DataTo(&userContext); err != nil {
		http.Error(w, "Error reading context data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"summary": userContext.Summary,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

// parseContextWithLLM calls the LLM to parse and merge context
func parseContextWithLLM(ctx context.Context, previousContext models.ParsedContext, newInput string) (*models.ContextUpdateResponse, error) {
	// Load the update-context prompt
	prompt, err := promptLoader.Load("system/update-context")
	if err != nil {
		return nil, err
	}

	// Marshal previous context to JSON
	previousContextJSON, err := json.Marshal(previousContext)
	if err != nil {
		return nil, err
	}

	// Render the prompt to a full request using prompts.Variables (map[string]string)
	req, err := promptRenderer.RenderToRequest(prompt, map[string]string{
		"previousContext": string(previousContextJSON),
		"newInput":        newInput,
	})
	if err != nil {
		return nil, err
	}

	// Call LLM using router - handles provider selection automatically
	response, err := llmRouter.Complete(*req)
	if err != nil {
		return nil, err
	}

	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no completion choices returned")
	}

	// Parse the LLM response
	var llmResponse struct {
		UpdatedContext models.ParsedContext   `json:"updatedContext"`
		Changes        []models.ContextChange `json:"changes"`
		Confidence     float64                `json:"confidence"`
		Summary        string                 `json:"summary"`
	}

	if err := json.Unmarshal([]byte(response.Choices[0].Message.Content), &llmResponse); err != nil {
		if appLogger != nil {
			logger.Warn(appLogger, ctx, "context_parse_json_failed",
				slog.String("error", err.Error()),
				slog.String("response", response.Choices[0].Message.Content),
			)
		}
		return nil, err
	}

	return &models.ContextUpdateResponse{
		PreviousContext: previousContext,
		UpdatedContext:  llmResponse.UpdatedContext,
		Changes:         llmResponse.Changes,
		Confidence:      llmResponse.Confidence,
		Summary:         llmResponse.Summary,
	}, nil
}

// calculateDerivedContext calculates context from user's learning activity
func calculateDerivedContext(ctx context.Context, fs *firestore.Client, userID string) (*models.DerivedContext, error) {
	derived := &models.DerivedContext{
		MostActiveHours: []int{},
		TopicsStudied:   []string{},
		LastUpdated:     time.Now().UnixMilli(),
	}

	// Get all learning paths for user
	iter := Collection(fs, "learning_paths").Where("userId", "==", userID).Documents(ctx)
	defer iter.Stop()

	topicsMap := make(map[string]bool)
	var totalQuizScore float64
	var quizCount int
	completedCount := 0

	for {
		doc, err := iter.Next()
		if err != nil {
			break
		}

		var path models.Course
		if err := doc.DataTo(&path); err != nil {
			continue
		}

		// Count completed courses
		if path.Status == "completed" {
			completedCount++
		}

		// Collect topics and quiz scores from steps
		for _, step := range path.Steps {
			if step.Topic != "" {
				topicsMap[step.Topic] = true
			}
			if step.Type == "quiz" && step.Score > 0 {
				totalQuizScore += float64(step.Score)
				quizCount++
			}
		}
	}

	// Calculate averages
	if quizCount > 0 {
		derived.AvgQuizScore = totalQuizScore / float64(quizCount)
	}
	derived.CompletedCourses = completedCount

	// Convert topics map to slice
	for topic := range topicsMap {
		derived.TopicsStudied = append(derived.TopicsStudied, topic)
	}

	return derived, nil
}
