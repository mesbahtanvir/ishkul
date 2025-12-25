package queue

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"google.golang.org/api/iterator"
)

// TaskManager handles creation and management of generation tasks
type TaskManager struct {
	fs         *firestore.Client
	instanceID string
	logger     *slog.Logger
}

// NewTaskManager creates a new TaskManager
func NewTaskManager(logger *slog.Logger) *TaskManager {
	instanceID := os.Getenv("K_REVISION")
	if instanceID == "" {
		// Generate a unique local instance ID using timestamp + random bytes
		randomBytes := make([]byte, 4)
		rand.Read(randomBytes)
		instanceID = fmt.Sprintf("local-%d-%s", time.Now().UnixNano(), hex.EncodeToString(randomBytes))
	}

	return &TaskManager{
		fs:         firebase.GetFirestore(),
		instanceID: instanceID,
		logger:     logger,
	}
}

// Collection returns the queue collection reference
func (tm *TaskManager) Collection() *firestore.CollectionRef {
	if tm.fs == nil {
		return nil
	}
	return tm.fs.Collection("generation_queue")
}

// CreateOutlineTask creates a task to generate a course outline
func (tm *TaskManager) CreateOutlineTask(ctx context.Context, courseID, userID, userTier string) (*models.GenerationTask, error) {
	task := models.NewGenerationTask(models.TaskTypeOutline, models.PriorityMedium, courseID, userID, userTier)

	if err := tm.saveTask(ctx, task); err != nil {
		return nil, err
	}

	tm.logInfo(ctx, "outline_task_created",
		slog.String("task_id", task.ID),
		slog.String("course_id", courseID),
	)

	return task, nil
}

// CreateBlockSkeletonTask creates a task to generate block skeletons for a lesson
func (tm *TaskManager) CreateBlockSkeletonTask(ctx context.Context, courseID, sectionID, lessonID, userID, userTier string) (*models.GenerationTask, error) {
	task := models.NewGenerationTask(models.TaskTypeBlockSkeleton, models.PriorityHigh, courseID, userID, userTier)
	task.SectionID = sectionID
	task.LessonID = lessonID

	if err := tm.saveTask(ctx, task); err != nil {
		return nil, err
	}

	tm.logInfo(ctx, "block_skeleton_task_created",
		slog.String("task_id", task.ID),
		slog.String("course_id", courseID),
		slog.String("lesson_id", lessonID),
	)

	return task, nil
}

// CreateBlockContentTask creates a task to generate content for a specific block
func (tm *TaskManager) CreateBlockContentTask(ctx context.Context, courseID, sectionID, lessonID, blockID, userID, userTier string, priority int) (*models.GenerationTask, error) {
	task := models.NewGenerationTask(models.TaskTypeBlockContent, priority, courseID, userID, userTier)
	task.SectionID = sectionID
	task.LessonID = lessonID
	task.BlockID = blockID

	if err := tm.saveTask(ctx, task); err != nil {
		return nil, err
	}

	tm.logInfo(ctx, "block_content_task_created",
		slog.String("task_id", task.ID),
		slog.String("course_id", courseID),
		slog.String("block_id", blockID),
		slog.Int("priority", priority),
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

// ClaimTask attempts to claim a task for processing
func (tm *TaskManager) ClaimTask(ctx context.Context, taskID string) (*models.GenerationTask, error) {
	if tm.fs == nil {
		return nil, fmt.Errorf("firestore not available")
	}

	taskRef := tm.Collection().Doc(taskID)
	var task models.GenerationTask

	err := tm.fs.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(taskRef)
		if err != nil {
			return err
		}

		if err := doc.DataTo(&task); err != nil {
			return err
		}

		if !task.CanBeClaimed() {
			return fmt.Errorf("task cannot be claimed: status=%s", task.Status)
		}

		claim := models.NewGenerationClaim(tm.instanceID)
		task.SetClaim(claim)

		return tx.Set(taskRef, task)
	})

	if err != nil {
		return nil, err
	}

	tm.logInfo(ctx, "task_claimed",
		slog.String("task_id", taskID),
		slog.String("instance_id", tm.instanceID),
	)

	return &task, nil
}

// CompleteTask marks a task as completed
func (tm *TaskManager) CompleteTask(ctx context.Context, taskID string) error {
	if tm.fs == nil {
		return fmt.Errorf("firestore not available")
	}

	taskRef := tm.Collection().Doc(taskID)

	_, err := taskRef.Update(ctx, []firestore.Update{
		{Path: "status", Value: models.GenerationStatusReady},
		{Path: "completedAt", Value: time.Now().UTC()},
		{Path: "updatedAt", Value: time.Now().UTC()},
		{Path: "claim", Value: nil},
	})

	if err != nil {
		return err
	}

	tm.logInfo(ctx, "task_completed",
		slog.String("task_id", taskID),
	)

	return nil
}

// FailTask marks a task as failed
func (tm *TaskManager) FailTask(ctx context.Context, taskID, errorMsg string) error {
	if tm.fs == nil {
		return fmt.Errorf("firestore not available")
	}

	taskRef := tm.Collection().Doc(taskID)

	_, err := taskRef.Update(ctx, []firestore.Update{
		{Path: "status", Value: models.GenerationStatusError},
		{Path: "error", Value: errorMsg},
		{Path: "updatedAt", Value: time.Now().UTC()},
		{Path: "claim", Value: nil},
	})

	if err != nil {
		return err
	}

	tm.logWarn(ctx, "task_failed",
		slog.String("task_id", taskID),
		slog.String("error", errorMsg),
	)

	return nil
}

// PauseTaskForTokenLimit pauses a task due to token limit
func (tm *TaskManager) PauseTaskForTokenLimit(ctx context.Context, taskID string) error {
	if tm.fs == nil {
		return fmt.Errorf("firestore not available")
	}

	taskRef := tm.Collection().Doc(taskID)

	_, err := taskRef.Update(ctx, []firestore.Update{
		{Path: "status", Value: models.GenerationStatusTokenLimit},
		{Path: "updatedAt", Value: time.Now().UTC()},
		{Path: "claim", Value: nil},
	})

	if err != nil {
		return err
	}

	tm.logInfo(ctx, "task_paused_token_limit",
		slog.String("task_id", taskID),
	)

	return nil
}

// GetNextTask fetches the next available task to process
func (tm *TaskManager) GetNextTask(ctx context.Context) (*models.GenerationTask, error) {
	if tm.fs == nil {
		return nil, fmt.Errorf("firestore not available")
	}

	// Query for pending/queued tasks ordered by priority
	query := tm.Collection().
		Where("status", "in", []string{models.GenerationStatusPending, models.GenerationStatusQueued}).
		OrderBy("priority", firestore.Asc).
		OrderBy("createdAt", firestore.Asc).
		Limit(10)

	iter := query.Documents(ctx)
	defer iter.Stop()

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var task models.GenerationTask
		if err := doc.DataTo(&task); err != nil {
			continue
		}

		if task.CanBeClaimed() {
			// Try to claim this task
			claimed, err := tm.ClaimTask(ctx, task.ID)
			if err == nil {
				return claimed, nil
			}
			// If claim failed, try next task
		}
	}

	return nil, nil // No tasks available
}

// RecoverStaleTasks finds and recovers tasks with expired claims
func (tm *TaskManager) RecoverStaleTasks(ctx context.Context) (int, error) {
	if tm.fs == nil {
		return 0, fmt.Errorf("firestore not available")
	}

	// Query for generating tasks (they should have claims)
	query := tm.Collection().
		Where("status", "==", models.GenerationStatusGenerating).
		Limit(100)

	iter := query.Documents(ctx)
	defer iter.Stop()

	recovered := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return recovered, err
		}

		var task models.GenerationTask
		if err := doc.DataTo(&task); err != nil {
			continue
		}

		// Check if claim is expired
		if task.Claim != nil && task.Claim.IsExpired() {
			// Reset to queued status
			_, err := doc.Ref.Update(ctx, []firestore.Update{
				{Path: "status", Value: models.GenerationStatusQueued},
				{Path: "claim", Value: nil},
				{Path: "updatedAt", Value: time.Now().UTC()},
			})
			if err == nil {
				recovered++
				tm.logInfo(ctx, "stale_task_recovered",
					slog.String("task_id", task.ID),
				)
			}
		}
	}

	return recovered, nil
}

// GetTasksByUser returns all tasks for a specific user
func (tm *TaskManager) GetTasksByUser(ctx context.Context, userID string) ([]*models.GenerationTask, error) {
	if tm.fs == nil {
		return nil, fmt.Errorf("firestore not available")
	}

	query := tm.Collection().
		Where("userId", "==", userID).
		OrderBy("createdAt", firestore.Desc).
		Limit(50)

	iter := query.Documents(ctx)
	defer iter.Stop()

	var tasks []*models.GenerationTask
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var task models.GenerationTask
		if err := doc.DataTo(&task); err != nil {
			continue
		}
		tasks = append(tasks, &task)
	}

	return tasks, nil
}

// GetTasksByCourse returns all tasks for a specific course
func (tm *TaskManager) GetTasksByCourse(ctx context.Context, courseID string) ([]*models.GenerationTask, error) {
	if tm.fs == nil {
		return nil, fmt.Errorf("firestore not available")
	}

	query := tm.Collection().
		Where("courseId", "==", courseID).
		OrderBy("createdAt", firestore.Desc).
		Limit(50)

	iter := query.Documents(ctx)
	defer iter.Stop()

	var tasks []*models.GenerationTask
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var task models.GenerationTask
		if err := doc.DataTo(&task); err != nil {
			continue
		}
		tasks = append(tasks, &task)
	}

	return tasks, nil
}

// saveTask saves a task to Firestore
func (tm *TaskManager) saveTask(ctx context.Context, task *models.GenerationTask) error {
	if tm.fs == nil {
		return fmt.Errorf("firestore not available")
	}

	_, err := tm.Collection().Doc(task.ID).Set(ctx, task)
	return err
}

// logInfo logs an info message
func (tm *TaskManager) logInfo(ctx context.Context, msg string, attrs ...slog.Attr) {
	if tm.logger != nil {
		logger.Info(tm.logger, ctx, msg, attrs...)
	}
}

// logWarn logs a warning message
func (tm *TaskManager) logWarn(ctx context.Context, msg string, attrs ...slog.Attr) {
	if tm.logger != nil {
		logger.Warn(tm.logger, ctx, msg, attrs...)
	}
}
