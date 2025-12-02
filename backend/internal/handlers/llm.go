package handlers

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/services"
	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
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
	openaiClient   *openai.Client
	promptLoader   *prompts.Loader
	promptRenderer *prompts.Renderer
)

// InitializeLLM initializes the LLM components (OpenAI client, prompt loader)
// These are used internally by learning_paths.go for generating next steps
func InitializeLLM(promptsDir string) error {
	var err error

	// Initialize OpenAI client
	openaiClient, err = openai.NewClient()
	if err != nil {
		if appLogger != nil {
			logger.Error(appLogger, context.Background(), "openai_client_init_failed",
				slog.String("error", err.Error()),
			)
		}
		return fmt.Errorf("failed to initialize OpenAI client: %w", err)
	}

	if appLogger != nil {
		logger.Info(appLogger, context.Background(), "openai_client_initialized")
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

	// Initialize pre-generation service
	pregenerateService = services.NewPregenerateService(
		stepCache,
		openaiClient,
		promptLoader,
		promptRenderer,
		appLogger,
	)
	if appLogger != nil {
		logger.Info(appLogger, context.Background(), "pregenerate_service_initialized")
	}

	log.Println("LLM components initialized successfully (with pre-generation cache)")
	return nil
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
