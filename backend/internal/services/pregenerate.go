package services

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// PregenerateService handles background pre-generation of learning steps
type PregenerateService struct {
	cache        *cache.StepCache
	llmProvider  llm.Provider
	providerType llm.ProviderType
	loader       *prompts.Loader
	renderer     *prompts.Renderer
	inProgress   sync.Map // Tracks ongoing generation to prevent duplicates
	logger       *slog.Logger
}

// NewPregenerateService creates a new pre-generation service
func NewPregenerateService(
	stepCache *cache.StepCache,
	provider llm.Provider,
	providerType llm.ProviderType,
	promptLoader *prompts.Loader,
	promptRenderer *prompts.Renderer,
	logger *slog.Logger,
) *PregenerateService {
	return &PregenerateService{
		cache:        stepCache,
		llmProvider:  provider,
		providerType: providerType,
		loader:       promptLoader,
		renderer:     promptRenderer,
		logger:       logger,
	}
}

// TriggerPregeneration starts background generation for a course
// It's safe to call multiple times - duplicate calls will be ignored
func (s *PregenerateService) TriggerPregeneration(course *models.Course, userTier string) {
	if s.llmProvider == nil || s.loader == nil {
		return // LLM not initialized
	}

	key := course.ID + ":" + course.UserID

	// Skip if already cached
	if s.cache.Has(course.ID, course.UserID) {
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

		step, err := s.generateStep(ctx, course, userTier)
		if err != nil {
			if s.logger != nil {
				s.logger.Error("pregeneration_failed",
					slog.String("course_id", course.ID),
					slog.String("user_id", course.UserID),
					slog.String("user_tier", userTier),
					slog.String("error", err.Error()),
				)
			}
			return
		}

		// Store in cache
		s.cache.Set(course.ID, course.UserID, step)

		if s.logger != nil {
			s.logger.Info("pregeneration_complete",
				slog.String("course_id", course.ID),
				slog.String("user_tier", userTier),
				slog.String("step_type", step.Type),
				slog.String("step_topic", step.Topic),
			)
		}
	}()
}

// IsGenerating checks if a course is currently being pre-generated
func (s *PregenerateService) IsGenerating(courseID, userID string) bool {
	key := courseID + ":" + userID
	_, exists := s.inProgress.Load(key)
	return exists
}

// generateStep creates a new step using the LLM with tier-aware model selection
func (s *PregenerateService) generateStep(ctx context.Context, path *models.Course, userTier string) (*models.Step, error) {
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

	// Render prompt with tier and provider-aware model selection
	openaiReq, err := s.renderer.RenderToRequestWithTierAndProvider(template, vars, userTier, s.providerType)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	// Call LLM provider
	completion, err := s.llmProvider.CreateChatCompletion(*openaiReq)
	if err != nil {
		return nil, fmt.Errorf("%s API error: %w", s.llmProvider.Name(), err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned from %s", s.llmProvider.Name())
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
	if err := llm.ParseJSONResponse(content, &stepData); err != nil {
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
func getRecentSteps(course *models.Course) []models.Step {
	if course.Memory == nil || course.Memory.Compaction == nil {
		return course.Steps
	}

	lastIndex := course.Memory.Compaction.LastStepIndex
	if lastIndex >= len(course.Steps)-1 {
		return []models.Step{}
	}

	return course.Steps[lastIndex+1:]
}

// buildMemoryContext builds a context string from the course's memory
func buildMemoryContext(course *models.Course) string {
	var sb strings.Builder

	if course.Memory == nil {
		return "No prior learning history."
	}

	// Include compaction summary if available
	if course.Memory.Compaction != nil && course.Memory.Compaction.Summary != "" {
		sb.WriteString("Learning Summary: ")
		sb.WriteString(course.Memory.Compaction.Summary)
		sb.WriteString("\n")

		if len(course.Memory.Compaction.Strengths) > 0 {
			sb.WriteString("Strengths: ")
			sb.WriteString(strings.Join(course.Memory.Compaction.Strengths, ", "))
			sb.WriteString("\n")
		}

		if len(course.Memory.Compaction.Weaknesses) > 0 {
			sb.WriteString("Areas needing work: ")
			sb.WriteString(strings.Join(course.Memory.Compaction.Weaknesses, ", "))
			sb.WriteString("\n")
		}

		if len(course.Memory.Compaction.Recommendations) > 0 {
			sb.WriteString("Recommendations: ")
			sb.WriteString(strings.Join(course.Memory.Compaction.Recommendations, ", "))
			sb.WriteString("\n")
		}
	}

	// Include topic confidence scores
	if len(course.Memory.Topics) > 0 {
		sb.WriteString("Topic Confidence: ")
		topicStrs := make([]string, 0, len(course.Memory.Topics))
		for topic, mem := range course.Memory.Topics {
			topicStrs = append(topicStrs, fmt.Sprintf("%s: %.0f%%", topic, mem.Confidence*100))
		}
		sb.WriteString(strings.Join(topicStrs, ", "))
	}

	if sb.Len() == 0 {
		return "No prior learning history."
	}

	return sb.String()
}
