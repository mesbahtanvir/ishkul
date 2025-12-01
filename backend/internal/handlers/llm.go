package handlers

import (
	"fmt"
	"log"

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
		return fmt.Errorf("failed to initialize OpenAI client: %w", err)
	}

	// Initialize prompt loader
	promptLoader = prompts.NewLoader(promptsDir)
	promptRenderer = prompts.NewRenderer()

	log.Println("LLM components initialized successfully")
	return nil
}
