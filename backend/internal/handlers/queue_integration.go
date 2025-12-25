// Package handlers provides HTTP handlers for the Ishkul API.
//
// This file provides integration with the background task queue system.
// Handlers can use the global TaskManager to queue generation tasks
// instead of performing synchronous LLM calls.
package handlers

import (
	"github.com/mesbahtanvir/ishkul/backend/internal/queue"
)

// Global task manager for queuing generation tasks
var taskManager *queue.TaskManager

// SetTaskManager sets the global TaskManager instance (called from main).
// This allows handlers to queue tasks for background processing.
func SetTaskManager(tm *queue.TaskManager) {
	taskManager = tm
}

// GetTaskManager returns the global TaskManager instance.
// Returns nil if not initialized.
func GetTaskManager() *queue.TaskManager {
	return taskManager
}
