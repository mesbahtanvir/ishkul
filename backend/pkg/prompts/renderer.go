package prompts

import (
	"fmt"
	"strings"

	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
)

// Renderer handles variable substitution in prompt templates
type Renderer struct{}

// NewRenderer creates a new prompt renderer
func NewRenderer() *Renderer {
	return &Renderer{}
}

// Render substitutes variables in a prompt template and returns OpenAI messages
func (r *Renderer) Render(template *PromptTemplate, vars Variables) ([]openai.Message, error) {
	messages := make([]openai.Message, 0, len(template.Messages))

	for _, msg := range template.Messages {
		content, err := r.substituteVariables(msg.Content, vars)
		if err != nil {
			return nil, fmt.Errorf("failed to substitute variables in message: %w", err)
		}

		messages = append(messages, openai.Message{
			Role:    msg.Role,
			Content: content,
		})
	}

	return messages, nil
}

// substituteVariables replaces {{variable}} placeholders with actual values
func (r *Renderer) substituteVariables(content string, vars Variables) (string, error) {
	result := content

	// Find all variables in the format {{variableName}}
	for key, value := range vars {
		placeholder := fmt.Sprintf("{{%s}}", key)
		result = strings.ReplaceAll(result, placeholder, value)
	}

	// Check for unsubstituted variables
	if strings.Contains(result, "{{") && strings.Contains(result, "}}") {
		// Extract the unsubstituted variable name
		start := strings.Index(result, "{{")
		end := strings.Index(result[start:], "}}") + start
		if end > start {
			varName := result[start+2 : end]
			return "", fmt.Errorf("unsubstituted variable: %s", varName)
		}
	}

	return result, nil
}

// RenderToRequest creates a complete OpenAI request from a template
func (r *Renderer) RenderToRequest(template *PromptTemplate, vars Variables) (*openai.ChatCompletionRequest, error) {
	messages, err := r.Render(template, vars)
	if err != nil {
		return nil, err
	}

	req := &openai.ChatCompletionRequest{
		Model:       template.Model,
		Messages:    messages,
		Temperature: template.ModelParameters.Temperature,
		MaxTokens:   template.ModelParameters.MaxTokens,
	}

	// Set optional parameters if provided
	if template.ModelParameters.TopP > 0 {
		req.TopP = template.ModelParameters.TopP
	}
	if template.ModelParameters.N > 0 {
		req.N = template.ModelParameters.N
	}

	return req, nil
}
