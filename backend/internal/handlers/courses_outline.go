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
// Outline Position Management
// =============================================================================

// advanceOutlinePosition links the completed step to the current outline lesson,
// marks the lesson as completed, and advances the position to the next lesson.
// Returns true if the outline was modified and needs to be saved.
func advanceOutlinePosition(course *models.Course, step *models.Step, score float64) bool {
	if course.Outline == nil || course.CurrentPosition == nil {
		return false
	}

	sectionIdx := course.CurrentPosition.SectionIndex
	lessonIdx := course.CurrentPosition.LessonIndex

	// Validate bounds
	if sectionIdx >= len(course.Outline.Sections) {
		return false
	}

	section := &course.Outline.Sections[sectionIdx]
	if lessonIdx >= len(section.Lessons) {
		return false
	}

	// Link the step to the current lesson
	markLessonCompleted(section, lessonIdx, step, score)

	// Ensure section is marked as in_progress
	if section.Status == "" || section.Status == models.SectionStatusPending {
		section.Status = models.SectionStatusInProgress
	}

	// Check if section is completed
	if areAllLessonsCompleted(section) {
		section.Status = models.SectionStatusCompleted
	}

	// Advance to next position
	advanceToNextPosition(course, sectionIdx, lessonIdx)

	return true
}

// markLessonCompleted marks the current lesson as completed with performance data.
func markLessonCompleted(section *models.Section, lessonIdx int, step *models.Step, score float64) {
	lesson := &section.Lessons[lessonIdx]
	lesson.Status = models.LessonStatusCompleted
	lesson.CompletedAt = time.Now().UnixMilli()
}

// areAllLessonsCompleted checks if all lessons in a section are completed.
func areAllLessonsCompleted(section *models.Section) bool {
	for _, l := range section.Lessons {
		if l.Status != models.LessonStatusCompleted && l.Status != "skipped" {
			return false
		}
	}
	return true
}

// advanceToNextPosition advances the lesson position to the next lesson.
func advanceToNextPosition(course *models.Course, sectionIdx, lessonIdx int) {
	section := &course.Outline.Sections[sectionIdx]

	// Try to move to next lesson in same section
	if lessonIdx+1 < len(section.Lessons) {
		course.CurrentPosition.LessonIndex = lessonIdx + 1
		course.CurrentPosition.LessonID = section.Lessons[lessonIdx+1].ID
		section.Lessons[lessonIdx+1].Status = models.LessonStatusInProgress
		return
	}

	// Try to move to next section
	if sectionIdx+1 < len(course.Outline.Sections) {
		nextSection := &course.Outline.Sections[sectionIdx+1]
		course.CurrentPosition.SectionIndex = sectionIdx + 1
		course.CurrentPosition.SectionID = nextSection.ID
		course.CurrentPosition.LessonIndex = 0

		if len(nextSection.Lessons) > 0 {
			course.CurrentPosition.LessonID = nextSection.Lessons[0].ID
			nextSection.Lessons[0].Status = models.LessonStatusInProgress
		}
		nextSection.Status = models.SectionStatusInProgress
	}
	// If no more sections, position stays at end (course complete)
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
	// New format: count lessons from sections
	for _, s := range outline.Sections {
		count += len(s.Lessons)
	}
	// Fallback: if no sections, try legacy modules
	if count == 0 {
		for _, m := range outline.Modules {
			count += len(m.Topics)
		}
	}
	return count
}
