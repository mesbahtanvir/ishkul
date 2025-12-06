package tools

import (
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// QuizTool Metadata Tests
// =============================================================================

func TestQuizToolMetadata(t *testing.T) {
	tool := &QuizTool{}
	meta := tool.Metadata()

	t.Run("has correct ID", func(t *testing.T) {
		assert.Equal(t, "quiz", meta.ID)
	})

	t.Run("has correct name", func(t *testing.T) {
		assert.Equal(t, "Quiz", meta.Name)
	})

	t.Run("has icon", func(t *testing.T) {
		assert.Equal(t, "❓", meta.Icon)
	})

	t.Run("has description", func(t *testing.T) {
		assert.NotEmpty(t, meta.Description)
		assert.Contains(t, meta.Description, "comprehension")
	})

	t.Run("has target minutes", func(t *testing.T) {
		assert.Equal(t, 1, meta.TargetMinutes)
	})

	t.Run("is embeddable", func(t *testing.T) {
		assert.True(t, meta.Embeddable)
	})
}

// =============================================================================
// QuizTool Schema Tests
// =============================================================================

func TestQuizToolSchema(t *testing.T) {
	tool := &QuizTool{}
	schema := tool.Schema()

	t.Run("has JSON schema properties", func(t *testing.T) {
		assert.NotEmpty(t, schema.Schema)
		assert.Equal(t, "quiz", schema.ID)
		assert.NotEmpty(t, schema.Title)
		assert.Equal(t, "object", schema.Type)
	})

	t.Run("has required properties", func(t *testing.T) {
		assert.Contains(t, schema.Required, "question")
		assert.Contains(t, schema.Required, "expectedAnswer")
		assert.Contains(t, schema.Required, "topic")
		assert.Contains(t, schema.Required, "title")
	})

	t.Run("defines question property", func(t *testing.T) {
		prop, ok := schema.Properties["question"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Greater(t, prop.MinLength, 0)
		assert.Greater(t, prop.MaxLength, prop.MinLength)
	})

	t.Run("defines expectedAnswer property", func(t *testing.T) {
		prop, ok := schema.Properties["expectedAnswer"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
	})

	t.Run("defines options property", func(t *testing.T) {
		prop, ok := schema.Properties["options"]
		require.True(t, ok)
		assert.Equal(t, "array", prop.Type)
		assert.NotNil(t, prop.Items)
		assert.Greater(t, prop.MinItems, 0)
	})

	t.Run("defines explanation property", func(t *testing.T) {
		prop, ok := schema.Properties["explanation"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
	})
}

// =============================================================================
// QuizTool PromptFile Tests
// =============================================================================

func TestQuizToolPromptFile(t *testing.T) {
	tool := &QuizTool{}

	t.Run("returns correct prompt file path", func(t *testing.T) {
		path := tool.PromptFile()
		assert.Equal(t, "learning/tools/quiz", path)
	})
}

// =============================================================================
// QuizTool ParseContent Tests
// =============================================================================

func TestQuizToolParseContent(t *testing.T) {
	tool := &QuizTool{}

	t.Run("parses valid quiz content", func(t *testing.T) {
		content := `{
			"topic": "Go Programming",
			"title": "Variable Declaration Quiz",
			"question": "What keyword is used to declare a variable in Go?",
			"expectedAnswer": "var",
			"options": ["let", "var", "const", "define"],
			"explanation": "Go uses 'var' for variable declarations"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "quiz", step.Type)
		assert.Equal(t, "Go Programming", step.Topic)
		assert.Equal(t, "Variable Declaration Quiz", step.Title)
		assert.Equal(t, "What keyword is used to declare a variable in Go?", step.Question)
		assert.Equal(t, "var", step.ExpectedAnswer)
		assert.Equal(t, []string{"let", "var", "const", "define"}, step.Options)
	})

	t.Run("parses content without optional fields", func(t *testing.T) {
		content := `{
			"topic": "Testing",
			"title": "Test Quiz",
			"question": "What is unit testing?",
			"expectedAnswer": "Testing individual units of code"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "quiz", step.Type)
		assert.Nil(t, step.Options)
	})

	t.Run("returns error for invalid JSON", func(t *testing.T) {
		content := `{invalid json}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse quiz content")
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
			"title": "漢字クイズ",
			"question": "「山」の読み方は？",
			"expectedAnswer": "やま"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "日本語", step.Topic)
		assert.Equal(t, "やま", step.ExpectedAnswer)
	})
}

// =============================================================================
// QuizTool Validate Tests
// =============================================================================

func TestQuizToolValidate(t *testing.T) {
	tool := &QuizTool{}

	t.Run("validates valid step", func(t *testing.T) {
		step := &models.Step{
			Question:       "This is a valid question with enough characters",
			ExpectedAnswer: "Valid answer",
		}

		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("returns error for empty question", func(t *testing.T) {
		step := &models.Step{
			Question:       "",
			ExpectedAnswer: "Answer",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "question is required")
	})

	t.Run("returns error for short question", func(t *testing.T) {
		step := &models.Step{
			Question:       "Short?",
			ExpectedAnswer: "Answer",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "question too short")
	})

	t.Run("returns error for empty expected answer", func(t *testing.T) {
		step := &models.Step{
			Question:       "This is a valid question with enough characters",
			ExpectedAnswer: "",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "expected answer is required")
	})

	t.Run("validates question with exactly 10 characters", func(t *testing.T) {
		step := &models.Step{
			Question:       "1234567890",
			ExpectedAnswer: "Answer",
		}

		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("rejects question with 9 characters", func(t *testing.T) {
		step := &models.Step{
			Question:       "123456789",
			ExpectedAnswer: "Answer",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
	})
}

// =============================================================================
// QuizData Tests
// =============================================================================

func TestQuizData(t *testing.T) {
	t.Run("struct has correct fields", func(t *testing.T) {
		data := QuizData{
			BaseToolData: BaseToolData{
				Type:  "quiz",
				Topic: "Go",
				Title: "Quiz Title",
			},
			Question:       "What is Go?",
			ExpectedAnswer: "A programming language",
			Options:        []string{"Option 1", "Option 2"},
			Explanation:    "Go is a statically typed language",
		}

		assert.Equal(t, "quiz", data.Type)
		assert.Equal(t, "Go", data.Topic)
		assert.Equal(t, "Quiz Title", data.Title)
		assert.Equal(t, "What is Go?", data.Question)
		assert.Equal(t, "A programming language", data.ExpectedAnswer)
		assert.Len(t, data.Options, 2)
		assert.NotEmpty(t, data.Explanation)
	})
}
