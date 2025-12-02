// Package tools provides a registry for learning tools with schema validation.
package tools

import (
	"encoding/json"
	"fmt"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// ToolMetadata contains display and LLM prompt information for a tool.
type ToolMetadata struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Icon          string `json:"icon"`
	Description   string `json:"description"`
	TargetMinutes int    `json:"targetMinutes"`
	Embeddable    bool   `json:"embeddable"`
}

// JSONSchema represents a simplified JSON Schema for validation.
type JSONSchema struct {
	Schema      string                    `json:"$schema,omitempty"`
	ID          string                    `json:"$id,omitempty"`
	Title       string                    `json:"title,omitempty"`
	Description string                    `json:"description,omitempty"`
	Type        string                    `json:"type"`
	Properties  map[string]SchemaProperty `json:"properties,omitempty"`
	Required    []string                  `json:"required,omitempty"`
}

// SchemaProperty defines a property in the JSON Schema.
type SchemaProperty struct {
	Type        string                    `json:"type"`
	Description string                    `json:"description,omitempty"`
	MinLength   int                       `json:"minLength,omitempty"`
	MaxLength   int                       `json:"maxLength,omitempty"`
	Minimum     int                       `json:"minimum,omitempty"`
	Maximum     int                       `json:"maximum,omitempty"`
	Enum        []string                  `json:"enum,omitempty"`
	Items       *SchemaProperty           `json:"items,omitempty"`
	MinItems    int                       `json:"minItems,omitempty"`
	MaxItems    int                       `json:"maxItems,omitempty"`
	Properties  map[string]SchemaProperty `json:"properties,omitempty"`
	Required    []string                  `json:"required,omitempty"`
}

// ToolData represents the parsed content from LLM for a specific tool.
type ToolData interface{}

// LearningTool defines the interface for a learning tool.
type LearningTool interface {
	// Metadata returns the tool's display and prompt information.
	Metadata() ToolMetadata

	// Schema returns the JSON schema for validating LLM responses.
	Schema() JSONSchema

	// PromptFile returns the path to the tool-specific prompt template.
	PromptFile() string

	// ParseContent parses the LLM response into a Step.
	ParseContent(content string, step *models.Step) error

	// Validate checks if the step data is valid.
	Validate(step *models.Step) error
}

// BaseToolData contains common fields for all tool types.
type BaseToolData struct {
	Type  string `json:"type"`
	Topic string `json:"topic"`
	Title string `json:"title"`
}

// LessonData represents lesson content from LLM.
type LessonData struct {
	BaseToolData
	Content string `json:"content"`
}

// QuizData represents quiz content from LLM.
type QuizData struct {
	BaseToolData
	Question       string   `json:"question"`
	ExpectedAnswer string   `json:"expectedAnswer"`
	Options        []string `json:"options,omitempty"`
	Explanation    string   `json:"explanation,omitempty"`
}

// PracticeData represents practice content from LLM.
type PracticeData struct {
	BaseToolData
	Task            string   `json:"task"`
	Hints           []string `json:"hints,omitempty"`
	SuccessCriteria []string `json:"successCriteria,omitempty"`
	EstimatedTime   string   `json:"estimatedTime,omitempty"`
}

// ParseBaseData extracts common fields from JSON content.
func ParseBaseData(content string) (*BaseToolData, error) {
	var data BaseToolData
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return nil, fmt.Errorf("failed to parse base tool data: %w", err)
	}
	return &data, nil
}
