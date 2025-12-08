package services

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/cache"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// PregenerateService handles background pre-generation of learning blocks
type PregenerateService struct {
	cache        *cache.BlockCache
	llmProvider  llm.Provider
	providerType llm.ProviderType
	loader       *prompts.Loader
	renderer     *prompts.Renderer
	inProgress   sync.Map // Tracks ongoing generation to prevent duplicates
	logger       *slog.Logger
}

// NewPregenerateService creates a new pre-generation service
func NewPregenerateService(
	blockCache *cache.BlockCache,
	provider llm.Provider,
	providerType llm.ProviderType,
	promptLoader *prompts.Loader,
	promptRenderer *prompts.Renderer,
	logger *slog.Logger,
) *PregenerateService {
	return &PregenerateService{
		cache:        blockCache,
		llmProvider:  provider,
		providerType: providerType,
		loader:       promptLoader,
		renderer:     promptRenderer,
		logger:       logger,
	}
}

// TriggerPregeneration starts background generation for a course's next block
// It's safe to call multiple times - duplicate calls will be ignored
func (s *PregenerateService) TriggerPregeneration(course *models.Course, userTier string) {
	if s.llmProvider == nil || s.loader == nil {
		return // LLM not initialized
	}

	// Get current lesson
	lesson := course.GetCurrentLesson()
	if lesson == nil {
		return // No current lesson
	}

	key := course.ID + ":" + lesson.ID

	// Skip if already generating
	if _, exists := s.inProgress.LoadOrStore(key, true); exists {
		return
	}

	// Start background generation
	go func() {
		defer s.inProgress.Delete(key)

		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		block, err := s.generateBlock(ctx, course, lesson, userTier)
		if err != nil {
			if s.logger != nil {
				s.logger.Error("pregeneration_failed",
					slog.String("course_id", course.ID),
					slog.String("lesson_id", lesson.ID),
					slog.String("user_id", course.UserID),
					slog.String("user_tier", userTier),
					slog.String("error", err.Error()),
				)
			}
			return
		}

		// Store in cache
		s.cache.Set(course.ID, lesson.ID, block.ID, block)

		if s.logger != nil {
			s.logger.Info("pregeneration_complete",
				slog.String("course_id", course.ID),
				slog.String("lesson_id", lesson.ID),
				slog.String("user_tier", userTier),
				slog.String("block_type", block.Type),
				slog.String("block_title", block.Title),
			)
		}
	}()
}

// IsGenerating checks if a course/lesson is currently being pre-generated
func (s *PregenerateService) IsGenerating(courseID, lessonID string) bool {
	key := courseID + ":" + lessonID
	_, exists := s.inProgress.Load(key)
	return exists
}

// generateBlock creates a new block using the LLM with tier-aware model selection
func (s *PregenerateService) generateBlock(ctx context.Context, course *models.Course, lesson *models.Lesson, userTier string) (*models.Block, error) {
	// Build context from course progress
	memorySummary := buildCourseContext(course)

	// Prepare variables for the prompt
	vars := prompts.Variables{
		"courseTitle":       course.Title,
		"lessonTitle":       lesson.Title,
		"lessonDescription": lesson.Description,
		"context":           memorySummary,
	}

	// Add current section context if available
	if course.Outline != nil && course.CurrentPosition != nil {
		sectionIdx := course.CurrentPosition.SectionIndex
		if sectionIdx < len(course.Outline.Sections) {
			section := course.Outline.Sections[sectionIdx]
			vars["currentSection"] = section.Title
		}
	}

	// Load the block generation prompt template
	template, err := s.loader.LoadByName("learning/generate-block")
	if err != nil {
		return nil, fmt.Errorf("failed to load prompt template: %w", err)
	}

	// Render prompt with tier and provider-aware model selection
	openaiReq, err := s.renderer.RenderToRequestWithTierAndProvider(template, vars, userTier, s.providerType)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	// Call LLM provider with context for cancellation support
	completion, err := s.llmProvider.CreateChatCompletion(ctx, *openaiReq)
	if err != nil {
		return nil, fmt.Errorf("%s API error: %w", s.llmProvider.Name(), err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned from %s", s.llmProvider.Name())
	}

	content := completion.Choices[0].Message.Content

	// Parse the JSON response
	var blockData struct {
		Type    string `json:"type"`
		Title   string `json:"title"`
		Purpose string `json:"purpose"`
		Content string `json:"content"`
	}
	if err := llm.ParseJSONResponse(content, &blockData); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response as JSON: %w (content: %s)", err, content)
	}

	// Create the Block
	block := &models.Block{
		ID:            fmt.Sprintf("block_%d", time.Now().UnixNano()),
		Type:          blockData.Type,
		Title:         blockData.Title,
		Purpose:       blockData.Purpose,
		ContentStatus: models.ContentStatusReady,
		Content: &models.BlockContent{
			Text: &models.TextContent{
				Markdown: blockData.Content,
			},
		},
	}

	return block, nil
}

// buildCourseContext builds a context string from the course's progress
func buildCourseContext(course *models.Course) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("Course: %s\n", course.Title))
	sb.WriteString(fmt.Sprintf("Progress: %d%%\n", course.Progress))

	if course.Outline != nil {
		sb.WriteString(fmt.Sprintf("Sections: %d\n", len(course.Outline.Sections)))

		// Count completed lessons
		completed := 0
		total := 0
		for _, section := range course.Outline.Sections {
			for _, lesson := range section.Lessons {
				total++
				if lesson.Status == models.LessonStatusCompleted {
					completed++
				}
			}
		}
		sb.WriteString(fmt.Sprintf("Lessons completed: %d/%d\n", completed, total))
	}

	if sb.Len() == 0 {
		return "Starting new course."
	}

	return sb.String()
}
