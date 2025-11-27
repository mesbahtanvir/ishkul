package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

// GetMe returns the current user's profile
func GetMe(w http.ResponseWriter, r *http.Request) {
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

	doc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var user models.User
	if err := doc.DataTo(&user); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// UpdateMeRequest represents the update profile request
type UpdateMeRequest struct {
	Goal        *string `json:"goal,omitempty"`
	Level       *string `json:"level,omitempty"`
	DisplayName *string `json:"displayName,omitempty"`
}

// UpdateMe updates the current user's profile
func UpdateMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdateMeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Build update map
	updates := []firestore.Update{
		{Path: "updatedAt", Value: time.Now()},
	}

	if req.Goal != nil {
		updates = append(updates, firestore.Update{Path: "goal", Value: *req.Goal})
	}
	if req.Level != nil {
		updates = append(updates, firestore.Update{Path: "level", Value: *req.Level})
	}
	if req.DisplayName != nil {
		updates = append(updates, firestore.Update{Path: "displayName", Value: *req.DisplayName})
	}

	docRef := fs.Collection("users").Doc(userID)
	if _, err := docRef.Update(ctx, updates); err != nil {
		http.Error(w, "Error updating user", http.StatusInternalServerError)
		return
	}

	// Fetch and return updated user
	doc, err := docRef.Get(ctx)
	if err != nil {
		http.Error(w, "Error fetching updated user", http.StatusInternalServerError)
		return
	}

	var user models.User
	if err := doc.DataTo(&user); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// GetMeDocument returns the full user document including learning data
func GetMeDocument(w http.ResponseWriter, r *http.Request) {
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

	doc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var userDoc models.UserDocument
	if err := doc.DataTo(&userDoc); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userDoc)
}

// CreateUserDocumentRequest represents the request to create/initialize a user document
type CreateUserDocumentRequest struct {
	Goal  string `json:"goal"`
	Level string `json:"level"`
}

// CreateMeDocument creates or initializes a user document with learning data
func CreateMeDocument(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateUserDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	docRef := fs.Collection("users").Doc(userID)
	doc, _ := docRef.Get(ctx)

	now := time.Now()

	// Initialize or update user document
	updates := map[string]interface{}{
		"goal":      req.Goal,
		"level":     req.Level,
		"updatedAt": now,
	}

	// If new user, initialize memory and history
	if !doc.Exists() {
		updates["memory"] = map[string]interface{}{
			"topics": map[string]interface{}{},
		}
		updates["history"] = []interface{}{}
		updates["createdAt"] = now
	} else {
		// Check if memory exists, if not initialize it
		data := doc.Data()
		if data["memory"] == nil {
			updates["memory"] = map[string]interface{}{
				"topics": map[string]interface{}{},
			}
		}
		if data["history"] == nil {
			updates["history"] = []interface{}{}
		}
	}

	if _, err := docRef.Set(ctx, updates, firestore.MergeAll); err != nil {
		http.Error(w, "Error updating user document", http.StatusInternalServerError)
		return
	}

	// Fetch and return updated document
	doc, err := docRef.Get(ctx)
	if err != nil {
		http.Error(w, "Error fetching user document", http.StatusInternalServerError)
		return
	}

	var userDoc models.UserDocument
	if err := doc.DataTo(&userDoc); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userDoc)
}

// AddHistoryRequest represents a request to add a history entry
type AddHistoryRequest struct {
	Type  string  `json:"type"`
	Topic string  `json:"topic"`
	Score float64 `json:"score,omitempty"`
}

// AddHistory adds a history entry to the user's document
func AddHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req AddHistoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Type == "" || req.Topic == "" {
		http.Error(w, "Type and topic are required", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	entry := models.HistoryEntry{
		Type:      req.Type,
		Topic:     req.Topic,
		Score:     req.Score,
		Timestamp: time.Now().UnixMilli(),
	}

	docRef := fs.Collection("users").Doc(userID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "history", Value: firestore.ArrayUnion(entry)},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		http.Error(w, "Error adding history entry", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"entry":   entry,
	})
}

// GetNextStep returns the user's next recommended step
func GetNextStep(w http.ResponseWriter, r *http.Request) {
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

	doc, err := fs.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	var userDoc models.UserDocument
	if err := doc.DataTo(&userDoc); err != nil {
		http.Error(w, "Error reading user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if userDoc.NextStep == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"nextStep": nil,
		})
	} else {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"nextStep": userDoc.NextStep,
		})
	}
}

// SetNextStep sets the user's next recommended step
func SetNextStep(w http.ResponseWriter, r *http.Request) {
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

	var nextStep models.NextStep
	if err := json.NewDecoder(r.Body).Decode(&nextStep); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if nextStep.Type == "" || nextStep.Topic == "" {
		http.Error(w, "Type and topic are required", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	docRef := fs.Collection("users").Doc(userID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "nextStep", Value: nextStep},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		http.Error(w, "Error setting next step", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"nextStep": nextStep,
	})
}

// ClearNextStep clears the user's next step
func ClearNextStep(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
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

	docRef := fs.Collection("users").Doc(userID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "nextStep", Value: firestore.Delete},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		http.Error(w, "Error clearing next step", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

// UpdateMemory updates the user's memory for a specific topic
type UpdateMemoryRequest struct {
	Topic       string  `json:"topic"`
	Confidence  float64 `json:"confidence"`
	TimesTested int     `json:"timesTested"`
}

func UpdateMemory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdateMemoryRequest
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

	topicMemory := models.TopicMemory{
		Confidence:   req.Confidence,
		LastReviewed: time.Now().Format(time.RFC3339),
		TimesTested:  req.TimesTested,
	}

	docRef := fs.Collection("users").Doc(userID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "memory.topics." + req.Topic, Value: topicMemory},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		http.Error(w, "Error updating memory", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"topic":   req.Topic,
		"memory":  topicMemory,
	})
}
