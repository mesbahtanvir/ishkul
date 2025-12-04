package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
	"github.com/mesbahtanvir/ishkul/backend/pkg/openai"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// PregenerateService handles background pre-generation of learning steps
type PregenerateService struct {
	cache      *cache.StepCache
	openai     *openai.Client
	loader     *prompts.Loader
	renderer   *prompts.Renderer
	inProgress sync.Map // Tracks ongoing generation to prevent duplicates
	logger     *slog.Logger
}

// NewPregenerateService creates a new pre-generation service
func NewPregenerateService(
	stepCache *cache.StepCache,
	openaiClient *openai.Client,
	promptLoader *prompts.Loader,
	promptRenderer *prompts.Renderer,
	logger *slog.Logger,
) *PregenerateService {
	return &PregenerateService{
		cache:    stepCache,
		openai:   openaiClient,
		loader:   promptLoader,
		renderer: promptRenderer,
		logger:   logger,
	}
}

// TriggerPregeneration starts background generation for a learning path
// It's safe to call multiple times - duplicate calls will be ignored
func (s *PregenerateService) TriggerPregeneration(path *models.LearningPath, userTier string) {
	if s.openai == nil || s.loader == nil {
		return // LLM not initialized
	}

	key := path.ID + ":" + path.UserID

	// Skip if already cached
	if s.cache.Has(path.ID, path.UserID) {
		return
	}

	// Skip if already generating
	if _, exists := s.inProgress.LoadOrStore(key, true); exists {
		return
	}

	// Start background generation
	go func() {
		defer s.inProgress.Delete(key)

		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		step, err := s.generateStep(ctx, path, userTier)
		if err != nil {
			if s.logger != nil {
				s.logger.Error("pregeneration_failed",
					slog.String("path_id", path.ID),
					slog.String("user_id", path.UserID),
					slog.String("user_tier", userTier),
					slog.String("error", err.Error()),
				)
			}
			return
		}

		// Store in cache
		s.cache.Set(path.ID, path.UserID, step)

		if s.logger != nil {
			s.logger.Info("pregeneration_complete",
				slog.String("path_id", path.ID),
				slog.String("user_tier", userTier),
				slog.String("step_type", step.Type),
				slog.String("step_topic", step.Topic),
			)
		}
	}()
}

// IsGenerating checks if a path is currently being pre-generated
func (s *PregenerateService) IsGenerating(pathID, userID string) bool {
	key := pathID + ":" + userID
	_, exists := s.inProgress.Load(key)
	return exists
}

// generateStep creates a new step using the LLM with tier-aware model selection
func (s *PregenerateService) generateStep(ctx context.Context, path *models.LearningPath, userTier string) (*models.Step, error) {
	// Get recent steps since last compaction
	recentSteps := getRecentSteps(path)

	// Build recent history string
	recentHistory := ""
	if len(recentSteps) > 0 {
		topics := make([]string, 0, len(recentSteps))
		for _, step := range recentSteps {
			topics = append(topics, step.Topic)
		}
		// Get last 5 topics for context
		start := len(topics) - 5
		if start < 0 {
			start = 0
		}
		recentHistory = strings.Join(topics[start:], ", ")
	}

	// Build memory context
	memorySummary := buildMemoryContext(path)

	// Prepare variables for the prompt
	vars := prompts.Variables{
		"goal":          path.Goal,
		"level":         path.Level,
		"historyCount":  strconv.Itoa(len(path.Steps)),
		"memory":        memorySummary,
		"recentHistory": recentHistory,
	}

	// Add outline context if available
	if path.Outline != nil && path.OutlinePosition != nil {
		moduleIdx := path.OutlinePosition.ModuleIndex
		topicIdx := path.OutlinePosition.TopicIndex

		if moduleIdx < len(path.Outline.Modules) {
			module := path.Outline.Modules[moduleIdx]
			vars["currentModule"] = module.Title

			if topicIdx < len(module.Topics) {
				topic := module.Topics[topicIdx]
				vars["currentTopic"] = topic.Title
				vars["currentTopicType"] = topic.ToolID
				vars["currentTopicDescription"] = topic.Description
			}
		}
	}

	// Load the next-step prompt template
	template, err := s.loader.LoadByName("learning/next-step")
	if err != nil {
		return nil, fmt.Errorf("failed to load prompt template: %w", err)
	}

	// Render prompt with tier-aware model selection
	openaiReq, err := s.renderer.RenderToRequestWithTier(template, vars, userTier)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	// Call OpenAI
	completion, err := s.openai.CreateChatCompletion(*openaiReq)
	if err != nil {
		return nil, fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned from OpenAI")
	}

	content := completion.Choices[0].Message.Content

	// Parse the JSON response
	var stepData struct {
		Type           string   `json:"type"`
		Topic          string   `json:"topic"`
		Title          string   `json:"title"`
		Content        string   `json:"content,omitempty"`
		Question       string   `json:"question,omitempty"`
		Options        []string `json:"options,omitempty"`
		ExpectedAnswer string   `json:"expectedAnswer,omitempty"`
		Task           string   `json:"task,omitempty"`
		Hints          []string `json:"hints,omitempty"`
	}
	if err := json.Unmarshal([]byte(content), &stepData); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response as JSON: %w (content: %s)", err, content)
	}

	// Truncate content if too long
	if len(stepData.Content) > models.MaxStepContentLength {
		stepData.Content = stepData.Content[:models.MaxStepContentLength]
	}

	// Create the Step
	now := time.Now().UnixMilli()
	step := &models.Step{
		ID:             uuid.New().String(),
		Index:          len(path.Steps),
		Type:           stepData.Type,
		Topic:          stepData.Topic,
		Title:          stepData.Title,
		Content:        stepData.Content,
		Question:       stepData.Question,
		Options:        stepData.Options,
		ExpectedAnswer: stepData.ExpectedAnswer,
		Task:           stepData.Task,
		Hints:          stepData.Hints,
		Completed:      false,
		CreatedAt:      now,
	}

	return step, nil
}

// getRecentSteps returns steps since the last compaction
func getRecentSteps(path *models.LearningPath) []models.Step {
	if path.Memory == nil || path.Memory.Compaction == nil {
		return path.Steps
	}

	lastIndex := path.Memory.Compaction.LastStepIndex
	if lastIndex >= len(path.Steps)-1 {
		return []models.Step{}
	}

	return path.Steps[lastIndex+1:]
}

// buildMemoryContext builds a context string from the path's memory
func buildMemoryContext(path *models.LearningPath) string {
	var sb strings.Builder

	if path.Memory == nil {
		return "No prior learning history."
	}

	// Include compaction summary if available
	if path.Memory.Compaction != nil && path.Memory.Compaction.Summary != "" {
		sb.WriteString("Learning Summary: ")
		sb.WriteString(path.Memory.Compaction.Summary)
		sb.WriteString("\n")

		if len(path.Memory.Compaction.Strengths) > 0 {
			sb.WriteString("Strengths: ")
			sb.WriteString(strings.Join(path.Memory.Compaction.Strengths, ", "))
			sb.WriteString("\n")
		}

		if len(path.Memory.Compaction.Weaknesses) > 0 {
			sb.WriteString("Areas needing work: ")
			sb.WriteString(strings.Join(path.Memory.Compaction.Weaknesses, ", "))
			sb.WriteString("\n")
		}

		if len(path.Memory.Compaction.Recommendations) > 0 {
			sb.WriteString("Recommendations: ")
			sb.WriteString(strings.Join(path.Memory.Compaction.Recommendations, ", "))
			sb.WriteString("\n")
		}
	}

	// Include topic confidence scores
	if len(path.Memory.Topics) > 0 {
		sb.WriteString("Topic Confidence: ")
		topicStrs := make([]string, 0, len(path.Memory.Topics))
		for topic, mem := range path.Memory.Topics {
			topicStrs = append(topicStrs, fmt.Sprintf("%s: %.0f%%", topic, mem.Confidence*100))
		}
		sb.WriteString(strings.Join(topicStrs, ", "))
	}

	if sb.Len() == 0 {
		return "No prior learning history."
	}

	return sb.String()
}
