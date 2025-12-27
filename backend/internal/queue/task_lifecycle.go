package queue

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/metrics"
	"google.golang.org/api/iterator"
)

// ClaimTask attempts to claim a task for processing
func (tm *TaskManager) ClaimTask(ctx context.Context, taskID string) (*models.GenerationTask, error) {
	start := time.Now()

	tm.logDebug(ctx, "queue_claim_start",
		slog.String("task_id", taskID),
		slog.String("instance_id", tm.instanceID),
	)

	if tm.fs == nil {
		tm.logError(ctx, "queue_claim_failed",
			slog.String("task_id", taskID),
			slog.String("error", "firestore not available"),
		)
		return nil, fmt.Errorf("firestore not available")
	}

	taskRef := tm.Collection().Doc(taskID)
	var task models.GenerationTask

	// Log transaction start
	tm.logDebug(ctx, "task_claim_transaction_start",
		slog.String("task_id", taskID),
		slog.String("instance_id", tm.instanceID),
	)

	err := tm.fs.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Step 1: Get task
		doc, err := tx.Get(taskRef)
		if err != nil {
			tm.logDebug(ctx, "task_claim_tx_get_failed",
				slog.String("task_id", taskID),
				slog.String("error", err.Error()),
			)
			return err
		}

		// Step 2: Parse task
		if err := doc.DataTo(&task); err != nil {
			tm.logWarn(ctx, "task_claim_tx_parse_failed",
				slog.String("task_id", taskID),
				slog.String("error", err.Error()),
			)
			return err
		}

		// Step 3: Check if claimable
		if !task.CanBeClaimed() {
			logAttrs := []slog.Attr{
				slog.String("task_id", taskID),
				slog.String("status", string(task.Status)),
			}
			if task.Claim != nil {
				logAttrs = append(logAttrs,
					slog.String("claimed_by", task.Claim.ClaimedBy),
					slog.Time("claimed_at", task.Claim.ClaimedAt),
				)
			}
			tm.logDebug(ctx, "task_claim_tx_not_claimable", logAttrs...)
			return fmt.Errorf("task cannot be claimed: status=%s", task.Status)
		}

		// Step 4: Update claim
		claim := models.NewGenerationClaim(tm.instanceID)
		task.SetClaim(claim)

		tm.logDebug(ctx, "task_claim_tx_updating",
			slog.String("task_id", taskID),
			slog.String("instance_id", tm.instanceID),
		)

		return tx.Set(taskRef, task)
	})

	claimDuration := time.Since(start).Milliseconds()

	// Check for transaction errors
	if err != nil {
		// Check if contention error
		errorMsg := err.Error()
		isContention := strings.Contains(errorMsg, "contention") ||
			strings.Contains(errorMsg, "aborted")

		tm.logWarn(ctx, "task_claim_transaction_failed",
			slog.String("task_id", taskID),
			slog.String("instance_id", tm.instanceID),
			slog.String("error", errorMsg),
			slog.Bool("contention", isContention),
			slog.Int64("duration_ms", claimDuration),
		)
		return nil, err
	}

	// Log successful transaction
	tm.logDebug(ctx, "task_claim_transaction_success",
		slog.String("task_id", taskID),
		slog.String("instance_id", tm.instanceID),
		slog.Int64("duration_ms", claimDuration),
	)

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricQueueTasksClaimed).Inc()
	m.Histogram(metrics.MetricQueueClaimDuration).Observe(claimDuration)
	m.Gauge(metrics.MetricQueueWorkersActive).Inc()

	tm.logInfo(ctx, "queue_task_claimed",
		slog.String("task_id", taskID),
		slog.String("task_type", string(task.Type)),
		slog.String("course_id", task.CourseID),
		slog.String("instance_id", tm.instanceID),
		slog.Int("priority", task.Priority),
		slog.Int64("claim_duration_ms", claimDuration),
		slog.Int64("queue_wait_ms", time.Since(task.CreatedAt).Milliseconds()),
	)

	return &task, nil
}

// CompleteTask marks a task as completed
func (tm *TaskManager) CompleteTask(ctx context.Context, taskID string) error {
	start := time.Now()

	tm.logDebug(ctx, "queue_complete_start",
		slog.String("task_id", taskID),
	)

	if tm.fs == nil {
		tm.logError(ctx, "queue_complete_failed",
			slog.String("task_id", taskID),
			slog.String("error", "firestore not available"),
		)
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
		tm.logError(ctx, "queue_complete_failed",
			slog.String("task_id", taskID),
			slog.String("error", err.Error()),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		return err
	}

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricQueueTasksCompleted).Inc()
	m.Gauge(metrics.MetricQueueWorkersActive).Dec()
	m.Histogram(metrics.MetricQueueFirestoreLatency).Observe(time.Since(start).Milliseconds())

	tm.logInfo(ctx, "queue_task_completed",
		slog.String("task_id", taskID),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)

	return nil
}

// FailTask marks a task as failed
func (tm *TaskManager) FailTask(ctx context.Context, taskID, errorMsg string) error {
	start := time.Now()

	if tm.fs == nil {
		tm.logError(ctx, "queue_fail_update_failed",
			slog.String("task_id", taskID),
			slog.String("error", "firestore not available"),
		)
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
		tm.logError(ctx, "queue_fail_update_failed",
			slog.String("task_id", taskID),
			slog.String("original_error", errorMsg),
			slog.String("update_error", err.Error()),
		)
		return err
	}

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricQueueTasksFailed).Inc()
	m.Gauge(metrics.MetricQueueWorkersActive).Dec()

	tm.logWarn(ctx, "queue_task_failed",
		slog.String("task_id", taskID),
		slog.String("error", errorMsg),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)

	return nil
}

// PauseTaskForTokenLimit pauses a task due to token limit
func (tm *TaskManager) PauseTaskForTokenLimit(ctx context.Context, taskID string) error {
	start := time.Now()

	if tm.fs == nil {
		tm.logError(ctx, "queue_pause_failed",
			slog.String("task_id", taskID),
			slog.String("error", "firestore not available"),
		)
		return fmt.Errorf("firestore not available")
	}

	taskRef := tm.Collection().Doc(taskID)

	_, err := taskRef.Update(ctx, []firestore.Update{
		{Path: "status", Value: models.GenerationStatusTokenLimit},
		{Path: "updatedAt", Value: time.Now().UTC()},
		{Path: "claim", Value: nil},
	})

	if err != nil {
		tm.logError(ctx, "queue_pause_failed",
			slog.String("task_id", taskID),
			slog.String("error", err.Error()),
		)
		return err
	}

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricQueueTasksTokenLimit).Inc()
	m.Gauge(metrics.MetricQueueWorkersActive).Dec()

	tm.logWarn(ctx, "queue_task_paused_token_limit",
		slog.String("task_id", taskID),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)

	return nil
}

// GetNextTask fetches the next available task to process
func (tm *TaskManager) GetNextTask(ctx context.Context) (*models.GenerationTask, error) {
	start := time.Now()

	tm.logDebug(ctx, "queue_poll_start",
		slog.String("instance_id", tm.instanceID),
	)

	if tm.fs == nil {
		tm.logError(ctx, "queue_poll_failed",
			slog.String("error", "firestore not available"),
		)
		return nil, fmt.Errorf("firestore not available")
	}

	// Query for pending/queued tasks ordered by priority
	// Log query structure before execution (helps diagnose index issues)
	tm.logDebug(ctx, "queue_query_start",
		slog.String("collection", "queue_tasks"),
		slog.String("filter_status_in", "pending,queued"),
		slog.String("order_by", "priority ASC, createdAt ASC"),
		slog.Int("limit", 10),
	)

	query := tm.Collection().
		Where("status", "in", []string{models.GenerationStatusPending, models.GenerationStatusQueued}).
		OrderBy("priority", firestore.Asc).
		OrderBy("createdAt", firestore.Asc).
		Limit(10)

	iter := query.Documents(ctx)
	defer iter.Stop()

	tasksScanned := 0
	claimAttempts := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			// Check if this is an index-related error
			errorMsg := err.Error()
			isIndexError := strings.Contains(errorMsg, "index") || strings.Contains(errorMsg, "composite")

			tm.logError(ctx, "queue_poll_failed",
				slog.String("error", errorMsg),
				slog.Bool("likely_index_missing", isIndexError),
				slog.String("collection", "queue_tasks"),
				slog.String("query_hint", "status IN [pending,queued] ORDER BY priority,createdAt"),
				slog.Int64("duration_ms", time.Since(start).Milliseconds()),
			)

			// If index error, provide actionable fix suggestion
			if isIndexError {
				tm.logWarn(ctx, "firestore_index_required",
					slog.String("collection", "queue_tasks"),
					slog.String("required_fields", "status, priority, createdAt"),
					slog.String("fix", "Add composite index in firebase/firestore.indexes.json and run 'firebase deploy --only firestore:indexes'"),
				)
			}

			return nil, err
		}

		tasksScanned++

		var task models.GenerationTask
		if err := doc.DataTo(&task); err != nil {
			tm.logDebug(ctx, "queue_poll_parse_error",
				slog.String("doc_id", doc.Ref.ID),
				slog.String("error", err.Error()),
			)
			continue
		}

		if task.CanBeClaimed() {
			claimAttempts++
			// Try to claim this task
			claimed, err := tm.ClaimTask(ctx, task.ID)
			if err == nil {
				tm.logDebug(ctx, "queue_poll_success",
					slog.String("task_id", claimed.ID),
					slog.Int("tasks_scanned", tasksScanned),
					slog.Int("claim_attempts", claimAttempts),
					slog.Int64("duration_ms", time.Since(start).Milliseconds()),
				)
				return claimed, nil
			}
			// If claim failed, try next task
			tm.logDebug(ctx, "queue_poll_claim_contention",
				slog.String("task_id", task.ID),
				slog.String("error", err.Error()),
			)
		}
	}

	// No tasks available
	tm.logDebug(ctx, "queue_poll_empty",
		slog.Int("tasks_scanned", tasksScanned),
		slog.Int("claim_attempts", claimAttempts),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)

	return nil, nil
}
