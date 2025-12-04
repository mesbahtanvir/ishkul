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
// and processes {{#if variable}}...{{/if}} conditional blocks
func (r *Renderer) substituteVariables(content string, vars Variables) (string, error) {
	result := content

	// First, process conditional blocks: {{#if variable}}...{{/if}}
	result = r.processConditionalBlocks(result, vars)

	// Then, substitute simple variables in the format {{variableName}}
	for key, value := range vars {
		placeholder := fmt.Sprintf("{{%s}}", key)
		result = strings.ReplaceAll(result, placeholder, value)
	}

	// Check for unsubstituted variables (excluding comments and escaped braces)
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

// processConditionalBlocks handles {{#if variable}}...{{/if}} blocks
// If the variable is set and non-empty, the content is kept; otherwise, the entire block is removed
func (r *Renderer) processConditionalBlocks(content string, vars Variables) string {
	result := content

	// Process all {{#if variable}}...{{/if}} blocks
	// We need to handle nested blocks, so process from innermost to outermost
	for {
		// Find the last {{#if ...}} to handle nested blocks correctly
		ifStart := strings.LastIndex(result, "{{#if ")
		if ifStart == -1 {
			break
		}

		// Find the closing }} for this #if
		ifTagEnd := strings.Index(result[ifStart:], "}}")
		if ifTagEnd == -1 {
			break
		}
		ifTagEnd += ifStart + 2 // Position after }}

		// Extract the variable name
		varStart := ifStart + 6 // len("{{#if ")
		varEnd := ifTagEnd - 2  // Position before }}
		varName := strings.TrimSpace(result[varStart:varEnd])

		// Find the matching {{/if}}
		endifTag := "{{/if}}"
		endifStart := strings.Index(result[ifTagEnd:], endifTag)
		if endifStart == -1 {
			break
		}
		endifStart += ifTagEnd
		endifEnd := endifStart + len(endifTag)

		// Extract the content between {{#if}} and {{/if}}
		blockContent := result[ifTagEnd:endifStart]

		// Check if the variable is set and non-empty
		value, exists := vars[varName]
		if exists && value != "" {
			// Keep the content (remove only the {{#if}} and {{/if}} tags)
			result = result[:ifStart] + blockContent + result[endifEnd:]
		} else {
			// Remove the entire block
			result = result[:ifStart] + result[endifEnd:]
		}
	}

	return result
}

// RenderToRequest creates a complete OpenAI request from a template
func (r *Renderer) RenderToRequest(template *PromptTemplate, vars Variables) (*openai.ChatCompletionRequest, error) {
	return r.RenderToRequestWithTier(template, vars, "free")
}

// RenderToRequestWithTier creates a complete OpenAI request from a template with tier-aware model selection
// Pro users get upgraded to gpt-5-pro for premium experience; free users use gpt-4o-mini
func (r *Renderer) RenderToRequestWithTier(template *PromptTemplate, vars Variables, tier string) (*openai.ChatCompletionRequest, error) {
	messages, err := r.Render(template, vars)
	if err != nil {
		return nil, err
	}

	model := template.Model
	// Pro users get upgraded to gpt-5-pro for learning steps if template is using mini
	if tier == "pro" && template.Model == "gpt-4o-mini" {
		model = "gpt-5-pro-2025-10-06"
	}

	req := &openai.ChatCompletionRequest{
		Model:       model,
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
