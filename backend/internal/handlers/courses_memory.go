package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/mesbahtanvir/ishkul/backend/internal/models"
	"github.com/mesbahtanvir/ishkul/backend/pkg/llm"
	"github.com/mesbahtanvir/ishkul/backend/pkg/prompts"
)

// =============================================================================
// Memory Update Handler
// =============================================================================

// UpdatePathMemoryRequest represents the request to update path memory.
type UpdatePathMemoryRequest struct {
	Topic       string  `json:"topic"`
	Confidence  float64 `json:"confidence"`
	TimesTested int     `json:"timesTested"`
}

// updatePathMemory updates memory for a specific topic in a course.
func updatePathMemory(w http.ResponseWriter, r *http.Request, courseID string) {
	rc := GetRequestContext(w, r)
	if rc == nil {
		return
	}

	var req UpdatePathMemoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		SendError(w, http.StatusBadRequest, "INVALID_BODY", "Invalid request body")
		return
	}

	if req.Topic == "" {
		SendError(w, http.StatusBadRequest, "MISSING_TOPIC", "Topic is required")
		return
	}

	course := GetCourseByID(w, rc, courseID)
	if course == nil {
		return
	}

	now := time.Now()
	topicMemory := models.TopicMemory{
		Confidence:   req.Confidence,
		LastReviewed: now.Format(time.RFC3339),
		TimesTested:  req.TimesTested,
	}

	updates := []firestore.Update{
		{Path: "memory.topics." + req.Topic, Value: topicMemory},
		{Path: "updatedAt", Value: now.UnixMilli()},
		{Path: "lastAccessedAt", Value: now.UnixMilli()},
	}

	if _, err := Collection(rc.FS, "courses").Doc(courseID).Update(rc.Ctx, updates); err != nil {
		SendError(w, http.StatusInternalServerError, "UPDATE_ERROR", fmt.Sprintf("Error updating memory: %v", err))
		return
	}

	SendSuccess(w, map[string]interface{}{
		"success": true,
		"topic":   req.Topic,
		"memory":  topicMemory,
	})
}

// =============================================================================
// Memory Compaction
// =============================================================================

// compactMemory uses LLM to summarize learning progress.
func compactMemory(ctx context.Context, course *models.Course, upToStepIndex int) error {
	if openaiClient == nil || promptLoader == nil {
		return fmt.Errorf("LLM not initialized")
	}

	stepsToCompact := course.Steps[:upToStepIndex+1]
	stepSummaries := buildStepSummaries(stepsToCompact)
	previousSummary := getPreviousSummary(course)

	vars := prompts.Variables{
		"goal":            course.Goal,
		"previousSummary": previousSummary,
		"steps":           strings.Join(stepSummaries, "\n"),
		"stepCount":       strconv.Itoa(len(stepsToCompact)),
	}

	template, err := promptLoader.LoadByName("learning/compact-memory")
	if err != nil {
		return fmt.Errorf("failed to load compact-memory prompt: %w", err)
	}

	openaiReq, err := promptRenderer.RenderToRequest(template, vars)
	if err != nil {
		return fmt.Errorf("failed to render prompt: %w", err)
	}

	completion, err := openaiClient.CreateChatCompletion(ctx, *openaiReq)
	if err != nil {
		return fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(completion.Choices) == 0 {
		return fmt.Errorf("no completion returned from OpenAI")
	}

	compaction, err := parseCompactionResult(completion.Choices[0].Message.Content)
	if err != nil {
		return err
	}

	// Apply compaction to course memory
	applyCompaction(course, compaction, upToStepIndex)

	return nil
}

// buildStepSummaries creates summary strings for each step.
func buildStepSummaries(steps []models.Step) []string {
	summaries := make([]string, 0, len(steps))
	for _, s := range steps {
		summary := fmt.Sprintf("- %s (%s): %s", s.Type, s.Topic, s.Title)
		if s.Score > 0 {
			summary += fmt.Sprintf(" [Score: %.0f%%]", s.Score)
		}
		summaries = append(summaries, summary)
	}
	return summaries
}

// getPreviousSummary returns the previous compaction summary if available.
func getPreviousSummary(course *models.Course) string {
	if course.Memory != nil && course.Memory.Compaction != nil {
		return course.Memory.Compaction.Summary
	}
	return ""
}

// compactionResult represents the parsed compaction response.
type compactionResult struct {
	Summary         string   `json:"summary"`
	Strengths       []string `json:"strengths"`
	Weaknesses      []string `json:"weaknesses"`
	Recommendations []string `json:"recommendations"`
}

// parseCompactionResult parses the LLM response into compaction data.
func parseCompactionResult(content string) (*compactionResult, error) {
	var result compactionResult
	if err := llm.ParseJSONResponse(content, &result); err != nil {
		return nil, fmt.Errorf("failed to parse compaction response: %w (content: %s)", err, content)
	}
	return &result, nil
}

// applyCompaction applies the compaction result to the course memory.
func applyCompaction(course *models.Course, result *compactionResult, upToStepIndex int) {
	if course.Memory == nil {
		course.Memory = &models.Memory{Topics: make(map[string]models.TopicMemory)}
	}

	course.Memory.Compaction = &models.Compaction{
		Summary:         result.Summary,
		Strengths:       result.Strengths,
		Weaknesses:      result.Weaknesses,
		Recommendations: result.Recommendations,
		LastStepIndex:   upToStepIndex,
		CompactedAt:     time.Now().UnixMilli(),
	}
}

// =============================================================================
// Memory Context Building
// =============================================================================

// BuildMemoryContext creates a string summary of the user's memory for the LLM.
func BuildMemoryContext(course *models.Course) string {
	if course.Memory == nil {
		return ""
	}

	var parts []string

	// Include compaction summary if available
	if course.Memory.Compaction != nil {
		parts = append(parts, fmt.Sprintf("Learning Summary: %s", course.Memory.Compaction.Summary))

		if len(course.Memory.Compaction.Strengths) > 0 {
			parts = append(parts, fmt.Sprintf("Strengths: %s", strings.Join(course.Memory.Compaction.Strengths, ", ")))
		}

		if len(course.Memory.Compaction.Weaknesses) > 0 {
			parts = append(parts, fmt.Sprintf("Weaknesses: %s", strings.Join(course.Memory.Compaction.Weaknesses, ", ")))
		}
	}

	// Include topic confidence scores
	if len(course.Memory.Topics) > 0 {
		topicScores := buildTopicScoreStrings(course.Memory.Topics)
		if len(topicScores) > 0 {
			parts = append(parts, fmt.Sprintf("Topic Confidence: %s", strings.Join(topicScores, ", ")))
		}
	}

	return strings.Join(parts, "\n")
}

// buildTopicScoreStrings creates formatted strings for topic confidence scores.
func buildTopicScoreStrings(topics map[string]models.TopicMemory) []string {
	scores := make([]string, 0, len(topics))
	for topic, mem := range topics {
		scores = append(scores, fmt.Sprintf("%s: %.0f%%", topic, mem.Confidence*100))
	}
	return scores
}
