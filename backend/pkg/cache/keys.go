package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/mesbahtanvir/ishkul/backend/internal/models"
)

// ContextHash creates a hash from learning context for cache invalidation.
// The hash changes when: memory changes, recent steps change, or progress changes.
func ContextHash(course *models.Course) string {
	var sb strings.Builder

	// Include memory state
	if course.Memory != nil && course.Memory.Compaction != nil {
		sb.WriteString(course.Memory.Compaction.Summary)
		sb.WriteString(strings.Join(course.Memory.Compaction.Weaknesses, ","))
	}

	// Include recent step count and types
	sb.WriteString(fmt.Sprintf("steps:%d", len(course.Steps)))

	// Include last 3 step types for pattern detection
	start := len(course.Steps) - 3
	if start < 0 {
		start = 0
	}
	for _, step := range course.Steps[start:] {
		sb.WriteString(step.Type)
		sb.WriteString(step.Topic)
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

	// Include topic confidence if available
	if course.Memory != nil && course.Memory.Topics != nil {
		if topicMem, ok := course.Memory.Topics[topic]; ok {
			sb.WriteString(fmt.Sprintf("conf:%.2f", topicMem.Confidence))
		}
	}

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
