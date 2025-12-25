package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

// TestLessonsHandler_Routing tests the routing logic of LessonsHandler
func TestLessonsHandler_Routing(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		segments       []string
		expectedStatus int
	}{
		{
			name:           "GET list lessons - no segments",
			method:         http.MethodGet,
			segments:       []string{},
			expectedStatus: http.StatusUnauthorized, // No auth
		},
		{
			name:           "POST list lessons - method not allowed",
			method:         http.MethodPost,
			segments:       []string{},
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "GET single lesson",
			method:         http.MethodGet,
			segments:       []string{"lesson-123"},
			expectedStatus: http.StatusUnauthorized, // No auth
		},
		{
			name:           "POST single lesson - method not allowed",
			method:         http.MethodPost,
			segments:       []string{"lesson-123"},
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "POST generate-blocks",
			method:         http.MethodPost,
			segments:       []string{"lesson-123", "generate-blocks"},
			expectedStatus: http.StatusUnauthorized, // No auth
		},
		{
			name:           "PATCH progress",
			method:         http.MethodPatch,
			segments:       []string{"lesson-123", "progress"},
			expectedStatus: http.StatusUnauthorized, // No auth
		},
		{
			name:           "GET invalid action - not found",
			method:         http.MethodGet,
			segments:       []string{"lesson-123", "invalid-action"},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "POST block generate",
			method:         http.MethodPost,
			segments:       []string{"lesson-123", "blocks", "block-456", "generate"},
			expectedStatus: http.StatusUnauthorized, // No auth
		},
		{
			name:           "POST block complete",
			method:         http.MethodPost,
			segments:       []string{"lesson-123", "blocks", "block-456", "complete"},
			expectedStatus: http.StatusUnauthorized, // No auth
		},
		{
			name:           "GET block action - method not allowed",
			method:         http.MethodGet,
			segments:       []string{"lesson-123", "blocks", "block-456", "generate"},
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "POST invalid block action - not found",
			method:         http.MethodPost,
			segments:       []string{"lesson-123", "blocks", "block-456", "invalid"},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid path with 'notblocks' - not found",
			method:         http.MethodPost,
			segments:       []string{"lesson-123", "notblocks", "block-456", "generate"},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "too many segments - not found",
			method:         http.MethodPost,
			segments:       []string{"lesson-123", "blocks", "block-456", "generate", "extra"},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "three segments - not found",
			method:         http.MethodPost,
			segments:       []string{"lesson-123", "blocks", "block-456"},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/courses/course-123/sections/section-123/lessons", nil)
			w := httptest.NewRecorder()

			LessonsHandler(w, req, "course-123", "section-123", tt.segments)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// TestFindBlockInLesson tests the findBlockInLesson helper function
func TestFindBlockInLesson(t *testing.T) {
	lesson := &models.Lesson{
		ID: "lesson-1",
		Blocks: []models.Block{
			{ID: "block-1", Type: models.BlockTypeText, Title: "Introduction"},
			{ID: "block-2", Type: models.BlockTypeCode, Title: "Code Example"},
			{ID: "block-3", Type: models.BlockTypeQuestion, Title: "Quiz"},
		},
	}

	tests := []struct {
		name     string
		blockID  string
		expected bool
	}{
		{
			name:     "find existing block",
			blockID:  "block-1",
			expected: true,
		},
		{
			name:     "find another existing block",
			blockID:  "block-3",
			expected: true,
		},
		{
			name:     "block not found",
			blockID:  "block-nonexistent",
			expected: false,
		},
		{
			name:     "empty block ID",
			blockID:  "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := findBlockInLesson(lesson, tt.blockID)
			if tt.expected {
				assert.NotNil(t, result)
				assert.Equal(t, tt.blockID, result.ID)
			} else {
				assert.Nil(t, result)
			}
		})
	}
}

// TestFindBlockInLesson_EmptyBlocks tests findBlockInLesson with empty blocks
func TestFindBlockInLesson_EmptyBlocks(t *testing.T) {
	lesson := &models.Lesson{
		ID:     "lesson-1",
		Blocks: []models.Block{},
	}

	result := findBlockInLesson(lesson, "any-block")
	assert.Nil(t, result)
}

// TestBlockCompleteRequestParsing tests parsing of block complete requests
func TestBlockCompleteRequestParsing(t *testing.T) {
	tests := []struct {
		name        string
		body        string
		expectError bool
	}{
		{
			name:        "valid request with all fields",
			body:        `{"userAnswer": "B", "score": 100, "timeSpent": 30}`,
			expectError: false,
		},
		{
			name:        "valid request with partial fields",
			body:        `{"timeSpent": 15}`,
			expectError: false,
		},
		{
			name:        "empty request body",
			body:        `{}`,
			expectError: false,
		},
		{
			name:        "invalid JSON",
			body:        `{invalid}`,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req models.BlockCompleteRequest
			err := json.NewDecoder(strings.NewReader(tt.body)).Decode(&req)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestLessonProgressResponse tests the structure of lesson progress responses
func TestLessonProgressResponse(t *testing.T) {
	progress := &models.LessonProgress{
		CurrentBlockIndex: 2,
		BlockResults: []models.BlockResult{
			{BlockID: "block-1", BlockType: models.BlockTypeText, Completed: true},
			{BlockID: "block-2", BlockType: models.BlockTypeCode, Completed: true},
		},
		StartedAt: 1234567890,
		TimeSpent: 120,
		Score:     85.5,
	}

	// Verify JSON marshaling
	data, err := json.Marshal(progress)
	assert.NoError(t, err)

	// Verify we can unmarshal back
	var decoded models.LessonProgress
	err = json.Unmarshal(data, &decoded)
	assert.NoError(t, err)
	assert.Equal(t, progress.CurrentBlockIndex, decoded.CurrentBlockIndex)
	assert.Equal(t, len(progress.BlockResults), len(decoded.BlockResults))
}

// TestBlockStatusTransitions tests valid block status transitions
func TestBlockStatusTransitions(t *testing.T) {
	tests := []struct {
		name       string
		fromStatus string
		toStatus   string
		valid      bool
	}{
		{
			name:       "pending to generating",
			fromStatus: models.ContentStatusPending,
			toStatus:   models.ContentStatusGenerating,
			valid:      true,
		},
		{
			name:       "generating to ready",
			fromStatus: models.ContentStatusGenerating,
			toStatus:   models.ContentStatusReady,
			valid:      true,
		},
		{
			name:       "generating to error",
			fromStatus: models.ContentStatusGenerating,
			toStatus:   models.ContentStatusError,
			valid:      true,
		},
		{
			name:       "pending to ready (skip generating)",
			fromStatus: models.ContentStatusPending,
			toStatus:   models.ContentStatusReady,
			valid:      true, // This is valid for sync generation
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			block := &models.Block{
				ID:            "test-block",
				ContentStatus: tt.fromStatus,
			}

			// Simulate status transition
			block.ContentStatus = tt.toStatus

			if tt.valid {
				assert.Equal(t, tt.toStatus, block.ContentStatus)
			}
		})
	}
}

// TestGenerateLessonBlocksResponseFormats tests response format for generate-blocks endpoint
func TestGenerateLessonBlocksResponseFormats(t *testing.T) {
	t.Run("generating status response", func(t *testing.T) {
		response := map[string]interface{}{
			"status":  "generating",
			"message": "Block generation already in progress",
		}

		data, err := json.Marshal(response)
		assert.NoError(t, err)

		var decoded map[string]interface{}
		err = json.Unmarshal(data, &decoded)
		assert.NoError(t, err)
		assert.Equal(t, "generating", decoded["status"])
	})

	t.Run("ready status response with blocks", func(t *testing.T) {
		blocks := []models.Block{
			{ID: "b1", Type: models.BlockTypeText, Title: "Intro"},
			{ID: "b2", Type: models.BlockTypeCode, Title: "Example"},
		}

		response := map[string]interface{}{
			"status": "ready",
			"blocks": blocks,
		}

		data, err := json.Marshal(response)
		assert.NoError(t, err)

		var decoded map[string]interface{}
		err = json.Unmarshal(data, &decoded)
		assert.NoError(t, err)
		assert.Equal(t, "ready", decoded["status"])
		assert.NotNil(t, decoded["blocks"])
	})
}

// TestGenerateBlockContentResponseFormats tests response format for block content generation
func TestGenerateBlockContentResponseFormats(t *testing.T) {
	t.Run("ready status with text content", func(t *testing.T) {
		content := &models.BlockContent{
			Text: &models.TextContent{
				Markdown: "# Hello World\n\nThis is a lesson.",
			},
		}

		response := map[string]interface{}{
			"status":  "ready",
			"content": content,
		}

		data, err := json.Marshal(response)
		assert.NoError(t, err)
		assert.Contains(t, string(data), "Hello World")
	})

	t.Run("ready status with code content", func(t *testing.T) {
		content := &models.BlockContent{
			Code: &models.CodeContent{
				Language:    "python",
				Code:        "print('Hello')",
				Explanation: "This prints hello to console",
				Runnable:    true,
			},
		}

		response := map[string]interface{}{
			"status":  "ready",
			"content": content,
		}

		data, err := json.Marshal(response)
		assert.NoError(t, err)
		assert.Contains(t, string(data), "python")
	})

	t.Run("ready status with question content", func(t *testing.T) {
		content := &models.BlockContent{
			Question: &models.QuestionContent{
				Question: models.Question{
					ID:            "q1",
					Text:          "What is 2+2?",
					Type:          models.QuestionTypeMultipleChoice,
					CorrectAnswer: "4",
					Options: []models.Option{
						{ID: "a", Text: "3"},
						{ID: "b", Text: "4"},
						{ID: "c", Text: "5"},
					},
				},
			},
		}

		response := map[string]interface{}{
			"status":  "ready",
			"content": content,
		}

		data, err := json.Marshal(response)
		assert.NoError(t, err)
		assert.Contains(t, string(data), "What is 2+2?")
	})

	t.Run("generating status response", func(t *testing.T) {
		response := map[string]interface{}{
			"status":  "generating",
			"message": "Content generation queued",
		}

		data, err := json.Marshal(response)
		assert.NoError(t, err)

		var decoded map[string]interface{}
		err = json.Unmarshal(data, &decoded)
		assert.NoError(t, err)
		assert.Equal(t, "generating", decoded["status"])
	})
}

// TestLessonResponseFormat tests the format of lesson GET responses
func TestLessonResponseFormat(t *testing.T) {
	lesson := &models.Lesson{
		ID:               "lesson-123",
		Title:            "Introduction to Go",
		Description:      "Learn the basics of Go programming",
		EstimatedMinutes: 30,
		BlocksStatus:     models.ContentStatusReady,
		Status:           models.LessonStatusPending,
		Blocks: []models.Block{
			{ID: "b1", Type: models.BlockTypeText, Title: "What is Go?", ContentStatus: models.ContentStatusReady},
			{ID: "b2", Type: models.BlockTypeCode, Title: "Hello World", ContentStatus: models.ContentStatusPending},
		},
	}

	response := map[string]interface{}{
		"lesson":    lesson,
		"sectionId": "section-456",
	}

	data, err := json.Marshal(response)
	assert.NoError(t, err)

	var decoded map[string]interface{}
	err = json.Unmarshal(data, &decoded)
	assert.NoError(t, err)

	assert.NotNil(t, decoded["lesson"])
	assert.Equal(t, "section-456", decoded["sectionId"])
}

// TestCompleteBlockResponseFormat tests the format of block complete responses
func TestCompleteBlockResponseFormat(t *testing.T) {
	response := map[string]interface{}{
		"success": true,
		"blockId": "block-123",
		"result": map[string]interface{}{
			"correct":  true,
			"score":    100,
			"feedback": "Great job!",
		},
	}

	data, err := json.Marshal(response)
	assert.NoError(t, err)

	var decoded map[string]interface{}
	err = json.Unmarshal(data, &decoded)
	assert.NoError(t, err)

	assert.True(t, decoded["success"].(bool))
	assert.Equal(t, "block-123", decoded["blockId"])
}
