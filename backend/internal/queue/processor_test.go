package queue

import (
	"context"
	"testing"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestNewProcessor(t *testing.T) {
	tm := &TaskManager{}
	gf := &GeneratorFuncs{}
	config := DefaultProcessorConfig()

	processor := NewProcessor(tm, gf, config, nil)

	assert.NotNil(t, processor)
	assert.Equal(t, tm, processor.taskManager)
	assert.Equal(t, gf, processor.generators)
	assert.Equal(t, config.MaxConcurrent, processor.config.MaxConcurrent)
	assert.False(t, processor.running)
}

func TestDefaultProcessorConfig(t *testing.T) {
	config := DefaultProcessorConfig()

	assert.Equal(t, 3, config.MaxConcurrent)
	assert.Equal(t, 5*time.Second, config.PollInterval)
	assert.Equal(t, models.RecoveryJobInterval, config.RecoveryInterval)
	assert.Equal(t, 5*time.Minute, config.TaskTimeout)
}

func TestProcessor_StartStop(t *testing.T) {
	tm := &TaskManager{}
	gf := &GeneratorFuncs{}
	config := ProcessorConfig{
		MaxConcurrent:    1,
		PollInterval:     100 * time.Millisecond,
		RecoveryInterval: 100 * time.Millisecond,
		TaskTimeout:      1 * time.Second,
	}

	processor := NewProcessor(tm, gf, config, nil)

	// Start processor
	processor.Start()
	assert.True(t, processor.IsRunning())

	// Starting again should be a no-op
	processor.Start()
	assert.True(t, processor.IsRunning())

	// Stop processor
	processor.Stop()
	assert.False(t, processor.IsRunning())

	// Stopping again should be a no-op
	processor.Stop()
	assert.False(t, processor.IsRunning())
}

func TestProcessor_IsRunning(t *testing.T) {
	tm := &TaskManager{}
	gf := &GeneratorFuncs{}
	config := DefaultProcessorConfig()

	processor := NewProcessor(tm, gf, config, nil)

	assert.False(t, processor.IsRunning())

	processor.Start()
	assert.True(t, processor.IsRunning())

	processor.Stop()
	assert.False(t, processor.IsRunning())
}

func TestTokenLimitError(t *testing.T) {
	err := &tokenLimitError{limitType: "daily_tokens"}

	assert.Equal(t, "token limit reached: daily_tokens", err.Error())
	assert.True(t, isTokenLimitError(err))
	assert.False(t, isTokenLimitError(context.DeadlineExceeded))
}

func TestCountLessons(t *testing.T) {
	tests := []struct {
		name     string
		outline  *models.CourseOutline
		expected int
	}{
		{
			name:     "nil outline",
			outline:  nil,
			expected: 0,
		},
		{
			name: "empty sections",
			outline: &models.CourseOutline{
				Sections: []models.Section{},
			},
			expected: 0,
		},
		{
			name: "single section with lessons",
			outline: &models.CourseOutline{
				Sections: []models.Section{
					{
						Lessons: []models.Lesson{
							{ID: "l1"},
							{ID: "l2"},
							{ID: "l3"},
						},
					},
				},
			},
			expected: 3,
		},
		{
			name: "multiple sections with lessons",
			outline: &models.CourseOutline{
				Sections: []models.Section{
					{
						Lessons: []models.Lesson{
							{ID: "l1"},
							{ID: "l2"},
						},
					},
					{
						Lessons: []models.Lesson{
							{ID: "l3"},
							{ID: "l4"},
							{ID: "l5"},
						},
					},
				},
			},
			expected: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := countLessons(tt.outline)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestProcessorConfig_Validation(t *testing.T) {
	config := DefaultProcessorConfig()

	// Ensure default values are reasonable
	assert.Greater(t, config.MaxConcurrent, 0)
	assert.Greater(t, config.PollInterval, time.Duration(0))
	assert.Greater(t, config.RecoveryInterval, time.Duration(0))
	assert.Greater(t, config.TaskTimeout, time.Duration(0))
}

func TestProcessor_GeneratorFuncsNotConfigured(t *testing.T) {
	tm := &TaskManager{}
	config := DefaultProcessorConfig()

	// Test with nil generators
	processor := NewProcessor(tm, nil, config, nil)
	assert.NotNil(t, processor)

	// Test with empty generators (CheckCanGenerate is nil)
	emptyGf := &GeneratorFuncs{}
	processor = NewProcessor(tm, emptyGf, config, nil)
	assert.NotNil(t, processor)
}
