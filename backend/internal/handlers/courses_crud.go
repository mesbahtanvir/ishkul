package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

// Note: GET endpoints (listCourses, getCourse) removed.
// Clients now use Firebase real-time subscriptions for course data.

// =============================================================================
// Update Course
// =============================================================================

// updateCourse updates a course.
func updateCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	var req models.CourseUpdate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		SendError(w, http.StatusBadRequest, "INVALID_BODY", "Invalid request body")
		return
	}

	updates := buildCourseUpdates(req)

	if _, err := Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, updates); err != nil {
		SendError(w, http.StatusInternalServerError, "UPDATE_ERROR", "Error updating course")
		return
	}

	// Fetch updated document
	updatedCourse := GetCourseByID(w, rc, courseID)
	if updatedCourse == nil {
		return
	}

	NormalizeCourse(updatedCourse)

	SendSuccess(w, map[string]interface{}{
		"course": updatedCourse,
	})
}

// buildCourseUpdates constructs Firestore updates from the request.
func buildCourseUpdates(req models.CourseUpdate) []firestore.Update {
	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "updatedAt", Value: now},
		{Path: "lastAccessedAt", Value: now},
	}

	if req.Title != nil {
		updates = append(updates, firestore.Update{Path: "title", Value: *req.Title})
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

	return updates
}

// =============================================================================
// Delete Course
// =============================================================================

// deleteCourse soft deletes a course (sets status to deleted).
func deleteCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	if course.Status == models.CourseStatusDeleted {
		SendError(w, http.StatusBadRequest, "ALREADY_DELETED", "Course is already deleted")
		return
	}

	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.CourseStatusDeleted},
		{Path: "deletedAt", Value: now},
		{Path: "updatedAt", Value: now},
	}

	if _, err := Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, updates); err != nil {
		SendError(w, http.StatusInternalServerError, "DELETE_ERROR", "Error deleting course")
		return
	}

	SendSuccess(w, map[string]interface{}{
		"success": true,
		"message": "Course deleted",
	})
}
