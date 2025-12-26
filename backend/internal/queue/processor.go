package queue

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/mesbahtanvir/ishkul/backend/pkg/metrics"
)

// GeneratorFuncs contains the function callbacks for content generation.
// These are injected to avoid import cycles between queue and handlers.
type GeneratorFuncs struct {
	// CheckCanGenerate checks if a user can generate content based on their token limits.
	// Returns: canGenerate, dailyUsed, dailyLimit, weeklyUsed, weeklyLimit, limitReached, error
	CheckCanGenerate func(ctx context.Context, userID, tier string) (bool, int64, int64, int64, int64, string, error)

	// IncrementTokenUsage increments the token usage for a user.
	// Returns: newDailyTotal, canContinue, error
	IncrementTokenUsage func(ctx context.Context, userID, tier string, inputTokens, outputTokens int64) (int64, bool, error)

	// GenerateCourseOutline generates a course outline.
	// Returns: outline, tokensUsed, error
	GenerateCourseOutline func(ctx context.Context, goal, userTier string) (*models.CourseOutline, int64, error)

	// GenerateBlockSkeletons generates block skeletons for a lesson.
	// Returns: blocks, tokensUsed, error
	GenerateBlockSkeletons func(ctx context.Context, course *models.Course, sectionID, lessonID, userTier string) ([]models.Block, int64, error)

	// GenerateBlockContent generates content for a specific block.
	// Returns: content, tokensUsed, error
	GenerateBlockContent func(ctx context.Context, course *models.Course, sectionID, lessonID, blockID, userTier string) (*models.BlockContent, int64, error)

	// UpdateLessonBlocks updates the blocks for a lesson in Firestore.
	UpdateLessonBlocks func(ctx context.Context, courseID, sectionID, lessonID string, blocks []models.Block, blocksStatus string) error

	// UpdateBlockContent updates the content for a block in Firestore.
	UpdateBlockContent func(ctx context.Context, courseID, sectionID, lessonID, blockID string, content *models.BlockContent, contentStatus string) error
}

// ProcessorConfig contains configuration for the queue processor
type ProcessorConfig struct {
	// MaxConcurrent is the max number of concurrent task processors
	MaxConcurrent int
	// PollInterval is how often to check for new tasks
	PollInterval time.Duration
	// RecoveryInterval is how often to check for stale tasks
	RecoveryInterval time.Duration
	// TaskTimeout is the max time a task can run before being considered stuck
	TaskTimeout time.Duration
}

// DefaultProcessorConfig returns default processor configuration
func DefaultProcessorConfig() ProcessorConfig {
	return ProcessorConfig{
		MaxConcurrent:    3,
		PollInterval:     5 * time.Second,
		RecoveryInterval: models.RecoveryJobInterval,
		TaskTimeout:      5 * time.Minute,
	}
}

// Processor handles processing of generation tasks
type Processor struct {
	taskManager *TaskManager
	generators  *GeneratorFuncs
	config      ProcessorConfig
	logger      *slog.Logger
	stopChan    chan struct{}
	wg          sync.WaitGroup
	running     bool
	mu          sync.Mutex
}

// NewProcessor creates a new queue processor
func NewProcessor(taskManager *TaskManager, generators *GeneratorFuncs, config ProcessorConfig, logger *slog.Logger) *Processor {
	return &Processor{
		taskManager: taskManager,
		generators:  generators,
		config:      config,
		logger:      logger,
		stopChan:    make(chan struct{}),
	}
}

// Start starts the processor
func (p *Processor) Start() {
	p.mu.Lock()
	if p.running {
		p.mu.Unlock()
		return
	}
	p.running = true
	p.stopChan = make(chan struct{})
	stopChan := p.stopChan // Capture the channel before releasing the lock

	// Add to WaitGroup while holding the lock to prevent races with Stop()
	numWorkers := p.config.MaxConcurrent
	p.wg.Add(numWorkers + 1) // workers + recovery worker
	p.mu.Unlock()

	// Start worker goroutines with the captured channel
	for i := 0; i < numWorkers; i++ {
		go p.worker(i, stopChan)
	}

	// Start recovery goroutine with the captured channel
	go p.recoveryWorker(stopChan)

	p.logInfo(context.Background(), "processor_started",
		slog.Int("workers", numWorkers),
	)
}

// Stop stops the processor
func (p *Processor) Stop() {
	p.mu.Lock()
	if !p.running {
		p.mu.Unlock()
		return
	}
	p.running = false
	stopChan := p.stopChan // Capture before closing to avoid race
	p.mu.Unlock()

	close(stopChan)
	p.wg.Wait()
	p.logInfo(context.Background(), "processor_stopped")
}

// IsRunning returns whether the processor is running
func (p *Processor) IsRunning() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.running
}

// worker is a goroutine that processes tasks
func (p *Processor) worker(id int, stopChan <-chan struct{}) {
	defer p.wg.Done()

	ticker := time.NewTicker(p.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-stopChan:
			return
		case <-ticker.C:
			p.processNextTask(id)
		}
	}
}

// processNextTask fetches and processes the next available task
func (p *Processor) processNextTask(workerID int) {
	ctx, cancel := context.WithTimeout(context.Background(), p.config.TaskTimeout)
	defer cancel()

	task, err := p.taskManager.GetNextTask(ctx)
	if err != nil {
		p.logWarn(ctx, "get_next_task_error",
			slog.Int("worker_id", workerID),
			slog.String("error", err.Error()),
		)
		return
	}

	if task == nil {
		// No tasks available
		return
	}

	taskStart := time.Now()

	p.logInfo(ctx, "queue_processing_task",
		slog.Int("worker_id", workerID),
		slog.String("task_id", task.ID),
		slog.String("task_type", string(task.Type)),
		slog.String("course_id", task.CourseID),
		slog.String("user_id", task.UserID),
		slog.Int("priority", task.Priority),
	)

	// Process based on task type
	var processErr error
	switch task.Type {
	case models.TaskTypeOutline:
		processErr = p.processOutlineTask(ctx, task)
	case models.TaskTypeBlockSkeleton:
		processErr = p.processBlockSkeletonTask(ctx, task)
	case models.TaskTypeBlockContent:
		processErr = p.processBlockContentTask(ctx, task)
	default:
		processErr = fmt.Errorf("unknown task type: %s", task.Type)
	}

	taskDuration := time.Since(taskStart)

	// Record task duration metric
	m := metrics.GetCollector()
	m.Histogram(metrics.MetricQueueTaskDuration).Observe(taskDuration.Milliseconds())

	if processErr != nil {
		p.logError(ctx, "queue_task_processing_failed",
			slog.Int("worker_id", workerID),
			slog.String("task_id", task.ID),
			slog.String("task_type", string(task.Type)),
			slog.String("error", processErr.Error()),
			slog.Int64("duration_ms", taskDuration.Milliseconds()),
		)

		// Check if it's a token limit error
		if isTokenLimitError(processErr) {
			_ = p.taskManager.PauseTaskForTokenLimit(ctx, task.ID)
		} else {
			_ = p.taskManager.FailTask(ctx, task.ID, processErr.Error())
		}
		return
	}

	p.logInfo(ctx, "queue_task_processing_success",
		slog.Int("worker_id", workerID),
		slog.String("task_id", task.ID),
		slog.String("task_type", string(task.Type)),
		slog.Int64("duration_ms", taskDuration.Milliseconds()),
	)

	// Mark task as completed
	_ = p.taskManager.CompleteTask(ctx, task.ID)
}

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

// recoveryWorker periodically checks for and recovers stale tasks
func (p *Processor) recoveryWorker(stopChan <-chan struct{}) {
	defer p.wg.Done()

	ticker := time.NewTicker(p.config.RecoveryInterval)
	defer ticker.Stop()

	for {
		select {
		case <-stopChan:
			return
		case <-ticker.C:
			ctx := context.Background()
			recovered, err := p.taskManager.RecoverStaleTasks(ctx)
			if err != nil {
				p.logWarn(ctx, "recovery_error",
					slog.String("error", err.Error()),
				)
			} else if recovered > 0 {
				p.logInfo(ctx, "stale_tasks_recovered",
					slog.Int("count", recovered),
				)
			}
		}
	}
}

// tokenLimitError indicates a token limit was reached
type tokenLimitError struct {
	limitType string
}

func (e *tokenLimitError) Error() string {
	return fmt.Sprintf("token limit reached: %s", e.limitType)
}

// isTokenLimitError checks if an error is a token limit error
func isTokenLimitError(err error) bool {
	_, ok := err.(*tokenLimitError)
	return ok
}

// countLessons counts total lessons in an outline
func countLessons(outline *models.CourseOutline) int {
	if outline == nil {
		return 0
	}
	count := 0
	for _, section := range outline.Sections {
		count += len(section.Lessons)
	}
	return count
}

// logDebug logs a debug message
func (p *Processor) logDebug(ctx context.Context, msg string, attrs ...slog.Attr) {
	if p.logger != nil {
		logger.Debug(p.logger, ctx, msg, attrs...)
	}
}

// logInfo logs an info message
func (p *Processor) logInfo(ctx context.Context, msg string, attrs ...slog.Attr) {
	if p.logger != nil {
		logger.Info(p.logger, ctx, msg, attrs...)
	}
}

// logWarn logs a warning message
func (p *Processor) logWarn(ctx context.Context, msg string, attrs ...slog.Attr) {
	if p.logger != nil {
		logger.Warn(p.logger, ctx, msg, attrs...)
	}
}

// logError logs an error message
func (p *Processor) logError(ctx context.Context, msg string, attrs ...slog.Attr) {
	if p.logger != nil {
		logger.Error(p.logger, ctx, msg, attrs...)
	}
}
