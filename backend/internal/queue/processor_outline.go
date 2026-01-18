package queue

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/metrics"
)

// ProgressiveLessonBuffer is the number of lessons to pre-generate when outline completes.
// This enables progressive generation: only generate current + next lesson, not all at once.
const ProgressiveLessonBuffer = 2

// processOutlineTask processes an outline generation task.
func (p *Processor) processOutlineTask(ctx context.Context, task *models.GenerationTask) error {
	genStart := time.Now()

	p.logDebug(ctx, "llm_generation_start",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeOutline)),
		slog.String("course_id", task.CourseID),
		slog.String("user_tier", task.UserTier),
	)

	if err := p.verifyTokenLimits(ctx, task); err != nil {
		return err
	}

	course, err := p.fetchCourse(ctx, task.CourseID)
	if err != nil {
		return err
	}

	if p.generators.GenerateCourseOutline == nil {
		return fmt.Errorf("outline generator not configured")
	}

	llmStart := time.Now()
	outline, tokensUsed, err := p.generators.GenerateCourseOutline(ctx, course.Title, task.UserTier)
	llmDuration := time.Since(llmStart)

	if err != nil {
		p.logError(ctx, "llm_generation_failed",
			slog.String("task_id", task.ID),
			slog.String("task_type", string(models.TaskTypeOutline)),
			slog.String("course_id", task.CourseID),
			slog.String("error", err.Error()),
			slog.Int64("llm_duration_ms", llmDuration.Milliseconds()),
		)
		return fmt.Errorf("generate outline: %w", err)
	}

	p.logInfo(ctx, "llm_generation_success",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeOutline)),
		slog.String("course_id", task.CourseID),
		slog.Int64("tokens_used", tokensUsed),
		slog.Int64("llm_duration_ms", llmDuration.Milliseconds()),
	)

	p.recordTokenUsage(ctx, task, tokensUsed)

	// Save outline to course
	fs := p.taskManager.fs
	_, err = fs.Collection("courses").Doc(task.CourseID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: outline},
		{Path: "outlineStatus", Value: models.OutlineStatusReady},
		{Path: "totalLessons", Value: countLessons(outline)},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	if err != nil {
		return fmt.Errorf("save outline: %w", err)
	}

	// Cascade: Queue block skeleton generation for all lessons
	p.queueBlockSkeletonsForOutline(ctx, task, outline)

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricGenerationOutlineSuccess).Inc()

	p.logInfo(ctx, "queue_outline_generated",
		slog.String("task_id", task.ID),
		slog.String("course_id", task.CourseID),
		slog.Int64("tokens_used", tokensUsed),
		slog.Int("total_lessons", countLessons(outline)),
		slog.Int64("total_duration_ms", time.Since(genStart).Milliseconds()),
	)

	return nil
}

// queueBlockSkeletonsForOutline queues block skeleton generation tasks for the first N lessons.
// This enables progressive generation: only generate a buffer of lessons, not all at once.
// Additional lessons are queued on-demand when the user accesses earlier lessons.
func (p *Processor) queueBlockSkeletonsForOutline(ctx context.Context, task *models.GenerationTask, outline *models.CourseOutline) {
	tm := p.taskManager
	tasksQueued := 0
	tasksFailed := 0
	lessonsProcessed := 0

	for _, section := range outline.Sections {
		for _, lesson := range section.Lessons {
			// Stop when buffer is full (progressive generation)
			if lessonsProcessed >= ProgressiveLessonBuffer {
				p.logInfo(ctx, "cascade_skeleton_buffer_reached",
					slog.String("course_id", task.CourseID),
					slog.Int("buffer_size", ProgressiveLessonBuffer),
					slog.Int("total_lessons", countLessons(outline)),
				)
				goto done
			}

			_, err := tm.CreateBlockSkeletonTask(ctx, task.CourseID, section.ID, lesson.ID, task.UserID, task.UserTier)
			if err != nil {
				p.logError(ctx, "cascade_skeleton_queue_failed",
					slog.String("course_id", task.CourseID),
					slog.String("section_id", section.ID),
					slog.String("lesson_id", lesson.ID),
					slog.String("error", err.Error()),
				)
				tasksFailed++
				continue // Don't fail the whole outline for one lesson
			}
			tasksQueued++
			lessonsProcessed++
		}
	}

done:
	p.logInfo(ctx, "cascade_skeleton_tasks_queued",
		slog.String("course_id", task.CourseID),
		slog.Int("tasks_queued", tasksQueued),
		slog.Int("tasks_failed", tasksFailed),
		slog.Int("buffer_limit", ProgressiveLessonBuffer),
	)
}
