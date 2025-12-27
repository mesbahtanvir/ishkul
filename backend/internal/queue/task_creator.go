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
