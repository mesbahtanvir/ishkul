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
	// chatManager is the main interface for LLM calls - abstracts away providers
	chatManager *llm.ChatCompletionManager
	// providerRegistry manages all LLM providers with fallback support (legacy)
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

	// Create ChatCompletionManager - the main interface for LLM calls
	chatManager = llm.NewChatCompletionManager(appLogger)

	// Create provider registry for legacy support
	providerRegistry = llm.NewProviderRegistry(appLogger)

	// Determine primary provider and strategy from environment
	providerEnv := os.Getenv("LLM_PROVIDER")
	strategyEnv := os.Getenv("LLM_STRATEGY")

	// Set selection strategy
	switch strategyEnv {
	case "round_robin":
		chatManager.SetStrategy(llm.StrategyRoundRobin)
	case "random":
		chatManager.SetStrategy(llm.StrategyRandom)
	default:
		chatManager.SetStrategy(llm.StrategyPriority)
	}

	// Try to initialize OpenAI (priority 1 if primary, 2 if fallback)
	openaiClient, err = openai.NewClient()
	if err == nil {
		openaiPriority := 2
		if providerEnv != "deepseek" {
			openaiPriority = 1
		}
		chatManager.RegisterProvider(llm.ProviderOpenAI, openaiClient, openaiPriority)
		providerRegistry.Register(llm.ProviderOpenAI, openaiClient)
		if appLogger != nil {
			logger.Info(appLogger, context.Background(), "openai_client_registered",
				slog.Int("priority", openaiPriority),
			)
		}
	} else {
		if appLogger != nil {
			logger.Warn(appLogger, context.Background(), "openai_client_init_failed",
				slog.String("error", err.Error()),
			)
		}
	}

	// Try to initialize DeepSeek (priority 1 if primary, 2 if fallback)
	deepseekClient, dsErr := deepseek.NewClient()
	if dsErr == nil {
		deepseekPriority := 2
		if providerEnv == "deepseek" {
			deepseekPriority = 1
		}
		chatManager.RegisterProvider(llm.ProviderDeepSeek, deepseekClient, deepseekPriority)
		providerRegistry.Register(llm.ProviderDeepSeek, deepseekClient)
		if appLogger != nil {
			logger.Info(appLogger, context.Background(), "deepseek_client_registered",
				slog.Int("priority", deepseekPriority),
			)
		}
	} else {
		if appLogger != nil {
			logger.Warn(appLogger, context.Background(), "deepseek_client_init_skipped",
				slog.String("reason", dsErr.Error()),
			)
		}
	}

	// Set primary and fallback in legacy registry based on LLM_PROVIDER env
	switch providerEnv {
	case "deepseek":
		if dsErr == nil {
			providerRegistry.SetPrimary(llm.ProviderDeepSeek)
			llmProvider = deepseekClient
			activeProviderType = llm.ProviderDeepSeek
			if err == nil {
				providerRegistry.SetFallback(llm.ProviderOpenAI)
			}
		} else if err == nil {
			providerRegistry.SetPrimary(llm.ProviderOpenAI)
			llmProvider = openaiClient
			activeProviderType = llm.ProviderOpenAI
			if appLogger != nil {
				logger.Warn(appLogger, context.Background(), "deepseek_unavailable_using_openai")
			}
		}
	default:
		if err == nil {
			providerRegistry.SetPrimary(llm.ProviderOpenAI)
			llmProvider = openaiClient
			activeProviderType = llm.ProviderOpenAI
			if dsErr == nil {
				providerRegistry.SetFallback(llm.ProviderDeepSeek)
			}
		} else if dsErr == nil {
			providerRegistry.SetPrimary(llm.ProviderDeepSeek)
			llmProvider = deepseekClient
			activeProviderType = llm.ProviderDeepSeek
			if appLogger != nil {
				logger.Warn(appLogger, context.Background(), "openai_unavailable_using_deepseek")
			}
		}
	}

	// Ensure at least one provider is available
	if chatManager.GetProviderCount() == 0 {
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
	log.Printf("LLM initialized: strategy=%s, providers=%d healthy, total=%d",
		chatManager.GetStrategy(),
		chatManager.GetHealthyProviderCount(),
		chatManager.GetProviderCount())
	return nil
}

// GetChatManager returns the ChatCompletionManager for making LLM calls
// This is the preferred way to make LLM calls - it handles provider selection automatically
func GetChatManager() *llm.ChatCompletionManager {
	return chatManager
}

// GetLLMProvider returns the primary LLM provider (legacy - prefer GetChatManager)
func GetLLMProvider() llm.Provider {
	return llmProvider
}

// GetProviderRegistry returns the provider registry (legacy - prefer GetChatManager)
func GetProviderRegistry() *llm.ProviderRegistry {
	return providerRegistry
}

// GetActiveProviderType returns the type of the active provider
func GetActiveProviderType() llm.ProviderType {
	return activeProviderType
}

// GetLLMHealth returns health status of all LLM providers
func GetLLMHealth() map[llm.ProviderType]llm.ProviderHealth {
	if chatManager == nil {
		return nil
	}
	return chatManager.GetHealth()
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
