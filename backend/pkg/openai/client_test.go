package openai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewClient(t *testing.T) {
	t.Run("returns error when API key not set", func(t *testing.T) {
		// Unset API key
		os.Unsetenv("OPENAI_API_KEY")

		client, err := NewClient()

		assert.Nil(t, client)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "OPENAI_API_KEY environment variable not set")
	})

	t.Run("creates client with API key", func(t *testing.T) {
		os.Setenv("OPENAI_API_KEY", "test-api-key")
		defer os.Unsetenv("OPENAI_API_KEY")

		client, err := NewClient()

		require.NoError(t, err)
		assert.NotNil(t, client)
		assert.Equal(t, "test-api-key", client.apiKey)
	})

	t.Run("uses default base URL", func(t *testing.T) {
		os.Setenv("OPENAI_API_KEY", "test-api-key")
		os.Unsetenv("OPENAI_BASE_URL")
		defer os.Unsetenv("OPENAI_API_KEY")

		client, err := NewClient()

		require.NoError(t, err)
		assert.Equal(t, "https://api.openai.com/v1", client.baseURL)
	})

	t.Run("uses custom base URL when set", func(t *testing.T) {
		os.Setenv("OPENAI_API_KEY", "test-api-key")
		os.Setenv("OPENAI_BASE_URL", "https://custom.api.com/v1")
		defer os.Unsetenv("OPENAI_API_KEY")
		defer os.Unsetenv("OPENAI_BASE_URL")

		client, err := NewClient()

		require.NoError(t, err)
		assert.Equal(t, "https://custom.api.com/v1", client.baseURL)
	})
}

func TestClientName(t *testing.T) {
	os.Setenv("OPENAI_API_KEY", "test-api-key")
	defer os.Unsetenv("OPENAI_API_KEY")

	client, err := NewClient()
	require.NoError(t, err)

	assert.Equal(t, "openai", client.Name())
}

func TestCreateChatCompletion(t *testing.T) {
	t.Run("successful completion request", func(t *testing.T) {
		// Create mock server
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Verify request
			assert.Equal(t, "POST", r.Method)
			assert.Equal(t, "/chat/completions", r.URL.Path)
			assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
			assert.Equal(t, "Bearer test-api-key", r.Header.Get("Authorization"))

			// Parse request body
			var req ChatCompletionRequest
			err := json.NewDecoder(r.Body).Decode(&req)
			require.NoError(t, err)
			assert.Equal(t, "gpt-4o-mini", req.Model)
			assert.Len(t, req.Messages, 2)

			// Return mock response
			resp := ChatCompletionResponse{
				ID:      "chatcmpl-123",
				Object:  "chat.completion",
				Created: time.Now().Unix(),
				Model:   "gpt-4o-mini",
				Choices: []ChatCompletionChoice{
					{
						Index: 0,
						Message: Message{
							Role:    "assistant",
							Content: "Hello! How can I help you today?",
						},
						FinishReason: "stop",
					},
				},
				Usage: Usage{
					PromptTokens:     10,
					CompletionTokens: 8,
					TotalTokens:      18,
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		// Create client with mock server
		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := ChatCompletionRequest{
			Messages: []Message{
				{Role: "system", Content: "You are a helpful assistant."},
				{Role: "user", Content: "Hello!"},
			},
		}

		resp, err := client.CreateChatCompletion(context.Background(), req)

		require.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "chatcmpl-123", resp.ID)
		assert.Len(t, resp.Choices, 1)
		assert.Equal(t, "Hello! How can I help you today?", resp.Choices[0].Message.Content)
	})

	t.Run("sets default model when not provided", func(t *testing.T) {
		var receivedModel string
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var req ChatCompletionRequest
			json.NewDecoder(r.Body).Decode(&req)
			receivedModel = req.Model

			resp := ChatCompletionResponse{
				Choices: []ChatCompletionChoice{{Message: Message{Content: "test"}}},
			}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := ChatCompletionRequest{
			Messages: []Message{{Role: "user", Content: "Hello"}},
			// Model not set
		}

		_, err := client.CreateChatCompletion(context.Background(), req)

		require.NoError(t, err)
		assert.Equal(t, "gpt-4o-mini", receivedModel)
	})

	t.Run("uses provided model", func(t *testing.T) {
		var receivedModel string
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var req ChatCompletionRequest
			json.NewDecoder(r.Body).Decode(&req)
			receivedModel = req.Model

			resp := ChatCompletionResponse{
				Choices: []ChatCompletionChoice{{Message: Message{Content: "test"}}},
			}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := ChatCompletionRequest{
			Model:    "gpt-4",
			Messages: []Message{{Role: "user", Content: "Hello"}},
		}

		_, err := client.CreateChatCompletion(context.Background(), req)

		require.NoError(t, err)
		assert.Equal(t, "gpt-4", receivedModel)
	})

	t.Run("handles API error response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
			errResp := ErrorResponse{
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

		req := ChatCompletionRequest{
			Messages: []Message{{Role: "user", Content: "Hello"}},
		}

		resp, err := client.CreateChatCompletion(context.Background(), req)

		assert.Nil(t, resp)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid API key")
	})

	t.Run("handles non-JSON error response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Internal Server Error"))
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := ChatCompletionRequest{
			Messages: []Message{{Role: "user", Content: "Hello"}},
		}

		resp, err := client.CreateChatCompletion(context.Background(), req)

		assert.Nil(t, resp)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "status 500")
	})

	t.Run("handles context cancellation", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Simulate slow response
			time.Sleep(5 * time.Second)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()

		req := ChatCompletionRequest{
			Messages: []Message{{Role: "user", Content: "Hello"}},
		}

		resp, err := client.CreateChatCompletion(ctx, req)

		assert.Nil(t, resp)
		assert.Error(t, err)
	})

	t.Run("handles invalid JSON response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte("not valid json"))
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		req := ChatCompletionRequest{
			Messages: []Message{{Role: "user", Content: "Hello"}},
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
			var req ChatCompletionRequest
			json.NewDecoder(r.Body).Decode(&req)

			// Verify messages structure
			assert.Len(t, req.Messages, 2)
			assert.Equal(t, "system", req.Messages[0].Role)
			assert.Equal(t, "You are a helpful assistant.", req.Messages[0].Content)
			assert.Equal(t, "user", req.Messages[1].Role)
			assert.Equal(t, "What is 2+2?", req.Messages[1].Content)

			// Verify parameters
			assert.Equal(t, 0.7, req.Temperature)
			assert.Equal(t, 100, req.MaxTokens)

			resp := ChatCompletionResponse{
				Choices: []ChatCompletionChoice{
					{Message: Message{Content: "4"}},
				},
			}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		result, err := client.CreateSimpleCompletion(
			context.Background(),
			"You are a helpful assistant.",
			"What is 2+2?",
			0.7,
			100,
		)

		require.NoError(t, err)
		assert.Equal(t, "4", result)
	})

	t.Run("returns error when no choices", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			resp := ChatCompletionResponse{
				Choices: []ChatCompletionChoice{}, // Empty choices
			}
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		result, err := client.CreateSimpleCompletion(
			context.Background(),
			"system",
			"user",
			0.7,
			100,
		)

		assert.Empty(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "no completion choices returned")
	})

	t.Run("propagates API errors", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadRequest)
			errResp := ErrorResponse{
				Error: struct {
					Message string `json:"message"`
					Type    string `json:"type"`
					Code    string `json:"code"`
				}{
					Message: "Bad request",
				},
			}
			json.NewEncoder(w).Encode(errResp)
		}))
		defer server.Close()

		client := &Client{
			apiKey:     "test-api-key",
			baseURL:    server.URL,
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}

		result, err := client.CreateSimpleCompletion(
			context.Background(),
			"system",
			"user",
			0.7,
			100,
		)

		assert.Empty(t, result)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Bad request")
	})
}

func TestChatCompletionRequest(t *testing.T) {
	t.Run("serializes correctly to JSON", func(t *testing.T) {
		req := ChatCompletionRequest{
			Model: "gpt-4",
			Messages: []Message{
				{Role: "system", Content: "You are helpful."},
				{Role: "user", Content: "Hi!"},
			},
			Temperature: 0.8,
			MaxTokens:   500,
		}

		data, err := json.Marshal(req)
		require.NoError(t, err)

		var parsed map[string]interface{}
		err = json.Unmarshal(data, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "gpt-4", parsed["model"])
		assert.Equal(t, 0.8, parsed["temperature"])
		assert.Equal(t, float64(500), parsed["max_tokens"])
	})
}
