package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/iterator"
)

// GetLessons retrieves all lessons or filters by level
func GetLessons(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	level := r.URL.Query().Get("level")

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Firestore not initialized", http.StatusInternalServerError)
		return
	}

	query := fs.Collection("lessons").OrderBy("order", "asc")

	// Filter by level if provided
	if level != "" {
		query = fs.Collection("lessons").
			Where("level", "==", level).
			OrderBy("order", "asc")
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	var lessons []models.Lesson
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			http.Error(w, "Error fetching lessons", http.StatusInternalServerError)
			return
		}

		var lesson models.Lesson
		if err := doc.DataTo(&lesson); err != nil {
			continue
		}
		lessons = append(lessons, lesson)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"lessons": lessons,
		"count":   len(lessons),
	})
}
