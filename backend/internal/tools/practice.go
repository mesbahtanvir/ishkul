package tools

import (
	"encoding/json"
	"fmt"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// PracticeTool implements the practice learning tool.
type PracticeTool struct{}

// Metadata returns the practice tool's metadata.
func (t *PracticeTool) Metadata() ToolMetadata {
	return ToolMetadata{
		ID:            "practice",
		Name:          "Practice",
		Icon:          "💪",
		Description:   "One small, focused exercise with clear success criteria",
		TargetMinutes: 5,
		Embeddable:    false,
	}
}

// Schema returns the JSON schema for practice content.
func (t *PracticeTool) Schema() JSONSchema {
	return JSONSchema{
		Schema:      "http://json-schema.org/draft-07/schema#",
		ID:          "practice",
		Title:       "Micro-Practice",
		Description: "Small, focused exercise completable in 3-5 minutes",
		Type:        "object",
		Properties: map[string]SchemaProperty{
			"task": {
				Type:        "string",
				Description: "One specific, small task (2-3 sentences)",
				MinLength:   20,
				MaxLength:   500,
			},
			"hints": {
				Type:        "array",
				Description: "Quick hints if stuck",
				Items: &SchemaProperty{
					Type:      "string",
					MinLength: 5,
					MaxLength: 200,
				},
				MinItems: 0,
				MaxItems: 3,
			},
			"successCriteria": {
				Type:        "array",
				Description: "Clear success criteria",
				Items: &SchemaProperty{
					Type:      "string",
					MinLength: 5,
					MaxLength: 150,
				},
				MinItems: 1,
				MaxItems: 3,
			},
			"estimatedTime": {
				Type:        "string",
				Description: "Estimated completion time",
				MaxLength:   20,
			},
			"topic": {
				Type:        "string",
				Description: "Topic being practiced",
				MinLength:   2,
				MaxLength:   50,
			},
			"title": {
				Type:        "string",
				Description: "Practice title",
				MinLength:   3,
				MaxLength:   100,
			},
		},
		Required: []string{"task", "topic", "title"},
	}
}

// PromptFile returns the path to the practice prompt template.
func (t *PracticeTool) PromptFile() string {
	return "learning/tools/practice"
}

// ParseContent parses LLM response into a Block.
func (t *PracticeTool) ParseContent(content string, block *models.Block) error {
	var data PracticeData
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return fmt.Errorf("failed to parse practice content: %w", err)
	}

	block.Type = models.BlockTypeTask
	block.Title = data.Title
	block.Content = &models.BlockContent{
		Task: &models.TaskContent{
			Instruction:     data.Task,
			Hints:           data.Hints,
			SuccessCriteria: data.SuccessCriteria,
		},
	}

	return nil
}

// Validate checks if the practice block data is valid.
func (t *PracticeTool) Validate(block *models.Block) error {
	if block.Content == nil || block.Content.Task == nil || block.Content.Task.Instruction == "" {
		return fmt.Errorf("practice task instruction is required")
	}
	if len(block.Content.Task.Instruction) < 20 {
		return fmt.Errorf("practice task too short (min 20 chars)")
	}
	return nil
}

func init() {
	Register(&PracticeTool{})
}
