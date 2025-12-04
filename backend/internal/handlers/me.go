package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/iterator"
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

	doc, err := Collection(fs, "users").Doc(userID).Get(ctx)
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
	if err := json.NewEncoder(w).Encode(user); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
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

	docRef := Collection(fs, "users").Doc(userID)
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
	if err := json.NewEncoder(w).Encode(user); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
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

	doc, err := Collection(fs, "users").Doc(userID).Get(ctx)
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
	if err := json.NewEncoder(w).Encode(userDoc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
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

	docRef := Collection(fs, "users").Doc(userID)
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
	if err := json.NewEncoder(w).Encode(userDoc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
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

	docRef := Collection(fs, "users").Doc(userID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "history", Value: firestore.ArrayUnion(entry)},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		http.Error(w, "Error adding history entry", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"entry":   entry,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
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

	doc, err := Collection(fs, "users").Doc(userID).Get(ctx)
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
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"nextStep": nil,
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
			return
		}
	} else {
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"nextStep": userDoc.NextStep,
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
			return
		}
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

	docRef := Collection(fs, "users").Doc(userID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "nextStep", Value: nextStep},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		http.Error(w, "Error setting next step", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"nextStep": nextStep,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
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

	docRef := Collection(fs, "users").Doc(userID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "nextStep", Value: firestore.Delete},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		http.Error(w, "Error clearing next step", http.StatusInternalServerError)
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

	docRef := Collection(fs, "users").Doc(userID)
	_, err := docRef.Update(ctx, []firestore.Update{
		{Path: "memory.topics." + req.Topic, Value: topicMemory},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		http.Error(w, "Error updating memory", http.StatusInternalServerError)
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

// DeleteAccountRequest represents a delete account request
type DeleteAccountRequest struct {
	Type string `json:"type"` // "soft" for 30-day recovery, "hard" for immediate deletion
}

// DeleteAccount soft deletes the account (30-day recovery period) or hard deletes it
// Soft delete: Sets deletedAt timestamp, user cannot login but data recoverable for 30 days
// Hard delete: Permanently deletes all user data immediately (only if DeletedAt is set)
func DeleteAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req DeleteAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Type != "soft" && req.Type != "hard" {
		http.Error(w, "Type must be 'soft' or 'hard'", http.StatusBadRequest)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	docRef := Collection(fs, "users").Doc(userID)

	if req.Type == "soft" {
		// Soft delete: Set deletedAt timestamp
		_, err := docRef.Update(ctx, []firestore.Update{
			{Path: "deletedAt", Value: time.Now()},
			{Path: "updatedAt", Value: time.Now()},
		})

		if err != nil {
			http.Error(w, "Error deleting account", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Account scheduled for deletion. You have 30 days to recover your account.",
			"type":    "soft",
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
			return
		}
	} else if req.Type == "hard" {
		// Hard delete: Permanently delete the user document and all learning paths
		// Use a transaction to ensure atomic deletion (all-or-nothing)
		pathCount := 0
		err := fs.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
			// Query all learning paths for this user
			pathsIter := Collection(fs, "learning_paths").Where("userId", "==", userID).Documents(ctx)
			defer pathsIter.Stop()

			// Collect all document references to delete
			var refsToDelete []*firestore.DocumentRef
			for {
				doc, err := pathsIter.Next()
				if err == iterator.Done {
					break
				}
				if err != nil {
					return err
				}
				refsToDelete = append(refsToDelete, doc.Ref)
				pathCount++
			}

			// Delete all learning paths in the transaction
			for _, ref := range refsToDelete {
				if err := tx.Delete(ref); err != nil {
					return err
				}
			}

			// Delete the user document in the same transaction
			if err := tx.Delete(docRef); err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			http.Error(w, "Error permanently deleting account", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"success":      true,
			"message":      "Account and all associated data permanently deleted.",
			"type":         "hard",
			"deletedPaths": pathCount,
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
			return
		}
	}
}
