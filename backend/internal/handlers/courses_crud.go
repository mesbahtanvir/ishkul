package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
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

	// Update last accessed time (non-critical, ignore error)
	now := time.Now().UnixMilli()
	_, _ = Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, []firestore.Update{
		{Path: "lastAccessedAt", Value: now},
	})
	course.LastAccessedAt = now

	NormalizeCourse(course)

	SendSuccess(w, map[string]interface{}{
		"course": course,
	})
}

// =============================================================================
// Create Course
// =============================================================================

// createCourse creates a new course.
func createCourse(w http.ResponseWriter, r *http.Request) {
	// 1. Auth check (before DB)
	ctx, userID := GetAuthContext(w, r)
	if userID == "" {
		return
	}

	// 2. Parse and validate input (before DB)
	var req models.CourseCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		SendError(w, http.StatusBadRequest, "INVALID_BODY", "Invalid request body")
		return
	}

	if req.Title == "" {
		SendError(w, http.StatusBadRequest, "MISSING_TITLE", "Title is required")
		return
	}

	// 3. Now get DB connection
	fs := GetFirestoreClient(w)
	if fs == nil {
		return
	}

	rc := &RequestContext{Ctx: ctx, UserID: userID, FS: fs, Request: r}

	// Validate course limit
	if err := validateCourseLimit(w, rc, req); err != nil {
		return // Error response already sent
	}

	// Create the course
	course := buildNewCourse(rc.UserID, req)

	if _, err := Collection(rc.FS, "courses").Doc(course.ID).Set(rc.Ctx, course); err != nil {
		SendError(w, http.StatusInternalServerError, "CREATE_ERROR", "Error creating course")
		return
	}

	// Generate course outline in background
	go generateCourseOutlineAsync(course.ID, req.Title, rc.UserID)

	SendCreated(w, map[string]interface{}{
		"course": course,
	})
}

// validateCourseLimit checks if user can create a new course.
// Returns an error if limit is reached (response already sent).
func validateCourseLimit(w http.ResponseWriter, rc *RequestContext, req models.CourseCreate) error {
	userTier, limits, err := GetUserTierAndLimits(rc.Ctx, rc.UserID)
	if err != nil {
		userTier = models.TierFree
	}

	existingPaths, err := CountUserActivePaths(rc.Ctx, rc.FS, rc.UserID)
	if err != nil {
		SendError(w, http.StatusInternalServerError, "COUNT_ERROR", "Error checking existing paths")
		return err
	}

	maxPaths := models.GetMaxActiveCourses(userTier)
	if existingPaths >= maxPaths {
		upgradeHint := ""
		if userTier == models.TierFree {
			upgradeHint = " Upgrade to Pro for up to 5 active paths."
		}

		SendJSON(w, http.StatusForbidden, map[string]interface{}{
			"error":       fmt.Sprintf("Maximum of %d active courses allowed.%s", maxPaths, upgradeHint),
			"code":        "COURSE_LIMIT_REACHED",
			"canUpgrade":  userTier == models.TierFree,
			"currentTier": userTier,
			"limits":      limits,
		})
		return fmt.Errorf("course limit reached")
	}

	return nil
}

// buildNewCourse creates a new Course model with defaults.
func buildNewCourse(userID string, req models.CourseCreate) models.Course {
	now := time.Now().UnixMilli()
	courseID := uuid.New().String()

	return models.Course{
		ID:               courseID,
		UserID:           userID,
		Title:            req.Title,
		Emoji:            req.Emoji,
		Status:           models.CourseStatusActive,
		OutlineStatus:    models.OutlineStatusGenerating,
		Progress:         0,
		LessonsCompleted: 0,
		TotalLessons:     0,
		CreatedAt:        now,
		UpdatedAt:        now,
		LastAccessedAt:   now,
	}
}

// generateCourseOutlineAsync handles async outline generation.
func generateCourseOutlineAsync(courseID, goal, userID string) {
	bgCtx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	bgFs := firebase.GetFirestore()
	if bgFs == nil {
		return
	}

	if appLogger != nil {
		logger.Info(appLogger, bgCtx, "outline_generation_started",
			slog.String("path_id", courseID),
			slog.String("goal", goal),
		)
	}

	outline, err := generateCourseOutline(bgCtx, goal)
	if err != nil {
		handleOutlineGenerationError(bgCtx, bgFs, courseID, err)
		return
	}

	if err := saveGeneratedOutline(bgCtx, bgFs, courseID, userID, goal, outline); err != nil {
		handleOutlineGenerationError(bgCtx, bgFs, courseID, err)
	}
}

// handleOutlineGenerationError logs and updates status on outline generation failure.
func handleOutlineGenerationError(ctx context.Context, fs *firestore.Client, courseID string, err error) {
	if appLogger != nil {
		logger.Error(appLogger, ctx, "outline_generation_failed",
			slog.String("path_id", courseID),
			slog.String("error", err.Error()),
		)
	}

	_, _ = Collection(fs, "courses").Doc(courseID).Update(ctx, []firestore.Update{
		{Path: "outlineStatus", Value: models.OutlineStatusFailed},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
}

// saveGeneratedOutline saves the outline and triggers pregeneration.
func saveGeneratedOutline(ctx context.Context, fs *firestore.Client, courseID, userID, goal string, outline *models.CourseOutline) error {
	totalLessons := countOutlineLessons(outline)
	currentPosition := initializeLessonPosition(outline)

	_, err := Collection(fs, "courses").Doc(courseID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: outline},
		{Path: "currentPosition", Value: currentPosition},
		{Path: "outlineStatus", Value: models.OutlineStatusReady},
		{Path: "totalLessons", Value: totalLessons},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	if err != nil {
		return err
	}

	if appLogger != nil {
		logger.Info(appLogger, ctx, "outline_generation_completed",
			slog.String("path_id", courseID),
			slog.Int("sections", len(outline.Sections)),
			slog.Int("total_lessons", totalLessons),
		)
	}

	// Trigger pregeneration of first step
	triggerPostOutlinePregeneration(ctx, fs, courseID, userID, goal, outline, currentPosition)

	return nil
}

// initializeLessonPosition sets up the initial lesson position.
func initializeLessonPosition(outline *models.CourseOutline) *models.LessonPosition {
	position := &models.LessonPosition{
		SectionIndex: 0,
		LessonIndex:  0,
	}

	if len(outline.Sections) > 0 {
		outline.Sections[0].Status = models.SectionStatusInProgress
		position.SectionID = outline.Sections[0].ID

		if len(outline.Sections[0].Lessons) > 0 {
			outline.Sections[0].Lessons[0].Status = models.LessonStatusInProgress
			position.LessonID = outline.Sections[0].Lessons[0].ID
		}
	}

	return position
}

// triggerPostOutlinePregeneration triggers pregeneration after outline is ready.
// Note: Pregeneration service removed - will be replaced by queue system
func triggerPostOutlinePregeneration(ctx context.Context, fs *firestore.Client, courseID, userID, title string, outline *models.CourseOutline, currentPosition *models.LessonPosition) {
	// TODO: Queue system will handle auto-generation of blocks
	if appLogger != nil {
		logger.Info(appLogger, ctx, "outline_ready_for_generation",
			slog.String("path_id", courseID),
			slog.String("title", title),
		)
	}
}

// getUserTierForPregeneration fetches user tier for pregeneration.
func getUserTierForPregeneration(ctx context.Context, fs *firestore.Client, userID string) string {
	userDoc, err := Collection(fs, "users").Doc(userID).Get(ctx)
	if err != nil {
		return models.TierFree
	}

	var user models.User
	if err := userDoc.DataTo(&user); err != nil {
		return models.TierFree
	}

	return user.GetCurrentTier()
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
