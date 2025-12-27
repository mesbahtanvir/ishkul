package handlers

import (
	"fmt"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// =============================================================================
// Archive / Unarchive Course
// =============================================================================

// archiveCourse archives an active course.
func archiveCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	// Only active paths can be archived
	if course.Status != models.CourseStatusActive && course.Status != "" {
		SendError(w, http.StatusBadRequest, "INVALID_STATUS",
			fmt.Sprintf("Cannot archive path with status '%s'. Only active paths can be archived.", course.Status))
		return
	}

	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.CourseStatusArchived},
		{Path: "archivedAt", Value: now},
		{Path: "updatedAt", Value: now},
	}

	if _, err := Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, updates); err != nil {
		SendError(w, http.StatusInternalServerError, "ARCHIVE_ERROR", fmt.Sprintf("Error archiving course: %v", err))
		return
	}

	SendSuccess(w, map[string]interface{}{
		"success": true,
		"message": "Course archived",
	})
}

// unarchiveCourse restores an archived path to active status.
func unarchiveCourse(w http.ResponseWriter, r *http.Request, courseID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	// Only archived paths can be unarchived
	if course.Status != models.CourseStatusArchived {
		SendError(w, http.StatusBadRequest, "INVALID_STATUS",
			fmt.Sprintf("Cannot unarchive path with status '%s'. Only archived paths can be unarchived.", course.Status))
		return
	}

	// Check course limit before unarchiving
	if err := validateUnarchiveLimit(w, rc, course); err != nil {
		return // Error response already sent
	}

	now := time.Now().UnixMilli()
	updates := []firestore.Update{
		{Path: "status", Value: models.CourseStatusActive},
		{Path: "archivedAt", Value: firestore.Delete},
		{Path: "updatedAt", Value: now},
		{Path: "lastAccessedAt", Value: now},
	}

	if _, err := Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, updates); err != nil {
		SendError(w, http.StatusInternalServerError, "UNARCHIVE_ERROR", fmt.Sprintf("Error unarchiving course: %v", err))
		return
	}

	// Course restored - queue system will handle any needed regeneration
	course.Status = models.CourseStatusActive

	SendSuccess(w, map[string]interface{}{
		"success": true,
		"message": "Course restored to active",
	})
}

// validateUnarchiveLimit checks if user can unarchive a course.
func validateUnarchiveLimit(w http.ResponseWriter, rc *RequestContext, course *models.Course) error {
	userTier, limits, err := GetUserTierAndLimits(rc.Ctx, rc.UserID)
	if err != nil {
		userTier = models.TierFree
	}

	activeCount, err := CountUserActivePaths(rc.Ctx, rc.FS, rc.UserID)
	if err != nil {
		SendError(w, http.StatusInternalServerError, "COUNT_ERROR", fmt.Sprintf("Error checking active paths: %v", err))
		return err
	}

	maxPaths := models.GetMaxActiveCourses(userTier)
	if activeCount >= maxPaths {
		upgradeHint := ""
		if userTier == models.TierFree {
			upgradeHint = " Upgrade to Pro for up to 5 active paths."
		}

		SendJSON(w, http.StatusForbidden, map[string]interface{}{
			"error":       fmt.Sprintf("Cannot unarchive: you already have %d active courses (max %d).%s", activeCount, maxPaths, upgradeHint),
			"code":        "COURSE_LIMIT_REACHED",
			"canUpgrade":  userTier == models.TierFree,
			"currentTier": userTier,
			"limits":      limits,
		})
		return fmt.Errorf("course limit reached")
	}

	return nil
}
