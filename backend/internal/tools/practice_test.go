package tools

import (
	"strings"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// PracticeTool Metadata Tests
// =============================================================================

func TestPracticeToolMetadata(t *testing.T) {
	tool := &PracticeTool{}
	meta := tool.Metadata()

	t.Run("has correct ID", func(t *testing.T) {
		assert.Equal(t, "practice", meta.ID)
	})

	t.Run("has correct name", func(t *testing.T) {
		assert.Equal(t, "Practice", meta.Name)
	})

	t.Run("has icon", func(t *testing.T) {
		assert.Equal(t, "💪", meta.Icon)
	})

	t.Run("has description", func(t *testing.T) {
		assert.NotEmpty(t, meta.Description)
		assert.Contains(t, meta.Description, "exercise")
	})

	t.Run("has target minutes", func(t *testing.T) {
		assert.Equal(t, 5, meta.TargetMinutes)
	})

	t.Run("is not embeddable", func(t *testing.T) {
		assert.False(t, meta.Embeddable)
	})
}

// =============================================================================
// PracticeTool Schema Tests
// =============================================================================

func TestPracticeToolSchema(t *testing.T) {
	tool := &PracticeTool{}
	schema := tool.Schema()

	t.Run("has JSON schema properties", func(t *testing.T) {
		assert.NotEmpty(t, schema.Schema)
		assert.Equal(t, "practice", schema.ID)
		assert.NotEmpty(t, schema.Title)
		assert.Equal(t, "object", schema.Type)
	})

	t.Run("has required properties", func(t *testing.T) {
		assert.Contains(t, schema.Required, "task")
		assert.Contains(t, schema.Required, "topic")
		assert.Contains(t, schema.Required, "title")
	})

	t.Run("defines task property", func(t *testing.T) {
		prop, ok := schema.Properties["task"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Equal(t, 20, prop.MinLength)
		assert.Equal(t, 500, prop.MaxLength)
	})

	t.Run("defines hints property", func(t *testing.T) {
		prop, ok := schema.Properties["hints"]
		require.True(t, ok)
		assert.Equal(t, "array", prop.Type)
		assert.NotNil(t, prop.Items)
		assert.Equal(t, "string", prop.Items.Type)
		assert.Equal(t, 0, prop.MinItems)
		assert.Equal(t, 3, prop.MaxItems)
	})

	t.Run("defines successCriteria property", func(t *testing.T) {
		prop, ok := schema.Properties["successCriteria"]
		require.True(t, ok)
		assert.Equal(t, "array", prop.Type)
		assert.NotNil(t, prop.Items)
		assert.Equal(t, 1, prop.MinItems)
		assert.Equal(t, 3, prop.MaxItems)
	})

	t.Run("defines estimatedTime property", func(t *testing.T) {
		prop, ok := schema.Properties["estimatedTime"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Equal(t, 20, prop.MaxLength)
	})

	t.Run("defines topic property", func(t *testing.T) {
		prop, ok := schema.Properties["topic"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
	})

	t.Run("defines title property", func(t *testing.T) {
		prop, ok := schema.Properties["title"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
	})
}

// =============================================================================
// PracticeTool PromptFile Tests
// =============================================================================

func TestPracticeToolPromptFile(t *testing.T) {
	tool := &PracticeTool{}

	t.Run("returns correct prompt file path", func(t *testing.T) {
		path := tool.PromptFile()
		assert.Equal(t, "learning/tools/practice", path)
	})
}

// =============================================================================
// PracticeTool ParseContent Tests
// =============================================================================

func TestPracticeToolParseContent(t *testing.T) {
	tool := &PracticeTool{}

	t.Run("parses valid practice content", func(t *testing.T) {
		content := `{
			"topic": "Go Programming",
			"title": "Write a Function",
			"task": "Write a function that calculates the factorial of a number. The function should handle edge cases like negative numbers.",
			"hints": ["Start with the base case", "Use recursion or iteration"],
			"successCriteria": ["Function returns correct values", "Handles edge cases"],
			"estimatedTime": "5 minutes"
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)

		require.NoError(t, err)
		assert.Equal(t, models.BlockTypeTask, block.Type)
		assert.Equal(t, "Write a Function", block.Title)
		require.NotNil(t, block.Content)
		require.NotNil(t, block.Content.Task)
		assert.Contains(t, block.Content.Task.Instruction, "factorial")
		assert.Equal(t, models.FlexStringSlice{"Start with the base case", "Use recursion or iteration"}, block.Content.Task.Hints)
	})

	t.Run("parses content without optional hints", func(t *testing.T) {
		content := `{
			"topic": "Testing",
			"title": "Write Tests",
			"task": "Write unit tests for the calculator add function"
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)

		require.NoError(t, err)
		assert.Equal(t, models.BlockTypeTask, block.Type)
		require.NotNil(t, block.Content)
		require.NotNil(t, block.Content.Task)
		assert.Nil(t, block.Content.Task.Hints)
	})

	t.Run("parses content with empty hints array", func(t *testing.T) {
		content := `{
			"topic": "Testing",
			"title": "Write Tests",
			"task": "Write unit tests for the calculator add function",
			"hints": []
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)

		require.NoError(t, err)
		require.NotNil(t, block.Content)
		require.NotNil(t, block.Content.Task)
		assert.Empty(t, block.Content.Task.Hints)
	})

	t.Run("returns error for invalid JSON", func(t *testing.T) {
		content := `{invalid json}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse practice content")
	})

	t.Run("returns error for empty content", func(t *testing.T) {
		content := ``

		block := &models.Block{}
		err := tool.ParseContent(content, block)

		assert.Error(t, err)
	})

	t.Run("handles unicode content", func(t *testing.T) {
		content := `{
			"topic": "日本語プログラミング",
			"title": "関数を書く",
			"task": "数値を受け取り、その階乗を計算する関数を書いてください。エッジケースも考慮してください。",
			"hints": ["基本ケースから始める", "再帰か反復を使う"]
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)

		require.NoError(t, err)
		assert.Equal(t, "関数を書く", block.Title)
		require.NotNil(t, block.Content)
		require.NotNil(t, block.Content.Task)
		assert.Contains(t, block.Content.Task.Instruction, "階乗")
	})

	t.Run("handles code snippets in task", func(t *testing.T) {
		content := `{
			"topic": "Go",
			"title": "Fix the Bug",
			"task": "Fix the bug in this code:\n\nfunc add(a, b int) {\n    return a + b\n}\n\nThe function should return the sum."
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)

		require.NoError(t, err)
		require.NotNil(t, block.Content)
		require.NotNil(t, block.Content.Task)
		assert.Contains(t, block.Content.Task.Instruction, "func add")
		assert.Contains(t, block.Content.Task.Instruction, "return a + b")
	})
}

// =============================================================================
// PracticeTool Validate Tests
// =============================================================================

func TestPracticeToolValidate(t *testing.T) {
	tool := &PracticeTool{}

	t.Run("validates valid block", func(t *testing.T) {
		block := &models.Block{
			Content: &models.BlockContent{
				Task: &models.TaskContent{
					Instruction: "Write a function that calculates the sum of two numbers and returns the result",
				},
			},
		}

		err := tool.Validate(block)
		assert.NoError(t, err)
	})

	t.Run("returns error for empty task", func(t *testing.T) {
		block := &models.Block{
			Content: &models.BlockContent{
				Task: &models.TaskContent{
					Instruction: "",
				},
			},
		}

		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "task instruction is required")
	})

	t.Run("returns error for nil content", func(t *testing.T) {
		block := &models.Block{
			Content: nil,
		}

		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "task instruction is required")
	})

	t.Run("returns error for short task", func(t *testing.T) {
		block := &models.Block{
			Content: &models.BlockContent{
				Task: &models.TaskContent{
					Instruction: "Short task",
				},
			},
		}

		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "task too short")
	})

	t.Run("validates task with exactly 20 characters", func(t *testing.T) {
		block := &models.Block{
			Content: &models.BlockContent{
				Task: &models.TaskContent{
					Instruction: strings.Repeat("a", 20),
				},
			},
		}

		err := tool.Validate(block)
		assert.NoError(t, err)
	})

	t.Run("rejects task with 19 characters", func(t *testing.T) {
		block := &models.Block{
			Content: &models.BlockContent{
				Task: &models.TaskContent{
					Instruction: strings.Repeat("a", 19),
				},
			},
		}

		err := tool.Validate(block)
		assert.Error(t, err)
	})

	t.Run("validates long task", func(t *testing.T) {
		block := &models.Block{
			Content: &models.BlockContent{
				Task: &models.TaskContent{
					Instruction: strings.Repeat("a", 500),
				},
			},
		}

		err := tool.Validate(block)
		assert.NoError(t, err)
	})
}

// =============================================================================
// PracticeData Tests
// =============================================================================

func TestPracticeData(t *testing.T) {
	t.Run("struct has correct fields", func(t *testing.T) {
		data := PracticeData{
			BaseToolData: BaseToolData{
				Type:  "practice",
				Topic: "Go",
				Title: "Practice Title",
			},
			Task:            "Complete the exercise",
			Hints:           []string{"Hint 1", "Hint 2"},
			SuccessCriteria: []string{"Criteria 1"},
			EstimatedTime:   "5 minutes",
		}

		assert.Equal(t, "practice", data.Type)
		assert.Equal(t, "Go", data.Topic)
		assert.Equal(t, "Practice Title", data.Title)
		assert.Equal(t, "Complete the exercise", data.Task)
		assert.Len(t, data.Hints, 2)
		assert.Len(t, data.SuccessCriteria, 1)
		assert.Equal(t, "5 minutes", data.EstimatedTime)
	})

	t.Run("optional fields can be empty", func(t *testing.T) {
		data := PracticeData{
			BaseToolData: BaseToolData{
				Type:  "practice",
				Topic: "Go",
				Title: "Practice Title",
			},
			Task: "Complete the exercise",
		}

		assert.Nil(t, data.Hints)
		assert.Nil(t, data.SuccessCriteria)
		assert.Empty(t, data.EstimatedTime)
	})
}
