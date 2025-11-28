package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/iterator"
)

// GetUsers retrieves all users (admin only - add admin check in production)
func GetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	fs := firebase.GetFirestore()

	if fs == nil {
		http.Error(w, "Firestore not initialized", http.StatusInternalServerError)
		return
	}

	iter := fs.Collection("users").Documents(ctx)
	defer iter.Stop()

	var users []models.User
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			http.Error(w, "Error fetching users", http.StatusInternalServerError)
			return
		}

		var user models.User
		if err := doc.DataTo(&user); err != nil {
			continue
		}
		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"users": users,
		"count": len(users),
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// CreateUser creates or updates a user
func CreateUser(w http.ResponseWriter, r *http.Request) {
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

	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set user ID from token
	user.ID = userID
	user.UpdatedAt = time.Now()

	// Check if user exists
	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Firestore not initialized", http.StatusInternalServerError)
		return
	}

	docRef := fs.Collection("users").Doc(userID)
	doc, err := docRef.Get(ctx)

	if err != nil || !doc.Exists() {
		// New user
		user.CreatedAt = time.Now()
	}

	// Save user
	if _, err := docRef.Set(ctx, user); err != nil {
		http.Error(w, "Error saving user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(user); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
