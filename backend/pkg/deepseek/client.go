package deepseek

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
)

const (
	// DefaultBaseURL is the default DeepSeek API endpoint
	DefaultBaseURL = "https://api.deepseek.com"
	// DefaultModel is the default model to use
	DefaultModel = "deepseek-chat"
)

// Client represents a DeepSeek API client
// DeepSeek uses an OpenAI-compatible API format
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a new DeepSeek client
func NewClient() (*Client, error) {
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("DEEPSEEK_API_KEY environment variable not set")
	}

	baseURL := os.Getenv("DEEPSEEK_BASE_URL")
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}

	return &Client{
		apiKey:  apiKey,
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 120 * time.Second, // DeepSeek reasoning models can take longer
		},
	}, nil
}

// Name returns the provider name
func (c *Client) Name() string {
	return "deepseek"
}

// CreateChatCompletion sends a chat completion request to DeepSeek
// Uses OpenAI-compatible request/response format
func (c *Client) CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (*openai.ChatCompletionResponse, error) {
	// Set default model if not provided
	if req.Model == "" {
		req.Model = DefaultModel
	}

	// Marshal request to JSON
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request with context for cancellation
	httpReq, err := http.NewRequestWithContext(
		ctx,
		"POST",
		c.baseURL+"/chat/completions",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	// Send request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		var errResp openai.ErrorResponse
		if err := json.Unmarshal(body, &errResp); err != nil {
			return nil, fmt.Errorf("DeepSeek API error (status %d): %s", resp.StatusCode, string(body))
		}
		return nil, fmt.Errorf("DeepSeek API error: %s", errResp.Error.Message)
	}

	// Parse successful response
	var completion openai.ChatCompletionResponse
	if err := json.Unmarshal(body, &completion); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &completion, nil
}

// CreateSimpleCompletion is a helper for simple single-message requests
func (c *Client) CreateSimpleCompletion(ctx context.Context, systemPrompt, userMessage string, temperature float64, maxTokens int) (string, error) {
	messages := []openai.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}

	req := openai.ChatCompletionRequest{
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}

	resp, err := c.CreateChatCompletion(ctx, req)
	if err != nil {
		return "", err
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no completion choices returned")
	}

	return resp.Choices[0].Message.Content, nil
}
