package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

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

// updateLessonProgress handles partial progress updates
func updateLessonProgress(w http.ResponseWriter, r *http.Request, courseID, sectionID, lessonID string) {
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
		CompletedBlocks   []string `json:"completedBlocks,omitempty"`
		LastBlockID       string   `json:"lastBlockId,omitempty"`
		CurrentBlockIndex int      `json:"currentBlockIndex,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
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

	// Initialize progress if needed
	now := time.Now().UnixMilli()
	if lesson.Progress == nil {
		lesson.Progress = models.NewLessonProgress()
		lesson.Progress.StartedAt = now
	}

	// Update progress fields
	if len(req.CompletedBlocks) > 0 {
		// Merge completed blocks (don't overwrite existing)
		existingBlocks := make(map[string]bool)
		for _, br := range lesson.Progress.BlockResults {
			existingBlocks[br.BlockID] = true
		}
		for _, blockID := range req.CompletedBlocks {
			if !existingBlocks[blockID] {
				lesson.Progress.BlockResults = append(lesson.Progress.BlockResults, models.BlockResult{
					BlockID:     blockID,
					Completed:   true,
					CompletedAt: now,
				})
			}
		}
	}

	if req.LastBlockID != "" {
		lesson.Progress.CurrentBlockIndex = req.CurrentBlockIndex
	}

	// Update lesson status if needed
	if lesson.Status == "" || lesson.Status == models.LessonStatusPending {
		lesson.Status = models.LessonStatusInProgress
	}

	// Save progress
	err = saveLessonProgress(ctx, fs, course, lessonID, lesson)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to save progress: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"progress": lesson.Progress,
	})
}

func updateLessonBlocksStatus(ctx context.Context, fs *firestore.Client, course *models.Course, lessonID, status, errorMsg string) {
	// Find lesson indices and capture old status for validation
	var oldStatus string
	for si, section := range course.Outline.Sections {
		for li, lesson := range section.Lessons {
			if lesson.ID == lessonID {
				oldStatus = lesson.BlocksStatus
				course.Outline.Sections[si].Lessons[li].BlocksStatus = status
				course.Outline.Sections[si].Lessons[li].BlocksError = errorMsg
				break
			}
		}
	}

	// Validate the status transition
	isValidTransition := ValidateBlocksStatusTransition(ctx, appLogger, course.ID, lessonID, oldStatus, status)

	firebase.LogWriteStart(ctx, appLogger, "update", "courses/"+course.ID,
		slog.String("field", "outline.blocksStatus"),
		slog.String("lesson_id", lessonID),
		slog.String("old_status", oldStatus),
		slog.String("new_status", status),
		slog.Bool("valid_transition", isValidTransition),
	)

	_, err := Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})

	firebase.LogWrite(ctx, appLogger, "update", "courses/"+course.ID, err)
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

	firebase.LogWriteStart(ctx, appLogger, "update", "courses/"+course.ID,
		slog.String("field", "outline.contentStatus"),
		slog.String("lesson_id", lessonID),
		slog.String("block_id", blockID),
		slog.String("status", status),
	)

	_, err := Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "outline", Value: course.Outline},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})

	firebase.LogWrite(ctx, appLogger, "update", "courses/"+course.ID, err)
}

func saveLessonBlocks(ctx context.Context, fs *firestore.Client, course *models.Course, lessonID string, blocks []models.Block) error {
	// Find and update lesson, capturing old status for validation
	var oldStatus string
	for si, section := range course.Outline.Sections {
		for li, lesson := range section.Lessons {
			if lesson.ID == lessonID {
				oldStatus = lesson.BlocksStatus
				course.Outline.Sections[si].Lessons[li].Blocks = blocks
				course.Outline.Sections[si].Lessons[li].BlocksStatus = models.ContentStatusReady
				course.Outline.Sections[si].Lessons[li].BlocksError = ""
				break
			}
		}
	}

	// Validate the status transition (generating -> complete/ready)
	isValidTransition := ValidateBlocksStatusTransition(ctx, appLogger, course.ID, lessonID, oldStatus, models.ContentStatusReady)

	logInfo(ctx, "save_lesson_blocks",
		slog.String("course_id", course.ID),
		slog.String("lesson_id", lessonID),
		slog.String("old_status", oldStatus),
		slog.String("new_status", models.ContentStatusReady),
		slog.Bool("valid_transition", isValidTransition),
		slog.Int("blocks_count", len(blocks)),
	)

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

	firebase.LogWriteStart(ctx, appLogger, "update", "courses/"+course.ID,
		slog.String("field", "progress"),
		slog.Int("lessons_completed", completedCount),
		slog.Int("total_lessons", totalCount),
		slog.Int("progress_percent", progress),
	)

	_, err := Collection(fs, "courses").Doc(course.ID).Update(ctx, []firestore.Update{
		{Path: "lessonsCompleted", Value: completedCount},
		{Path: "totalLessons", Value: totalCount},
		{Path: "progress", Value: progress},
		{Path: "updatedAt", Value: time.Now().UnixMilli()},
	})

	firebase.LogWrite(ctx, appLogger, "update", "courses/"+course.ID, err)
}
