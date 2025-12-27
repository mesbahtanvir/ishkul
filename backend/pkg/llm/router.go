package llm

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/pkg/metrics"
	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
)

// LLMRouter manages multiple LLM providers with intelligent routing,
// health tracking, and circuit breaker support.
type LLMRouter struct {
	providers     map[ProviderType]*ProviderEntry
	providerOrder []ProviderType // Ordered by priority
	config        RouterConfig
	rrIndex       uint64 // Round-robin index
	mu            sync.RWMutex
	logger        *slog.Logger
}

// NewRouter creates a new LLM router with default configuration
func NewRouter(logger *slog.Logger) *LLMRouter {
	return NewRouterWithConfig(logger, DefaultRouterConfig())
}

// NewRouterWithConfig creates a new LLM router with custom configuration
func NewRouterWithConfig(logger *slog.Logger, config RouterConfig) *LLMRouter {
	return &LLMRouter{
		providers: make(map[ProviderType]*ProviderEntry),
		config:    config,
		logger:    logger,
	}
}

// RegisterProvider adds a provider to the router
func (r *LLMRouter) RegisterProvider(providerType ProviderType, provider Provider, priority int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.providers[providerType] = &ProviderEntry{
		Provider: provider,
		Type:     providerType,
		Priority: priority,
		Health: &ProviderHealth{
			Available:    true,
			CircuitState: CircuitClosed,
		},
		CircuitConfig: r.config.CircuitBreaker,
	}

	// Rebuild priority order
	r.rebuildOrder()

	if r.logger != nil {
		r.logger.Info("provider_registered",
			slog.String("provider", string(providerType)),
			slog.Int("priority", priority),
		)
	}
}

// rebuildOrder rebuilds the provider order based on priority (must hold write lock)
func (r *LLMRouter) rebuildOrder() {
	r.providerOrder = make([]ProviderType, 0, len(r.providers))
	for pt := range r.providers {
		r.providerOrder = append(r.providerOrder, pt)
	}

	// Sort by priority (lower = first)
	for i := 0; i < len(r.providerOrder)-1; i++ {
		for j := i + 1; j < len(r.providerOrder); j++ {
			if r.providers[r.providerOrder[j]].Priority < r.providers[r.providerOrder[i]].Priority {
				r.providerOrder[i], r.providerOrder[j] = r.providerOrder[j], r.providerOrder[i]
			}
		}
	}
}

// SetStrategy sets the selection strategy
func (r *LLMRouter) SetStrategy(strategy SelectionStrategy) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.config.Strategy = strategy
}

// GetStrategy returns the current selection strategy
func (r *LLMRouter) GetStrategy() SelectionStrategy {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.config.Strategy
}

// Complete sends a chat completion request using the configured strategy
// This is the main method - callers don't need to know about providers
func (r *LLMRouter) Complete(ctx context.Context, req openai.ChatCompletionRequest) (*openai.ChatCompletionResponse, error) {
	return r.CompleteWithTier(ctx, req, string(TierFree))
}

// CompleteWithTier sends a request with tier-aware model selection
func (r *LLMRouter) CompleteWithTier(ctx context.Context, req openai.ChatCompletionRequest, tier string) (*openai.ChatCompletionResponse, error) {
	r.mu.RLock()
	strategy := r.config.Strategy
	providers := r.getAvailableProviders()
	r.mu.RUnlock()

	if len(providers) == 0 {
		return nil, fmt.Errorf("no available providers (all circuits open or unhealthy)")
	}

	switch strategy {
	case StrategyRoundRobin:
		return r.completeRoundRobin(ctx, req, tier, providers)
	case StrategyRandom:
		return r.completeRandom(ctx, req, tier, providers)
	default: // StrategyPriority
		return r.completePriority(ctx, req, tier, providers)
	}
}

// completePriority tries providers in priority order with fallback
func (r *LLMRouter) completePriority(ctx context.Context, req openai.ChatCompletionRequest, tier string, providers []*ProviderEntry) (*openai.ChatCompletionResponse, error) {
	var lastErr error

	for _, entry := range providers {
		resp, err := r.callProvider(ctx, entry, req, tier)
		if err == nil {
			return resp, nil
		}
		lastErr = err

		if r.logger != nil {
			r.logger.Warn("provider_failed_trying_next",
				slog.String("provider", string(entry.Type)),
				slog.String("error", err.Error()),
				slog.String("circuit_state", string(entry.Health.CircuitState)),
			)
		}
	}

	return nil, fmt.Errorf("all providers failed, last error: %w", lastErr)
}

// completeRoundRobin distributes requests across providers
func (r *LLMRouter) completeRoundRobin(ctx context.Context, req openai.ChatCompletionRequest, tier string, providers []*ProviderEntry) (*openai.ChatCompletionResponse, error) {
	if len(providers) == 0 {
		return nil, fmt.Errorf("no providers available")
	}

	// Get next index atomically
	idx := atomic.AddUint64(&r.rrIndex, 1) % uint64(len(providers))
	startIdx := idx

	// Try providers starting from the selected one
	for i := 0; i < len(providers); i++ {
		entry := providers[(int(startIdx)+i)%len(providers)]
		resp, err := r.callProvider(ctx, entry, req, tier)
		if err == nil {
			return resp, nil
		}

		if r.logger != nil {
			r.logger.Warn("provider_failed_trying_next",
				slog.String("provider", string(entry.Type)),
				slog.String("error", err.Error()),
			)
		}
	}

	return nil, fmt.Errorf("all providers failed")
}

// completeRandom randomly selects a provider
func (r *LLMRouter) completeRandom(ctx context.Context, req openai.ChatCompletionRequest, tier string, providers []*ProviderEntry) (*openai.ChatCompletionResponse, error) {
	if len(providers) == 0 {
		return nil, fmt.Errorf("no providers available")
	}

	// Shuffle providers
	shuffled := make([]*ProviderEntry, len(providers))
	copy(shuffled, providers)
	rand.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	// Try each until one succeeds
	for _, entry := range shuffled {
		resp, err := r.callProvider(ctx, entry, req, tier)
		if err == nil {
			return resp, nil
		}

		if r.logger != nil {
			r.logger.Warn("provider_failed_trying_next",
				slog.String("provider", string(entry.Type)),
				slog.String("error", err.Error()),
			)
		}
	}

	return nil, fmt.Errorf("all providers failed")
}

// callProvider calls a specific provider with circuit breaker logic
func (r *LLMRouter) callProvider(ctx context.Context, entry *ProviderEntry, req openai.ChatCompletionRequest, tier string) (*openai.ChatCompletionResponse, error) {
	// Check circuit breaker state
	if !r.canCallProvider(entry) {
		return nil, fmt.Errorf("circuit breaker open for %s", entry.Type)
	}

	// Adjust model for this provider and tier
	adjustedReq := req
	adjustedReq.Model = GetModelForProvider(entry.Type, tier, req.Model)

	// Calculate input size for logging
	inputTokenEstimate := 0
	for _, msg := range adjustedReq.Messages {
		inputTokenEstimate += len(msg.Content) / 4 // rough estimate: 4 chars per token
	}

	// Log LLM call start
	if r.logger != nil {
		r.logger.Info("llm_call_start",
			slog.String("provider", string(entry.Type)),
			slog.String("model", adjustedReq.Model),
			slog.String("tier", tier),
			slog.Int("message_count", len(adjustedReq.Messages)),
			slog.Int("input_tokens_estimate", inputTokenEstimate),
			slog.Int("max_tokens", adjustedReq.MaxTokens),
		)
	}

	start := time.Now()
	resp, err := entry.Provider.CreateChatCompletion(ctx, adjustedReq)
	latency := time.Since(start).Milliseconds()

	// Log LLM call result
	if r.logger != nil {
		if err != nil {
			r.logger.Error("llm_call_error",
				slog.String("provider", string(entry.Type)),
				slog.String("model", adjustedReq.Model),
				slog.Int64("latency_ms", latency),
				slog.String("error", err.Error()),
			)
		} else {
			// Calculate output size
			outputTokens := 0
			outputChars := 0
			if len(resp.Choices) > 0 {
				outputChars = len(resp.Choices[0].Message.Content)
				outputTokens = outputChars / 4 // rough estimate
			}
			// Use actual token counts if available
			if resp.Usage.CompletionTokens > 0 {
				outputTokens = resp.Usage.CompletionTokens
			}
			actualInputTokens := inputTokenEstimate
			if resp.Usage.PromptTokens > 0 {
				actualInputTokens = resp.Usage.PromptTokens
			}

			r.logger.Info("llm_call_success",
				slog.String("provider", string(entry.Type)),
				slog.String("model", adjustedReq.Model),
				slog.Int64("latency_ms", latency),
				slog.Int("input_tokens", actualInputTokens),
				slog.Int("output_tokens", outputTokens),
				slog.Int("output_chars", outputChars),
				slog.Int("total_tokens", resp.Usage.TotalTokens),
			)
		}
	}

	// Update health stats with circuit breaker logic
	r.recordResult(entry, err, latency)

	// Record metrics
	m := metrics.GetCollector()
	m.Counter(metrics.MetricLLMCallsTotal).Inc()
	m.Histogram(metrics.MetricLLMLatency).Observe(latency)

	if err != nil {
		m.Counter(metrics.MetricLLMCallsError).Inc()
	} else {
		m.Counter(metrics.MetricLLMCallsSuccess).Inc()
		if resp.Usage.PromptTokens > 0 {
			m.Counter(metrics.MetricLLMTokensInput).Add(int64(resp.Usage.PromptTokens))
		}
		if resp.Usage.CompletionTokens > 0 {
			m.Counter(metrics.MetricLLMTokensOutput).Add(int64(resp.Usage.CompletionTokens))
		}
	}

	return resp, err
}

// canCallProvider checks if we can make a request to this provider
func (r *LLMRouter) canCallProvider(entry *ProviderEntry) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	switch entry.Health.CircuitState {
	case CircuitClosed:
		return true

	case CircuitOpen:
		// Check if enough time has passed to try half-open
		if time.Since(entry.Health.CircuitOpenedAt) >= entry.CircuitConfig.OpenDuration {
			entry.Health.CircuitState = CircuitHalfOpen
			entry.halfOpenCount = 0
			if r.logger != nil {
				r.logger.Info("circuit_half_open",
					slog.String("provider", string(entry.Type)),
				)
			}
			return true
		}
		return false

	case CircuitHalfOpen:
		// Allow limited requests in half-open state
		if entry.halfOpenCount < entry.CircuitConfig.HalfOpenMaxRequests {
			entry.halfOpenCount++
			return true
		}
		return false
	}

	return false
}

// recordResult updates health stats after a provider call
func (r *LLMRouter) recordResult(entry *ProviderEntry, err error, latencyMs int64) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if err != nil {
		entry.Health.FailureCount++
		entry.Health.ConsecutiveFails++
		entry.Health.LastError = err.Error()
		entry.Health.LastErrorTime = time.Now()

		// Circuit breaker logic
		switch entry.Health.CircuitState {
		case CircuitClosed:
			if entry.Health.ConsecutiveFails >= entry.CircuitConfig.FailureThreshold {
				entry.Health.CircuitState = CircuitOpen
				entry.Health.CircuitOpenedAt = time.Now()
				entry.Health.Available = false
				if r.logger != nil {
					r.logger.Warn("circuit_opened",
						slog.String("provider", string(entry.Type)),
						slog.Int("consecutive_failures", entry.Health.ConsecutiveFails),
					)
				}
			}

		case CircuitHalfOpen:
			// Failed in half-open, reopen the circuit
			entry.Health.CircuitState = CircuitOpen
			entry.Health.CircuitOpenedAt = time.Now()
			if r.logger != nil {
				r.logger.Warn("circuit_reopened",
					slog.String("provider", string(entry.Type)),
				)
			}
		}
	} else {
		entry.Health.SuccessCount++
		entry.Health.LastSuccess = time.Now()
		entry.Health.ConsecutiveFails = 0

		// Update average latency
		entry.Health.totalLatency += latencyMs
		entry.Health.AvgLatencyMs = entry.Health.totalLatency / entry.Health.SuccessCount

		// Circuit breaker success logic
		switch entry.Health.CircuitState {
		case CircuitHalfOpen:
			// Success in half-open, close the circuit
			entry.Health.CircuitState = CircuitClosed
			entry.Health.Available = true
			entry.halfOpenCount = 0
			if r.logger != nil {
				r.logger.Info("circuit_closed",
					slog.String("provider", string(entry.Type)),
				)
			}

		case CircuitClosed:
			entry.Health.Available = true
		}
	}
}

// getAvailableProviders returns providers that can accept requests
func (r *LLMRouter) getAvailableProviders() []*ProviderEntry {
	available := make([]*ProviderEntry, 0, len(r.providerOrder))
	for _, pt := range r.providerOrder {
		entry := r.providers[pt]
		if entry == nil {
			continue
		}

		// Include if circuit is closed or might be ready for half-open
		switch entry.Health.CircuitState {
		case CircuitClosed:
			available = append(available, entry)
		case CircuitOpen:
			// Check if ready for half-open
			if time.Since(entry.Health.CircuitOpenedAt) >= entry.CircuitConfig.OpenDuration {
				available = append(available, entry)
			}
		case CircuitHalfOpen:
			if entry.halfOpenCount < entry.CircuitConfig.HalfOpenMaxRequests {
				available = append(available, entry)
			}
		}
	}
	return available
}

// GetHealth returns health status of all providers
func (r *LLMRouter) GetHealth() map[ProviderType]ProviderHealth {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make(map[ProviderType]ProviderHealth, len(r.providers))
	for pt, entry := range r.providers {
		result[pt] = *entry.Health
	}
	return result
}

// GetProviderCount returns the number of registered providers
func (r *LLMRouter) GetProviderCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.providers)
}

// GetHealthyProviderCount returns the number of healthy providers
func (r *LLMRouter) GetHealthyProviderCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	count := 0
	for _, entry := range r.providers {
		if entry.Health.CircuitState == CircuitClosed {
			count++
		}
	}
	return count
}

// ResetHealth resets health stats for a provider (e.g., after fixing an issue)
func (r *LLMRouter) ResetHealth(providerType ProviderType) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry, ok := r.providers[providerType]; ok {
		entry.Health = &ProviderHealth{
			Available:    true,
			CircuitState: CircuitClosed,
		}
		entry.halfOpenCount = 0

		if r.logger != nil {
			r.logger.Info("health_reset",
				slog.String("provider", string(providerType)),
			)
		}
	}
}

// ForceClose forces a provider's circuit to close (use with caution)
func (r *LLMRouter) ForceClose(providerType ProviderType) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry, ok := r.providers[providerType]; ok {
		entry.Health.CircuitState = CircuitClosed
		entry.Health.Available = true
		entry.Health.ConsecutiveFails = 0
		entry.halfOpenCount = 0

		if r.logger != nil {
			r.logger.Info("circuit_force_closed",
				slog.String("provider", string(providerType)),
			)
		}
	}
}

// GetPrimaryProvider returns the highest priority available provider
func (r *LLMRouter) GetPrimaryProvider() (Provider, ProviderType) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, pt := range r.providerOrder {
		entry := r.providers[pt]
		if entry != nil && entry.Health.CircuitState == CircuitClosed {
			return entry.Provider, entry.Type
		}
	}

	// Return first provider even if unhealthy (for legacy compatibility)
	if len(r.providerOrder) > 0 {
		pt := r.providerOrder[0]
		return r.providers[pt].Provider, pt
	}

	return nil, ""
}

// GetModelForProvider returns the appropriate model name for a provider and tier
// For pro tier, only mini models get upgraded; non-mini models stay unchanged
func GetModelForProvider(provider ProviderType, tier string, templateModel string) string {
	modelTier := ModelTier(tier)

	// For pro tier, only upgrade mini/chat models to pro models
	if modelTier == TierPro {
		// Check if it's a base model that should be upgraded
		if strings.Contains(templateModel, "mini") || templateModel == "deepseek-chat" {
			if mapping, ok := DefaultModelMappings[TierPro]; ok {
				switch provider {
				case ProviderDeepSeek:
					return mapping.DeepSeek
				default:
					return mapping.OpenAI
				}
			}
		}
		// Non-mini models stay unchanged for pro tier
		return templateModel
	}

	// For free tier, use the default model mapping
	if modelTier == TierFree {
		if mapping, ok := DefaultModelMappings[TierFree]; ok {
			switch provider {
			case ProviderDeepSeek:
				return mapping.DeepSeek
			default:
				return mapping.OpenAI
			}
		}
	}

	// For unknown tiers, use the original template model
	return templateModel
}
