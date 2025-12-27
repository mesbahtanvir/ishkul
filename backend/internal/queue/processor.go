package queue

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

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
