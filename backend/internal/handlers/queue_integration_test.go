package handlers

import (
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/queue"
	"github.com/stretchr/testify/assert"
)

func TestSetTaskManager(t *testing.T) {
	// Ensure taskManager is initially nil or we reset it
	originalTM := taskManager
	defer func() { taskManager = originalTM }()

	taskManager = nil

	// Test setting task manager
	tm := queue.NewTaskManager(nil)
	SetTaskManager(tm)

	assert.Equal(t, tm, taskManager)
}

func TestGetTaskManager(t *testing.T) {
	// Save original and restore after test
	originalTM := taskManager
	defer func() { taskManager = originalTM }()

	// Test with nil
	taskManager = nil
	assert.Nil(t, GetTaskManager())

	// Test with valid task manager
	tm := queue.NewTaskManager(nil)
	taskManager = tm
	assert.Equal(t, tm, GetTaskManager())
}

func TestTaskManagerIntegration(t *testing.T) {
	// Save original and restore after test
	originalTM := taskManager
	defer func() { taskManager = originalTM }()

	t.Run("nil task manager returns nil", func(t *testing.T) {
		taskManager = nil
		result := GetTaskManager()
		assert.Nil(t, result)
	})

	t.Run("set and get task manager", func(t *testing.T) {
		tm := queue.NewTaskManager(nil)
		SetTaskManager(tm)

		result := GetTaskManager()
		assert.NotNil(t, result)
		assert.Equal(t, tm, result)
	})

	t.Run("overwrite task manager", func(t *testing.T) {
		tm1 := queue.NewTaskManager(nil)
		tm2 := queue.NewTaskManager(nil)

		SetTaskManager(tm1)
		assert.Same(t, tm1, GetTaskManager())

		SetTaskManager(tm2)
		assert.Same(t, tm2, GetTaskManager())
		assert.NotSame(t, tm1, GetTaskManager())
	})
}
