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
	// providerRegistry manages all LLM providers with fallback support
	providerRegistry *llm.ProviderRegistry
	// llmProvider is the primary LLM provider (for backwards compatibility)
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
// - "deepseek" - Use DeepSeek as primary (requires DEEPSEEK_API_KEY)
// - "openai" or empty - Use OpenAI as primary (requires OPENAI_API_KEY, default)
// Both providers are initialized if credentials are available, enabling fallback
func InitializeLLM(promptsDir string) error {
	var err error

	// Create provider registry with fallback support
	providerRegistry = llm.NewProviderRegistry(appLogger)

	// Determine primary provider from environment
	providerEnv := os.Getenv("LLM_PROVIDER")

	// Try to initialize OpenAI
	openaiClient, err = openai.NewClient()
	if err == nil {
		providerRegistry.Register(llm.ProviderOpenAI, openaiClient)
		if appLogger != nil {
			logger.Info(appLogger, context.Background(), "openai_client_registered")
		}
	} else {
		if appLogger != nil {
			logger.Warn(appLogger, context.Background(), "openai_client_init_failed",
				slog.String("error", err.Error()),
			)
		}
	}

	// Try to initialize DeepSeek
	deepseekClient, dsErr := deepseek.NewClient()
	if dsErr == nil {
		providerRegistry.Register(llm.ProviderDeepSeek, deepseekClient)
		if appLogger != nil {
			logger.Info(appLogger, context.Background(), "deepseek_client_registered")
		}
	} else {
		if appLogger != nil {
			logger.Warn(appLogger, context.Background(), "deepseek_client_init_skipped",
				slog.String("reason", dsErr.Error()),
			)
		}
	}

	// Set primary and fallback based on LLM_PROVIDER env
	switch providerEnv {
	case "deepseek":
		if dsErr == nil {
			providerRegistry.SetPrimary(llm.ProviderDeepSeek)
			llmProvider = deepseekClient
			activeProviderType = llm.ProviderDeepSeek
			// Set OpenAI as fallback if available
			if err == nil {
				providerRegistry.SetFallback(llm.ProviderOpenAI)
			}
		} else if err == nil {
			// DeepSeek requested but failed, use OpenAI
			providerRegistry.SetPrimary(llm.ProviderOpenAI)
			llmProvider = openaiClient
			activeProviderType = llm.ProviderOpenAI
			if appLogger != nil {
				logger.Warn(appLogger, context.Background(), "deepseek_unavailable_using_openai")
			}
		}
	default: // "openai" or empty
		if err == nil {
			providerRegistry.SetPrimary(llm.ProviderOpenAI)
			llmProvider = openaiClient
			activeProviderType = llm.ProviderOpenAI
			// Set DeepSeek as fallback if available
			if dsErr == nil {
				providerRegistry.SetFallback(llm.ProviderDeepSeek)
			}
		} else if dsErr == nil {
			// OpenAI failed, use DeepSeek
			providerRegistry.SetPrimary(llm.ProviderDeepSeek)
			llmProvider = deepseekClient
			activeProviderType = llm.ProviderDeepSeek
			if appLogger != nil {
				logger.Warn(appLogger, context.Background(), "openai_unavailable_using_deepseek")
			}
		}
	}

	// Ensure at least one provider is available
	if llmProvider == nil {
		return fmt.Errorf("no LLM provider available: OpenAI error: %v, DeepSeek error: %v", err, dsErr)
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

	// Log initialization summary
	fallbackInfo := "none"
	if providerRegistry.HasFallback() {
		fallbackInfo = providerRegistry.GetFallback().Name()
	}
	log.Printf("LLM initialized: primary=%s, fallback=%s, providers=%v",
		llmProvider.Name(), fallbackInfo, providerRegistry.GetProviderNames())
	return nil
}

// GetLLMProvider returns the primary LLM provider
func GetLLMProvider() llm.Provider {
	return llmProvider
}

// GetProviderRegistry returns the provider registry for fallback-aware calls
func GetProviderRegistry() *llm.ProviderRegistry {
	return providerRegistry
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
