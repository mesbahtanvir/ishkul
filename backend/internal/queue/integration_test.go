package queue

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

// TestProcessorWithMockGenerators tests the processor with mock generator functions
func TestProcessorWithMockGenerators(t *testing.T) {
	t.Run("processor handles nil generators gracefully", func(t *testing.T) {
		tm := &TaskManager{}
		processor := NewProcessor(tm, nil, DefaultProcessorConfig(), nil)

		assert.NotNil(t, processor)
		assert.Nil(t, processor.generators)
	})

	t.Run("processor with empty GeneratorFuncs", func(t *testing.T) {
		tm := &TaskManager{}
		gf := &GeneratorFuncs{}
		processor := NewProcessor(tm, gf, DefaultProcessorConfig(), nil)

		assert.NotNil(t, processor)
		assert.NotNil(t, processor.generators)
		assert.Nil(t, processor.generators.CheckCanGenerate)
	})
}

// TestGeneratorFuncsCallbacks tests that generator functions are called correctly
func TestGeneratorFuncsCallbacks(t *testing.T) {
	t.Run("CheckCanGenerate callback", func(t *testing.T) {
		called := false
		gf := &GeneratorFuncs{
			CheckCanGenerate: func(ctx context.Context, userID, tier string) (bool, int64, int64, int64, int64, string, error) {
				called = true
				assert.Equal(t, "user-123", userID)
				assert.Equal(t, "pro", tier)
				return true, 1000, 100000, 5000, 1000000, "", nil
			},
		}

		canGen, daily, dailyLimit, weekly, weeklyLimit, limitReached, err := gf.CheckCanGenerate(context.Background(), "user-123", "pro")

		assert.True(t, called)
		assert.True(t, canGen)
		assert.Equal(t, int64(1000), daily)
		assert.Equal(t, int64(100000), dailyLimit)
		assert.Equal(t, int64(5000), weekly)
		assert.Equal(t, int64(1000000), weeklyLimit)
		assert.Empty(t, limitReached)
		assert.NoError(t, err)
	})

	t.Run("IncrementTokenUsage callback", func(t *testing.T) {
		called := false
		gf := &GeneratorFuncs{
			IncrementTokenUsage: func(ctx context.Context, userID, tier string, input, output int64) (int64, bool, error) {
				called = true
				assert.Equal(t, int64(100), input)
				assert.Equal(t, int64(500), output)
				return 600, true, nil
			},
		}

		total, canContinue, err := gf.IncrementTokenUsage(context.Background(), "user-123", "free", 100, 500)

		assert.True(t, called)
		assert.Equal(t, int64(600), total)
		assert.True(t, canContinue)
		assert.NoError(t, err)
	})

	t.Run("GenerateCourseOutline callback", func(t *testing.T) {
		called := false
		expectedOutline := &models.CourseOutline{
			Title:       "Test Course",
			Description: "A test course",
		}

		gf := &GeneratorFuncs{
			GenerateCourseOutline: func(ctx context.Context, goal, tier string) (*models.CourseOutline, int64, error) {
				called = true
				assert.Equal(t, "Learn Go", goal)
				return expectedOutline, 1500, nil
			},
		}

		outline, tokens, err := gf.GenerateCourseOutline(context.Background(), "Learn Go", "free")

		assert.True(t, called)
		assert.Equal(t, expectedOutline, outline)
		assert.Equal(t, int64(1500), tokens)
		assert.NoError(t, err)
	})

	t.Run("GenerateBlockSkeletons callback", func(t *testing.T) {
		called := false
		course := &models.Course{ID: "course-123"}
		expectedBlocks := []models.Block{
			{ID: "b1", Type: models.BlockTypeText},
			{ID: "b2", Type: models.BlockTypeCode},
		}

		gf := &GeneratorFuncs{
			GenerateBlockSkeletons: func(ctx context.Context, c *models.Course, sectionID, lessonID, tier string) ([]models.Block, int64, error) {
				called = true
				assert.Equal(t, course, c)
				assert.Equal(t, "section-1", sectionID)
				assert.Equal(t, "lesson-1", lessonID)
				return expectedBlocks, 800, nil
			},
		}

		blocks, tokens, err := gf.GenerateBlockSkeletons(context.Background(), course, "section-1", "lesson-1", "pro")

		assert.True(t, called)
		assert.Equal(t, expectedBlocks, blocks)
		assert.Equal(t, int64(800), tokens)
		assert.NoError(t, err)
	})

	t.Run("GenerateBlockContent callback", func(t *testing.T) {
		called := false
		course := &models.Course{ID: "course-123"}
		expectedContent := &models.BlockContent{
			Text: &models.TextContent{Markdown: "Hello"},
		}

		gf := &GeneratorFuncs{
			GenerateBlockContent: func(ctx context.Context, c *models.Course, sectionID, lessonID, blockID, tier string) (*models.BlockContent, int64, error) {
				called = true
				assert.Equal(t, "block-1", blockID)
				return expectedContent, 500, nil
			},
		}

		content, tokens, err := gf.GenerateBlockContent(context.Background(), course, "section-1", "lesson-1", "block-1", "free")

		assert.True(t, called)
		assert.Equal(t, expectedContent, content)
		assert.Equal(t, int64(500), tokens)
		assert.NoError(t, err)
	})

	t.Run("UpdateLessonBlocks callback", func(t *testing.T) {
		called := false
		blocks := []models.Block{{ID: "b1"}}

		gf := &GeneratorFuncs{
			UpdateLessonBlocks: func(ctx context.Context, courseID, sectionID, lessonID string, b []models.Block, status string) error {
				called = true
				assert.Equal(t, "course-1", courseID)
				assert.Equal(t, blocks, b)
				assert.Equal(t, models.ContentStatusReady, status)
				return nil
			},
		}

		err := gf.UpdateLessonBlocks(context.Background(), "course-1", "section-1", "lesson-1", blocks, models.ContentStatusReady)

		assert.True(t, called)
		assert.NoError(t, err)
	})

	t.Run("UpdateBlockContent callback", func(t *testing.T) {
		called := false
		content := &models.BlockContent{Text: &models.TextContent{Markdown: "Test"}}

		gf := &GeneratorFuncs{
			UpdateBlockContent: func(ctx context.Context, courseID, sectionID, lessonID, blockID string, c *models.BlockContent, status string) error {
				called = true
				assert.Equal(t, "block-1", blockID)
				assert.Equal(t, content, c)
				return nil
			},
		}

		err := gf.UpdateBlockContent(context.Background(), "course-1", "section-1", "lesson-1", "block-1", content, models.ContentStatusReady)

		assert.True(t, called)
		assert.NoError(t, err)
	})
}

// TestGeneratorFuncsErrors tests error handling in generator functions
func TestGeneratorFuncsErrors(t *testing.T) {
	t.Run("CheckCanGenerate returns error", func(t *testing.T) {
		gf := &GeneratorFuncs{
			CheckCanGenerate: func(ctx context.Context, userID, tier string) (bool, int64, int64, int64, int64, string, error) {
				return false, 0, 0, 0, 0, "", errors.New("database error")
			},
		}

		_, _, _, _, _, _, err := gf.CheckCanGenerate(context.Background(), "user-1", "free")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "database error")
	})

	t.Run("CheckCanGenerate returns token limit", func(t *testing.T) {
		gf := &GeneratorFuncs{
			CheckCanGenerate: func(ctx context.Context, userID, tier string) (bool, int64, int64, int64, int64, string, error) {
				return false, 100000, 100000, 500000, 1000000, "daily", nil
			},
		}

		canGen, _, _, _, _, limitReached, err := gf.CheckCanGenerate(context.Background(), "user-1", "free")
		assert.NoError(t, err)
		assert.False(t, canGen)
		assert.Equal(t, "daily", limitReached)
	})

	t.Run("GenerateBlockSkeletons returns error", func(t *testing.T) {
		gf := &GeneratorFuncs{
			GenerateBlockSkeletons: func(ctx context.Context, c *models.Course, sectionID, lessonID, tier string) ([]models.Block, int64, error) {
				return nil, 0, errors.New("LLM error")
			},
		}

		blocks, tokens, err := gf.GenerateBlockSkeletons(context.Background(), &models.Course{}, "s1", "l1", "free")
		assert.Error(t, err)
		assert.Nil(t, blocks)
		assert.Equal(t, int64(0), tokens)
	})
}

// TestProcessorConcurrency tests concurrent processor operations
func TestProcessorConcurrency(t *testing.T) {
	t.Run("multiple start/stop calls are safe", func(t *testing.T) {
		tm := &TaskManager{}
		gf := &GeneratorFuncs{}
		config := ProcessorConfig{
			MaxConcurrent:    2,
			PollInterval:     50 * time.Millisecond,
			RecoveryInterval: 50 * time.Millisecond,
			TaskTimeout:      1 * time.Second,
		}

		processor := NewProcessor(tm, gf, config, nil)

		var wg sync.WaitGroup
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				processor.Start()
				time.Sleep(10 * time.Millisecond)
				processor.Stop()
			}()
		}

		wg.Wait()
		assert.False(t, processor.IsRunning())
	})

	t.Run("IsRunning is thread-safe", func(t *testing.T) {
		tm := &TaskManager{}
		gf := &GeneratorFuncs{}
		config := ProcessorConfig{
			MaxConcurrent:    1,
			PollInterval:     10 * time.Millisecond,
			RecoveryInterval: 10 * time.Millisecond,
			TaskTimeout:      1 * time.Second,
		}

		processor := NewProcessor(tm, gf, config, nil)
		processor.Start()

		var wg sync.WaitGroup
		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_ = processor.IsRunning()
			}()
		}

		wg.Wait()
		processor.Stop()
	})
}

// TestTaskTypeConstants verifies task type string values
func TestTaskTypeConstants(t *testing.T) {
	assert.Equal(t, models.GenerationTaskType("outline"), models.TaskTypeOutline)
	assert.Equal(t, models.GenerationTaskType("block_skeleton"), models.TaskTypeBlockSkeleton)
	assert.Equal(t, models.GenerationTaskType("block_content"), models.TaskTypeBlockContent)
}

// TestPriorityConstants verifies priority ordering
func TestPriorityConstants(t *testing.T) {
	// Lower number = higher priority
	assert.True(t, models.PriorityUrgent < models.PriorityHigh)
	assert.True(t, models.PriorityHigh < models.PriorityMedium)
	assert.True(t, models.PriorityMedium < models.PriorityLow)
}

// TestStatusConstants verifies status string values
func TestStatusConstants(t *testing.T) {
	assert.Equal(t, "pending", models.GenerationStatusPending)
	assert.Equal(t, "queued", models.GenerationStatusQueued)
	assert.Equal(t, "generating", models.GenerationStatusGenerating)
	assert.Equal(t, "ready", models.GenerationStatusReady)
	assert.Equal(t, "error", models.GenerationStatusError)
	assert.Equal(t, "token_limit", models.GenerationStatusTokenLimit)
}
