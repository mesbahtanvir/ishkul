package tools

import (
	"strings"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// LessonTool Metadata Tests
// =============================================================================

func TestLessonToolMetadata(t *testing.T) {
	tool := &LessonTool{}
	meta := tool.Metadata()

	t.Run("has correct ID", func(t *testing.T) {
		assert.Equal(t, "lesson", meta.ID)
	})

	t.Run("has correct name", func(t *testing.T) {
		assert.Equal(t, "Lesson", meta.Name)
	})

	t.Run("has icon", func(t *testing.T) {
		assert.Equal(t, "📖", meta.Icon)
	})

	t.Run("has description", func(t *testing.T) {
		assert.NotEmpty(t, meta.Description)
		assert.Contains(t, meta.Description, "micro-concept")
	})

	t.Run("has target minutes", func(t *testing.T) {
		assert.Equal(t, 3, meta.TargetMinutes)
	})

	t.Run("is not embeddable", func(t *testing.T) {
		assert.False(t, meta.Embeddable)
	})
}

// =============================================================================
// LessonTool Schema Tests
// =============================================================================

func TestLessonToolSchema(t *testing.T) {
	tool := &LessonTool{}
	schema := tool.Schema()

	t.Run("has JSON schema properties", func(t *testing.T) {
		assert.NotEmpty(t, schema.Schema)
		assert.Equal(t, "lesson", schema.ID)
		assert.NotEmpty(t, schema.Title)
		assert.Equal(t, "object", schema.Type)
	})

	t.Run("has required properties", func(t *testing.T) {
		assert.Contains(t, schema.Required, "content")
		assert.Contains(t, schema.Required, "topic")
		assert.Contains(t, schema.Required, "title")
	})

	t.Run("defines content property", func(t *testing.T) {
		prop, ok := schema.Properties["content"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Equal(t, 50, prop.MinLength)
		assert.Equal(t, 1500, prop.MaxLength)
	})

	t.Run("defines topic property", func(t *testing.T) {
		prop, ok := schema.Properties["topic"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Equal(t, 2, prop.MinLength)
		assert.Equal(t, 50, prop.MaxLength)
	})

	t.Run("defines title property", func(t *testing.T) {
		prop, ok := schema.Properties["title"]
		require.True(t, ok)
		assert.Equal(t, "string", prop.Type)
		assert.Equal(t, 3, prop.MinLength)
		assert.Equal(t, 100, prop.MaxLength)
	})
}

// =============================================================================
// LessonTool PromptFile Tests
// =============================================================================

func TestLessonToolPromptFile(t *testing.T) {
	tool := &LessonTool{}

	t.Run("returns correct prompt file path", func(t *testing.T) {
		path := tool.PromptFile()
		assert.Equal(t, "learning/tools/lesson", path)
	})
}

// =============================================================================
// LessonTool ParseContent Tests
// =============================================================================

func TestLessonToolParseContent(t *testing.T) {
	tool := &LessonTool{}

	t.Run("parses valid lesson content", func(t *testing.T) {
		content := `{
			"topic": "Go Basics",
			"title": "Understanding Variables",
			"content": "Variables in Go are declared using the var keyword. Go is statically typed, meaning you must specify the type of each variable."
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "lesson", step.Type)
		assert.Equal(t, "Go Basics", step.Topic)
		assert.Equal(t, "Understanding Variables", step.Title)
		assert.Contains(t, step.Content, "Variables in Go")
	})

	t.Run("returns error for invalid JSON", func(t *testing.T) {
		content := `{invalid json}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse lesson content")
	})

	t.Run("returns error for empty content", func(t *testing.T) {
		content := ``

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		assert.Error(t, err)
	})

	t.Run("handles markdown content", func(t *testing.T) {
		content := `{
			"topic": "Markdown",
			"title": "Using Markdown",
			"content": "# Heading\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Contains(t, step.Content, "# Heading")
		assert.Contains(t, step.Content, "**Bold text**")
	})

	t.Run("handles unicode content", func(t *testing.T) {
		content := `{
			"topic": "日本語レッスン",
			"title": "ひらがな入門",
			"content": "ひらがなは日本語の基本文字です。あいうえおから始めましょう。"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "日本語レッスン", step.Topic)
		assert.Contains(t, step.Content, "ひらがな")
	})
}

// =============================================================================
// LessonTool Validate Tests
// =============================================================================

func TestLessonToolValidate(t *testing.T) {
	tool := &LessonTool{}

	t.Run("validates valid step", func(t *testing.T) {
		step := &models.Step{
			Content: strings.Repeat("a", 100), // 100 characters
		}

		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("returns error for empty content", func(t *testing.T) {
		step := &models.Step{
			Content: "",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "content is required")
	})

	t.Run("returns error for short content", func(t *testing.T) {
		step := &models.Step{
			Content: strings.Repeat("a", 49), // Less than 50 characters
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "content too short")
	})

	t.Run("returns error for long content", func(t *testing.T) {
		step := &models.Step{
			Content: strings.Repeat("a", 1501), // More than 1500 characters
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "content too long")
	})

	t.Run("validates content with exactly 50 characters", func(t *testing.T) {
		step := &models.Step{
			Content: strings.Repeat("a", 50),
		}

		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("validates content with exactly 1500 characters", func(t *testing.T) {
		step := &models.Step{
			Content: strings.Repeat("a", 1500),
		}

		err := tool.Validate(step)
		assert.NoError(t, err)
	})
}

// =============================================================================
// ReviewTool Tests
// =============================================================================

func TestReviewToolMetadata(t *testing.T) {
	tool := &ReviewTool{}
	meta := tool.Metadata()

	t.Run("has correct ID", func(t *testing.T) {
		assert.Equal(t, "review", meta.ID)
	})

	t.Run("has correct name", func(t *testing.T) {
		assert.Equal(t, "Review", meta.Name)
	})

	t.Run("has icon", func(t *testing.T) {
		assert.Equal(t, "🔄", meta.Icon)
	})

	t.Run("has target minutes", func(t *testing.T) {
		assert.Equal(t, 2, meta.TargetMinutes)
	})

	t.Run("is not embeddable", func(t *testing.T) {
		assert.False(t, meta.Embeddable)
	})
}

func TestReviewToolParseContent(t *testing.T) {
	tool := &ReviewTool{}

	t.Run("parses content and sets type to review", func(t *testing.T) {
		content := `{
			"topic": "Review Topic",
			"title": "Quick Review",
			"content": "This is review content to refresh your memory about the previously learned concept."
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "review", step.Type)
		assert.Equal(t, "Review Topic", step.Topic)
	})

	t.Run("returns error for invalid JSON", func(t *testing.T) {
		content := `{invalid}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		assert.Error(t, err)
	})
}

func TestReviewToolInheritsValidation(t *testing.T) {
	tool := &ReviewTool{}

	t.Run("validates like LessonTool", func(t *testing.T) {
		step := &models.Step{
			Content: "Short",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "content too short")
	})
}

// =============================================================================
// SummaryTool Tests
// =============================================================================

func TestSummaryToolMetadata(t *testing.T) {
	tool := &SummaryTool{}
	meta := tool.Metadata()

	t.Run("has correct ID", func(t *testing.T) {
		assert.Equal(t, "summary", meta.ID)
	})

	t.Run("has correct name", func(t *testing.T) {
		assert.Equal(t, "Summary", meta.Name)
	})

	t.Run("has icon", func(t *testing.T) {
		assert.Equal(t, "📋", meta.Icon)
	})

	t.Run("has target minutes", func(t *testing.T) {
		assert.Equal(t, 2, meta.TargetMinutes)
	})

	t.Run("is not embeddable", func(t *testing.T) {
		assert.False(t, meta.Embeddable)
	})
}

func TestSummaryToolParseContent(t *testing.T) {
	tool := &SummaryTool{}

	t.Run("parses content and sets type to summary", func(t *testing.T) {
		content := `{
			"topic": "Module Summary",
			"title": "Key Concepts Review",
			"content": "In this module, we covered three key concepts: variables, functions, and control flow."
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		require.NoError(t, err)
		assert.Equal(t, "summary", step.Type)
		assert.Equal(t, "Module Summary", step.Topic)
	})

	t.Run("returns error for invalid JSON", func(t *testing.T) {
		content := `{invalid}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)

		assert.Error(t, err)
	})
}

func TestSummaryToolInheritsValidation(t *testing.T) {
	tool := &SummaryTool{}

	t.Run("validates like LessonTool", func(t *testing.T) {
		step := &models.Step{
			Content: "",
		}

		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "content is required")
	})
}

// =============================================================================
// LessonData Tests
// =============================================================================

func TestLessonData(t *testing.T) {
	t.Run("struct has correct fields", func(t *testing.T) {
		data := LessonData{
			BaseToolData: BaseToolData{
				Type:  "lesson",
				Topic: "Go",
				Title: "Lesson Title",
			},
			Content: "This is the lesson content.",
		}

		assert.Equal(t, "lesson", data.Type)
		assert.Equal(t, "Go", data.Topic)
		assert.Equal(t, "Lesson Title", data.Title)
		assert.Equal(t, "This is the lesson content.", data.Content)
	})
}
