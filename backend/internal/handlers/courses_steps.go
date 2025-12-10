package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// =============================================================================
// Get Next Step
// =============================================================================

// getPathNextStep returns the current incomplete step or generates a new one.
func getPathNextStep(w http.ResponseWriter, r *http.Request, courseID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	// Handle legacy paths without status
	if course.Status == "" {
		course.Status = models.CourseStatusActive
	}

	// Validate course status for step generation
	if err := validateCourseStatusForSteps(w, course); err != nil {
		return
	}

	userTier, limits, err := GetUserTierAndLimits(rc.Ctx, rc.UserID)
	if err != nil {
		userTier = models.TierFree
	}

	NormalizeCourse(course)
	updateLastAccessed(rc, courseID)

	// Check for existing incomplete step
	if currentStep := GetCurrentStep(course.Steps); currentStep != nil {
		SendSuccess(w, map[string]interface{}{
			"step":      currentStep,
			"stepIndex": currentStep.Index,
		})
		return
	}

	// Check daily step limit before generating
	if err := validateDailyStepLimit(w, rc, userTier, limits, course); err != nil {
		return
	}

	// Generate new step
	nextStep, err := generateAndSaveStep(rc, course, courseID, userTier)
	if err != nil {
		if appLogger != nil {
			router := GetLLMRouter()
			logger.Error(appLogger, rc.Ctx, "failed_to_generate_next_step",
				slog.String("path_id", courseID),
				slog.String("error", err.Error()),
				slog.String("llm_router_nil", fmt.Sprintf("%v", router == nil)),
				slog.String("prompt_loader_nil", fmt.Sprintf("%v", promptLoader == nil)),
			)
		}
		SendError(w, http.StatusInternalServerError, "GENERATION_ERROR", fmt.Sprintf("Failed to generate next step: %v", err))
		return
	}

	SendSuccess(w, map[string]interface{}{
		"step":      nextStep,
		"stepIndex": nextStep.Index,
	})
}

// validateCourseStatusForSteps checks if the course status allows step generation.
func validateCourseStatusForSteps(w http.ResponseWriter, course *models.Course) error {
	switch course.Status {
	case models.CourseStatusCompleted:
		sendErrorResponse(w, http.StatusBadRequest, ErrCodePathCompleted,
			"This course is completed. You can only review existing steps.")
		return fmt.Errorf("course completed")
	case models.CourseStatusArchived:
		sendErrorResponse(w, http.StatusBadRequest, ErrCodePathArchived,
			"This course is archived. Unarchive it to continue learning.")
		return fmt.Errorf("course archived")
	case models.CourseStatusDeleted:
		sendErrorResponse(w, http.StatusNotFound, ErrCodePathDeleted,
			"This course has been deleted.")
		return fmt.Errorf("course deleted")
	}
	return nil
}

// updateLastAccessed updates the last accessed timestamp (non-critical).
func updateLastAccessed(rc *RequestContext, courseID string) {
	now := time.Now().UnixMilli()
	_, _ = Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, []firestore.Update{
		{Path: "lastAccessedAt", Value: now},
	})
}

// validateDailyStepLimit checks if user can generate a new step.
func validateDailyStepLimit(w http.ResponseWriter, rc *RequestContext, userTier string, limits interface{}, course *models.Course) error {
	canGenerate, stepsUsed, stepLimit, _ := CheckCanGenerateStep(rc.Ctx, rc.UserID, userTier)
	if !canGenerate {
		upgradeHint := ""
		if userTier == models.TierFree {
			upgradeHint = " Upgrade to Pro for 1,000 steps per day."
		}
		resetTime := models.GetDailyLimitResetTime()

		SendJSON(w, http.StatusForbidden, map[string]interface{}{
			"error":             fmt.Sprintf("Daily step limit reached (%d/%d).%s", stepsUsed, stepLimit, upgradeHint),
			"code":              "DAILY_STEP_LIMIT_REACHED",
			"canUpgrade":        userTier == models.TierFree,
			"currentTier":       userTier,
			"limits":            limits,
			"dailyLimitResetAt": resetTime,
			"existingSteps":     course.Steps,
		})
		return fmt.Errorf("daily limit reached")
	}
	return nil
}

// generateAndSaveStep generates a new step, saves it, and updates usage.
func generateAndSaveStep(rc *RequestContext, course *models.Course, courseID, userTier string) (*models.Step, error) {
	llmCtx, cancel := context.WithTimeout(rc.Ctx, 60*time.Second)
	defer cancel()

	nextStep, err := generateNextStepForPath(llmCtx, course)
	if err != nil {
		return nil, err
	}

	if appLogger != nil {
		logger.Info(appLogger, rc.Ctx, "step_cache_miss",
			slog.String("path_id", courseID),
			slog.String("step_type", nextStep.Type),
		)
	}

	// Append and save the new step
	course.Steps = append(course.Steps, *nextStep)
	_, err = Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, []firestore.Update{
		{Path: "steps", Value: course.Steps},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	if err != nil {
		fmt.Printf("Warning: failed to save generated step: %v\n", err)
	}

	// Increment daily usage counter
	incrementDailyUsageCounter(rc, userTier)

	// Trigger pregeneration for next step
	triggerStepPregeneration(rc, course)

	return nextStep, nil
}

// incrementDailyUsageCounter increments the daily usage and logs result.
func incrementDailyUsageCounter(rc *RequestContext, userTier string) {
	newUsage, _, err := IncrementDailyUsage(rc.Ctx, rc.UserID, userTier)
	if err != nil {
		if appLogger != nil {
			logger.Warn(appLogger, rc.Ctx, "failed_to_increment_daily_usage",
				slog.String("user_id", rc.UserID),
				slog.String("error", err.Error()),
			)
		}
	} else if appLogger != nil {
		logger.Info(appLogger, rc.Ctx, "daily_usage_incremented",
			slog.String("user_id", rc.UserID),
			slog.Int("new_count", newUsage),
			slog.String("tier", userTier),
		)
	}
}

// triggerStepPregeneration triggers pregeneration for the next step.
func triggerStepPregeneration(rc *RequestContext, course *models.Course) {
	if pregenerateService == nil {
		return
	}

	pregenerateTier := getUserTierForPregeneration(rc.Ctx, rc.FS, course.UserID)
	pregenerateService.TriggerPregeneration(course, pregenerateTier)
}

// =============================================================================
// Step Generation
// =============================================================================

// generateNextStepForPath generates the next learning step using the LLM router.
func generateNextStepForPath(ctx context.Context, course *models.Course) (*models.Step, error) {
	router := GetLLMRouter()
	if router == nil || promptLoader == nil {
		if appLogger != nil {
			logger.Error(appLogger, context.Background(), "llm_not_initialized",
				slog.String("path_id", course.ID),
				slog.String("llm_router_nil", fmt.Sprintf("%v", router == nil)),
				slog.String("prompt_loader_nil", fmt.Sprintf("%v", promptLoader == nil)),
			)
		}
		return nil, fmt.Errorf("LLM not initialized")
	}

	vars := buildStepGenerationVariables(course)

	template, err := promptLoader.LoadByName("learning/next-step")
	if err != nil {
		return nil, fmt.Errorf("failed to load prompt template: %w", err)
	}

	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := router.Complete(ctx, *openaiReq)
	if err != nil {
		return nil, fmt.Errorf("LLM API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned from LLM")
	}

	return parseStepFromCompletion(completion.Choices[0].Message.Content, len(course.Steps))
}

// buildStepGenerationVariables builds the variables for step generation prompt.
func buildStepGenerationVariables(course *models.Course) prompts.Variables {
	recentSteps := getRecentSteps(course)
	recentHistory := buildRecentHistoryString(recentSteps)
	memorySummary := BuildMemoryContext(course)

	vars := prompts.Variables{
		"goal":          course.Goal,
		"historyCount":  strconv.Itoa(len(course.Steps)),
		"memory":        memorySummary,
		"recentHistory": recentHistory,
	}

	// Add outline context if available
	addOutlineContextToVars(course, vars)

	return vars
}

// buildRecentHistoryString creates a comma-separated string of recent topics.
func buildRecentHistoryString(recentSteps []models.Step) string {
	if len(recentSteps) == 0 {
		return ""
	}

	topics := make([]string, 0, len(recentSteps))
	for _, s := range recentSteps {
		topics = append(topics, s.Topic)
	}

	start := len(topics) - 5
	if start < 0 {
		start = 0
	}
	return strings.Join(topics[start:], ", ")
}

// addOutlineContextToVars adds outline context to the variables if available.
func addOutlineContextToVars(course *models.Course, vars prompts.Variables) {
	if course.Outline == nil || course.CurrentPosition == nil {
		return
	}

	sectionIdx := course.CurrentPosition.SectionIndex
	lessonIdx := course.CurrentPosition.LessonIndex

	if sectionIdx >= len(course.Outline.Sections) {
		return
	}

	section := course.Outline.Sections[sectionIdx]
	vars["currentSection"] = section.Title

	if lessonIdx < len(section.Lessons) {
		lesson := section.Lessons[lessonIdx]
		vars["currentLesson"] = lesson.Title
		vars["currentLessonDescription"] = lesson.Description
	}
}

// parseStepFromCompletion parses the LLM response into a Step.
func parseStepFromCompletion(content string, stepIndex int) (*models.Step, error) {
	var stepData struct {
		Type           string   `json:"type"`
		Topic          string   `json:"topic"`
		Title          string   `json:"title"`
		Content        string   `json:"content,omitempty"`
		Question       string   `json:"question,omitempty"`
		Options        []string `json:"options,omitempty"`
		ExpectedAnswer string   `json:"expectedAnswer,omitempty"`
		Task           string   `json:"task,omitempty"`
		Hints          []string `json:"hints,omitempty"`
	}

	if err := llm.ParseJSONResponse(content, &stepData); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response as JSON: %w (content: %s)", err, content)
	}

	// Truncate content if too long
	if len(stepData.Content) > models.MaxStepContentLength {
		stepData.Content = stepData.Content[:models.MaxStepContentLength]
	}

	now := time.Now().UnixMilli()
	return &models.Step{
		ID:             uuid.New().String(),
		Index:          stepIndex,
		Type:           stepData.Type,
		Topic:          stepData.Topic,
		Title:          stepData.Title,
		Content:        stepData.Content,
		Question:       stepData.Question,
		Options:        stepData.Options,
		ExpectedAnswer: stepData.ExpectedAnswer,
		Task:           stepData.Task,
		Hints:          stepData.Hints,
		Completed:      false,
		CreatedAt:      now,
	}, nil
}

// =============================================================================
// Complete Step
// =============================================================================

// completeCurrentStep completes the current (first incomplete) step - legacy endpoint.
func completeCurrentStep(w http.ResponseWriter, r *http.Request, courseID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	currentStep := GetCurrentStep(course.Steps)
	if currentStep == nil {
		SendError(w, http.StatusBadRequest, "NO_ACTIVE_STEP", "No active step to complete")
		return
	}

	var req models.StepComplete
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req = models.StepComplete{}
	}

	completeStepInternal(w, r, courseID, currentStep.ID, course, &req)
}

// completeStep marks a specific step as complete.
func completeStep(w http.ResponseWriter, r *http.Request, courseID string, stepID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	var req models.StepComplete
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req = models.StepComplete{}
	}

	completeStepInternal(w, r, courseID, stepID, course, &req)
}

// completeStepInternal handles the internal logic for completing a step.
func completeStepInternal(w http.ResponseWriter, r *http.Request, courseID string, stepID string, course *models.Course, req *models.StepComplete) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	stepIndex := findStepIndex(course.Steps, stepID)
	if stepIndex == -1 {
		SendError(w, http.StatusNotFound, "STEP_NOT_FOUND", "Step not found")
		return
	}

	// Handle idempotent completion
	if course.Steps[stepIndex].Completed {
		sendIdempotentCompletionResponse(w, course, stepIndex)
		return
	}

	// Update step completion data
	now := time.Now().UnixMilli()
	updateStepCompletionData(&course.Steps[stepIndex], req, now)

	// Calculate progress and update memory
	completedCount := countCompletedSteps(course.Steps)
	newProgress := calculateProgress(completedCount, course.TotalLessons)
	updateTopicMemory(course, &course.Steps[stepIndex], req)

	// Check for memory compaction
	checkAndTriggerCompaction(rc.Ctx, course, completedCount)

	// Advance outline position
	outlineModified := advanceOutlinePosition(course, &course.Steps[stepIndex], req.Score)

	// Check for course completion
	courseCompleted := newProgress >= 100 && isPathReadyForCompletion(course)

	// Build and execute updates
	updates := buildStepCompletionUpdates(course, completedCount, newProgress, now, outlineModified, courseCompleted)

	if _, err := Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, updates); err != nil {
		SendError(w, http.StatusInternalServerError, "UPDATE_ERROR", "Error updating course")
		return
	}

	// Refresh course data
	refreshedCourse := GetCourseByID(w, rc, courseID)
	if refreshedCourse == nil {
		return
	}
	NormalizeCourse(refreshedCourse)

	// Trigger pregeneration if needed
	nextStepNeeded := !courseCompleted && refreshedCourse.Status == models.CourseStatusActive
	if nextStepNeeded {
		triggerCompletionPregeneration(rc, refreshedCourse, courseID, stepIndex)
	}

	SendSuccess(w, map[string]interface{}{
		"course":          refreshedCourse,
		"completedStep":   refreshedCourse.Steps[stepIndex],
		"nextStepNeeded":  nextStepNeeded,
		"courseCompleted": courseCompleted,
	})
}

// findStepIndex finds the index of a step by ID.
func findStepIndex(steps []models.Step, stepID string) int {
	for i := range steps {
		if steps[i].ID == stepID {
			return i
		}
	}
	return -1
}

// sendIdempotentCompletionResponse sends response for already completed step.
func sendIdempotentCompletionResponse(w http.ResponseWriter, course *models.Course, stepIndex int) {
	courseCompleted := course.Status == models.CourseStatusCompleted
	nextStepNeeded := !courseCompleted && course.Status == models.CourseStatusActive

	SendSuccess(w, map[string]interface{}{
		"course":          course,
		"completedStep":   course.Steps[stepIndex],
		"nextStepNeeded":  nextStepNeeded,
		"courseCompleted": courseCompleted,
	})
}

// updateStepCompletionData updates the step with completion data.
func updateStepCompletionData(step *models.Step, req *models.StepComplete, now int64) {
	step.Completed = true
	step.CompletedAt = now

	if req.UserAnswer != "" {
		step.UserAnswer = req.UserAnswer
	}
	if req.Score > 0 {
		step.Score = req.Score
	}
}

// countCompletedSteps counts the number of completed steps.
func countCompletedSteps(steps []models.Step) int {
	count := 0
	for _, s := range steps {
		if s.Completed {
			count++
		}
	}
	return count
}

// calculateProgress calculates the progress percentage.
func calculateProgress(completedCount, totalLessons int) int {
	if totalLessons <= 0 {
		return 0
	}
	progress := (completedCount * 100) / totalLessons
	if progress > 100 {
		progress = 100
	}
	return progress
}

// updateTopicMemory updates memory for the completed step's topic.
func updateTopicMemory(course *models.Course, step *models.Step, req *models.StepComplete) {
	if course.Memory == nil {
		course.Memory = &models.Memory{Topics: make(map[string]models.TopicMemory)}
	}

	topicMem := course.Memory.Topics[step.Topic]
	topicMem.TimesTested++
	topicMem.LastReviewed = time.Now().Format(time.RFC3339)

	if req.Score > 0 {
		if topicMem.Confidence == 0 {
			topicMem.Confidence = req.Score / 100.0
		} else {
			topicMem.Confidence = (topicMem.Confidence + (req.Score / 100.0)) / 2
		}
	}

	course.Memory.Topics[step.Topic] = topicMem
}

// checkAndTriggerCompaction checks if compaction is needed and triggers it.
func checkAndTriggerCompaction(ctx context.Context, course *models.Course, completedCount int) {
	stepsSinceCompaction := completedCount
	if course.Memory != nil && course.Memory.Compaction != nil {
		stepsSinceCompaction = completedCount - course.Memory.Compaction.LastStepIndex - 1
	}

	if stepsSinceCompaction >= models.CompactionInterval {
		if err := compactMemory(ctx, course, completedCount-1); err != nil {
			fmt.Printf("Warning: memory compaction failed: %v\n", err)
		}
	}
}

// buildStepCompletionUpdates builds Firestore updates for step completion.
func buildStepCompletionUpdates(course *models.Course, completedCount, newProgress int, now int64, outlineModified, courseCompleted bool) []firestore.Update {
	updates := []firestore.Update{
		{Path: "steps", Value: course.Steps},
		{Path: "lessonsCompleted", Value: completedCount},
		{Path: "progress", Value: newProgress},
		{Path: "memory", Value: course.Memory},
		{Path: "updatedAt", Value: now},
		{Path: "lastAccessedAt", Value: now},
	}

	if outlineModified {
		updates = append(updates,
			firestore.Update{Path: "outline", Value: course.Outline},
			firestore.Update{Path: "currentPosition", Value: course.CurrentPosition},
		)
	}

	if courseCompleted {
		updates = append(updates,
			firestore.Update{Path: "status", Value: models.CourseStatusCompleted},
			firestore.Update{Path: "completedAt", Value: now},
		)
		course.Status = models.CourseStatusCompleted
		course.CompletedAt = now
	}

	return updates
}

// triggerCompletionPregeneration triggers pregeneration after step completion.
func triggerCompletionPregeneration(rc *RequestContext, course *models.Course, courseID string, stepIndex int) {
	if pregenerateService == nil {
		return
	}

	pregenerateTier := getUserTierForPregeneration(rc.Ctx, rc.FS, course.UserID)
	pregenerateService.TriggerPregeneration(course, pregenerateTier)

	if appLogger != nil {
		logger.Info(appLogger, rc.Ctx, "pregeneration_triggered_on_complete",
			slog.String("path_id", courseID),
			slog.Int("completed_step_index", stepIndex),
			slog.String("user_tier", pregenerateTier),
		)
	}
}

// =============================================================================
// View Step
// =============================================================================

// viewStep records that a user viewed a completed step (updates lastReviewed).
func viewStep(w http.ResponseWriter, r *http.Request, courseID string, stepID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	step := findStepByID(course.Steps, stepID)
	if step == nil {
		SendError(w, http.StatusNotFound, "STEP_NOT_FOUND", "Step not found")
		return
	}

	// Update memory lastReviewed for this topic
	if course.Memory == nil {
		course.Memory = &models.Memory{Topics: make(map[string]models.TopicMemory)}
	}

	now := time.Now()
	topicMem := course.Memory.Topics[step.Topic]
	topicMem.LastReviewed = now.Format(time.RFC3339)
	course.Memory.Topics[step.Topic] = topicMem

	updates := []firestore.Update{
		{Path: "memory.topics." + step.Topic, Value: topicMem},
		{Path: "lastAccessedAt", Value: now.UnixMilli()},
	}

	if _, err := Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, updates); err != nil {
		SendError(w, http.StatusInternalServerError, "UPDATE_ERROR", fmt.Sprintf("Error updating memory: %v", err))
		return
	}

	SendSuccess(w, map[string]interface{}{
		"success": true,
		"step":    step,
	})
}

// findStepByID finds a step by ID and returns a pointer to it.
func findStepByID(steps []models.Step, stepID string) *models.Step {
	for i := range steps {
		if steps[i].ID == stepID {
			return &steps[i]
		}
	}
	return nil
}

// =============================================================================
// Helper Functions
// =============================================================================

// getRecentSteps returns steps since the last compaction (or all if no compaction).
func getRecentSteps(course *models.Course) []models.Step {
	if course.Memory == nil || course.Memory.Compaction == nil {
		return course.Steps
	}

	lastCompactedIndex := course.Memory.Compaction.LastStepIndex
	if lastCompactedIndex >= len(course.Steps) {
		return []models.Step{}
	}

	return course.Steps[lastCompactedIndex+1:]
}

// isPathReadyForCompletion checks if all steps are completed and quizzes passed.
func isPathReadyForCompletion(course *models.Course) bool {
	if len(course.Steps) == 0 {
		return false
	}

	for _, step := range course.Steps {
		if !step.Completed {
			return false
		}
		// For quiz steps, check if they have a passing score (>= 70%)
		if step.Type == "quiz" && step.Score < 70 {
			return false
		}
	}

	return true
}
