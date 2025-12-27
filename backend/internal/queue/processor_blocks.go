package queue

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/metrics"
)

// processBlockSkeletonTask processes a block skeleton generation task
func (p *Processor) processBlockSkeletonTask(ctx context.Context, task *models.GenerationTask) error {
	genStart := time.Now()

	p.logDebug(ctx, "llm_generation_start",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeBlockSkeleton)),
		slog.String("course_id", task.CourseID),
		slog.String("lesson_id", task.LessonID),
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

	// Get course from Firestore
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

	if p.generators.GenerateBlockSkeletons == nil {
		return fmt.Errorf("block skeleton generator not configured")
	}

	// Generate block skeletons
	llmStart := time.Now()
	blocks, tokensUsed, err := p.generators.GenerateBlockSkeletons(ctx, &course, task.SectionID, task.LessonID, task.UserTier)
	llmDuration := time.Since(llmStart)

	if err != nil {
		p.logError(ctx, "llm_generation_failed",
			slog.String("task_id", task.ID),
			slog.String("task_type", string(models.TaskTypeBlockSkeleton)),
			slog.String("course_id", task.CourseID),
			slog.String("lesson_id", task.LessonID),
			slog.String("error", err.Error()),
			slog.Int64("llm_duration_ms", llmDuration.Milliseconds()),
		)
		return fmt.Errorf("generate block skeletons: %w", err)
	}

	p.logInfo(ctx, "llm_generation_success",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeBlockSkeleton)),
		slog.String("course_id", task.CourseID),
		slog.String("lesson_id", task.LessonID),
		slog.Int("block_count", len(blocks)),
		slog.Int64("tokens_used", tokensUsed),
		slog.Int64("llm_duration_ms", llmDuration.Milliseconds()),
	)

	// Record token usage
	if tokensUsed > 0 && p.generators.IncrementTokenUsage != nil {
		_, _, _ = p.generators.IncrementTokenUsage(ctx, task.UserID, task.UserTier, tokensUsed, 0)
	}

	// Save blocks to the lesson
	if p.generators.UpdateLessonBlocks == nil {
		return fmt.Errorf("update lesson blocks function not configured")
	}

	if err := p.generators.UpdateLessonBlocks(ctx, task.CourseID, task.SectionID, task.LessonID, blocks, models.ContentStatusReady); err != nil {
		return fmt.Errorf("update lesson blocks: %w", err)
	}

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricGenerationSkeletonSuccess).Inc()

	p.logInfo(ctx, "queue_block_skeletons_generated",
		slog.String("task_id", task.ID),
		slog.String("course_id", task.CourseID),
		slog.String("lesson_id", task.LessonID),
		slog.Int("block_count", len(blocks)),
		slog.Int64("tokens_used", tokensUsed),
		slog.Int64("total_duration_ms", time.Since(genStart).Milliseconds()),
	)

	return nil
}

// processBlockContentTask processes a block content generation task
func (p *Processor) processBlockContentTask(ctx context.Context, task *models.GenerationTask) error {
	genStart := time.Now()

	p.logDebug(ctx, "llm_generation_start",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeBlockContent)),
		slog.String("course_id", task.CourseID),
		slog.String("lesson_id", task.LessonID),
		slog.String("block_id", task.BlockID),
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

	// Get course from Firestore
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

	if p.generators.GenerateBlockContent == nil {
		return fmt.Errorf("block content generator not configured")
	}

	// Generate block content
	llmStart := time.Now()
	content, tokensUsed, err := p.generators.GenerateBlockContent(ctx, &course, task.SectionID, task.LessonID, task.BlockID, task.UserTier)
	llmDuration := time.Since(llmStart)

	if err != nil {
		p.logError(ctx, "llm_generation_failed",
			slog.String("task_id", task.ID),
			slog.String("task_type", string(models.TaskTypeBlockContent)),
			slog.String("course_id", task.CourseID),
			slog.String("block_id", task.BlockID),
			slog.String("error", err.Error()),
			slog.Int64("llm_duration_ms", llmDuration.Milliseconds()),
		)
		return fmt.Errorf("generate block content: %w", err)
	}

	p.logInfo(ctx, "llm_generation_success",
		slog.String("task_id", task.ID),
		slog.String("task_type", string(models.TaskTypeBlockContent)),
		slog.String("course_id", task.CourseID),
		slog.String("block_id", task.BlockID),
		slog.Int64("tokens_used", tokensUsed),
		slog.Int64("llm_duration_ms", llmDuration.Milliseconds()),
	)

	// Record token usage
	if tokensUsed > 0 && p.generators.IncrementTokenUsage != nil {
		_, _, _ = p.generators.IncrementTokenUsage(ctx, task.UserID, task.UserTier, tokensUsed, 0)
	}

	// Save content to the block
	if p.generators.UpdateBlockContent == nil {
		return fmt.Errorf("update block content function not configured")
	}

	if err := p.generators.UpdateBlockContent(ctx, task.CourseID, task.SectionID, task.LessonID, task.BlockID, content, models.ContentStatusReady); err != nil {
		return fmt.Errorf("update block content: %w", err)
	}

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricGenerationContentSuccess).Inc()

	p.logInfo(ctx, "queue_block_content_generated",
		slog.String("task_id", task.ID),
		slog.String("course_id", task.CourseID),
		slog.String("block_id", task.BlockID),
		slog.Int64("tokens_used", tokensUsed),
		slog.Int64("total_duration_ms", time.Since(genStart).Milliseconds()),
	)

	return nil
}
