package llm

import "log/slog"

// Backwards compatibility aliases
// These are deprecated - use the new names directly

// ChatCompletionManager is deprecated, use LLMRouter instead
type ChatCompletionManager = LLMRouter

// NewChatCompletionManager is deprecated, use NewRouter instead
func NewChatCompletionManager(logger *slog.Logger) *LLMRouter {
	return NewRouter(logger)
}

// ProviderHealth alias for backwards compatibility
// Note: This is already defined in types.go, kept here for documentation

// GetHealthyProviders is an internal method exposed for backwards compatibility
// Deprecated: This is an internal implementation detail
func (r *LLMRouter) GetHealthyProviders() []*ProviderEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.getAvailableProviders()
}
