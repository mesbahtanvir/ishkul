package queue

import (
	"context"
	"log/slog"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/metrics"
)

// CreateOutlineTask creates a task to generate a course outline
func (tm *TaskManager) CreateOutlineTask(ctx context.Context, courseID, userID, userTier string) (*models.GenerationTask, error) {
	start := time.Now()
	task := models.NewGenerationTask(models.TaskTypeOutline, models.PriorityMedium, courseID, userID, userTier)

	tm.logDebug(ctx, "queue_enqueue_start",
		slog.String("task_type", string(models.TaskTypeOutline)),
		slog.String("course_id", courseID),
		slog.String("user_id", userID),
		slog.String("user_tier", userTier),
		slog.Int("priority", models.PriorityMedium),
	)

	if err := tm.saveTask(ctx, task); err != nil {
		tm.logError(ctx, "queue_enqueue_failed",
			slog.String("task_type", string(models.TaskTypeOutline)),
			slog.String("course_id", courseID),
			slog.String("error", err.Error()),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		return nil, err
	}

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricQueueTasksEnqueued).Inc()
	m.Counter(metrics.MetricGenerationOutlineTotal).Inc()
	m.Histogram(metrics.MetricQueueFirestoreLatency).Observe(time.Since(start).Milliseconds())

	tm.logInfo(ctx, "queue_task_enqueued",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeOutline)),
		slog.String("course_id", courseID),
		slog.String("user_id", userID),
		slog.String("user_tier", userTier),
		slog.Int("priority", models.PriorityMedium),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)

	return task, nil
}

// CreateBlockSkeletonTask creates a task to generate block skeletons for a lesson
func (tm *TaskManager) CreateBlockSkeletonTask(ctx context.Context, courseID, sectionID, lessonID, userID, userTier string) (*models.GenerationTask, error) {
	start := time.Now()
	task := models.NewGenerationTask(models.TaskTypeBlockSkeleton, models.PriorityHigh, courseID, userID, userTier)
	task.SectionID = sectionID
	task.LessonID = lessonID

	tm.logDebug(ctx, "queue_enqueue_start",
		slog.String("task_type", string(models.TaskTypeBlockSkeleton)),
		slog.String("course_id", courseID),
		slog.String("section_id", sectionID),
		slog.String("lesson_id", lessonID),
		slog.String("user_id", userID),
		slog.Int("priority", models.PriorityHigh),
	)

	if err := tm.saveTask(ctx, task); err != nil {
		tm.logError(ctx, "queue_enqueue_failed",
			slog.String("task_type", string(models.TaskTypeBlockSkeleton)),
			slog.String("course_id", courseID),
			slog.String("lesson_id", lessonID),
			slog.String("error", err.Error()),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		return nil, err
	}

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricQueueTasksEnqueued).Inc()
	m.Counter(metrics.MetricGenerationSkeletonTotal).Inc()
	m.Histogram(metrics.MetricQueueFirestoreLatency).Observe(time.Since(start).Milliseconds())

	tm.logInfo(ctx, "queue_task_enqueued",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeBlockSkeleton)),
		slog.String("course_id", courseID),
		slog.String("section_id", sectionID),
		slog.String("lesson_id", lessonID),
		slog.String("user_id", userID),
		slog.Int("priority", models.PriorityHigh),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)

	return task, nil
}

// CreateBlockContentTask creates a task to generate content for a specific block
func (tm *TaskManager) CreateBlockContentTask(ctx context.Context, courseID, sectionID, lessonID, blockID, userID, userTier string, priority int) (*models.GenerationTask, error) {
	start := time.Now()
	task := models.NewGenerationTask(models.TaskTypeBlockContent, priority, courseID, userID, userTier)
	task.SectionID = sectionID
	task.LessonID = lessonID
	task.BlockID = blockID

	tm.logDebug(ctx, "queue_enqueue_start",
		slog.String("task_type", string(models.TaskTypeBlockContent)),
		slog.String("course_id", courseID),
		slog.String("section_id", sectionID),
		slog.String("lesson_id", lessonID),
		slog.String("block_id", blockID),
		slog.String("user_id", userID),
		slog.Int("priority", priority),
	)

	if err := tm.saveTask(ctx, task); err != nil {
		tm.logError(ctx, "queue_enqueue_failed",
			slog.String("task_type", string(models.TaskTypeBlockContent)),
			slog.String("course_id", courseID),
			slog.String("block_id", blockID),
			slog.String("error", err.Error()),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		return nil, err
	}

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricQueueTasksEnqueued).Inc()
	m.Counter(metrics.MetricGenerationContentTotal).Inc()
	m.Histogram(metrics.MetricQueueFirestoreLatency).Observe(time.Since(start).Milliseconds())

	tm.logInfo(ctx, "queue_task_enqueued",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeBlockContent)),
		slog.String("course_id", courseID),
		slog.String("section_id", sectionID),
		slog.String("lesson_id", lessonID),
		slog.String("block_id", blockID),
		slog.String("user_id", userID),
		slog.Int("priority", priority),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)

	return task, nil
}

// QueuePregeneration queues tasks for pre-generating upcoming blocks within a lesson
func (tm *TaskManager) QueuePregeneration(ctx context.Context, courseID, sectionID, lessonID, userID, userTier string, currentBlockIndex int, blocks []models.Block) error {
	depth := models.PreGenerationDepth
	if depth > len(blocks)-currentBlockIndex-1 {
		depth = len(blocks) - currentBlockIndex - 1
	}

	for i := 1; i <= depth; i++ {
		block := blocks[currentBlockIndex+i]
		if block.ContentStatus == models.ContentStatusPending {
			_, err := tm.CreateBlockContentTask(ctx, courseID, sectionID, lessonID, block.ID, userID, userTier, models.PriorityLow)
			if err != nil {
				tm.logWarn(ctx, "pregeneration_task_failed",
					slog.String("block_id", block.ID),
					slog.String("error", err.Error()),
				)
			}
		}
	}

	return nil
}

// QueueNextLesson queues skeleton generation for the lesson after the given position.
// This enables progressive generation - content is generated just-in-time as user progresses.
// Returns true if a task was queued, false if no queueing was needed (already queued or no more lessons).
func (tm *TaskManager) QueueNextLesson(ctx context.Context, course *models.Course, currentSectionIdx, currentLessonIdx int, userID, userTier string) (bool, error) {
	if course.Outline == nil {
		return false, nil
	}

	// Find next lesson position
	nextSectionIdx := currentSectionIdx
	nextLessonIdx := currentLessonIdx + 1

	// Handle section boundary - move to next section if past end of current
	if nextSectionIdx < len(course.Outline.Sections) &&
		nextLessonIdx >= len(course.Outline.Sections[nextSectionIdx].Lessons) {
		nextSectionIdx++
		nextLessonIdx = 0
	}

	// Check bounds - no more lessons
	if nextSectionIdx >= len(course.Outline.Sections) {
		tm.logDebug(ctx, "progressive_no_more_lessons",
			slog.String("course_id", course.ID),
			slog.Int("current_section", currentSectionIdx),
			slog.Int("current_lesson", currentLessonIdx),
		)
		return false, nil
	}

	nextSection := &course.Outline.Sections[nextSectionIdx]
	if nextLessonIdx >= len(nextSection.Lessons) {
		return false, nil
	}
	nextLesson := &nextSection.Lessons[nextLessonIdx]

	// Only queue if still pending (idempotent - skip if already queued/generating)
	if nextLesson.BlocksStatus != "" && nextLesson.BlocksStatus != models.ContentStatusPending {
		tm.logDebug(ctx, "progressive_already_queued",
			slog.String("course_id", course.ID),
			slog.String("lesson_id", nextLesson.ID),
			slog.String("blocks_status", nextLesson.BlocksStatus),
		)
		return false, nil
	}

	// Queue the next lesson
	_, err := tm.CreateBlockSkeletonTask(ctx, course.ID, nextSection.ID, nextLesson.ID, userID, userTier)
	if err != nil {
		return false, err
	}

	tm.logInfo(ctx, "progressive_lesson_queued",
		slog.String("course_id", course.ID),
		slog.String("from_lesson_idx", slog.IntValue(currentLessonIdx).String()),
		slog.String("queued_section_id", nextSection.ID),
		slog.String("queued_lesson_id", nextLesson.ID),
	)

	return true, nil
}
