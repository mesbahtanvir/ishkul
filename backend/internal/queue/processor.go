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
	p.mu.Unlock()

	// Start worker goroutines
	for i := 0; i < p.config.MaxConcurrent; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}

	// Start recovery goroutine
	p.wg.Add(1)
	go p.recoveryWorker()

	p.logInfo(context.Background(), "processor_started",
		slog.Int("workers", p.config.MaxConcurrent),
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
	close(p.stopChan)
	p.mu.Unlock()

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
func (p *Processor) worker(id int) {
	defer p.wg.Done()

	ticker := time.NewTicker(p.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-p.stopChan:
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

	p.logInfo(ctx, "processing_task",
		slog.Int("worker_id", workerID),
		slog.String("task_id", task.ID),
		slog.String("type", string(task.Type)),
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

	if processErr != nil {
		// Check if it's a token limit error
		if isTokenLimitError(processErr) {
			_ = p.taskManager.PauseTaskForTokenLimit(ctx, task.ID)
		} else {
			_ = p.taskManager.FailTask(ctx, task.ID, processErr.Error())
		}
		return
	}

	// Mark task as completed
	_ = p.taskManager.CompleteTask(ctx, task.ID)
}

// processOutlineTask processes an outline generation task
func (p *Processor) processOutlineTask(ctx context.Context, task *models.GenerationTask) error {
	if p.generators == nil || p.generators.CheckCanGenerate == nil {
		return fmt.Errorf("generator functions not configured")
	}

	// Check token limits first
	canGenerate, _, _, _, _, limitReached, err := p.generators.CheckCanGenerate(ctx, task.UserID, task.UserTier)
	if err != nil {
		return fmt.Errorf("check token limit: %w", err)
	}
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
	outline, tokensUsed, err := p.generators.GenerateCourseOutline(ctx, course.Title, task.UserTier)
	if err != nil {
		return fmt.Errorf("generate outline: %w", err)
	}

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

	p.logInfo(ctx, "outline_generated",
		slog.String("course_id", task.CourseID),
		slog.Int64("tokens_used", tokensUsed),
	)

	return nil
}

// processBlockSkeletonTask processes a block skeleton generation task
func (p *Processor) processBlockSkeletonTask(ctx context.Context, task *models.GenerationTask) error {
	if p.generators == nil || p.generators.CheckCanGenerate == nil {
		return fmt.Errorf("generator functions not configured")
	}

	// Check token limits first
	canGenerate, _, _, _, _, limitReached, err := p.generators.CheckCanGenerate(ctx, task.UserID, task.UserTier)
	if err != nil {
		return fmt.Errorf("check token limit: %w", err)
	}
	if !canGenerate {
		return &tokenLimitError{limitType: limitReached}
	}

	// This would generate block skeletons for a lesson
	// Implementation depends on the specific generation logic
	p.logInfo(ctx, "block_skeleton_generation_stub",
		slog.String("course_id", task.CourseID),
		slog.String("lesson_id", task.LessonID),
	)

	return nil
}

// processBlockContentTask processes a block content generation task
func (p *Processor) processBlockContentTask(ctx context.Context, task *models.GenerationTask) error {
	if p.generators == nil || p.generators.CheckCanGenerate == nil {
		return fmt.Errorf("generator functions not configured")
	}

	// Check token limits first
	canGenerate, _, _, _, _, limitReached, err := p.generators.CheckCanGenerate(ctx, task.UserID, task.UserTier)
	if err != nil {
		return fmt.Errorf("check token limit: %w", err)
	}
	if !canGenerate {
		return &tokenLimitError{limitType: limitReached}
	}

	// This would generate content for a specific block
	// Implementation depends on the specific generation logic
	p.logInfo(ctx, "block_content_generation_stub",
		slog.String("course_id", task.CourseID),
		slog.String("block_id", task.BlockID),
	)

	return nil
}

// recoveryWorker periodically checks for and recovers stale tasks
func (p *Processor) recoveryWorker() {
	defer p.wg.Done()

	ticker := time.NewTicker(p.config.RecoveryInterval)
	defer ticker.Stop()

	for {
		select {
		case <-p.stopChan:
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
