package llm

import (
	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
)

// Provider defines the interface for LLM providers
// All providers use the OpenAI-compatible request/response format
type Provider interface {
	// CreateChatCompletion sends a chat completion request
	CreateChatCompletion(req openai.ChatCompletionRequest) (*openai.ChatCompletionResponse, error)

	// CreateSimpleCompletion is a helper for simple single-message requests
	CreateSimpleCompletion(systemPrompt, userMessage string, temperature float64, maxTokens int) (string, error)

	// Name returns the provider name (e.g., "openai", "deepseek")
	Name() string
}

// ProviderType represents supported LLM providers
type ProviderType string

const (
	ProviderOpenAI   ProviderType = "openai"
	ProviderDeepSeek ProviderType = "deepseek"
)

// ModelMapping maps generic model names to provider-specific models
type ModelMapping struct {
	OpenAI   string
	DeepSeek string
}

// DefaultModelMappings provides default model mappings for tier-based selection
var DefaultModelMappings = map[string]ModelMapping{
	// Free tier model
	"default": {
		OpenAI:   "gpt-4o-mini",
		DeepSeek: "deepseek-chat",
	},
	// Pro tier model
	"pro": {
		OpenAI:   "gpt-5-pro-2025-10-06",
		DeepSeek: "deepseek-reasoner",
	},
}

// GetModelForProvider returns the appropriate model name for a provider and tier
func GetModelForProvider(provider ProviderType, tier string, templateModel string) string {
	// If template specifies a provider-specific model, respect it
	// Otherwise, map based on tier

	// For pro tier, upgrade from default model
	if tier == "pro" {
		if mapping, ok := DefaultModelMappings["pro"]; ok {
			switch provider {
			case ProviderDeepSeek:
				return mapping.DeepSeek
			default:
				return mapping.OpenAI
			}
		}
	}

	// For default/free tier
	if mapping, ok := DefaultModelMappings["default"]; ok {
		switch provider {
		case ProviderDeepSeek:
			return mapping.DeepSeek
		default:
			return mapping.OpenAI
		}
	}

	// Fallback to template model
	return templateModel
}
