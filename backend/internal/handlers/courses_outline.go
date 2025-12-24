package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/internal/tools"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// =============================================================================
// Outline Generation
// =============================================================================

// GenerateCourseOutline generates a course outline using the LLM.
// Returns the outline and the number of tokens used.
// This is the exported version for use by the queue processor.
func GenerateCourseOutline(ctx context.Context, goal, userTier string) (*models.CourseOutline, int64, error) {
	outline, err := generateCourseOutline(ctx, goal)
	if err != nil {
		return nil, 0, err
	}

	// TODO: Track actual token usage from LLM response
	// For now, estimate based on outline size
	estimatedTokens := int64(1000) // Base cost for outline generation

	return outline, estimatedTokens, nil
}

// generateCourseOutline generates a course outline using the LLM.
func generateCourseOutline(ctx context.Context, goal string) (*models.CourseOutline, error) {
	if openaiClient == nil || promptLoader == nil {
		return nil, fmt.Errorf("LLM not initialized")
	}

	vars := prompts.Variables{
		"goal":             goal,
		"toolDescriptions": tools.GetToolDescriptions(),
		"category":         InferCategory(goal),
	}

	template, err := promptLoader.LoadByName("learning/course-outline")
	if err != nil {
		return nil, fmt.Errorf("failed to load course-outline prompt: %w", err)
	}

	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := openaiClient.CreateChatCompletion(ctx, *openaiReq)
	if err != nil {
		return nil, fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned from OpenAI")
	}

	return parseOutlineFromResponse(completion.Choices[0].Message.Content)
}

// parseOutlineFromResponse parses the LLM response into a CourseOutline.
func parseOutlineFromResponse(content string) (*models.CourseOutline, error) {
	var outlineData outlineResponseData
	if err := llm.ParseJSONResponse(content, &outlineData); err != nil {
		return nil, fmt.Errorf("failed to parse outline response as JSON: %w (content: %s)", err, content)
	}

	return convertToOutlineModel(&outlineData), nil
}

// outlineResponseData represents the raw LLM response structure.
// Uses new format: sections with lessons (was: modules with topics).
type outlineResponseData struct {
	Title            string   `json:"title"`
	Description      string   `json:"description"`
	Emoji            string   `json:"emoji"`
	EstimatedMinutes int      `json:"estimatedMinutes"`
	Difficulty       string   `json:"difficulty"` // top-level in new format
	Category         string   `json:"category"`   // top-level in new format
	Prerequisites    []string `json:"prerequisites"`
	LearningOutcomes []string `json:"learningOutcomes"`
	// New format: sections with lessons
	Sections []struct {
		ID               string   `json:"id"`
		Title            string   `json:"title"`
		Description      string   `json:"description"`
		EstimatedMinutes int      `json:"estimatedMinutes"`
		LearningOutcomes []string `json:"learningOutcomes"`
		Lessons          []struct {
			ID               string `json:"id"`
			Title            string `json:"title"`
			Description      string `json:"description"`
			EstimatedMinutes int    `json:"estimatedMinutes"`
		} `json:"lessons"`
	} `json:"sections"`
	// Reasoning field (optional, for debugging)
	Reasoning struct {
		StructureRationale  string `json:"structureRationale"`
		LearningProgression string `json:"learningProgression"`
		Personalization     string `json:"personalization"`
	} `json:"reasoning"`
}

// convertToOutlineModel converts raw response data to CourseOutline model.
func convertToOutlineModel(data *outlineResponseData) *models.CourseOutline {
	outline := &models.CourseOutline{
		Title:            data.Title,
		Description:      data.Description,
		EstimatedMinutes: data.EstimatedMinutes,
		Prerequisites:    data.Prerequisites,
		LearningOutcomes: data.LearningOutcomes,
		Metadata: models.OutlineMetadata{
			Difficulty: data.Difficulty,
			Category:   data.Category,
			Tags:       []string{}, // Tags not in new format, initialize empty
		},
		GeneratedAt: time.Now().UnixMilli(),
		Sections:    make([]models.Section, 0, len(data.Sections)),
	}

	// Convert sections and lessons to the new model structure
	for _, s := range data.Sections {
		section := models.Section{
			ID:               s.ID,
			Title:            s.Title,
			Description:      s.Description,
			EstimatedMinutes: s.EstimatedMinutes,
			LearningOutcomes: s.LearningOutcomes,
			Status:           models.SectionStatusPending,
			Lessons:          make([]models.Lesson, 0, len(s.Lessons)),
		}

		for _, l := range s.Lessons {
			lesson := models.Lesson{
				ID:               l.ID,
				Title:            l.Title,
				Description:      l.Description,
				EstimatedMinutes: l.EstimatedMinutes,
				BlocksStatus:     models.ContentStatusPending,
				Status:           models.LessonStatusPending,
				Blocks:           []models.Block{},
			}
			section.Lessons = append(section.Lessons, lesson)
		}

		outline.Sections = append(outline.Sections, section)
	}

	return outline
}

// =============================================================================
// Outline Utilities
// =============================================================================

// countOutlineLessons returns the total number of lessons in an outline.
// Counts from new Sections/Lessons format, falls back to legacy Modules/Topics.
func countOutlineLessons(outline *models.CourseOutline) int {
	if outline == nil {
		return 0
	}

	count := 0
	// Count lessons from sections
	for _, s := range outline.Sections {
		count += len(s.Lessons)
	}
	return count
}
