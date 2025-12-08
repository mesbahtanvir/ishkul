package tools

import (
	"encoding/json"
	"fmt"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// QuizTool implements the quiz learning tool.
type QuizTool struct{}

// Metadata returns the quiz tool's metadata.
func (t *QuizTool) Metadata() ToolMetadata {
	return ToolMetadata{
		ID:            "quiz",
		Name:          "Quiz",
		Icon:          "❓",
		Description:   "Quick comprehension check with one focused question",
		TargetMinutes: 1,
		Embeddable:    true,
	}
}

// Schema returns the JSON schema for quiz content.
func (t *QuizTool) Schema() JSONSchema {
	return JSONSchema{
		Schema:      "http://json-schema.org/draft-07/schema#",
		ID:          "quiz",
		Title:       "Micro-Quiz",
		Description: "Quick comprehension check with ONE question (30-60 seconds)",
		Type:        "object",
		Properties: map[string]SchemaProperty{
			"question": {
				Type:        "string",
				Description: "Clear, focused question (1-2 sentences)",
				MinLength:   10,
				MaxLength:   300,
			},
			"expectedAnswer": {
				Type:        "string",
				Description: "Concise correct answer (1-10 words)",
				MinLength:   1,
				MaxLength:   200,
			},
			"options": {
				Type:        "array",
				Description: "Multiple choice options (optional, 3-4 items)",
				Items: &SchemaProperty{
					Type:      "string",
					MinLength: 1,
					MaxLength: 100,
				},
				MinItems: 2,
				MaxItems: 6,
			},
			"explanation": {
				Type:        "string",
				Description: "Brief explanation shown after answering",
				MaxLength:   300,
			},
			"topic": {
				Type:        "string",
				Description: "Topic being tested",
				MinLength:   2,
				MaxLength:   50,
			},
			"title": {
				Type:        "string",
				Description: "Quiz title",
				MinLength:   3,
				MaxLength:   100,
			},
		},
		Required: []string{"question", "expectedAnswer", "topic", "title"},
	}
}

// PromptFile returns the path to the quiz prompt template.
func (t *QuizTool) PromptFile() string {
	return "learning/tools/quiz"
}

// ParseContent parses LLM response into a Block.
func (t *QuizTool) ParseContent(content string, block *models.Block) error {
	var data QuizData
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return fmt.Errorf("failed to parse quiz content: %w", err)
	}

	// Convert options to Option structs
	options := make([]models.Option, len(data.Options))
	for i, opt := range data.Options {
		options[i] = models.Option{
			ID:   string(rune('a' + i)), // a, b, c, d...
			Text: opt,
		}
	}

	block.Type = models.BlockTypeQuestion
	block.Title = data.Title
	block.Content = &models.BlockContent{
		Question: &models.QuestionContent{
			Question: models.Question{
				Text:          data.Question,
				Type:          models.QuestionTypeMultipleChoice,
				Options:       options,
				CorrectAnswer: data.ExpectedAnswer,
				Explanation:   data.Explanation,
			},
		},
	}

	return nil
}

// Validate checks if the quiz block data is valid.
func (t *QuizTool) Validate(block *models.Block) error {
	if block.Content == nil || block.Content.Question == nil {
		return fmt.Errorf("quiz question content is required")
	}
	q := block.Content.Question.Question
	if q.Text == "" {
		return fmt.Errorf("quiz question is required")
	}
	if len(q.Text) < 10 {
		return fmt.Errorf("quiz question too short (min 10 chars)")
	}
	if q.CorrectAnswer == "" {
		return fmt.Errorf("quiz expected answer is required")
	}
	return nil
}

func init() {
	Register(&QuizTool{})
}
