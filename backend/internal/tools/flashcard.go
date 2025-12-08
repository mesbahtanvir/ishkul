package tools

import (
	"encoding/json"
	"fmt"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// FlashcardData represents flashcard content from LLM.
type FlashcardData struct {
	BaseToolData
	Front string `json:"front"`
	Back  string `json:"back"`
	Hint  string `json:"hint,omitempty"`
}

// FlashcardTool implements the flashcard learning tool.
type FlashcardTool struct{}

// Metadata returns the flashcard tool's metadata.
func (t *FlashcardTool) Metadata() ToolMetadata {
	return ToolMetadata{
		ID:            "flashcard",
		Name:          "Flashcard",
		Icon:          "🃏",
		Description:   "Quick recall with flip card and self-assessment",
		TargetMinutes: 1,
		Embeddable:    true,
	}
}

// Schema returns the JSON schema for flashcard content.
func (t *FlashcardTool) Schema() JSONSchema {
	return JSONSchema{
		Schema:      "http://json-schema.org/draft-07/schema#",
		ID:          "flashcard",
		Title:       "Flashcard",
		Description: "Quick recall card with front/back for spaced repetition",
		Type:        "object",
		Properties: map[string]SchemaProperty{
			"front": {
				Type:        "string",
				Description: "Question, term, or prompt shown first",
				MinLength:   3,
				MaxLength:   200,
			},
			"back": {
				Type:        "string",
				Description: "Answer, definition, or explanation",
				MinLength:   3,
				MaxLength:   500,
			},
			"hint": {
				Type:        "string",
				Description: "Optional hint before revealing answer",
				MaxLength:   150,
			},
			"topic": {
				Type:        "string",
				Description: "Topic being tested",
				MinLength:   2,
				MaxLength:   50,
			},
			"title": {
				Type:        "string",
				Description: "Flashcard title",
				MinLength:   3,
				MaxLength:   100,
			},
		},
		Required: []string{"front", "back", "topic", "title"},
	}
}

// PromptFile returns the path to the flashcard prompt template.
func (t *FlashcardTool) PromptFile() string {
	return "learning/tools/flashcard"
}

// ParseContent parses LLM response into a Block.
func (t *FlashcardTool) ParseContent(content string, block *models.Block) error {
	var data FlashcardData
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return fmt.Errorf("failed to parse flashcard content: %w", err)
	}

	block.Type = models.BlockTypeFlashcard
	block.Title = data.Title
	block.Content = &models.BlockContent{
		Flashcard: &models.FlashcardContent{
			Front: data.Front,
			Back:  data.Back,
			Hint:  data.Hint,
		},
	}

	return nil
}

// Validate checks if the flashcard block data is valid.
func (t *FlashcardTool) Validate(block *models.Block) error {
	if block.Content == nil || block.Content.Flashcard == nil {
		return fmt.Errorf("flashcard content is required")
	}
	if block.Content.Flashcard.Front == "" {
		return fmt.Errorf("flashcard front (question) is required")
	}
	if block.Content.Flashcard.Back == "" {
		return fmt.Errorf("flashcard back (answer) is required")
	}
	return nil
}

func init() {
	Register(&FlashcardTool{})
}
