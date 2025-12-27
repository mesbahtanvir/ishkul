package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
)

func generateBlocksAsync(courseID, sectionID, lessonID string, course *models.Course, userID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	fs := firebase.GetFirestore()
	if fs == nil {
		return
	}

	lesson, _ := findLessonInCourse(course, lessonID)
	if lesson == nil {
		return
	}

	blocks, err := generateBlocksForLesson(ctx, course, sectionID, lesson)
	if err != nil {
		logError(ctx, "async_block_generation_failed",
			slog.String("course_id", courseID),
			slog.String("lesson_id", lessonID),
			slog.String("error", err.Error()),
		)
		updateLessonBlocksStatus(ctx, fs, course, lessonID, models.ContentStatusError, err.Error())
		return
	}

	_ = saveLessonBlocks(ctx, fs, course, lessonID, blocks)
}

func generateBlocksForLesson(ctx context.Context, course *models.Course, sectionID string, lesson *models.Lesson) ([]models.Block, error) {
	router := GetLLMRouter()
	if router == nil || promptLoader == nil {
		return nil, fmt.Errorf("LLM not initialized")
	}

	// Build context
	llmCtx := models.BuildLLMContext(nil, course, course.CourseProgress)
	if llmCtx.Course != nil {
		llmCtx.Course = llmCtx.Course.WithLesson(lesson)
	}

	// Find section title
	sectionTitle := ""
	for _, s := range course.Outline.Sections {
		if s.ID == sectionID {
			sectionTitle = s.Title
			break
		}
	}

	vars := llmCtx.ToVariables()
	vars["lessonId"] = lesson.ID
	vars["lessonTitle"] = lesson.Title
	vars["lessonDescription"] = lesson.Description
	vars["currentSection"] = sectionTitle
	vars["estimatedMinutes"] = fmt.Sprintf("%d", lesson.EstimatedMinutes)

	// Load prompt
	template, err := promptLoader.LoadByName("learning/lesson-blocks")
	if err != nil {
		return nil, fmt.Errorf("failed to load prompt: %w", err)
	}

	req, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := router.Complete(ctx, *req)
	if err != nil {
		return nil, fmt.Errorf("LLM error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned")
	}

	// Parse response
	var response struct {
		LessonID string `json:"lessonId"`
		Blocks   []struct {
			ID      string `json:"id"`
			Type    string `json:"type"`
			Title   string `json:"title"`
			Purpose string `json:"purpose"`
			Order   int    `json:"order"`
		} `json:"blocks"`
	}

	if err := llm.ParseJSONResponse(completion.Choices[0].Message.Content, &response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Convert to Block models
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
		// Generate UUID if not provided
		if blocks[i].ID == "" {
			blocks[i].ID = uuid.New().String()
		}
	}

	return blocks, nil
}

func generateContentForBlock(ctx context.Context, course *models.Course, sectionID string, lesson *models.Lesson, block *models.Block) (*models.BlockContent, error) {
	router := GetLLMRouter()
	if router == nil || promptLoader == nil {
		return nil, fmt.Errorf("LLM not initialized")
	}

	// Build context
	llmCtx := models.BuildLLMContext(nil, course, course.CourseProgress)
	if llmCtx.Course != nil {
		llmCtx.Course = llmCtx.Course.WithLesson(lesson).WithBlock(block)
	}

	// Find section title
	sectionTitle := ""
	for _, s := range course.Outline.Sections {
		if s.ID == sectionID {
			sectionTitle = s.Title
			break
		}
	}

	vars := llmCtx.ToVariables()
	vars["lessonTitle"] = lesson.Title
	vars["lessonDescription"] = lesson.Description
	vars["currentSection"] = sectionTitle
	vars["blockType"] = block.Type
	vars["blockTitle"] = block.Title
	vars["blockPurpose"] = block.Purpose

	// Build lesson blocks context
	lessonBlocksCtx := ""
	for _, b := range lesson.Blocks {
		status := "pending"
		if b.ContentStatus == models.ContentStatusReady {
			status = "ready"
		}
		lessonBlocksCtx += fmt.Sprintf("- %s (%s) [%s]\n", b.Title, b.Type, status)
	}
	vars["lessonBlocks"] = lessonBlocksCtx

	// Load prompt
	template, err := promptLoader.LoadByName("learning/block-content")
	if err != nil {
		return nil, fmt.Errorf("failed to load prompt: %w", err)
	}

	req, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return nil, fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := router.Complete(ctx, *req)
	if err != nil {
		return nil, fmt.Errorf("LLM error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("no completion returned")
	}

	// Parse response based on block type
	content := &models.BlockContent{}
	responseContent := completion.Choices[0].Message.Content

	switch block.Type {
	case models.BlockTypeText:
		var textResp struct {
			Text string `json:"text"`
		}
		if err := llm.ParseJSONResponse(responseContent, &textResp); err != nil {
			return nil, fmt.Errorf("failed to parse text response: %w", err)
		}
		content.Text = &models.TextContent{Markdown: textResp.Text}

	case models.BlockTypeCode:
		var codeResp models.CodeContent
		if err := llm.ParseJSONResponse(responseContent, &codeResp); err != nil {
			return nil, fmt.Errorf("failed to parse code response: %w", err)
		}
		content.Code = &codeResp

	case models.BlockTypeQuestion:
		var questionResp models.Question
		if err := llm.ParseJSONResponse(responseContent, &questionResp); err != nil {
			return nil, fmt.Errorf("failed to parse question response: %w", err)
		}
		if questionResp.ID == "" {
			questionResp.ID = uuid.New().String()
		}
		content.Question = &models.QuestionContent{Question: questionResp}

	case models.BlockTypeTask:
		var taskResp models.TaskContent
		if err := llm.ParseJSONResponse(responseContent, &taskResp); err != nil {
			return nil, fmt.Errorf("failed to parse task response: %w", err)
		}
		content.Task = &taskResp

	case models.BlockTypeFlashcard:
		var flashcardResp models.FlashcardContent
		if err := llm.ParseJSONResponse(responseContent, &flashcardResp); err != nil {
			return nil, fmt.Errorf("failed to parse flashcard response: %w", err)
		}
		content.Flashcard = &flashcardResp

	case models.BlockTypeSummary:
		var summaryResp models.SummaryContent
		if err := llm.ParseJSONResponse(responseContent, &summaryResp); err != nil {
			return nil, fmt.Errorf("failed to parse summary response: %w", err)
		}
		content.Summary = &summaryResp

	default:
		return nil, fmt.Errorf("unknown block type: %s", block.Type)
	}

	return content, nil
}
