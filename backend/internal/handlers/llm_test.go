package handlers

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestLLMConstants(t *testing.T) {
	t.Run("StepCacheTTL is set correctly", func(t *testing.T) {
		assert.Equal(t, 10*time.Minute, StepCacheTTL)
	})

	t.Run("CacheCleanupInterval is set correctly", func(t *testing.T) {
		assert.Equal(t, 5*time.Minute, CacheCleanupInterval)
	})

	t.Run("cleanup interval is shorter than TTL", func(t *testing.T) {
		// This ensures expired entries are cleaned up before TTL expires
		assert.Less(t, CacheCleanupInterval, StepCacheTTL)
	})
}

func TestGetStepCacheStats(t *testing.T) {
	t.Run("returns uninitialized when cache is nil", func(t *testing.T) {
		// Save original cache
		originalCache := stepCache
		stepCache = nil
		defer func() { stepCache = originalCache }()

		stats := GetStepCacheStats()

		assert.NotNil(t, stats)
		assert.Equal(t, false, stats["initialized"])
	})

	t.Run("returns stats structure", func(t *testing.T) {
		// Save original cache
		originalCache := stepCache
		stepCache = nil
		defer func() { stepCache = originalCache }()

		stats := GetStepCacheStats()

		assert.Contains(t, stats, "initialized")
	})
}

func TestInitializeLLM(t *testing.T) {
	t.Run("returns error when OpenAI client initialization fails", func(t *testing.T) {
		// This test verifies the error path when OPENAI_API_KEY is not set
		// In a real test environment, we'd mock the OpenAI client

		// Save original values
		originalChatManager := chatManager
		originalProviderRegistry := providerRegistry
		originalLLMProvider := llmProvider
		originalActiveProviderType := activeProviderType
		originalClient := openaiClient
		originalLoader := promptLoader
		originalRenderer := promptRenderer
		originalCache := stepCache
		originalPregenerateService := pregenerateService

		// Reset after test
		defer func() {
			chatManager = originalChatManager
			providerRegistry = originalProviderRegistry
			llmProvider = originalLLMProvider
			activeProviderType = originalActiveProviderType
			openaiClient = originalClient
			promptLoader = originalLoader
			promptRenderer = originalRenderer
			stepCache = originalCache
			pregenerateService = originalPregenerateService
		}()

		// Reset globals
		chatManager = nil
		providerRegistry = nil
		llmProvider = nil
		activeProviderType = ""
		openaiClient = nil
		promptLoader = nil
		promptRenderer = nil
		stepCache = nil
		pregenerateService = nil

		// InitializeLLM should fail without OPENAI_API_KEY
		err := InitializeLLM("nonexistent-prompts-dir")

		// Should return an error about OpenAI client initialization
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "OpenAI")
	})
}
