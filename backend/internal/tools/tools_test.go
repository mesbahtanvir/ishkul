package tools

import (
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRegistry tests the global tool registry
func TestRegistry(t *testing.T) {
	// Clear registry for clean tests
	Clear()

	t.Run("register and get tool", func(t *testing.T) {
		tool := &LessonTool{}
		Register(tool)

		retrieved, exists := Get("lesson")
		assert.True(t, exists)
		assert.NotNil(t, retrieved)
		assert.Equal(t, "lesson", retrieved.Metadata().ID)
	})

	t.Run("get non-existent tool", func(t *testing.T) {
		_, exists := Get("nonexistent")
		assert.False(t, exists)
	})

	t.Run("has tool", func(t *testing.T) {
		Clear()
		Register(&QuizTool{})

		assert.True(t, Has("quiz"))
		assert.False(t, Has("nonexistent"))
	})

	t.Run("get all tools", func(t *testing.T) {
		Clear()
		Register(&LessonTool{})
		Register(&QuizTool{})
		Register(&PracticeTool{})

		tools := GetAll()
		assert.Len(t, tools, 3)
	})

	t.Run("get tool IDs", func(t *testing.T) {
		Clear()
		Register(&LessonTool{})
		Register(&QuizTool{})

		ids := GetToolIDs()
		assert.Len(t, ids, 2)
		assert.Contains(t, ids, "lesson")
		assert.Contains(t, ids, "quiz")
	})

	t.Run("get schemas", func(t *testing.T) {
		Clear()
		Register(&LessonTool{})
		Register(&QuizTool{})

		schemas := GetSchemas()
		assert.Len(t, schemas, 2)
		assert.Contains(t, schemas, "lesson")
		assert.Contains(t, schemas, "quiz")
	})

	t.Run("get tool descriptions", func(t *testing.T) {
		Clear()
		Register(&LessonTool{})

		desc := GetToolDescriptions()
		assert.Contains(t, desc, "lesson")
		assert.Contains(t, desc, "📖")
	})

	t.Run("double registration is ignored", func(t *testing.T) {
		Clear()
		Register(&LessonTool{})
		Register(&LessonTool{}) // Should not add duplicate

		tools := GetAll()
		assert.Len(t, tools, 1)
	})
}

// TestLessonTool tests the lesson tool
func TestLessonTool(t *testing.T) {
	tool := &LessonTool{}

	t.Run("metadata", func(t *testing.T) {
		meta := tool.Metadata()
		assert.Equal(t, "lesson", meta.ID)
		assert.Equal(t, "Lesson", meta.Name)
		assert.Equal(t, "📖", meta.Icon)
		assert.Equal(t, 3, meta.TargetMinutes)
		assert.False(t, meta.Embeddable)
	})

	t.Run("schema", func(t *testing.T) {
		schema := tool.Schema()
		assert.Equal(t, "object", schema.Type)
		assert.Contains(t, schema.Properties, "content")
		assert.Contains(t, schema.Properties, "topic")
		assert.Contains(t, schema.Properties, "title")
		assert.Contains(t, schema.Required, "content")
	})

	t.Run("prompt file", func(t *testing.T) {
		assert.Equal(t, "learning/tools/lesson", tool.PromptFile())
	})

	t.Run("parse valid content", func(t *testing.T) {
		content := `{
			"type": "lesson",
			"topic": "Variables",
			"title": "Understanding Variables",
			"content": "This is a comprehensive lesson about variables in programming. Variables are containers for storing data values."
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)
		require.NoError(t, err)

		assert.Equal(t, models.BlockTypeText, block.Type)
		assert.Equal(t, "Understanding Variables", block.Title)
		require.NotNil(t, block.Content)
		require.NotNil(t, block.Content.Text)
		assert.Contains(t, block.Content.Text.Markdown, "Variables are containers")
	})

	t.Run("parse invalid JSON", func(t *testing.T) {
		block := &models.Block{}
		err := tool.ParseContent("invalid json", block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse")
	})

	t.Run("validate valid block", func(t *testing.T) {
		block := &models.Block{
			Type: models.BlockTypeText,
			Content: &models.BlockContent{
				Text: &models.TextContent{
					Markdown: "This is a valid lesson content that is long enough to pass validation requirements.",
				},
			},
		}
		err := tool.Validate(block)
		assert.NoError(t, err)
	})

	t.Run("validate empty content", func(t *testing.T) {
		block := &models.Block{Type: models.BlockTypeText}
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required")
	})

	t.Run("validate short content", func(t *testing.T) {
		block := &models.Block{
			Type: models.BlockTypeText,
			Content: &models.BlockContent{
				Text: &models.TextContent{Markdown: "Too short"},
			},
		}
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "too short")
	})

	t.Run("validate long content", func(t *testing.T) {
		longContent := make([]byte, 1600)
		for i := range longContent {
			longContent[i] = 'a'
		}
		block := &models.Block{
			Type: models.BlockTypeText,
			Content: &models.BlockContent{
				Text: &models.TextContent{Markdown: string(longContent)},
			},
		}
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "too long")
	})
}

// TestReviewTool tests the review tool (inherits from LessonTool)
func TestReviewTool(t *testing.T) {
	tool := &ReviewTool{}

	t.Run("metadata", func(t *testing.T) {
		meta := tool.Metadata()
		assert.Equal(t, "review", meta.ID)
		assert.Equal(t, "Review", meta.Name)
		assert.Equal(t, "🔄", meta.Icon)
	})

	t.Run("parse sets text type", func(t *testing.T) {
		content := `{
			"type": "review",
			"topic": "Variables",
			"title": "Review: Variables",
			"content": "Let's review what we learned about variables. Remember that variables store data."
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)
		require.NoError(t, err)
		assert.Equal(t, models.BlockTypeText, block.Type)
		assert.Equal(t, "Review: Variables", block.Title)
	})
}

// TestSummaryTool tests the summary tool (inherits from LessonTool)
func TestSummaryTool(t *testing.T) {
	tool := &SummaryTool{}

	t.Run("metadata", func(t *testing.T) {
		meta := tool.Metadata()
		assert.Equal(t, "summary", meta.ID)
		assert.Equal(t, "Summary", meta.Name)
		assert.Equal(t, "📋", meta.Icon)
	})

	t.Run("parse sets summary type", func(t *testing.T) {
		content := `{
			"type": "summary",
			"topic": "Module 1",
			"title": "Module 1 Summary",
			"content": "In this module, we covered several important topics. Let's summarize."
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)
		require.NoError(t, err)
		assert.Equal(t, "summary", block.Type)
		assert.Equal(t, "Module 1 Summary", block.Title)
	})
}

// TestQuizTool tests the quiz tool
func TestQuizTool(t *testing.T) {
	tool := &QuizTool{}

	// Helper to create a valid quiz block
	makeQuizBlock := func(question, answer string) *models.Block {
		return &models.Block{
			Type: models.BlockTypeQuestion,
			Content: &models.BlockContent{
				Question: &models.QuestionContent{
					Question: models.Question{
						Text:          question,
						CorrectAnswer: answer,
					},
				},
			},
		}
	}

	t.Run("metadata", func(t *testing.T) {
		meta := tool.Metadata()
		assert.Equal(t, "quiz", meta.ID)
		assert.Equal(t, "Quiz", meta.Name)
		assert.Equal(t, "❓", meta.Icon)
		assert.Equal(t, 1, meta.TargetMinutes)
		assert.True(t, meta.Embeddable)
	})

	t.Run("schema", func(t *testing.T) {
		schema := tool.Schema()
		assert.Contains(t, schema.Properties, "question")
		assert.Contains(t, schema.Properties, "expectedAnswer")
		assert.Contains(t, schema.Properties, "options")
		assert.Contains(t, schema.Required, "question")
		assert.Contains(t, schema.Required, "expectedAnswer")
	})

	t.Run("parse valid content with options", func(t *testing.T) {
		content := `{
			"type": "quiz",
			"topic": "Variables",
			"title": "Variable Quiz",
			"question": "What is a variable in programming?",
			"expectedAnswer": "A container for storing data",
			"options": ["A function", "A container for storing data", "A loop", "A class"]
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)
		require.NoError(t, err)

		assert.Equal(t, models.BlockTypeQuestion, block.Type)
		assert.Equal(t, "What is a variable in programming?", block.Content.Question.Question.Text)
		assert.Equal(t, "A container for storing data", block.Content.Question.Question.CorrectAnswer)
		assert.Len(t, block.Content.Question.Question.Options, 4)
	})

	t.Run("parse content without options", func(t *testing.T) {
		content := `{
			"type": "quiz",
			"topic": "Variables",
			"title": "Variable Quiz",
			"question": "What is a variable?",
			"expectedAnswer": "A storage container"
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)
		require.NoError(t, err)

		assert.Empty(t, block.Content.Question.Question.Options)
	})

	t.Run("validate valid block", func(t *testing.T) {
		block := makeQuizBlock("This is a valid question?", "Yes")
		err := tool.Validate(block)
		assert.NoError(t, err)
	})

	t.Run("validate missing question", func(t *testing.T) {
		block := makeQuizBlock("", "Yes")
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required")
	})

	t.Run("validate short question", func(t *testing.T) {
		block := makeQuizBlock("Short?", "Yes")
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "too short")
	})

	t.Run("validate missing answer", func(t *testing.T) {
		block := makeQuizBlock("This is a valid question?", "")
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required")
	})
}

// TestPracticeTool tests the practice tool
func TestPracticeTool(t *testing.T) {
	tool := &PracticeTool{}

	// Helper to create a valid practice block
	makePracticeBlock := func(task string, hints []string) *models.Block {
		return &models.Block{
			Type: models.BlockTypeTask,
			Content: &models.BlockContent{
				Task: &models.TaskContent{
					Instruction: task,
					Hints:       hints,
				},
			},
		}
	}

	t.Run("metadata", func(t *testing.T) {
		meta := tool.Metadata()
		assert.Equal(t, "practice", meta.ID)
		assert.Equal(t, "Practice", meta.Name)
		assert.Equal(t, "💪", meta.Icon)
		assert.Equal(t, 5, meta.TargetMinutes)
		assert.False(t, meta.Embeddable)
	})

	t.Run("schema", func(t *testing.T) {
		schema := tool.Schema()
		assert.Contains(t, schema.Properties, "task")
		assert.Contains(t, schema.Properties, "hints")
		assert.Contains(t, schema.Properties, "successCriteria")
		assert.Contains(t, schema.Required, "task")
	})

	t.Run("parse valid content", func(t *testing.T) {
		content := `{
			"type": "practice",
			"topic": "Variables",
			"title": "Variable Practice",
			"task": "Create a variable called 'name' and assign it your first name.",
			"hints": ["Use the = operator", "String values need quotes"],
			"successCriteria": ["Variable is declared", "Variable has a value"]
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)
		require.NoError(t, err)

		assert.Equal(t, models.BlockTypeTask, block.Type)
		assert.Contains(t, block.Content.Task.Instruction, "variable")
		assert.Len(t, block.Content.Task.Hints, 2)
	})

	t.Run("validate valid block", func(t *testing.T) {
		block := makePracticeBlock("Create a variable and assign it a value of your choice.", nil)
		err := tool.Validate(block)
		assert.NoError(t, err)
	})

	t.Run("validate empty task", func(t *testing.T) {
		block := makePracticeBlock("", nil)
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required")
	})

	t.Run("validate short task", func(t *testing.T) {
		block := makePracticeBlock("Do something", nil)
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "too short")
	})
}

// TestFlashcardTool tests the flashcard tool
func TestFlashcardTool(t *testing.T) {
	tool := &FlashcardTool{}

	// Helper to create a valid flashcard block
	makeFlashcardBlock := func(front, back, hint string) *models.Block {
		return &models.Block{
			Type: models.BlockTypeFlashcard,
			Content: &models.BlockContent{
				Flashcard: &models.FlashcardContent{
					Front: front,
					Back:  back,
					Hint:  hint,
				},
			},
		}
	}

	t.Run("metadata", func(t *testing.T) {
		meta := tool.Metadata()
		assert.Equal(t, "flashcard", meta.ID)
		assert.Equal(t, "Flashcard", meta.Name)
		assert.Equal(t, "🃏", meta.Icon)
		assert.Equal(t, 1, meta.TargetMinutes)
		assert.True(t, meta.Embeddable)
	})

	t.Run("schema", func(t *testing.T) {
		schema := tool.Schema()
		assert.Contains(t, schema.Properties, "front")
		assert.Contains(t, schema.Properties, "back")
		assert.Contains(t, schema.Properties, "hint")
		assert.Contains(t, schema.Required, "front")
		assert.Contains(t, schema.Required, "back")
	})

	t.Run("parse valid content with hint", func(t *testing.T) {
		content := `{
			"type": "flashcard",
			"topic": "Variables",
			"title": "Variable Flashcard",
			"front": "What is a variable?",
			"back": "A container for storing data",
			"hint": "Think about storage"
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)
		require.NoError(t, err)

		assert.Equal(t, models.BlockTypeFlashcard, block.Type)
		assert.Equal(t, "What is a variable?", block.Content.Flashcard.Front)
		assert.Equal(t, "A container for storing data", block.Content.Flashcard.Back)
		assert.Equal(t, "Think about storage", block.Content.Flashcard.Hint)
	})

	t.Run("parse content without hint", func(t *testing.T) {
		content := `{
			"type": "flashcard",
			"topic": "Variables",
			"title": "Variable Flashcard",
			"front": "What is a variable?",
			"back": "A storage container"
		}`

		block := &models.Block{}
		err := tool.ParseContent(content, block)
		require.NoError(t, err)

		assert.Empty(t, block.Content.Flashcard.Hint)
	})

	t.Run("validate valid block", func(t *testing.T) {
		block := makeFlashcardBlock("Front text", "Back text", "")
		err := tool.Validate(block)
		assert.NoError(t, err)
	})

	t.Run("validate missing front", func(t *testing.T) {
		block := makeFlashcardBlock("", "Back text", "")
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "front")
	})

	t.Run("validate missing back", func(t *testing.T) {
		block := makeFlashcardBlock("Front text", "", "")
		err := tool.Validate(block)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "back")
	})
}

// TestParseBaseData tests the utility function
func TestParseBaseData(t *testing.T) {
	t.Run("parse valid data", func(t *testing.T) {
		content := `{
			"type": "lesson",
			"topic": "Variables",
			"title": "Understanding Variables"
		}`

		data, err := ParseBaseData(content)
		require.NoError(t, err)

		assert.Equal(t, "lesson", data.Type)
		assert.Equal(t, "Variables", data.Topic)
		assert.Equal(t, "Understanding Variables", data.Title)
	})

	t.Run("parse invalid JSON", func(t *testing.T) {
		_, err := ParseBaseData("invalid json")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse")
	})
}
