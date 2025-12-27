package queue

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/metrics"
	"google.golang.org/api/iterator"
)

// RecoverStaleTasks finds and recovers tasks with expired claims
func (tm *TaskManager) RecoverStaleTasks(ctx context.Context) (int, error) {
	start := time.Now()

	tm.logDebug(ctx, "queue_recovery_start",
		slog.String("instance_id", tm.instanceID),
	)

	if tm.fs == nil {
		tm.logError(ctx, "queue_recovery_failed",
			slog.String("error", "firestore not available"),
		)
		return 0, fmt.Errorf("firestore not available")
	}

	// Query for generating tasks (they should have claims)
	query := tm.Collection().
		Where("status", "==", models.GenerationStatusGenerating).
		Limit(100)

	iter := query.Documents(ctx)
	defer iter.Stop()

	recovered := 0
	scanned := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			tm.logError(ctx, "queue_recovery_failed",
				slog.String("error", err.Error()),
				slog.Int("recovered", recovered),
				slog.Int64("duration_ms", time.Since(start).Milliseconds()),
			)
			return recovered, err
		}

		scanned++

		var task models.GenerationTask
		if err := doc.DataTo(&task); err != nil {
			// Log parse error instead of silently skipping
			tm.logDebug(ctx, "queue_recovery_parse_error",
				slog.String("doc_id", doc.Ref.ID),
				slog.String("error", err.Error()),
			)
			continue
		}

		// Check if claim is expired
		if task.Claim != nil && task.Claim.IsExpired() {
			claimAge := time.Since(task.Claim.ClaimedAt).Milliseconds()

			// Reset to queued status
			_, err := doc.Ref.Update(ctx, []firestore.Update{
				{Path: "status", Value: models.GenerationStatusQueued},
				{Path: "claim", Value: nil},
				{Path: "updatedAt", Value: time.Now().UTC()},
			})
			if err == nil {
				recovered++
				// Record metrics
				m := metrics.GetCollector()
				m.Counter(metrics.MetricQueueTasksRecovered).Inc()

				tm.logInfo(ctx, "queue_stale_task_recovered",
					slog.String("task_id", task.ID),
					slog.String("task_type", string(task.Type)),
					slog.String("original_claimer", task.Claim.ClaimedBy),
					slog.Int64("claim_age_ms", claimAge),
				)
			} else {
				tm.logWarn(ctx, "queue_recovery_update_failed",
					slog.String("task_id", task.ID),
					slog.String("error", err.Error()),
				)
			}
		}
	}

	tm.logDebug(ctx, "queue_recovery_complete",
		slog.Int("scanned", scanned),
		slog.Int("recovered", recovered),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)

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
			// Log parse error instead of silently skipping
			tm.logDebug(ctx, "queue_get_tasks_parse_error",
				slog.String("doc_id", doc.Ref.ID),
				slog.String("user_id", userID),
				slog.String("error", err.Error()),
			)
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
			// Log parse error instead of silently skipping
			tm.logDebug(ctx, "queue_get_tasks_parse_error",
				slog.String("doc_id", doc.Ref.ID),
				slog.String("course_id", courseID),
				slog.String("error", err.Error()),
			)
			continue
		}
		tasks = append(tasks, &task)
	}

	return tasks, nil
}
