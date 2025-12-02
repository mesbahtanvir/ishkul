package tools

import (
	"encoding/json"
	"fmt"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// LessonTool implements the lesson learning tool.
type LessonTool struct{}

// Metadata returns the lesson tool's metadata.
func (t *LessonTool) Metadata() ToolMetadata {
	return ToolMetadata{
		ID:            "lesson",
		Name:          "Lesson",
		Icon:          "📖",
		Description:   "Teach ONE micro-concept with a clear example and takeaway",
		TargetMinutes: 3,
		Embeddable:    false,
	}
}

// Schema returns the JSON schema for lesson content.
func (t *LessonTool) Schema() JSONSchema {
	return JSONSchema{
		Schema:      "http://json-schema.org/draft-07/schema#",
		ID:          "lesson",
		Title:       "Micro-Lesson",
		Description: "Bite-sized lesson teaching ONE concept in 2-3 minutes",
		Type:        "object",
		Properties: map[string]SchemaProperty{
			"content": {
				Type:        "string",
				Description: "Markdown-formatted lesson content (100-200 words)",
				MinLength:   50,
				MaxLength:   1500,
			},
			"topic": {
				Type:        "string",
				Description: "Single concept name (2-4 words)",
				MinLength:   2,
				MaxLength:   50,
			},
			"title": {
				Type:        "string",
				Description: "Engaging, specific title",
				MinLength:   3,
				MaxLength:   100,
			},
		},
		Required: []string{"content", "topic", "title"},
	}
}

// PromptFile returns the path to the lesson prompt template.
func (t *LessonTool) PromptFile() string {
	return "learning/tools/lesson"
}

// ParseContent parses LLM response into a Step.
func (t *LessonTool) ParseContent(content string, step *models.Step) error {
	var data LessonData
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return fmt.Errorf("failed to parse lesson content: %w", err)
	}

	step.Type = "lesson"
	step.Topic = data.Topic
	step.Title = data.Title
	step.Content = data.Content

	return nil
}

// Validate checks if the lesson step data is valid.
func (t *LessonTool) Validate(step *models.Step) error {
	if step.Content == "" {
		return fmt.Errorf("lesson content is required")
	}
	if len(step.Content) < 50 {
		return fmt.Errorf("lesson content too short (min 50 chars)")
	}
	if len(step.Content) > 1500 {
		return fmt.Errorf("lesson content too long (max 1500 chars)")
	}
	return nil
}

// ReviewTool is a variant of LessonTool for review content.
type ReviewTool struct {
	LessonTool
}

// Metadata returns the review tool's metadata.
func (t *ReviewTool) Metadata() ToolMetadata {
	return ToolMetadata{
		ID:            "review",
		Name:          "Review",
		Icon:          "🔄",
		Description:   "Quick refresh of ONE previously learned concept",
		TargetMinutes: 2,
		Embeddable:    false,
	}
}

// ParseContent parses LLM response into a Step with review type.
func (t *ReviewTool) ParseContent(content string, step *models.Step) error {
	if err := t.LessonTool.ParseContent(content, step); err != nil {
		return err
	}
	step.Type = "review"
	return nil
}

// SummaryTool is a variant of LessonTool for summary content.
type SummaryTool struct {
	LessonTool
}

// Metadata returns the summary tool's metadata.
func (t *SummaryTool) Metadata() ToolMetadata {
	return ToolMetadata{
		ID:            "summary",
		Name:          "Summary",
		Icon:          "📋",
		Description:   "Connect 2-3 recent concepts in a structured format",
		TargetMinutes: 2,
		Embeddable:    false,
	}
}

// ParseContent parses LLM response into a Step with summary type.
func (t *SummaryTool) ParseContent(content string, step *models.Step) error {
	if err := t.LessonTool.ParseContent(content, step); err != nil {
		return err
	}
	step.Type = "summary"
	return nil
}

func init() {
	Register(&LessonTool{})
	Register(&ReviewTool{})
	Register(&SummaryTool{})
}
