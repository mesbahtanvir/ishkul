package llm

import (
	"time"

	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
)

// ProviderType represents supported LLM providers
type ProviderType string

const (
	ProviderOpenAI   ProviderType = "openai"
	ProviderDeepSeek ProviderType = "deepseek"
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

// SelectionStrategy determines how the router selects a provider
type SelectionStrategy string

const (
	// StrategyPriority uses primary provider, falls back on failure
	StrategyPriority SelectionStrategy = "priority"
	// StrategyRoundRobin distributes requests across healthy providers
	StrategyRoundRobin SelectionStrategy = "round_robin"
	// StrategyRandom randomly selects from healthy providers
	StrategyRandom SelectionStrategy = "random"
)

// CircuitState represents the state of a circuit breaker
type CircuitState string

const (
	CircuitClosed   CircuitState = "closed"   // Normal operation
	CircuitOpen     CircuitState = "open"     // Failing, rejecting requests
	CircuitHalfOpen CircuitState = "half_open" // Testing if recovered
)

// CircuitBreakerConfig configures the circuit breaker behavior
type CircuitBreakerConfig struct {
	// FailureThreshold is the number of failures before opening the circuit
	FailureThreshold int
	// SuccessThreshold is the number of successes in half-open to close
	SuccessThreshold int
	// OpenDuration is how long to wait before trying half-open
	OpenDuration time.Duration
	// HalfOpenMaxRequests is max concurrent requests in half-open state
	HalfOpenMaxRequests int
}

// DefaultCircuitBreakerConfig returns sensible defaults
func DefaultCircuitBreakerConfig() CircuitBreakerConfig {
	return CircuitBreakerConfig{
		FailureThreshold:    5,
		SuccessThreshold:    2,
		OpenDuration:        30 * time.Second,
		HalfOpenMaxRequests: 1,
	}
}

// ProviderHealth tracks the health status of a provider
type ProviderHealth struct {
	Available        bool         `json:"available"`
	CircuitState     CircuitState `json:"circuitState"`
	SuccessCount     int64        `json:"successCount"`
	FailureCount     int64        `json:"failureCount"`
	ConsecutiveFails int          `json:"consecutiveFails"`
	LastError        string       `json:"lastError,omitempty"`
	LastErrorTime    time.Time    `json:"lastErrorTime,omitempty"`
	LastSuccess      time.Time    `json:"lastSuccess,omitempty"`
	CircuitOpenedAt  time.Time    `json:"circuitOpenedAt,omitempty"`
	AvgLatencyMs     int64        `json:"avgLatencyMs"`
	totalLatency     int64        // internal: total latency in ms for averaging
}

// SuccessRate returns the success rate as a percentage (0-100)
func (h *ProviderHealth) SuccessRate() float64 {
	total := h.SuccessCount + h.FailureCount
	if total == 0 {
		return 100.0
	}
	return float64(h.SuccessCount) / float64(total) * 100
}

// ProviderEntry holds a provider and its configuration
type ProviderEntry struct {
	Provider       Provider
	Type           ProviderType
	Priority       int // Lower = higher priority
	Health         *ProviderHealth
	CircuitConfig  CircuitBreakerConfig
	halfOpenCount  int // Current requests in half-open state
}

// ModelTier represents different service tiers
type ModelTier string

const (
	TierFree ModelTier = "free"
	TierPro  ModelTier = "pro"
)

// ModelMapping maps generic model names to provider-specific models
type ModelMapping struct {
	OpenAI   string
	DeepSeek string
}

// DefaultModelMappings provides default model mappings for tier-based selection
// Updated December 2025 - GPT-4.1 and GPT-5 series now available
var DefaultModelMappings = map[ModelTier]ModelMapping{
	// Free tier model - fast and cost-effective
	TierFree: {
		OpenAI:   "gpt-4.1-nano", // Fastest and cheapest, good for simple tasks
		DeepSeek: "deepseek-chat",
	},
	// Pro tier model - higher quality reasoning
	TierPro: {
		OpenAI:   "gpt-4.1", // Major improvements in coding and instruction following
		DeepSeek: "deepseek-reasoner",
	},
}

// RouterConfig holds configuration for the LLM router
type RouterConfig struct {
	// Strategy for selecting providers
	Strategy SelectionStrategy
	// CircuitBreaker configuration
	CircuitBreaker CircuitBreakerConfig
	// EnableMetrics enables detailed metrics collection
	EnableMetrics bool
}

// DefaultRouterConfig returns sensible defaults
func DefaultRouterConfig() RouterConfig {
	return RouterConfig{
		Strategy:       StrategyPriority,
		CircuitBreaker: DefaultCircuitBreakerConfig(),
		EnableMetrics:  true,
	}
}
