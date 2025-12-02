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

		step := &models.Step{}
		err := tool.ParseContent(content, step)
		require.NoError(t, err)

		assert.Equal(t, "lesson", step.Type)
		assert.Equal(t, "Variables", step.Topic)
		assert.Equal(t, "Understanding Variables", step.Title)
		assert.Contains(t, step.Content, "Variables are containers")
	})

	t.Run("parse invalid JSON", func(t *testing.T) {
		step := &models.Step{}
		err := tool.ParseContent("invalid json", step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse")
	})

	t.Run("validate valid step", func(t *testing.T) {
		step := &models.Step{
			Content: "This is a valid lesson content that is long enough to pass validation requirements.",
		}
		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("validate empty content", func(t *testing.T) {
		step := &models.Step{Content: ""}
		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required")
	})

	t.Run("validate short content", func(t *testing.T) {
		step := &models.Step{Content: "Too short"}
		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "too short")
	})

	t.Run("validate long content", func(t *testing.T) {
		longContent := make([]byte, 1600)
		for i := range longContent {
			longContent[i] = 'a'
		}
		step := &models.Step{Content: string(longContent)}
		err := tool.Validate(step)
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

	t.Run("parse sets review type", func(t *testing.T) {
		content := `{
			"type": "review",
			"topic": "Variables",
			"title": "Review: Variables",
			"content": "Let's review what we learned about variables. Remember that variables store data."
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)
		require.NoError(t, err)
		assert.Equal(t, "review", step.Type)
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

		step := &models.Step{}
		err := tool.ParseContent(content, step)
		require.NoError(t, err)
		assert.Equal(t, "summary", step.Type)
	})
}

// TestQuizTool tests the quiz tool
func TestQuizTool(t *testing.T) {
	tool := &QuizTool{}

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

		step := &models.Step{}
		err := tool.ParseContent(content, step)
		require.NoError(t, err)

		assert.Equal(t, "quiz", step.Type)
		assert.Equal(t, "What is a variable in programming?", step.Question)
		assert.Equal(t, "A container for storing data", step.ExpectedAnswer)
		assert.Len(t, step.Options, 4)
	})

	t.Run("parse content without options", func(t *testing.T) {
		content := `{
			"type": "quiz",
			"topic": "Variables",
			"title": "Variable Quiz",
			"question": "What is a variable?",
			"expectedAnswer": "A storage container"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)
		require.NoError(t, err)

		assert.Nil(t, step.Options)
	})

	t.Run("validate valid step", func(t *testing.T) {
		step := &models.Step{
			Question:       "This is a valid question?",
			ExpectedAnswer: "Yes",
		}
		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("validate missing question", func(t *testing.T) {
		step := &models.Step{
			Question:       "",
			ExpectedAnswer: "Yes",
		}
		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required")
	})

	t.Run("validate short question", func(t *testing.T) {
		step := &models.Step{
			Question:       "Short?",
			ExpectedAnswer: "Yes",
		}
		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "too short")
	})

	t.Run("validate missing answer", func(t *testing.T) {
		step := &models.Step{
			Question:       "This is a valid question?",
			ExpectedAnswer: "",
		}
		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required")
	})
}

// TestPracticeTool tests the practice tool
func TestPracticeTool(t *testing.T) {
	tool := &PracticeTool{}

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

		step := &models.Step{}
		err := tool.ParseContent(content, step)
		require.NoError(t, err)

		assert.Equal(t, "practice", step.Type)
		assert.Contains(t, step.Task, "variable")
		assert.Len(t, step.Hints, 2)
	})

	t.Run("validate valid step", func(t *testing.T) {
		step := &models.Step{
			Task: "Create a variable and assign it a value of your choice.",
		}
		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("validate empty task", func(t *testing.T) {
		step := &models.Step{Task: ""}
		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "required")
	})

	t.Run("validate short task", func(t *testing.T) {
		step := &models.Step{Task: "Do something"}
		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "too short")
	})
}

// TestFlashcardTool tests the flashcard tool
func TestFlashcardTool(t *testing.T) {
	tool := &FlashcardTool{}

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

		step := &models.Step{}
		err := tool.ParseContent(content, step)
		require.NoError(t, err)

		assert.Equal(t, "flashcard", step.Type)
		assert.Equal(t, "What is a variable?", step.Question)
		assert.Equal(t, "A container for storing data", step.ExpectedAnswer)
		assert.Len(t, step.Hints, 1)
		assert.Equal(t, "Think about storage", step.Hints[0])
	})

	t.Run("parse content without hint", func(t *testing.T) {
		content := `{
			"type": "flashcard",
			"topic": "Variables",
			"title": "Variable Flashcard",
			"front": "What is a variable?",
			"back": "A storage container"
		}`

		step := &models.Step{}
		err := tool.ParseContent(content, step)
		require.NoError(t, err)

		assert.Nil(t, step.Hints)
	})

	t.Run("validate valid step", func(t *testing.T) {
		step := &models.Step{
			Question:       "Front text",
			ExpectedAnswer: "Back text",
		}
		err := tool.Validate(step)
		assert.NoError(t, err)
	})

	t.Run("validate missing front", func(t *testing.T) {
		step := &models.Step{
			Question:       "",
			ExpectedAnswer: "Back text",
		}
		err := tool.Validate(step)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "front")
	})

	t.Run("validate missing back", func(t *testing.T) {
		step := &models.Step{
			Question:       "Front text",
			ExpectedAnswer: "",
		}
		err := tool.Validate(step)
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
