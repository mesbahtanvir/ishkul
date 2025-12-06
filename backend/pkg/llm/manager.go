package llm

import (
	"fmt"
	"log/slog"
	"math/rand"
	"sync"
	"sync/atomic"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
)

// SelectionStrategy determines how the manager selects a provider
type SelectionStrategy string

const (
	// StrategyPriority uses primary provider, falls back on failure
	StrategyPriority SelectionStrategy = "priority"
	// StrategyRoundRobin distributes requests across healthy providers
	StrategyRoundRobin SelectionStrategy = "round_robin"
	// StrategyRandom randomly selects from healthy providers
	StrategyRandom SelectionStrategy = "random"
)

// ProviderHealth tracks the health status of a provider
type ProviderHealth struct {
	Available     bool      `json:"available"`
	SuccessCount  int64     `json:"successCount"`
	FailureCount  int64     `json:"failureCount"`
	LastError     string    `json:"lastError,omitempty"`
	LastErrorTime time.Time `json:"lastErrorTime,omitempty"`
	LastSuccess   time.Time `json:"lastSuccess,omitempty"`
	AvgLatencyMs  int64     `json:"avgLatencyMs"`
	totalLatency  int64     // internal: total latency in ms for averaging
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
	Provider Provider
	Type     ProviderType
	Priority int // Lower = higher priority
	Health   *ProviderHealth
}

// ChatCompletionManager manages multiple LLM providers and handles routing
type ChatCompletionManager struct {
	providers     map[ProviderType]*ProviderEntry
	providerOrder []ProviderType // Ordered by priority
	strategy      SelectionStrategy
	rrIndex       uint64 // Round-robin index
	mu            sync.RWMutex
	logger        *slog.Logger
}

// NewChatCompletionManager creates a new manager
func NewChatCompletionManager(logger *slog.Logger) *ChatCompletionManager {
	return &ChatCompletionManager{
		providers: make(map[ProviderType]*ProviderEntry),
		strategy:  StrategyPriority,
		logger:    logger,
	}
}

// RegisterProvider adds a provider to the manager
func (m *ChatCompletionManager) RegisterProvider(providerType ProviderType, provider Provider, priority int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.providers[providerType] = &ProviderEntry{
		Provider: provider,
		Type:     providerType,
		Priority: priority,
		Health: &ProviderHealth{
			Available: true,
		},
	}

	// Rebuild priority order
	m.rebuildOrder()

	if m.logger != nil {
		m.logger.Info("provider_registered",
			slog.String("provider", string(providerType)),
			slog.Int("priority", priority),
		)
	}
}

// rebuildOrder rebuilds the provider order based on priority (must hold write lock)
func (m *ChatCompletionManager) rebuildOrder() {
	m.providerOrder = make([]ProviderType, 0, len(m.providers))
	for pt := range m.providers {
		m.providerOrder = append(m.providerOrder, pt)
	}

	// Sort by priority (lower = first)
	for i := 0; i < len(m.providerOrder)-1; i++ {
		for j := i + 1; j < len(m.providerOrder); j++ {
			if m.providers[m.providerOrder[j]].Priority < m.providers[m.providerOrder[i]].Priority {
				m.providerOrder[i], m.providerOrder[j] = m.providerOrder[j], m.providerOrder[i]
			}
		}
	}
}

// SetStrategy sets the selection strategy
func (m *ChatCompletionManager) SetStrategy(strategy SelectionStrategy) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.strategy = strategy
}

// GetStrategy returns the current selection strategy
func (m *ChatCompletionManager) GetStrategy() SelectionStrategy {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.strategy
}

// Complete sends a chat completion request using the configured strategy
// This is the main method - callers don't need to know about providers
func (m *ChatCompletionManager) Complete(req openai.ChatCompletionRequest) (*openai.ChatCompletionResponse, error) {
	return m.CompleteWithTier(req, "free")
}

// CompleteWithTier sends a request with tier-aware model selection
func (m *ChatCompletionManager) CompleteWithTier(req openai.ChatCompletionRequest, tier string) (*openai.ChatCompletionResponse, error) {
	m.mu.RLock()
	strategy := m.strategy
	providers := m.getHealthyProviders()
	m.mu.RUnlock()

	if len(providers) == 0 {
		return nil, fmt.Errorf("no healthy providers available")
	}

	switch strategy {
	case StrategyRoundRobin:
		return m.completeRoundRobin(req, tier, providers)
	case StrategyRandom:
		return m.completeRandom(req, tier, providers)
	default: // StrategyPriority
		return m.completePriority(req, tier, providers)
	}
}

// completePriority tries providers in priority order with fallback
func (m *ChatCompletionManager) completePriority(req openai.ChatCompletionRequest, tier string, providers []*ProviderEntry) (*openai.ChatCompletionResponse, error) {
	var lastErr error

	for _, entry := range providers {
		resp, err := m.callProvider(entry, req, tier)
		if err == nil {
			return resp, nil
		}
		lastErr = err

		if m.logger != nil {
			m.logger.Warn("provider_failed_trying_next",
				slog.String("provider", string(entry.Type)),
				slog.String("error", err.Error()),
			)
		}
	}

	return nil, fmt.Errorf("all providers failed, last error: %w", lastErr)
}

// completeRoundRobin distributes requests across providers
func (m *ChatCompletionManager) completeRoundRobin(req openai.ChatCompletionRequest, tier string, providers []*ProviderEntry) (*openai.ChatCompletionResponse, error) {
	if len(providers) == 0 {
		return nil, fmt.Errorf("no providers available")
	}

	// Get next index atomically
	idx := atomic.AddUint64(&m.rrIndex, 1) % uint64(len(providers))
	startIdx := idx

	// Try providers starting from the selected one
	for i := 0; i < len(providers); i++ {
		entry := providers[(int(startIdx)+i)%len(providers)]
		resp, err := m.callProvider(entry, req, tier)
		if err == nil {
			return resp, nil
		}

		if m.logger != nil {
			m.logger.Warn("provider_failed_trying_next",
				slog.String("provider", string(entry.Type)),
				slog.String("error", err.Error()),
			)
		}
	}

	return nil, fmt.Errorf("all providers failed")
}

// completeRandom randomly selects a provider
func (m *ChatCompletionManager) completeRandom(req openai.ChatCompletionRequest, tier string, providers []*ProviderEntry) (*openai.ChatCompletionResponse, error) {
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
		resp, err := m.callProvider(entry, req, tier)
		if err == nil {
			return resp, nil
		}

		if m.logger != nil {
			m.logger.Warn("provider_failed_trying_next",
				slog.String("provider", string(entry.Type)),
				slog.String("error", err.Error()),
			)
		}
	}

	return nil, fmt.Errorf("all providers failed")
}

// callProvider calls a specific provider and updates health stats
func (m *ChatCompletionManager) callProvider(entry *ProviderEntry, req openai.ChatCompletionRequest, tier string) (*openai.ChatCompletionResponse, error) {
	// Adjust model for this provider
	adjustedReq := req
	adjustedReq.Model = GetModelForProvider(entry.Type, tier, req.Model)

	start := time.Now()
	resp, err := entry.Provider.CreateChatCompletion(adjustedReq)
	latency := time.Since(start).Milliseconds()

	// Update health stats
	m.mu.Lock()
	if err != nil {
		entry.Health.FailureCount++
		entry.Health.LastError = err.Error()
		entry.Health.LastErrorTime = time.Now()

		// Mark unavailable if too many failures
		if entry.Health.FailureCount > 5 && entry.Health.SuccessRate() < 50 {
			entry.Health.Available = false
		}
	} else {
		entry.Health.SuccessCount++
		entry.Health.LastSuccess = time.Now()
		entry.Health.Available = true

		// Update average latency
		entry.Health.totalLatency += latency
		entry.Health.AvgLatencyMs = entry.Health.totalLatency / entry.Health.SuccessCount
	}
	m.mu.Unlock()

	return resp, err
}

// getHealthyProviders returns providers that are available (must hold read lock or be called with lock)
func (m *ChatCompletionManager) getHealthyProviders() []*ProviderEntry {
	healthy := make([]*ProviderEntry, 0, len(m.providerOrder))
	for _, pt := range m.providerOrder {
		entry := m.providers[pt]
		if entry != nil && entry.Health.Available {
			healthy = append(healthy, entry)
		}
	}
	return healthy
}

// GetHealth returns health status of all providers
func (m *ChatCompletionManager) GetHealth() map[ProviderType]ProviderHealth {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[ProviderType]ProviderHealth, len(m.providers))
	for pt, entry := range m.providers {
		result[pt] = *entry.Health
	}
	return result
}

// GetProviderCount returns the number of registered providers
func (m *ChatCompletionManager) GetProviderCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.providers)
}

// GetHealthyProviderCount returns the number of healthy providers
func (m *ChatCompletionManager) GetHealthyProviderCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.getHealthyProviders())
}

// ResetHealth resets health stats for a provider (e.g., after fixing an issue)
func (m *ChatCompletionManager) ResetHealth(providerType ProviderType) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if entry, ok := m.providers[providerType]; ok {
		entry.Health = &ProviderHealth{
			Available: true,
		}
	}
}

// MarkAvailable manually marks a provider as available
func (m *ChatCompletionManager) MarkAvailable(providerType ProviderType, available bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if entry, ok := m.providers[providerType]; ok {
		entry.Health.Available = available
	}
}
