package tools

import (
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// FlashcardTool Metadata Tests
// =============================================================================

func TestFlashcardToolMetadata(t *testing.T) {
	tool := &FlashcardTool{}
	meta := tool.Metadata()

	t.Run("has correct ID", func(t *testing.T) {
		assert.Equal(t, "flashcard", meta.ID)
	})

	t.Run("has correct name", func(t *testing.T) {
		assert.Equal(t, "Flashcard", meta.Name)
	})

	t.Run("has icon", func(t *testing.T) {
		assert.Equal(t, "🃏", meta.Icon)
	})

	t.Run("has description", func(t *testing.T) {
		assert.NotEmpty(t, meta.Description)
		assert.Contains(t, meta.Description, "recall")
	})

	t.Run("has target minutes", func(t *testing.T) {
		assert.Equal(t, 1, meta.TargetMinutes)
	})

	t.Run("is embeddable", func(t *testing.T) {
		assert.True(t, meta.Embeddable)
	})
}

// =============================================================================
// FlashcardTool Schema Tests
// =============================================================================

func TestFlashcardToolSchema(t *testing.T) {
	tool := &FlashcardTool{}
	schema := tool.Schema()

	t.Run("has JSON schema properties", func(t *testing.T) {
		assert.NotEmpty(t, schema.Schema)
		assert.Equal(t, "flashcard", schema.ID)
		assert.NotEmpty(t, schema.Title)
		assert.Equal(t, "object", schema.Type)
	})

	t.Run("has required properties", func(t *testing.T) {
		assert.Contains(t, schema.Required, "front")
		assert.Contains(t, schema.Required, "back")
		assert.Contains(t, schema.Required, "topic")
		assert.Contains(t, schema.Required, "title")
	})

	t.Run("defines front property", func(t *testing.T) {
		prop, ok := schema.Properties["front"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Equal(t, 3, prop.MinLength)
		assert.Equal(t, 200, prop.MaxLength)
	})

	t.Run("defines back property", func(t *testing.T) {
		prop, ok := schema.Properties["back"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Equal(t, 3, prop.MinLength)
		assert.Equal(t, 500, prop.MaxLength)
	})

	t.Run("defines hint property", func(t *testing.T) {
		prop, ok := schema.Properties["hint"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Equal(t, 150, prop.MaxLength)
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
// FlashcardTool PromptFile Tests
// =============================================================================

func TestFlashcardToolPromptFile(t *testing.T) {
	tool := &FlashcardTool{}

	t.Run("returns correct prompt file path", func(t *testing.T) {
		path := tool.PromptFile()
		assert.Equal(t, "learning/tools/flashcard", path)
	})
}

// =============================================================================
// FlashcardTool ParseContent Tests
// =============================================================================

func TestFlashcardToolParseContent(t *testing.T) {
	tool := &FlashcardTool{}

	t.Run("parses valid flashcard content", func(t *testing.T) {
		content := `{
			"topic": "Go Programming",
			"title": "Variable Declaration",
			"front": "What keyword is used to declare a variable in Go?",
			"back": "The 'var' keyword is used for variable declaration",
			"hint": "Think about the first three letters of variable"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "flashcard", step.Type)
		assert.Equal(t, "Go Programming", step.Topic)
		assert.Equal(t, "Variable Declaration", step.Title)
		assert.Equal(t, "What keyword is used to declare a variable in Go?", step.Question)
		assert.Equal(t, "The 'var' keyword is used for variable declaration", step.ExpectedAnswer)
		assert.Equal(t, []string{"Think about the first three letters of variable"}, step.Hints)
	})

	t.Run("parses content without optional hint", func(t *testing.T) {
		content := `{
			"topic": "Testing",
			"title": "Unit Test",
			"front": "What is unit testing?",
			"back": "Testing individual units of code in isolation"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "flashcard", step.Type)
		assert.Nil(t, step.Hints)
	})

	t.Run("parses content with empty hint", func(t *testing.T) {
		content := `{
			"topic": "Testing",
			"title": "Unit Test",
			"front": "What is unit testing?",
			"back": "Testing individual units of code in isolation",
			"hint": ""
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Nil(t, step.Hints, "empty hint should not be added to hints slice")
	})

	t.Run("returns error for invalid JSON", func(t *testing.T) {
		content := `{invalid json}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse flashcard content")
	})

	t.Run("returns error for empty content", func(t *testing.T) {
		content := ``

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		assert.Error(t, err)
	})

	t.Run("handles unicode content", func(t *testing.T) {
		content := `{
			"topic": "日本語",
			"title": "漢字フラッシュカード",
			"front": "「水」の読み方は？",
			"back": "みず (mizu)",
			"hint": "H2Oを思い出して"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "日本語", step.Topic)
		assert.Equal(t, "「水」の読み方は？", step.Question)
		assert.Equal(t, "みず (mizu)", step.ExpectedAnswer)
	})

	t.Run("handles special characters", func(t *testing.T) {
		content := `{
			"topic": "Math",
			"title": "Symbols",
			"front": "What is √(16)?",
			"back": "4 (because 4² = 16)"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Contains(t, step.Question, "√")
		assert.Contains(t, step.ExpectedAnswer, "²")
	})
}

// =============================================================================
// FlashcardTool Validate Tests
// =============================================================================

func TestFlashcardToolValidate(t *testing.T) {
	tool := &FlashcardTool{}

	t.Run("validates valid step", func(t *testing.T) {
		step := &models.Step{
			Question:       "What is the capital of France?",
			ExpectedAnswer: "Paris",
		}

		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("returns error for empty question (front)", func(t *testing.T) {
		step := &models.Step{
			Question:       "",
			ExpectedAnswer: "Paris",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "front")
		assert.Contains(t, err.Error(), "question")
	})

	t.Run("returns error for empty expected answer (back)", func(t *testing.T) {
		step := &models.Step{
			Question:       "What is the capital of France?",
			ExpectedAnswer: "",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "back")
		assert.Contains(t, err.Error(), "answer")
	})

	t.Run("returns error when both are empty", func(t *testing.T) {
		step := &models.Step{
			Question:       "",
			ExpectedAnswer: "",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		// Should fail on question first
		assert.Contains(t, err.Error(), "front")
	})
}

// =============================================================================
// FlashcardData Tests
// =============================================================================

func TestFlashcardData(t *testing.T) {
	t.Run("struct has correct fields", func(t *testing.T) {
		data := FlashcardData{
			BaseToolData: BaseToolData{
				Type:  "flashcard",
				Topic: "Geography",
				Title: "Capitals",
			},
			Front: "What is the capital of Japan?",
			Back:  "Tokyo",
			Hint:  "Think about the Olympics 2020",
		}

		assert.Equal(t, "flashcard", data.Type)
		assert.Equal(t, "Geography", data.Topic)
		assert.Equal(t, "Capitals", data.Title)
		assert.Equal(t, "What is the capital of Japan?", data.Front)
		assert.Equal(t, "Tokyo", data.Back)
		assert.Equal(t, "Think about the Olympics 2020", data.Hint)
	})

	t.Run("hint is optional", func(t *testing.T) {
		data := FlashcardData{
			BaseToolData: BaseToolData{
				Type:  "flashcard",
				Topic: "Geography",
				Title: "Capitals",
			},
			Front: "What is the capital of Japan?",
			Back:  "Tokyo",
		}

		assert.Empty(t, data.Hint)
	})
}
