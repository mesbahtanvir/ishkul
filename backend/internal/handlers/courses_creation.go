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
)

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

	// Validate course limit and get user tier
	userTier, err := validateCourseLimitAndGetTier(w, rc, req)
	if err != nil {
		return // Error response already sent
	}

	// Create the course
	course := buildNewCourse(rc.UserID, req)

	firebase.LogWriteStart(rc.Ctx, appLogger, "set", "courses/"+course.ID,
		slog.String("title", req.Title),
	)
	_, err = Collection(rc.FS, "courses").Doc(course.ID).Set(rc.Ctx, course)
	firebase.LogWrite(rc.Ctx, appLogger, "set", "courses/"+course.ID, err)
	if err != nil {
		SendError(w, http.StatusInternalServerError, "CREATE_ERROR", "Error creating course")
		return
	}

	// Generate course outline via queue system (reliable) or goroutine (fallback)
	if taskManager != nil {
		_, queueErr := taskManager.CreateOutlineTask(rc.Ctx, course.ID, rc.UserID, userTier)
		if queueErr != nil {
			logWarn(rc.Ctx, "queue_outline_task_failed",
				slog.String("course_id", course.ID),
				slog.String("error", queueErr.Error()),
			)
			// Fall back to goroutine if queue fails
			go generateCourseOutlineAsync(course.ID, req.Title, rc.UserID)
		}
	} else {
		// Fallback if queue not initialized (e.g., local development)
		go generateCourseOutlineAsync(course.ID, req.Title, rc.UserID)
	}

	SendCreated(w, map[string]interface{}{
		"course": course,
	})
}

// validateCourseLimitAndGetTier checks if user can create a new course and returns the user tier.
// Returns the user tier and an error if limit is reached (response already sent).
func validateCourseLimitAndGetTier(w http.ResponseWriter, rc *RequestContext, req models.CourseCreate) (string, error) {
	userTier, limits, err := GetUserTierAndLimits(rc.Ctx, rc.UserID)
	if err != nil {
		userTier = models.TierFree
	}

	existingPaths, err := CountUserActivePaths(rc.Ctx, rc.FS, rc.UserID)
	if err != nil {
		SendError(w, http.StatusInternalServerError, "COUNT_ERROR", "Error checking existing paths")
		return userTier, err
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
		return userTier, fmt.Errorf("course limit reached")
	}

	return userTier, nil
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

// =============================================================================
// Outline Generation
// =============================================================================

// generateCourseOutlineAsync handles async outline generation.
func generateCourseOutlineAsync(courseID, goal, userID string) {
	bgCtx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	bgFs := firebase.GetFirestore()
	if bgFs == nil {
		return
	}

	logInfo(bgCtx, "outline_generation_started",
		slog.String("path_id", courseID),
		slog.String("goal", goal),
	)

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
	logError(ctx, "outline_generation_failed",
		slog.String("path_id", courseID),
		slog.String("error", err.Error()),
	)
	firebase.LogWriteStart(ctx, appLogger, "update", "courses/"+courseID,
		slog.String("field", "outlineStatus"),
		slog.String("value", string(models.OutlineStatusFailed)),
	)

	_, updateErr := Collection(fs, "courses").Doc(courseID).Update(ctx, []firestore.Update{
		{Path: "outlineStatus", Value: models.OutlineStatusFailed},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})

	firebase.LogWrite(ctx, appLogger, "update", "courses/"+courseID, updateErr)
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

	logInfo(ctx, "outline_generation_completed",
		slog.String("path_id", courseID),
		slog.Int("sections", len(outline.Sections)),
		slog.Int("total_lessons", totalLessons),
	)

	// Note: Cascade generation now handled by queue processor (processor_outline.go)
	// triggerPostOutlinePregeneration is a legacy stub - cascade triggers automatically
	// when outline task completes in the queue system.

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
