package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"google.golang.org/api/iterator"
)

// =============================================================================
// List Courses
// =============================================================================

// listCourses returns courses for the authenticated user.
// Query params:
//   - status: filter by status (active, completed, archived). Default shows active + completed.
//     Deleted paths are never shown.
func listCourses(w http.ResponseWriter, r *http.Request) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	statusFilter := r.URL.Query().Get("status")
	query := buildCoursesQuery(rc.FS, rc.UserID, statusFilter)

	courses, err := fetchCourses(rc.Ctx, query)
	if err != nil {
		SendError(w, http.StatusInternalServerError, "FETCH_ERROR", "Error fetching courses")
		return
	}

	SendSuccess(w, map[string]interface{}{
		"courses": courses,
	})
}

// buildCoursesQuery constructs the Firestore query based on status filter.
func buildCoursesQuery(fs *firestore.Client, userID, statusFilter string) firestore.Query {
	baseQuery := Collection(fs, "courses").Where("userId", "==", userID)

	switch statusFilter {
	case models.CourseStatusActive:
		return baseQuery.Where("status", "==", models.CourseStatusActive).OrderBy("lastAccessedAt", firestore.Desc)
	case models.CourseStatusCompleted:
		return baseQuery.Where("status", "==", models.CourseStatusCompleted).OrderBy("completedAt", firestore.Desc)
	case models.CourseStatusArchived:
		return baseQuery.Where("status", "==", models.CourseStatusArchived).OrderBy("archivedAt", firestore.Desc)
	default:
		return baseQuery.OrderBy("lastAccessedAt", firestore.Desc)
	}
}

// fetchCourses executes the query and returns normalized courses.
func fetchCourses(ctx context.Context, query firestore.Query) ([]models.Course, error) {
	iter := query.Documents(ctx)
	defer iter.Stop()

	courses := []models.Course{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var course models.Course
		if err := doc.DataTo(&course); err != nil {
			// Log parse error instead of silently skipping
			firebase.LogDataToError(ctx, appLogger, "courses", doc.Ref.ID, err)
			continue // Skip malformed documents
		}

		// Skip deleted courses (they should never be shown)
		if course.Status == models.CourseStatusDeleted {
			continue
		}

		// Handle legacy courses without status (treat as active)
		if course.Status == "" {
			course.Status = models.CourseStatusActive
		}

		NormalizeCourse(&course)
		courses = append(courses, course)
	}

	return courses, nil
}

// =============================================================================
// Get Course
// =============================================================================

// getCourse returns a specific course.
func getCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	// Update last accessed time (non-critical, log error if it occurs)
	now := time.Now().UnixMilli()
	firebase.LogWriteStart(rc.Ctx, appLogger, "update", "courses/"+courseID,
		slog.String("field", "lastAccessedAt"),
	)
	_, err := Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, []firestore.Update{
		{Path: "lastAccessedAt", Value: now},
	})
	firebase.LogWrite(rc.Ctx, appLogger, "update", "courses/"+courseID, err)
	course.LastAccessedAt = now

	NormalizeCourse(course)

	SendSuccess(w, map[string]interface{}{
		"course": course,
	})
}

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
