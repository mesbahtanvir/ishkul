package handlers

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"os"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
	"github.com/mesbahtanvir/ishkul/backend/pkg/deepseek"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// Cache configuration constants
const (
	// BlockCacheTTL is how long pre-generated blocks stay in cache
	BlockCacheTTL = 10 * time.Minute
	// CacheCleanupInterval is how often expired entries are removed
	CacheCleanupInterval = 5 * time.Minute
)

var (
	// llmRouter is the main interface for LLM calls - handles provider selection,
	// fallback, health tracking, and circuit breaker logic automatically
	llmRouter *llm.LLMRouter

	// openaiClient is kept for backwards compatibility
	openaiClient   *openai.Client
	promptLoader   *prompts.Loader
	promptRenderer *prompts.Renderer
)

// InitializeLLM initializes the LLM components (router, prompt loader)
// Provider selection is controlled by LLM_PROVIDER environment variable:
// - "deepseek" - Use DeepSeek as primary (requires DEEPSEEK_API_KEY)
// - "openai" or empty - Use OpenAI as primary (requires OPENAI_API_KEY, default)
// Both providers are initialized if credentials are available, enabling automatic fallback
func InitializeLLM(promptsDir string) error {
	// Determine configuration from environment
	providerEnv := os.Getenv("LLM_PROVIDER")
	strategyEnv := os.Getenv("LLM_STRATEGY")

	// Create router configuration
	config := llm.DefaultRouterConfig()
	switch strategyEnv {
	case "round_robin":
		config.Strategy = llm.StrategyRoundRobin
	case "random":
		config.Strategy = llm.StrategyRandom
	default:
		config.Strategy = llm.StrategyPriority
	}

	// Create the LLM router
	llmRouter = llm.NewRouterWithConfig(appLogger, config)

	// Track initialization errors for final check
	var openaiErr, deepseekErr error

	// Initialize OpenAI provider
	openaiClient, openaiErr = openai.NewClient()
	if openaiErr == nil {
		priority := 2
		if providerEnv != "deepseek" {
			priority = 1 // OpenAI is primary by default
		}
		llmRouter.RegisterProvider(llm.ProviderOpenAI, openaiClient, priority)
		logInfo(context.Background(), "openai_provider_registered", slog.Int("priority", priority))
	} else {
		logWarn(context.Background(), "openai_provider_unavailable", slog.String("error", openaiErr.Error()))
	}

	// Initialize DeepSeek provider
	deepseekClient, deepseekErr := deepseek.NewClient()
	if deepseekErr == nil {
		priority := 2
		if providerEnv == "deepseek" {
			priority = 1 // DeepSeek is primary when explicitly configured
		}
		llmRouter.RegisterProvider(llm.ProviderDeepSeek, deepseekClient, priority)
		logInfo(context.Background(), "deepseek_provider_registered", slog.Int("priority", priority))
	} else {
		logWarn(context.Background(), "deepseek_provider_unavailable", slog.String("error", deepseekErr.Error()))
	}

	// Ensure at least one provider is available
	if llmRouter.GetProviderCount() == 0 {
		return fmt.Errorf("no LLM provider available: OpenAI error: %v, DeepSeek error: %v", openaiErr, deepseekErr)
	}

	// Initialize prompt loader
	promptLoader = prompts.NewLoader(promptsDir)
	logInfo(context.Background(), "prompt_loader_initialized", slog.String("prompts_dir", promptsDir))

	// Initialize prompt renderer
	promptRenderer = prompts.NewRenderer()
	logInfo(context.Background(), "prompt_renderer_initialized")

	// Initialize block cache for pre-generation
	blockCache = cache.NewBlockCache(BlockCacheTTL)
	blockCache.StartCleanup(CacheCleanupInterval)
	logInfo(context.Background(), "block_cache_initialized",
		slog.Duration("ttl", BlockCacheTTL),
		slog.Duration("cleanup_interval", CacheCleanupInterval),
	)

	// Note: Pre-generation service removed - replaced by queue system
	logInfo(context.Background(), "llm_initialization_complete")

	// Log initialization summary
	log.Printf("LLM initialized: strategy=%s, healthy=%d, total=%d",
		llmRouter.GetStrategy(),
		llmRouter.GetHealthyProviderCount(),
		llmRouter.GetProviderCount())

	return nil
}

// GetLLMRouter returns the LLM router for making LLM calls
// This is the preferred way to make LLM calls - it handles provider selection,
// fallback, and circuit breaker logic automatically
func GetLLMRouter() *llm.LLMRouter {
	return llmRouter
}

// GetChatManager returns the ChatCompletionManager for making LLM calls
// Deprecated: Use GetLLMRouter instead. This is kept for backwards compatibility.
func GetChatManager() *llm.ChatCompletionManager {
	return llmRouter // ChatCompletionManager is an alias for LLMRouter
}

// GetLLMProvider returns the primary LLM provider
// Deprecated: Use GetLLMRouter().GetPrimaryProvider() instead
func GetLLMProvider() llm.Provider {
	provider, _ := llmRouter.GetPrimaryProvider()
	return provider
}

// GetActiveProviderType returns the type of the active (primary) provider
func GetActiveProviderType() llm.ProviderType {
	_, providerType := llmRouter.GetPrimaryProvider()
	return providerType
}

// GetLLMHealth returns health status of all LLM providers
func GetLLMHealth() map[llm.ProviderType]llm.ProviderHealth {
	if llmRouter == nil {
		return nil
	}
	return llmRouter.GetHealth()
}

// GetBlockCacheStats returns current cache statistics for monitoring
func GetBlockCacheStats() map[string]interface{} {
	if blockCache == nil {
		return map[string]interface{}{
			"initialized": false,
		}
	}
	return map[string]interface{}{
		"initialized": true,
		"size":        blockCache.Size(),
		"ttl_minutes": BlockCacheTTL.Minutes(),
	}
}
