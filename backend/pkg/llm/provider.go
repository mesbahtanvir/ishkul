package llm

import (
	"fmt"
	"log/slog"
	"sync"

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

// ProviderRegistry manages multiple LLM providers with fallback support
type ProviderRegistry struct {
	providers    map[ProviderType]Provider
	primaryType  ProviderType
	fallbackType ProviderType
	mu           sync.RWMutex
	logger       *slog.Logger
}

// NewProviderRegistry creates a new provider registry
func NewProviderRegistry(logger *slog.Logger) *ProviderRegistry {
	return &ProviderRegistry{
		providers: make(map[ProviderType]Provider),
		logger:    logger,
	}
}

// Register adds a provider to the registry
func (r *ProviderRegistry) Register(providerType ProviderType, provider Provider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers[providerType] = provider
}

// SetPrimary sets the primary provider
func (r *ProviderRegistry) SetPrimary(providerType ProviderType) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.providers[providerType]; !ok {
		return fmt.Errorf("provider %s not registered", providerType)
	}
	r.primaryType = providerType
	return nil
}

// SetFallback sets the fallback provider
func (r *ProviderRegistry) SetFallback(providerType ProviderType) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.providers[providerType]; !ok {
		return fmt.Errorf("provider %s not registered", providerType)
	}
	r.fallbackType = providerType
	return nil
}

// GetPrimary returns the primary provider
func (r *ProviderRegistry) GetPrimary() Provider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.providers[r.primaryType]
}

// GetPrimaryType returns the primary provider type
func (r *ProviderRegistry) GetPrimaryType() ProviderType {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.primaryType
}

// GetFallback returns the fallback provider (may be nil)
func (r *ProviderRegistry) GetFallback() Provider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.providers[r.fallbackType]
}

// HasFallback returns true if a fallback provider is configured
func (r *ProviderRegistry) HasFallback() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.fallbackType != "" && r.fallbackType != r.primaryType
}

// CreateChatCompletionWithFallback tries primary, falls back on error
func (r *ProviderRegistry) CreateChatCompletionWithFallback(req openai.ChatCompletionRequest) (*openai.ChatCompletionResponse, error) {
	r.mu.RLock()
	primary := r.providers[r.primaryType]
	fallback := r.providers[r.fallbackType]
	hasFallback := r.fallbackType != "" && r.fallbackType != r.primaryType
	r.mu.RUnlock()

	if primary == nil {
		return nil, fmt.Errorf("no primary provider configured")
	}

	// Try primary provider
	resp, err := primary.CreateChatCompletion(req)
	if err == nil {
		return resp, nil
	}

	// Log primary failure
	if r.logger != nil {
		r.logger.Warn("primary_provider_failed",
			slog.String("provider", primary.Name()),
			slog.String("error", err.Error()),
			slog.Bool("has_fallback", hasFallback),
		)
	}

	// Try fallback if available
	if hasFallback && fallback != nil {
		if r.logger != nil {
			r.logger.Info("trying_fallback_provider",
				slog.String("fallback", fallback.Name()),
			)
		}

		// Adjust model for fallback provider
		fallbackReq := req
		fallbackReq.Model = GetModelForProvider(r.fallbackType, "free", req.Model)

		resp, fallbackErr := fallback.CreateChatCompletion(fallbackReq)
		if fallbackErr == nil {
			if r.logger != nil {
				r.logger.Info("fallback_provider_succeeded",
					slog.String("fallback", fallback.Name()),
				)
			}
			return resp, nil
		}

		// Both failed
		if r.logger != nil {
			r.logger.Error("fallback_provider_also_failed",
				slog.String("fallback", fallback.Name()),
				slog.String("error", fallbackErr.Error()),
			)
		}
		return nil, fmt.Errorf("all providers failed: primary (%s): %v, fallback (%s): %v",
			primary.Name(), err, fallback.Name(), fallbackErr)
	}

	// No fallback available
	return nil, fmt.Errorf("%s API error: %w", primary.Name(), err)
}

// GetProviderNames returns names of all registered providers
func (r *ProviderRegistry) GetProviderNames() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.providers))
	for _, p := range r.providers {
		names = append(names, p.Name())
	}
	return names
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
