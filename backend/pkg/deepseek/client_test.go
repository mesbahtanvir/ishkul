package deepseek

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewClient(t *testing.T) {
	t.Run("returns error when API key not set", func(t *testing.T) {
		os.Unsetenv("DEEPSEEK_API_KEY")

		client, err := NewClient()

		assert.Nil(t, client)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "DEEPSEEK_API_KEY environment variable not set")
	})

	t.Run("creates client with API key", func(t *testing.T) {
		os.Setenv("DEEPSEEK_API_KEY", "test-deepseek-key")
		defer os.Unsetenv("DEEPSEEK_API_KEY")

		client, err := NewClient()

		require.NoError(t, err)
		assert.NotNil(t, client)
		assert.Equal(t, "test-deepseek-key", client.apiKey)
	})

	t.Run("uses default base URL", func(t *testing.T) {
		os.Setenv("DEEPSEEK_API_KEY", "test-deepseek-key")
		os.Unsetenv("DEEPSEEK_BASE_URL")
		defer os.Unsetenv("DEEPSEEK_API_KEY")

		client, err := NewClient()

		require.NoError(t, err)
		assert.Equal(t, DefaultBaseURL, client.baseURL)
		assert.Equal(t, "https://api.deepseek.com", client.baseURL)
	})

	t.Run("uses custom base URL when set", func(t *testing.T) {
		os.Setenv("DEEPSEEK_API_KEY", "test-deepseek-key")
		os.Setenv("DEEPSEEK_BASE_URL", "https://custom.deepseek.com")
		defer os.Unsetenv("DEEPSEEK_API_KEY")
		defer os.Unsetenv("DEEPSEEK_BASE_URL")

		client, err := NewClient()

		require.NoError(t, err)
		assert.Equal(t, "https://custom.deepseek.com", client.baseURL)
	})

	t.Run("sets longer timeout for reasoning models", func(t *testing.T) {
		os.Setenv("DEEPSEEK_API_KEY", "test-deepseek-key")
		defer os.Unsetenv("DEEPSEEK_API_KEY")

		client, err := NewClient()

		require.NoError(t, err)
		assert.Equal(t, 120*time.Second, client.httpClient.Timeout)
	})
}

func TestClientName(t *testing.T) {
	os.Setenv("DEEPSEEK_API_KEY", "test-deepseek-key")
	defer os.Unsetenv("DEEPSEEK_API_KEY")

	client, err := NewClient()
	require.NoError(t, err)

	assert.Equal(t, "deepseek", client.Name())
}

func TestCreateChatCompletion(t *testing.T) {
	t.Run("successful completion request", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify request
			assert.Equal(t, "POST", r.Method)
			assert.Equal(t, "/chat/completions", r.URL.Path)
			assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
			assert.Equal(t, "Bearer test-deepseek-key", r.Header.Get("Authorization"))

			// Parse request body
			var req openai.ChatCompletionRequest
			err := json.NewDecoder(r.Body).Decode(&req)
			require.NoError(t, err)
			assert.Equal(t, DefaultModel, req.Model)

			// Return mock response
			resp := openai.ChatCompletionResponse{
				ID:      "deepseek-123",
				Object:  "chat.completion",
				Created: time.Now().Unix(),
				Model:   DefaultModel,
				Choices: []openai.ChatCompletionChoice{
					{
						Index: 0,
						Message: openai.Message{
							Role:    "assistant",
							Content: "Hello from DeepSeek!",
						},
						FinishReason: "stop",
					},
				},
				Usage: openai.Usage{
					PromptTokens:     15,
					CompletionTokens: 5,
					TotalTokens:      20,
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := openai.ChatCompletionRequest{
			Messages: []openai.Message{
				{Role: "system", Content: "You are a helpful assistant."},
				{Role: "user", Content: "Hello!"},
			},
		}

		resp, err := client.CreateChatCompletion(context.Background(), req)

		require.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "deepseek-123", resp.ID)
		assert.Len(t, resp.Choices, 1)
		assert.Equal(t, "Hello from DeepSeek!", resp.Choices[0].Message.Content)
	})

	t.Run("sets default model when not provided", func(t *testing.T) {
		var receivedModel string
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var req openai.ChatCompletionRequest
			json.NewDecoder(r.Body).Decode(&req)
			receivedModel = req.Model

			resp := openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{{Message: openai.Message{Content: "test"}}},
			}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := openai.ChatCompletionRequest{
			Messages: []openai.Message{{Role: "user", Content: "Hello"}},
		}

		_, err := client.CreateChatCompletion(context.Background(), req)

		require.NoError(t, err)
		assert.Equal(t, DefaultModel, receivedModel)
		assert.Equal(t, "deepseek-chat", receivedModel)
	})

	t.Run("uses provided model", func(t *testing.T) {
		var receivedModel string
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var req openai.ChatCompletionRequest
			json.NewDecoder(r.Body).Decode(&req)
			receivedModel = req.Model

			resp := openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{{Message: openai.Message{Content: "test"}}},
			}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := openai.ChatCompletionRequest{
			Model:    "deepseek-reasoner",
			Messages: []openai.Message{{Role: "user", Content: "Hello"}},
		}

		_, err := client.CreateChatCompletion(context.Background(), req)

		require.NoError(t, err)
		assert.Equal(t, "deepseek-reasoner", receivedModel)
	})

	t.Run("handles API error response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
			errResp := openai.ErrorResponse{
				Error: struct {
					Message string `json:"message"`
					Type    string `json:"type"`
					Code    string `json:"code"`
				}{
					Message: "Invalid API key",
					Type:    "invalid_request_error",
					Code:    "invalid_api_key",
				},
			}
			json.NewEncoder(w).Encode(errResp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "invalid-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := openai.ChatCompletionRequest{
			Messages: []openai.Message{{Role: "user", Content: "Hello"}},
		}

		resp, err := client.CreateChatCompletion(context.Background(), req)

		assert.Nil(t, resp)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid API key")
		assert.Contains(t, err.Error(), "DeepSeek")
	})

	t.Run("handles non-JSON error response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte("Bad Gateway"))
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := openai.ChatCompletionRequest{
			Messages: []openai.Message{{Role: "user", Content: "Hello"}},
		}

		resp, err := client.CreateChatCompletion(context.Background(), req)

		assert.Nil(t, resp)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "status 502")
		assert.Contains(t, err.Error(), "DeepSeek")
	})

	t.Run("handles context cancellation", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(5 * time.Second)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()

		req := openai.ChatCompletionRequest{
			Messages: []openai.Message{{Role: "user", Content: "Hello"}},
		}

		resp, err := client.CreateChatCompletion(ctx, req)

		assert.Nil(t, resp)
		assert.Error(t, err)
	})

	t.Run("handles invalid JSON response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte("{invalid json"))
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := openai.ChatCompletionRequest{
			Messages: []openai.Message{{Role: "user", Content: "Hello"}},
		}

		resp, err := client.CreateChatCompletion(context.Background(), req)

		assert.Nil(t, resp)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse response")
	})
}

func TestCreateSimpleCompletion(t *testing.T) {
	t.Run("successful simple completion", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var req openai.ChatCompletionRequest
			json.NewDecoder(r.Body).Decode(&req)

			// Verify messages structure
			assert.Len(t, req.Messages, 2)
			assert.Equal(t, "system", req.Messages[0].Role)
			assert.Equal(t, "You are a math tutor.", req.Messages[0].Content)
			assert.Equal(t, "user", req.Messages[1].Role)
			assert.Equal(t, "What is pi?", req.Messages[1].Content)

			// Verify parameters
			assert.Equal(t, 0.5, req.Temperature)
			assert.Equal(t, 200, req.MaxTokens)

			resp := openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{
					{Message: openai.Message{Content: "Pi is approximately 3.14159"}},
				},
			}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		result, err := client.CreateSimpleCompletion(
			context.Background(),
			"You are a math tutor.",
			"What is pi?",
			0.5,
			200,
		)

		require.NoError(t, err)
		assert.Equal(t, "Pi is approximately 3.14159", result)
	})

	t.Run("returns error when no choices", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			resp := openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{},
			}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		result, err := client.CreateSimpleCompletion(
			context.Background(),
			"system",
			"user",
			0.5,
			100,
		)

		assert.Empty(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "no completion choices returned")
	})

	t.Run("propagates API errors", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusTooManyRequests)
			errResp := openai.ErrorResponse{
				Error: struct {
					Message string `json:"message"`
					Type    string `json:"type"`
					Code    string `json:"code"`
				}{
					Message: "Rate limit exceeded",
				},
			}
			json.NewEncoder(w).Encode(errResp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-deepseek-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		result, err := client.CreateSimpleCompletion(
			context.Background(),
			"system",
			"user",
			0.5,
			100,
		)

		assert.Empty(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Rate limit exceeded")
	})
}

func TestConstants(t *testing.T) {
	t.Run("default base URL is correct", func(t *testing.T) {
		assert.Equal(t, "https://api.deepseek.com", DefaultBaseURL)
	})

	t.Run("default model is correct", func(t *testing.T) {
		assert.Equal(t, "deepseek-chat", DefaultModel)
	})
}
