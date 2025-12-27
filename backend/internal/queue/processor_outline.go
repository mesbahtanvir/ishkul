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

// processOutlineTask processes an outline generation task
func (p *Processor) processOutlineTask(ctx context.Context, task *models.GenerationTask) error {
	genStart := time.Now()

	p.logDebug(ctx, "llm_generation_start",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeOutline)),
		slog.String("course_id", task.CourseID),
		slog.String("user_tier", task.UserTier),
	)

	if p.generators == nil || p.generators.CheckCanGenerate == nil {
		return fmt.Errorf("generator functions not configured")
	}

	// Check token limits first
	canGenerate, dailyUsed, dailyLimit, weeklyUsed, weeklyLimit, limitReached, err := p.generators.CheckCanGenerate(ctx, task.UserID, task.UserTier)
	if err != nil {
		return fmt.Errorf("check token limit: %w", err)
	}

	p.logDebug(ctx, "llm_token_check",
		slog.String("task_id", task.ID),
		slog.Bool("can_generate", canGenerate),
		slog.Int64("daily_used", dailyUsed),
		slog.Int64("daily_limit", dailyLimit),
		slog.Int64("weekly_used", weeklyUsed),
		slog.Int64("weekly_limit", weeklyLimit),
	)

	if !canGenerate {
		return &tokenLimitError{limitType: limitReached}
	}

	// Get course to get the title
	fs := p.taskManager.fs
	if fs == nil {
		return fmt.Errorf("firestore not available")
	}

	courseDoc, err := fs.Collection("courses").Doc(task.CourseID).Get(ctx)
	if err != nil {
		return fmt.Errorf("get course: %w", err)
	}

	var course models.Course
	if err := courseDoc.DataTo(&course); err != nil {
		return fmt.Errorf("parse course: %w", err)
	}

	if p.generators.GenerateCourseOutline == nil {
		return fmt.Errorf("outline generator not configured")
	}

	// Generate outline
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

	// Record token usage
	if tokensUsed > 0 && p.generators.IncrementTokenUsage != nil {
		_, _, _ = p.generators.IncrementTokenUsage(ctx, task.UserID, task.UserTier, tokensUsed, 0)
	}

	// Save outline to course
	_, err = fs.Collection("courses").Doc(task.CourseID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: outline},
		{Path: "outlineStatus", Value: models.OutlineStatusReady},
		{Path: "totalLessons", Value: countLessons(outline)},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	if err != nil {
		return fmt.Errorf("save outline: %w", err)
	}

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
