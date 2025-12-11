package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

// LessonsHandler handles /api/courses/{courseId}/sections/{sectionId}/lessons routes
// Routes:
//   - GET    /api/courses/{id}/sections/{sectionId}/lessons                              -> list section lessons
//   - GET    /api/courses/{id}/sections/{sectionId}/lessons/{lessonId}                   -> get lesson with blocks
//   - POST   /api/courses/{id}/sections/{sectionId}/lessons/{lessonId}/generate-blocks   -> generate block skeletons
//   - POST   /api/courses/{id}/sections/{sectionId}/lessons/{lessonId}/blocks/{blockId}/generate -> generate block content
//   - POST   /api/courses/{id}/sections/{sectionId}/lessons/{lessonId}/blocks/{blockId}/complete -> complete a block
func LessonsHandler(w http.ResponseWriter, r *http.Request, courseID, sectionID string, segments []string) {
	// segments: [] for list, [lessonId] for get, [lessonId, action] or [lessonId, blocks, blockId, action]

	switch len(segments) {
	case 0:
		// GET /sections/{sectionId}/lessons -> list all lessons in section
		if r.Method == http.MethodGet {
			listSectionLessons(w, r, courseID, sectionID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	case 1:
		// GET /sections/{sectionId}/lessons/{lessonId}
		lessonID := segments[0]
		if r.Method == http.MethodGet {
			getLesson(w, r, courseID, sectionID, lessonID)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	case 2:
		// POST /sections/{sectionId}/lessons/{lessonId}/{action}
		lessonID := segments[0]
		action := segments[1]
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		switch action {
		case "generate-blocks":
			generateLessonBlocks(w, r, courseID, sectionID, lessonID)
		default:
			http.Error(w, "Not found", http.StatusNotFound)
		}
	case 4:
		// /sections/{sectionId}/lessons/{lessonId}/blocks/{blockId}/{action}
		lessonID := segments[0]
		if segments[1] != "blocks" {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		blockID := segments[2]
		action := segments[3]
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		switch action {
		case "generate":
			generateBlockContent(w, r, courseID, sectionID, lessonID, blockID)
		case "complete":
			completeBlock(w, r, courseID, sectionID, lessonID, blockID)
		default:
			http.Error(w, "Not found", http.StatusNotFound)
		}
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// listSectionLessons returns all lessons in a section
func listSectionLessons(w http.ResponseWriter, r *http.Request, courseID, sectionID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Get the course
	course, err := getCourseByID(ctx, fs, courseID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Find the section
	section := findSectionInCourse(course, sectionID)
	if section == nil {
		http.Error(w, "Section not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"lessons": section.Lessons,
	})
}

// getLesson returns a lesson with its blocks
func getLesson(w http.ResponseWriter, r *http.Request, courseID, sectionID, lessonID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Get the course
	course, err := getCourseByID(ctx, fs, courseID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Find the lesson in the specified section
	lesson := findLessonInSection(course, sectionID, lessonID)
	if lesson == nil {
		http.Error(w, "Lesson not found in section", http.StatusNotFound)
		return
	}

	// Auto-generate blocks if needed
	if lesson.BlocksStatus == "" || lesson.BlocksStatus == models.ContentStatusPending {
		// Trigger async generation
		go generateBlocksAsync(courseID, sectionID, lessonID, course, userID)

		// Return with generating status
		lesson.BlocksStatus = models.ContentStatusGenerating
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"lesson":    lesson,
		"sectionId": sectionID,
	})
}

// generateLessonBlocks generates block skeletons for a lesson (Stage 2)
func generateLessonBlocks(w http.ResponseWriter, r *http.Request, courseID, sectionID, lessonID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Get the course
	course, err := getCourseByID(ctx, fs, courseID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Find the lesson in the specified section
	lesson := findLessonInSection(course, sectionID, lessonID)
	if lesson == nil {
		http.Error(w, "Lesson not found in section", http.StatusNotFound)
		return
	}

	// Check if already generating or ready
	if lesson.BlocksStatus == models.ContentStatusGenerating {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "generating",
			"message": "Block generation already in progress",
		})
		return
	}

	if lesson.BlocksStatus == models.ContentStatusReady && len(lesson.Blocks) > 0 {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "ready",
			"blocks": lesson.Blocks,
		})
		return
	}

	// Mark as generating
	updateLessonBlocksStatus(ctx, fs, course, lessonID, models.ContentStatusGenerating, "")

	// Generate synchronously for immediate feedback
	blocks, err := generateBlocksForLesson(ctx, course, sectionID, lesson)
	if err != nil {
		updateLessonBlocksStatus(ctx, fs, course, lessonID, models.ContentStatusError, err.Error())
		http.Error(w, fmt.Sprintf("Failed to generate blocks: %v", err), http.StatusInternalServerError)
		return
	}

	// Save blocks to the lesson
	err = saveLessonBlocks(ctx, fs, course, lessonID, blocks)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to save blocks: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ready",
		"blocks": blocks,
	})
}

// generateBlockContent generates content for a specific block (Stage 3)
func generateBlockContent(w http.ResponseWriter, r *http.Request, courseID, sectionID, lessonID, blockID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Get the course
	course, err := getCourseByID(ctx, fs, courseID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Find the lesson in the specified section
	lesson := findLessonInSection(course, sectionID, lessonID)
	if lesson == nil {
		http.Error(w, "Lesson not found in section", http.StatusNotFound)
		return
	}

	block := findBlockInLesson(lesson, blockID)
	if block == nil {
		http.Error(w, "Block not found", http.StatusNotFound)
		return
	}

	// Check if already has content
	if block.ContentStatus == models.ContentStatusReady && block.Content != nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "ready",
			"content": block.Content,
		})
		return
	}

	if block.ContentStatus == models.ContentStatusGenerating {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "generating",
			"message": "Content generation in progress",
		})
		return
	}

	// Mark as generating
	updateBlockContentStatus(ctx, fs, course, lessonID, blockID, models.ContentStatusGenerating, "")

	// Generate content
	content, err := generateContentForBlock(ctx, course, sectionID, lesson, block)
	if err != nil {
		updateBlockContentStatus(ctx, fs, course, lessonID, blockID, models.ContentStatusError, err.Error())
		http.Error(w, fmt.Sprintf("Failed to generate content: %v", err), http.StatusInternalServerError)
		return
	}

	// Save content
	err = saveBlockContent(ctx, fs, course, lessonID, blockID, content)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to save content: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ready",
		"content": content,
	})
}

// completeBlock marks a block as completed
func completeBlock(w http.ResponseWriter, r *http.Request, courseID, sectionID, lessonID, blockID string) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fs := firebase.GetFirestore()
	if fs == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	// Parse request
	var req struct {
		UserAnswer string  `json:"userAnswer,omitempty"`
		Score      float64 `json:"score,omitempty"`
		TimeSpent  int     `json:"timeSpent,omitempty"` // seconds
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Allow empty body
		req = struct {
			UserAnswer string  `json:"userAnswer,omitempty"`
			Score      float64 `json:"score,omitempty"`
			TimeSpent  int     `json:"timeSpent,omitempty"`
		}{}
	}

	// Get the course
	course, err := getCourseByID(ctx, fs, courseID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Find lesson in the specified section
	lesson := findLessonInSection(course, sectionID, lessonID)
	if lesson == nil {
		http.Error(w, "Lesson not found in section", http.StatusNotFound)
		return
	}

	block := findBlockInLesson(lesson, blockID)
	if block == nil {
		http.Error(w, "Block not found", http.StatusNotFound)
		return
	}

	// Create or update block result
	now := time.Now().UnixMilli()
	result := models.BlockResult{
		BlockID:     blockID,
		BlockType:   block.Type,
		Completed:   true,
		CompletedAt: now,
		UserAnswer:  req.UserAnswer,
		Score:       req.Score,
		TimeSpent:   req.TimeSpent,
	}

	// Update lesson progress
	if lesson.Progress == nil {
		lesson.Progress = models.NewLessonProgress()
		lesson.Progress.StartedAt = now
	}

	// Add or update block result
	found := false
	for i, br := range lesson.Progress.BlockResults {
		if br.BlockID == blockID {
			lesson.Progress.BlockResults[i] = result
			found = true
			break
		}
	}
	if !found {
		lesson.Progress.BlockResults = append(lesson.Progress.BlockResults, result)
	}

	// Update current block index
	lesson.Progress.CurrentBlockIndex = len(lesson.Progress.BlockResults)

	// Check if lesson is complete
	lessonComplete := lesson.Progress.IsComplete(len(lesson.Blocks))
	if lessonComplete && lesson.Progress.CompletedAt == 0 {
		lesson.Progress.CompletedAt = now
		lesson.Progress.Score = lesson.Progress.CalculateScore()
		lesson.Status = models.LessonStatusCompleted
	}

	// Save progress
	err = saveLessonProgress(ctx, fs, course, lessonID, lesson)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to save progress: %v", err), http.StatusInternalServerError)
		return
	}

	// Update course progress
	updateCourseProgress(ctx, fs, course)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"blockResult":    result,
		"lessonComplete": lessonComplete,
		"lessonProgress": lesson.Progress,
	})
}

// Helper functions

func getCourseByID(ctx context.Context, fs *firestore.Client, courseID, userID string) (*models.Course, error) {
	doc, err := Collection(fs, "courses").Doc(courseID).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("course not found")
	}

	var course models.Course
	if err := doc.DataTo(&course); err != nil {
		return nil, fmt.Errorf("error reading course")
	}

	if course.UserID != userID {
		return nil, fmt.Errorf("forbidden")
	}

	return &course, nil
}

// findSectionInCourse finds a section by ID in the course
func findSectionInCourse(course *models.Course, sectionID string) *models.Section {
	if course.Outline == nil {
		return nil
	}

	for si := range course.Outline.Sections {
		if course.Outline.Sections[si].ID == sectionID {
			return &course.Outline.Sections[si]
		}
	}
	return nil
}

// findLessonInSection finds a lesson within a specific section
func findLessonInSection(course *models.Course, sectionID, lessonID string) *models.Lesson {
	section := findSectionInCourse(course, sectionID)
	if section == nil {
		return nil
	}

	for li := range section.Lessons {
		if section.Lessons[li].ID == lessonID {
			return &section.Lessons[li]
		}
	}
	return nil
}

// findLessonInCourse finds a lesson anywhere in the course (searches all sections)
// Used for internal operations where section is not specified
func findLessonInCourse(course *models.Course, lessonID string) (*models.Lesson, string) {
	if course.Outline == nil {
		return nil, ""
	}

	for si := range course.Outline.Sections {
		for li := range course.Outline.Sections[si].Lessons {
			if course.Outline.Sections[si].Lessons[li].ID == lessonID {
				return &course.Outline.Sections[si].Lessons[li], course.Outline.Sections[si].ID
			}
		}
	}
	return nil, ""
}

func findBlockInLesson(lesson *models.Lesson, blockID string) *models.Block {
	for i := range lesson.Blocks {
		if lesson.Blocks[i].ID == blockID {
			return &lesson.Blocks[i]
		}
	}
	return nil
}

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
		if appLogger != nil {
			logger.Error(appLogger, ctx, "async_block_generation_failed",
				slog.String("course_id", courseID),
				slog.String("lesson_id", lessonID),
				slog.String("error", err.Error()),
			)
		}
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

func updateLessonBlocksStatus(ctx context.Context, fs *firestore.Client, course *models.Course, lessonID, status, errorMsg string) {
	// Find lesson indices
	for si, section := range course.Outline.Sections {
		for li, lesson := range section.Lessons {
			if lesson.ID == lessonID {
				course.Outline.Sections[si].Lessons[li].BlocksStatus = status
				course.Outline.Sections[si].Lessons[li].BlocksError = errorMsg
				break
			}
		}
	}

	_, _ = Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
}

func updateBlockContentStatus(ctx context.Context, fs *firestore.Client, course *models.Course, lessonID, blockID, status, errorMsg string) {
	// Find and update block
	for si, section := range course.Outline.Sections {
		for li, lesson := range section.Lessons {
			if lesson.ID == lessonID {
				for bi, block := range lesson.Blocks {
					if block.ID == blockID {
						course.Outline.Sections[si].Lessons[li].Blocks[bi].ContentStatus = status
						course.Outline.Sections[si].Lessons[li].Blocks[bi].ContentError = errorMsg
						break
					}
				}
				break
			}
		}
	}

	_, _ = Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
}

func saveLessonBlocks(ctx context.Context, fs *firestore.Client, course *models.Course, lessonID string, blocks []models.Block) error {
	// Find and update lesson
	for si, section := range course.Outline.Sections {
		for li, lesson := range section.Lessons {
			if lesson.ID == lessonID {
				course.Outline.Sections[si].Lessons[li].Blocks = blocks
				course.Outline.Sections[si].Lessons[li].BlocksStatus = models.ContentStatusReady
				course.Outline.Sections[si].Lessons[li].BlocksError = ""
				break
			}
		}
	}

	_, err := Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	return err
}

func saveBlockContent(ctx context.Context, fs *firestore.Client, course *models.Course, lessonID, blockID string, content *models.BlockContent) error {
	// Find and update block
	for si, section := range course.Outline.Sections {
		for li, lesson := range section.Lessons {
			if lesson.ID == lessonID {
				for bi, block := range lesson.Blocks {
					if block.ID == blockID {
						course.Outline.Sections[si].Lessons[li].Blocks[bi].Content = content
						course.Outline.Sections[si].Lessons[li].Blocks[bi].ContentStatus = models.ContentStatusReady
						course.Outline.Sections[si].Lessons[li].Blocks[bi].ContentError = ""
						break
					}
				}
				break
			}
		}
	}

	_, err := Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	return err
}

func saveLessonProgress(ctx context.Context, fs *firestore.Client, course *models.Course, lessonID string, lesson *models.Lesson) error {
	// Find and update lesson progress
	for si, section := range course.Outline.Sections {
		for li, l := range section.Lessons {
			if l.ID == lessonID {
				course.Outline.Sections[si].Lessons[li].Progress = lesson.Progress
				course.Outline.Sections[si].Lessons[li].Status = lesson.Status
				break
			}
		}
	}

	_, err := Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
	return err
}

func updateCourseProgress(ctx context.Context, fs *firestore.Client, course *models.Course) {
	// Calculate completed lessons
	completedCount := 0
	totalCount := 0

	if course.Outline != nil {
		for _, section := range course.Outline.Sections {
			for _, lesson := range section.Lessons {
				totalCount++
				if lesson.Status == models.LessonStatusCompleted {
					completedCount++
				}
			}
		}
	}

	progress := 0
	if totalCount > 0 {
		progress = (completedCount * 100) / totalCount
	}

	_, _ = Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "lessonsCompleted", Value: completedCount},
		{Path: "totalLessons", Value: totalCount},
		{Path: "progress", Value: progress},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})
}
