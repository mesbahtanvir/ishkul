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
		if _, err := rand.Read(randomBytes); err != nil {
			// Extremely unlikely to fail, but handle it
			instanceID = fmt.Sprintf("local-%d", time.Now().UnixNano())
		} else {
			instanceID = fmt.Sprintf("local-%d-%s", time.Now().UnixNano(), hex.EncodeToString(randomBytes))
		}
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

// saveTask saves a task to Firestore
func (tm *TaskManager) saveTask(ctx context.Context, task *models.GenerationTask) error {
	if tm.fs == nil {
		return fmt.Errorf("firestore not available")
	}

	_, err := tm.Collection().Doc(task.ID).Set(ctx, task)
	return err
}

// logDebug logs a debug message
func (tm *TaskManager) logDebug(ctx context.Context, msg string, attrs ...slog.Attr) {
	if tm.logger != nil {
		logger.Debug(tm.logger, ctx, msg, attrs...)
	}
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

// logError logs an error message
func (tm *TaskManager) logError(ctx context.Context, msg string, attrs ...slog.Attr) {
	if tm.logger != nil {
		logger.Error(tm.logger, ctx, msg, attrs...)
	}
}
