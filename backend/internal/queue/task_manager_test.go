package queue

import (
	"testing"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestNewTaskManager(t *testing.T) {
	tm := NewTaskManager(nil)

	assert.NotNil(t, tm)
	assert.NotEmpty(t, tm.instanceID)
	assert.Nil(t, tm.logger)
}

func TestTaskManager_InstanceID(t *testing.T) {
	tm1 := NewTaskManager(nil)
	tm2 := NewTaskManager(nil)

	// Instance IDs should be unique
	assert.NotEqual(t, tm1.instanceID, tm2.instanceID)
}

func TestTaskManager_CollectionNilFirestore(t *testing.T) {
	tm := NewTaskManager(nil)
	tm.fs = nil

	collection := tm.Collection()
	assert.Nil(t, collection)
}

func TestGenerationTask_CanBeClaimed(t *testing.T) {
	tests := []struct {
		name     string
		task     models.GenerationTask
		expected bool
	}{
		{
			name: "pending task without claim",
			task: models.GenerationTask{
				Status: models.GenerationStatusPending,
				Claim:  nil,
			},
			expected: true,
		},
		{
			name: "queued task without claim",
			task: models.GenerationTask{
				Status: models.GenerationStatusQueued,
				Claim:  nil,
			},
			expected: true,
		},
		{
			name: "pending task with expired claim",
			task: models.GenerationTask{
				Status: models.GenerationStatusPending,
				Claim:  &models.GenerationClaim{}, // Expired by default (zero time)
			},
			expected: true,
		},
		{
			name: "ready task",
			task: models.GenerationTask{
				Status: models.GenerationStatusReady,
			},
			expected: false,
		},
		{
			name: "error task",
			task: models.GenerationTask{
				Status: models.GenerationStatusError,
			},
			expected: false,
		},
		{
			name: "token_limit task",
			task: models.GenerationTask{
				Status: models.GenerationStatusTokenLimit,
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.task.CanBeClaimed()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGenerationClaim_IsValid(t *testing.T) {
	t.Run("nil claim is invalid", func(t *testing.T) {
		var claim *models.GenerationClaim = nil
		assert.False(t, claim.IsValid())
	})

	t.Run("expired claim is invalid", func(t *testing.T) {
		claim := &models.GenerationClaim{}
		assert.False(t, claim.IsValid())
	})

	t.Run("new claim is valid", func(t *testing.T) {
		claim := models.NewGenerationClaim("test-instance")
		assert.True(t, claim.IsValid())
	})
}

func TestGenerationClaim_IsExpired(t *testing.T) {
	t.Run("nil claim is expired", func(t *testing.T) {
		var claim *models.GenerationClaim = nil
		assert.True(t, claim.IsExpired())
	})

	t.Run("zero time claim is expired", func(t *testing.T) {
		claim := &models.GenerationClaim{}
		assert.True(t, claim.IsExpired())
	})

	t.Run("new claim is not expired", func(t *testing.T) {
		claim := models.NewGenerationClaim("test-instance")
		assert.False(t, claim.IsExpired())
	})
}

func TestGenerationClaim_Extend(t *testing.T) {
	claim := models.NewGenerationClaim("test-instance")
	originalVersion := claim.Version

	// Wait a tiny bit to ensure time difference
	time.Sleep(1 * time.Millisecond)

	claim.Extend()

	// Version should increment
	assert.Equal(t, originalVersion+1, claim.Version)
	// Claim should still be valid after extending
	assert.True(t, claim.IsValid())
	assert.False(t, claim.IsExpired())
}

func TestNewGenerationTask(t *testing.T) {
	task := models.NewGenerationTask(
		models.TaskTypeOutline,
		models.PriorityMedium,
		"course-123",
		"user-456",
		"pro",
	)

	assert.NotEmpty(t, task.ID)
	assert.Equal(t, models.TaskTypeOutline, task.Type)
	assert.Equal(t, models.PriorityMedium, task.Priority)
	assert.Equal(t, "course-123", task.CourseID)
	assert.Equal(t, "user-456", task.UserID)
	assert.Equal(t, "pro", task.UserTier)
	assert.Equal(t, models.GenerationStatusPending, task.Status)
	assert.Nil(t, task.Claim)
	assert.False(t, task.CreatedAt.IsZero())
	assert.False(t, task.UpdatedAt.IsZero())
}

func TestGenerationTask_SetClaim(t *testing.T) {
	task := models.NewGenerationTask(
		models.TaskTypeBlockContent,
		models.PriorityHigh,
		"course-123",
		"user-456",
		"free",
	)

	claim := models.NewGenerationClaim("instance-1")
	task.SetClaim(claim)

	assert.Equal(t, claim, task.Claim)
	assert.Equal(t, models.GenerationStatusGenerating, task.Status)
}

func TestGenerationTask_Complete(t *testing.T) {
	task := models.NewGenerationTask(
		models.TaskTypeBlockSkeleton,
		models.PriorityLow,
		"course-123",
		"user-456",
		"pro",
	)
	task.SetClaim(models.NewGenerationClaim("instance-1"))

	task.Complete()

	assert.Equal(t, models.GenerationStatusReady, task.Status)
	assert.NotNil(t, task.CompletedAt)
	assert.Nil(t, task.Claim)
}

func TestGenerationTask_Fail(t *testing.T) {
	task := models.NewGenerationTask(
		models.TaskTypeOutline,
		models.PriorityMedium,
		"course-123",
		"user-456",
		"free",
	)
	task.SetClaim(models.NewGenerationClaim("instance-1"))

	task.Fail("LLM API error")

	assert.Equal(t, models.GenerationStatusError, task.Status)
	assert.Equal(t, "LLM API error", task.Error)
	assert.Nil(t, task.Claim)
}

func TestGenerationTask_PauseForTokenLimit(t *testing.T) {
	task := models.NewGenerationTask(
		models.TaskTypeBlockContent,
		models.PriorityUrgent,
		"course-123",
		"user-456",
		"free",
	)
	task.SetClaim(models.NewGenerationClaim("instance-1"))

	task.PauseForTokenLimit()

	assert.Equal(t, models.GenerationStatusTokenLimit, task.Status)
	assert.Nil(t, task.Claim)
}

func TestTaskTypes(t *testing.T) {
	assert.Equal(t, models.GenerationTaskType("outline"), models.TaskTypeOutline)
	assert.Equal(t, models.GenerationTaskType("block_skeleton"), models.TaskTypeBlockSkeleton)
	assert.Equal(t, models.GenerationTaskType("block_content"), models.TaskTypeBlockContent)
}

func TestPriorityLevels(t *testing.T) {
	// Lower number = higher priority
	assert.Less(t, models.PriorityUrgent, models.PriorityHigh)
	assert.Less(t, models.PriorityHigh, models.PriorityMedium)
	assert.Less(t, models.PriorityMedium, models.PriorityLow)
}
