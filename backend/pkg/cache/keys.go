package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// ContextHash creates a hash from learning context for cache invalidation.
// The hash changes when: outline changes, current position changes, or progress changes.
func ContextHash(course *models.Course) string {
	var sb strings.Builder

	// Include outline section/lesson count
	if course.Outline != nil {
		sb.WriteString(fmt.Sprintf("sections:%d", len(course.Outline.Sections)))
		totalLessons := 0
		for _, section := range course.Outline.Sections {
			totalLessons += len(section.Lessons)
		}
		sb.WriteString(fmt.Sprintf("lessons:%d", totalLessons))
	}

	// Include current position
	if course.CurrentPosition != nil {
		sb.WriteString(fmt.Sprintf("pos:%d:%d", course.CurrentPosition.SectionIndex, course.CurrentPosition.LessonIndex))
	}

	// Include progress percentage
	sb.WriteString(fmt.Sprintf("progress:%d", course.Progress))

	hash := sha256.Sum256([]byte(sb.String()))
	return hex.EncodeToString(hash[:8]) // Short 16-char hash
}

// TopicHash creates a hash for topic-specific caching.
func TopicHash(course *models.Course, topic string) string {
	var sb strings.Builder

	sb.WriteString(topic)

	// Include progress for context
	sb.WriteString(fmt.Sprintf("progress:%d", course.Progress))

	hash := sha256.Sum256([]byte(sb.String()))
	return hex.EncodeToString(hash[:8])
}

// SelectionKey generates a cache key for tool selection results.
// Format: "select:{pathID}:{contextHash}"
func SelectionKey(pathID, contextHash string) string {
	return fmt.Sprintf("select:%s:%s", pathID, contextHash)
}

// ContentKey generates a cache key for tool-specific content.
// Format: "content:{pathID}:{toolType}:{topicHash}"
func ContentKey(pathID, toolType, topicHash string) string {
	return fmt.Sprintf("content:%s:%s:%s", pathID, toolType, topicHash)
}

// StepKey generates a cache key for complete pre-generated steps.
// Format: "step:{pathID}:{userID}"
func StepKey(pathID, userID string) string {
	return fmt.Sprintf("step:%s:%s", pathID, userID)
}

// ParseSelectionKey extracts pathID and contextHash from a selection key.
func ParseSelectionKey(key string) (pathID, contextHash string, ok bool) {
	parts := strings.Split(key, ":")
	if len(parts) != 3 || parts[0] != "select" {
		return "", "", false
	}
	return parts[1], parts[2], true
}

// ParseContentKey extracts pathID, toolType, and topicHash from a content key.
func ParseContentKey(key string) (pathID, toolType, topicHash string, ok bool) {
	parts := strings.Split(key, ":")
	if len(parts) != 4 || parts[0] != "content" {
		return "", "", "", false
	}
	return parts[1], parts[2], parts[3], true
}
