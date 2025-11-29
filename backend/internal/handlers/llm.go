package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

var (
	openaiClient   *openai.Client
	promptLoader   *prompts.Loader
	promptRenderer *prompts.Renderer
)

// InitializeLLM initializes the LLM components (OpenAI client, prompt loader)
func InitializeLLM(promptsDir string) error {
	var err error

	// Initialize OpenAI client
	openaiClient, err = openai.NewClient()
	if err != nil {
		return fmt.Errorf("failed to initialize OpenAI client: %w", err)
	}

	// Initialize prompt loader
	promptLoader = prompts.NewLoader(promptsDir)
	promptRenderer = prompts.NewRenderer()

	log.Println("LLM components initialized successfully")
	return nil
}

// GenerateRequest represents a request to generate content using a prompt template
type GenerateRequest struct {
	PromptName string            `json:"promptName"` // e.g., "learning/next-step"
	Variables  map[string]string `json:"variables"`  // Variables for template substitution
}

// GenerateResponse represents the response from the LLM
type GenerateResponse struct {
	Content string `json:"content"` // Generated content
	Model   string `json:"model"`   // Model used
	Usage   struct {
		PromptTokens     int `json:"promptTokens"`
		CompletionTokens int `json:"completionTokens"`
		TotalTokens      int `json:"totalTokens"`
	} `json:"usage"`
}

// GenerateContent handles POST /api/llm/generate
// Generates content using OpenAI with a specified prompt template
func GenerateContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if LLM is initialized
	if openaiClient == nil || promptLoader == nil {
		http.Error(w, "LLM not initialized", http.StatusInternalServerError)
		return
	}

	// Parse request body
	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.PromptName == "" {
		http.Error(w, "promptName is required", http.StatusBadRequest)
		return
	}

	// Load prompt template
	template, err := promptLoader.LoadByName(req.PromptName)
	if err != nil {
		log.Printf("Failed to load prompt %s: %v", req.PromptName, err)
		http.Error(w, fmt.Sprintf("Failed to load prompt: %v", err), http.StatusNotFound)
		return
	}

	// Render prompt with variables
	openaiReq, err := promptRenderer.RenderToRequest(template, req.Variables)
	if err != nil {
		log.Printf("Failed to render prompt: %v", err)
		http.Error(w, fmt.Sprintf("Failed to render prompt: %v", err), http.StatusBadRequest)
		return
	}

	// Call OpenAI API
	completion, err := openaiClient.CreateChatCompletion(*openaiReq)
	if err != nil {
		log.Printf("OpenAI API error: %v", err)
		http.Error(w, fmt.Sprintf("Failed to generate content: %v", err), http.StatusInternalServerError)
		return
	}

	// Extract response content
	if len(completion.Choices) == 0 {
		http.Error(w, "No completion choices returned", http.StatusInternalServerError)
		return
	}

	content := completion.Choices[0].Message.Content

	// Build response
	resp := GenerateResponse{
		Content: content,
		Model:   completion.Model,
	}
	resp.Usage.PromptTokens = completion.Usage.PromptTokens
	resp.Usage.CompletionTokens = completion.Usage.CompletionTokens
	resp.Usage.TotalTokens = completion.Usage.TotalTokens

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Failed to encode response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// NextStepRequest represents a request for the next learning step
type NextStepRequest struct {
	Goal          string   `json:"goal"`
	Level         string   `json:"level"`
	History       []string `json:"history"`       // Array of completed step titles
	Memory        string   `json:"memory"`        // Current knowledge/progress summary
	RecentHistory string   `json:"recentHistory"` // Summary of recent activities
}

// GenerateNextStep handles POST /api/llm/next-step
// Generates the next learning step using the next-step prompt template
func GenerateNextStep(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if LLM is initialized
	if openaiClient == nil || promptLoader == nil {
		http.Error(w, "LLM not initialized", http.StatusInternalServerError)
		return
	}

	// Parse request body
	var req NextStepRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.Goal == "" {
		http.Error(w, "goal is required", http.StatusBadRequest)
		return
	}
	if req.Level == "" {
		req.Level = "beginner" // Default level
	}

	// Prepare variables for the prompt
	vars := prompts.Variables{
		"goal":          req.Goal,
		"level":         req.Level,
		"historyCount":  strconv.Itoa(len(req.History)),
		"memory":        req.Memory,
		"recentHistory": req.RecentHistory,
	}

	// If no recent history provided, use last 3 items from history
	if req.RecentHistory == "" && len(req.History) > 0 {
		start := len(req.History) - 3
		if start < 0 {
			start = 0
		}
		vars["recentHistory"] = strings.Join(req.History[start:], ", ")
	}

	// Use the next-step prompt template
	template, err := promptLoader.LoadByName("learning/next-step")
	if err != nil {
		log.Printf("Failed to load next-step prompt: %v", err)
		http.Error(w, "Failed to load prompt template", http.StatusInternalServerError)
		return
	}

	// Render prompt
	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		log.Printf("Failed to render prompt: %v", err)
		http.Error(w, fmt.Sprintf("Failed to render prompt: %v", err), http.StatusBadRequest)
		return
	}

	// Call OpenAI
	completion, err := openaiClient.CreateChatCompletion(*openaiReq)
	if err != nil {
		log.Printf("OpenAI API error: %v", err)
		http.Error(w, "Failed to generate next step", http.StatusInternalServerError)
		return
	}

	if len(completion.Choices) == 0 {
		http.Error(w, "No completion returned", http.StatusInternalServerError)
		return
	}

	content := completion.Choices[0].Message.Content

	// The content should be JSON (as specified in the prompt)
	// Parse it to validate and return
	var nextStep map[string]interface{}
	if err := json.Unmarshal([]byte(content), &nextStep); err != nil {
		// If not valid JSON, return as-is with a warning
		log.Printf("Warning: LLM response is not valid JSON: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"content": content,
			"model":   completion.Model,
			"warning": "Response was not valid JSON",
		})
		return
	}

	// Return the parsed JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"nextStep": nextStep,
		"model":    completion.Model,
		"usage": map[string]int{
			"promptTokens":     completion.Usage.PromptTokens,
			"completionTokens": completion.Usage.CompletionTokens,
			"totalTokens":      completion.Usage.TotalTokens,
		},
	}); err != nil {
		log.Printf("Failed to encode response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// ListPrompts handles GET /api/llm/prompts
// Lists available prompt templates
func ListPrompts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if promptLoader == nil {
		http.Error(w, "LLM not initialized", http.StatusInternalServerError)
		return
	}

	// Get directory from query param (default: learning)
	dir := r.URL.Query().Get("dir")
	if dir == "" {
		dir = "learning"
	}

	prompts, err := promptLoader.List(dir)
	if err != nil {
		log.Printf("Failed to list prompts in %s: %v", dir, err)
		http.Error(w, "Failed to list prompts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"directory": dir,
		"prompts":   prompts,
		"count":     len(prompts),
	})
}
