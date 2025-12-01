package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/iterator"
)

// GetProgress retrieves user's learning progress
func GetProgress(w http.ResponseWriter, r *http.Request) {
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
		http.Error(w, "Firestore not initialized", http.StatusInternalServerError)
		return
	}

	// Query progress for user
	iter := fs.Collection("progress").
		Where("userId", "==", userID).
		Documents(ctx)
	defer iter.Stop()

	var progressList []models.Progress
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			http.Error(w, fmt.Sprintf("Error fetching progress: %v", err), http.StatusInternalServerError)
			return
		}

		var progress models.Progress
		if err := doc.DataTo(&progress); err != nil {
			continue
		}
		progressList = append(progressList, progress)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"progress": progressList,
		"count":    len(progressList),
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// UpdateProgress updates user's lesson progress
func UpdateProgress(w http.ResponseWriter, r *http.Request) {
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

	var progress models.Progress
	if err := json.NewDecoder(r.Body).Decode(&progress); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	// Set user ID from token
	progress.UserID = userID
	progress.LastAttempt = time.Now()

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Firestore not initialized", http.StatusInternalServerError)
		return
	}

	// Create composite key for progress document
	docID := userID + "_" + progress.LessonID
	docRef := fs.Collection("progress").Doc(docID)

	// Get existing progress if any
	doc, err := docRef.Get(ctx)
	if err == nil && doc.Exists() {
		var existing models.Progress
		if err := doc.DataTo(&existing); err == nil {
			progress.Attempts = existing.Attempts + 1
		}
	} else {
		progress.Attempts = 1
	}

	// Save progress
	if _, err := docRef.Set(ctx, progress); err != nil {
		http.Error(w, fmt.Sprintf("Error saving progress: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(progress); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
