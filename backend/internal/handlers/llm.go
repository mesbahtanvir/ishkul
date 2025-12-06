package handlers

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"os"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/services"
	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
	"github.com/mesbahtanvir/ishkul/backend/pkg/deepseek"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// Cache configuration constants
const (
	// StepCacheTTL is how long pre-generated steps stay in cache
	StepCacheTTL = 10 * time.Minute
	// CacheCleanupInterval is how often expired entries are removed
	CacheCleanupInterval = 5 * time.Minute
)

var (
	// llmProvider is the active LLM provider (OpenAI or DeepSeek)
	llmProvider llm.Provider
	// activeProviderType tracks which provider is active
	activeProviderType llm.ProviderType
	// openaiClient is kept for backwards compatibility
	openaiClient   *openai.Client
	promptLoader   *prompts.Loader
	promptRenderer *prompts.Renderer
)

// InitializeLLM initializes the LLM components (provider, prompt loader)
// These are used internally by learning_paths.go for generating next steps
// Provider selection is controlled by LLM_PROVIDER environment variable:
// - "deepseek" - Use DeepSeek (requires DEEPSEEK_API_KEY)
// - "openai" or empty - Use OpenAI (requires OPENAI_API_KEY, default)
func InitializeLLM(promptsDir string) error {
	var err error

	// Determine which provider to use
	providerEnv := os.Getenv("LLM_PROVIDER")

	// Try to initialize the requested provider
	switch providerEnv {
	case "deepseek":
		deepseekClient, dsErr := deepseek.NewClient()
		if dsErr != nil {
			if appLogger != nil {
				logger.Warn(appLogger, context.Background(), "deepseek_client_init_failed_fallback_to_openai",
					slog.String("error", dsErr.Error()),
				)
			}
			// Fall back to OpenAI
		} else {
			llmProvider = deepseekClient
			activeProviderType = llm.ProviderDeepSeek
			if appLogger != nil {
				logger.Info(appLogger, context.Background(), "deepseek_client_initialized")
			}
		}
	}

	// If no provider initialized yet, use OpenAI (default)
	if llmProvider == nil {
		openaiClient, err = openai.NewClient()
		if err != nil {
			if appLogger != nil {
				logger.Error(appLogger, context.Background(), "openai_client_init_failed",
					slog.String("error", err.Error()),
				)
			}
			return fmt.Errorf("failed to initialize OpenAI client: %w", err)
		}
		llmProvider = openaiClient
		activeProviderType = llm.ProviderOpenAI
		if appLogger != nil {
			logger.Info(appLogger, context.Background(), "openai_client_initialized")
		}
	}

	// Initialize prompt loader
	promptLoader = prompts.NewLoader(promptsDir)
	if appLogger != nil {
		logger.Info(appLogger, context.Background(), "prompt_loader_initialized",
			slog.String("prompts_dir", promptsDir),
		)
	}

	promptRenderer = prompts.NewRenderer()
	if appLogger != nil {
		logger.Info(appLogger, context.Background(), "prompt_renderer_initialized")
	}

	// Initialize step cache for pre-generation
	stepCache = cache.NewStepCache(StepCacheTTL)
	stepCache.StartCleanup(CacheCleanupInterval)
	if appLogger != nil {
		logger.Info(appLogger, context.Background(), "step_cache_initialized",
			slog.Duration("ttl", StepCacheTTL),
			slog.Duration("cleanup_interval", CacheCleanupInterval),
		)
	}

	// Initialize pre-generation service with the active provider
	pregenerateService = services.NewPregenerateService(
		stepCache,
		llmProvider,
		activeProviderType,
		promptLoader,
		promptRenderer,
		appLogger,
	)
	if appLogger != nil {
		logger.Info(appLogger, context.Background(), "pregenerate_service_initialized")
	}

	log.Printf("LLM components initialized successfully with provider: %s (with pre-generation cache)", llmProvider.Name())
	return nil
}

// GetLLMProvider returns the active LLM provider
func GetLLMProvider() llm.Provider {
	return llmProvider
}

// GetActiveProviderType returns the type of the active provider
func GetActiveProviderType() llm.ProviderType {
	return activeProviderType
}

// GetStepCacheStats returns current cache statistics for monitoring
func GetStepCacheStats() map[string]interface{} {
	if stepCache == nil {
		return map[string]interface{}{
			"initialized": false,
		}
	}
	return map[string]interface{}{
		"initialized": true,
		"size":        stepCache.Size(),
		"ttl_minutes": StepCacheTTL.Minutes(),
	}
}
