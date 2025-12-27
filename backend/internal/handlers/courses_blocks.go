package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// =============================================================================
// Block Skeleton Generation (Stage 2)
// =============================================================================

// GenerateBlockSkeletons generates block skeletons for a lesson using the LLM.
// Returns the blocks and the number of tokens used.
// This is called by the queue processor.
func GenerateBlockSkeletons(ctx context.Context, course *models.Course, sectionID, lessonID, userTier string) ([]models.Block, int64, error) {
	if openaiClient == nil || promptLoader == nil {
		return nil, 0, fmt.Errorf("LLM not initialized")
	}

	// Find the section and lesson
	var section *models.Section
	var lesson *models.Lesson
	for i := range course.Outline.Sections {
		if course.Outline.Sections[i].ID == sectionID {
			section = &course.Outline.Sections[i]
			for j := range section.Lessons {
				if section.Lessons[j].ID == lessonID {
					lesson = &section.Lessons[j]
					break
				}
			}
			break
		}
	}

	if section == nil || lesson == nil {
		return nil, 0, fmt.Errorf("section or lesson not found: sectionID=%s, lessonID=%s", sectionID, lessonID)
	}

	// Build previous lessons context
	previousLessons := buildPreviousLessonsContext(section, lessonID)

	vars := prompts.Variables{
		"courseTitle":       course.Title,
		"currentSection":    section.Title,
		"lessonId":          lesson.ID,
		"lessonTitle":       lesson.Title,
		"lessonDescription": lesson.Description,
		"estimatedMinutes":  fmt.Sprintf("%d", lesson.EstimatedMinutes),
		"previousLessons":   previousLessons,
	}

	template, err := promptLoader.LoadByName("learning/lesson-blocks")
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load lesson-blocks prompt: %w", err)
	}

	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := openaiClient.CreateChatCompletion(ctx, *openaiReq)
	if err != nil {
		return nil, 0, fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, 0, fmt.Errorf("no completion returned from OpenAI")
	}

	blocks, err := parseBlockSkeletonsFromResponse(completion.Choices[0].Message.Content)
	if err != nil {
		return nil, 0, err
	}

	// Estimate tokens used (TODO: get actual usage from response)
	estimatedTokens := int64(500)

	return blocks, estimatedTokens, nil
}

// blockSkeletonsResponse represents the LLM response for block skeletons
type blockSkeletonsResponse struct {
	LessonID string `json:"lessonId"`
	Blocks   []struct {
		ID      string `json:"id"`
		Type    string `json:"type"`
		Title   string `json:"title"`
		Purpose string `json:"purpose"`
		Order   int    `json:"order"`
	} `json:"blocks"`
	Reasoning struct {
		BlockSequence string `json:"blockSequence"`
		Interactivity string `json:"interactivity"`
	} `json:"reasoning"`
}

// parseBlockSkeletonsFromResponse parses the LLM response into Block skeletons
func parseBlockSkeletonsFromResponse(content string) ([]models.Block, error) {
	var response blockSkeletonsResponse
	if err := llm.ParseJSONResponse(content, &response); err != nil {
		return nil, fmt.Errorf("failed to parse block skeletons response as JSON: %w (content: %s)", err, content)
	}

	blocks := make([]models.Block, len(response.Blocks))
	for i, b := range response.Blocks {
		blocks[i] = models.Block{
			ID:            b.ID,
			Type:          b.Type,
			Title:         b.Title,
			Purpose:       b.Purpose,
			Order:         b.Order,
			ContentStatus: models.ContentStatusPending,
		}
	}

	return blocks, nil
}

// buildPreviousLessonsContext creates context about previous lessons in the section
func buildPreviousLessonsContext(section *models.Section, currentLessonID string) string {
	var context string
	for _, lesson := range section.Lessons {
		if lesson.ID == currentLessonID {
			break
		}
		context += fmt.Sprintf("- %s: %s\n", lesson.Title, lesson.Description)
	}
	return context
}

// =============================================================================
// Block Content Generation (Stage 3)
// =============================================================================

// GenerateBlockContent generates content for a specific block using the LLM.
// Returns the content and the number of tokens used.
// This is called by the queue processor.
func GenerateBlockContent(ctx context.Context, course *models.Course, sectionID, lessonID, blockID, userTier string) (*models.BlockContent, int64, error) {
	if openaiClient == nil || promptLoader == nil {
		return nil, 0, fmt.Errorf("LLM not initialized")
	}

	// Find the section, lesson, and block
	var section *models.Section
	var lesson *models.Lesson
	var block *models.Block
	for i := range course.Outline.Sections {
		if course.Outline.Sections[i].ID == sectionID {
			section = &course.Outline.Sections[i]
			for j := range section.Lessons {
				if section.Lessons[j].ID == lessonID {
					lesson = &section.Lessons[j]
					for k := range lesson.Blocks {
						if lesson.Blocks[k].ID == blockID {
							block = &lesson.Blocks[k]
							break
						}
					}
					break
				}
			}
			break
		}
	}

	if section == nil || lesson == nil || block == nil {
		return nil, 0, fmt.Errorf("section, lesson, or block not found: sectionID=%s, lessonID=%s, blockID=%s", sectionID, lessonID, blockID)
	}

	// Build context about other blocks in the lesson
	lessonBlocks := buildLessonBlocksContext(lesson.Blocks, blockID)

	vars := prompts.Variables{
		"courseTitle":       course.Title,
		"currentSection":    section.Title,
		"lessonTitle":       lesson.Title,
		"lessonDescription": lesson.Description,
		"blockType":         block.Type,
		"blockTitle":        block.Title,
		"blockPurpose":      block.Purpose,
		"lessonBlocks":      lessonBlocks,
	}

	template, err := promptLoader.LoadByName("learning/block-content")
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load block-content prompt: %w", err)
	}

	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := openaiClient.CreateChatCompletion(ctx, *openaiReq)
	if err != nil {
		return nil, 0, fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, 0, fmt.Errorf("no completion returned from OpenAI")
	}

	content, err := parseBlockContentFromResponse(block.Type, completion.Choices[0].Message.Content)
	if err != nil {
		return nil, 0, err
	}

	// Estimate tokens used (TODO: get actual usage from response)
	estimatedTokens := int64(300)

	return content, estimatedTokens, nil
}

// parseBlockContentFromResponse parses the LLM response into BlockContent based on type
func parseBlockContentFromResponse(blockType, responseContent string) (*models.BlockContent, error) {
	// Strip markdown code blocks if present
	cleanContent := llm.StripMarkdownCodeBlocks(responseContent)

	content := &models.BlockContent{}

	switch blockType {
	case models.BlockTypeText:
		var textResp struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal([]byte(cleanContent), &textResp); err != nil {
			return nil, fmt.Errorf("failed to parse text content: %w", err)
		}
		content.Text = &models.TextContent{Markdown: textResp.Text}

	case models.BlockTypeCode:
		var codeResp models.CodeContent
		if err := json.Unmarshal([]byte(cleanContent), &codeResp); err != nil {
			return nil, fmt.Errorf("failed to parse code content: %w", err)
		}
		content.Code = &codeResp

	case models.BlockTypeQuestion:
		var questionResp models.Question
		if err := json.Unmarshal([]byte(cleanContent), &questionResp); err != nil {
			return nil, fmt.Errorf("failed to parse question content: %w", err)
		}
		content.Question = &models.QuestionContent{Question: questionResp}

	case models.BlockTypeTask:
		var taskResp models.TaskContent
		if err := json.Unmarshal([]byte(cleanContent), &taskResp); err != nil {
			return nil, fmt.Errorf("failed to parse task content: %w", err)
		}
		content.Task = &taskResp

	case models.BlockTypeFlashcard:
		var flashcardResp models.FlashcardContent
		if err := json.Unmarshal([]byte(cleanContent), &flashcardResp); err != nil {
			return nil, fmt.Errorf("failed to parse flashcard content: %w", err)
		}
		content.Flashcard = &flashcardResp

	case models.BlockTypeSummary:
		var summaryResp models.SummaryContent
		if err := json.Unmarshal([]byte(cleanContent), &summaryResp); err != nil {
			return nil, fmt.Errorf("failed to parse summary content: %w", err)
		}
		content.Summary = &summaryResp

	default:
		return nil, fmt.Errorf("unknown block type: %s", blockType)
	}

	return content, nil
}

// buildLessonBlocksContext creates context about other blocks in the lesson
func buildLessonBlocksContext(blocks []models.Block, currentBlockID string) string {
	var context string
	for _, b := range blocks {
		marker := ""
		if b.ID == currentBlockID {
			marker = " [CURRENT]"
		}
		context += fmt.Sprintf("- %s (%s): %s%s\n", b.Title, b.Type, b.Purpose, marker)
	}
	return context
}

// =============================================================================
// Firestore Update Helpers
// =============================================================================

// UpdateLessonBlocks updates the blocks for a lesson in Firestore
func UpdateLessonBlocks(ctx context.Context, courseID, sectionID, lessonID string, blocks []models.Block, blocksStatus string) error {
	fs := firebase.GetFirestore()
	if fs == nil {
		return fmt.Errorf("firestore not available")
	}

	// Get the course document
	courseRef := fs.Collection("courses").Doc(courseID)
	courseDoc, err := courseRef.Get(ctx)
	if err != nil {
		return fmt.Errorf("failed to get course: %w", err)
	}

	var course models.Course
	if err := courseDoc.DataTo(&course); err != nil {
		return fmt.Errorf("failed to parse course: %w", err)
	}

	// Find and update the lesson (capture old status for logging)
	found := false
	var oldStatus string
	for i := range course.Outline.Sections {
		if course.Outline.Sections[i].ID == sectionID {
			for j := range course.Outline.Sections[i].Lessons {
				if course.Outline.Sections[i].Lessons[j].ID == lessonID {
					// Capture old status before updating
					oldStatus = course.Outline.Sections[i].Lessons[j].BlocksStatus

					// Log blocksStatus transition
					if appLogger != nil {
						logger.Info(appLogger, ctx, "blocks_status_update",
							slog.String("course_id", courseID),
							slog.String("section_id", sectionID),
							slog.String("lesson_id", lessonID),
							slog.String("old_status", oldStatus),
							slog.String("new_status", blocksStatus),
							slog.Int("blocks_count", len(blocks)),
						)
					}

					course.Outline.Sections[i].Lessons[j].Blocks = blocks
					course.Outline.Sections[i].Lessons[j].BlocksStatus = blocksStatus
					found = true
					break
				}
			}
			break
		}
	}

	if !found {
		return fmt.Errorf("lesson not found: sectionID=%s, lessonID=%s", sectionID, lessonID)
	}

	// Log write operation
	if appLogger != nil {
		firebase.LogWriteStart(ctx, appLogger, "update", "courses/"+courseID,
			slog.String("field", "outline.blocksStatus"),
			slog.String("lesson_id", lessonID),
			slog.String("status_transition", oldStatus+" -> "+blocksStatus),
		)
	}

	// Update the document
	_, err = courseRef.Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})

	// Log write result
	if appLogger != nil {
		if err != nil {
			logger.Error(appLogger, ctx, "blocks_status_update_failed",
				slog.String("course_id", courseID),
				slog.String("lesson_id", lessonID),
				slog.String("attempted_status", blocksStatus),
				slog.String("error", err.Error()),
			)
		}
		firebase.LogWrite(ctx, appLogger, "update", "courses/"+courseID, err)
	}

	return err
}

// UpdateBlockContent updates the content for a specific block in Firestore
func UpdateBlockContent(ctx context.Context, courseID, sectionID, lessonID, blockID string, content *models.BlockContent, contentStatus string) error {
	fs := firebase.GetFirestore()
	if fs == nil {
		return fmt.Errorf("firestore not available")
	}

	// Get the course document
	courseRef := fs.Collection("courses").Doc(courseID)
	courseDoc, err := courseRef.Get(ctx)
	if err != nil {
		return fmt.Errorf("failed to get course: %w", err)
	}

	var course models.Course
	if err := courseDoc.DataTo(&course); err != nil {
		return fmt.Errorf("failed to parse course: %w", err)
	}

	// Find and update the block
	found := false
	for i := range course.Outline.Sections {
		if course.Outline.Sections[i].ID == sectionID {
			for j := range course.Outline.Sections[i].Lessons {
				if course.Outline.Sections[i].Lessons[j].ID == lessonID {
					for k := range course.Outline.Sections[i].Lessons[j].Blocks {
						if course.Outline.Sections[i].Lessons[j].Blocks[k].ID == blockID {
							course.Outline.Sections[i].Lessons[j].Blocks[k].Content = content
							course.Outline.Sections[i].Lessons[j].Blocks[k].ContentStatus = contentStatus
							found = true
							break
						}
					}
					break
				}
			}
			break
		}
	}

	if !found {
		return fmt.Errorf("block not found: sectionID=%s, lessonID=%s, blockID=%s", sectionID, lessonID, blockID)
	}

	// Update the document
	_, err = courseRef.Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})

	return err
}
