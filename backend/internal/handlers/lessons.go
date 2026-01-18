package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

// LessonsHandler handles /api/courses/{courseId}/sections/{sectionId}/lessons routes
// Routes:
//   - GET    /api/courses/{id}/sections/{sectionId}/lessons                              -> list section lessons
//   - GET    /api/courses/{id}/sections/{sectionId}/lessons/{lessonId}                   -> get lesson with blocks
//   - POST   /api/courses/{id}/sections/{sectionId}/lessons/{lessonId}/generate-blocks   -> generate block skeletons
//   - PATCH  /api/courses/{id}/sections/{sectionId}/lessons/{lessonId}/progress          -> update lesson progress
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
		// PATCH /sections/{sectionId}/lessons/{lessonId}/progress
		lessonID := segments[0]
		action := segments[1]
		switch {
		case r.Method == http.MethodPost && action == "generate-blocks":
			generateLessonBlocks(w, r, courseID, sectionID, lessonID)
		case r.Method == http.MethodPatch && action == "progress":
			updateLessonProgress(w, r, courseID, sectionID, lessonID)
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
		// Queue a task for block generation via the task queue
		tm := GetTaskManager()
		if tm != nil {
			userTier := getUserTierForPregeneration(ctx, fs, userID)
			_, err := tm.CreateBlockSkeletonTask(ctx, courseID, sectionID, lessonID, userID, userTier)
			if err != nil {
				// Log error but continue - fall back to async generation
				logWarn(ctx, "failed_to_queue_block_skeleton_task",
					slog.String("error", err.Error()),
				)
				// Fall back to direct async generation
				go generateBlocksAsync(courseID, sectionID, lessonID, course, userID)
			}
		} else {
			// No task manager, use direct async generation
			go generateBlocksAsync(courseID, sectionID, lessonID, course, userID)
		}

		// Mark as generating and update Firestore
		updateLessonBlocksStatus(ctx, fs, course, lessonID, models.ContentStatusGenerating, "")
		lesson.BlocksStatus = models.ContentStatusGenerating
	}

	// Progressive generation: queue next lesson when user accesses current one
	// This maintains a lookahead buffer so content is ready when user advances
	if tm := GetTaskManager(); tm != nil {
		sectionIdx, lessonIdx := course.FindLessonIndices(sectionID, lessonID)
		if sectionIdx >= 0 && lessonIdx >= 0 {
			userTier := getUserTierForPregeneration(ctx, fs, userID)
			queued, err := tm.QueueNextLesson(ctx, course, sectionIdx, lessonIdx, userID, userTier)
			if err != nil {
				logWarn(ctx, "progressive_queue_failed",
					slog.String("course_id", courseID),
					slog.String("lesson_id", lessonID),
					slog.String("error", err.Error()),
				)
			} else if queued {
				logInfo(ctx, "progressive_next_lesson_queued",
					slog.String("course_id", courseID),
					slog.String("from_lesson", lessonID),
				)
			}
		}
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

	// Try to queue the task for background processing
	tm := GetTaskManager()
	if tm != nil {
		userTier := getUserTierForPregeneration(ctx, fs, userID)
		_, err := tm.CreateBlockContentTask(ctx, courseID, sectionID, lessonID, blockID, userID, userTier, models.PriorityHigh)
		if err != nil {
			// Log error but fall back to synchronous generation
			logWarn(ctx, "failed_to_queue_block_content_task",
				slog.String("error", err.Error()),
			)
		} else {
			// Task queued successfully - return generating status
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"status":  "generating",
				"message": "Content generation queued",
			})
			return
		}
	}

	// Fall back to synchronous generation if queue is not available
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
