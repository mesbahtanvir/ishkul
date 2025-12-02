package handlers

import (
	"context"
	"fmt"
	"log"
	"log/slog"

	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
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
		errMsg := fmt.Sprintf("failed to initialize OpenAI client: %v", err)
		if appLogger != nil {
			logger.Error(appLogger, context.Background(), "openai_client_init_failed",
				slog.String("error", err.Error()),
			)
		}
		return fmt.Errorf(errMsg)
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

	log.Println("LLM components initialized successfully")
	return nil
}
