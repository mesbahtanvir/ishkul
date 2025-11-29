package openai

// Message represents a chat message in the OpenAI API format
type Message struct {
	Role    string `json:"role"`    // "system", "user", or "assistant"
	Content string `json:"content"` // Message content
}

// ChatCompletionRequest represents a request to the OpenAI chat completion API
type ChatCompletionRequest struct {
	Model       string    `json:"model"`                 // Model to use (e.g., "gpt-4o-mini")
	Messages    []Message `json:"messages"`              // Conversation messages
	Temperature float64   `json:"temperature,omitempty"` // Sampling temperature (0-2)
	MaxTokens   int       `json:"max_tokens,omitempty"`  // Maximum tokens to generate
	TopP        float64   `json:"top_p,omitempty"`       // Nucleus sampling parameter
	N           int       `json:"n,omitempty"`           // Number of completions
	Stream      bool      `json:"stream,omitempty"`      // Whether to stream responses
	Stop        []string  `json:"stop,omitempty"`        // Stop sequences
}

// ChatCompletionChoice represents a single completion choice
type ChatCompletionChoice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Usage represents token usage statistics
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ChatCompletionResponse represents the OpenAI API response
type ChatCompletionResponse struct {
	ID      string                 `json:"id"`
	Object  string                 `json:"object"`
	Created int64                  `json:"created"`
	Model   string                 `json:"model"`
	Choices []ChatCompletionChoice `json:"choices"`
	Usage   Usage                  `json:"usage"`
}

// ErrorResponse represents an error from the OpenAI API
type ErrorResponse struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}
