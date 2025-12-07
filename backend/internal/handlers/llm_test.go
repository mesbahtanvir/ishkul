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
	t.Run("returns error when no providers available", func(t *testing.T) {
		// This test verifies the error path when no API keys are set
		// In a real test environment, we'd mock the providers

		// Save original values
		originalRouter := llmRouter
		originalClient := openaiClient
		originalLoader := promptLoader
		originalRenderer := promptRenderer
		originalCache := stepCache
		originalPregenerateService := pregenerateService

		// Reset after test
		defer func() {
			llmRouter = originalRouter
			openaiClient = originalClient
			promptLoader = originalLoader
			promptRenderer = originalRenderer
			stepCache = originalCache
			pregenerateService = originalPregenerateService
		}()

		// Reset globals
		llmRouter = nil
		openaiClient = nil
		promptLoader = nil
		promptRenderer = nil
		stepCache = nil
		pregenerateService = nil

		// InitializeLLM should fail without any API keys
		err := InitializeLLM("nonexistent-prompts-dir")

		// Should return an error about no providers available
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "no LLM provider available")
	})
}

func TestGetLLMHealth(t *testing.T) {
	t.Run("returns nil when router is nil", func(t *testing.T) {
		// Save original router
		originalRouter := llmRouter
		llmRouter = nil
		defer func() { llmRouter = originalRouter }()

		health := GetLLMHealth()
		assert.Nil(t, health)
	})
}
