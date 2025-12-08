package models

// Legacy types for backward compatibility during migration from Step-based to Block-based model.
// These types support the old step-based learning flow while the codebase transitions
// to the new 3-stage (Outline → Skeleton → Content) generation approach.
//
// TODO: Remove these types once all handlers are migrated to use Lesson/Block model.

// Step constants
const (
	MaxStepContentLength = 10000 // Maximum length for step content
	CompactionInterval   = 10    // Compact memory every N steps
)

// Step represents a learning step in the old flat model
// Deprecated: Use Block within Lesson instead
type Step struct {
	ID             string   `json:"id" firestore:"id"`
	Index          int      `json:"index" firestore:"index"`
	Type           string   `json:"type" firestore:"type"` // lesson, quiz, exercise
	Topic          string   `json:"topic" firestore:"topic"`
	Title          string   `json:"title" firestore:"title"`
	Content        string   `json:"content,omitempty" firestore:"content,omitempty"`
	Question       string   `json:"question,omitempty" firestore:"question,omitempty"`
	Options        []string `json:"options,omitempty" firestore:"options,omitempty"`
	ExpectedAnswer string   `json:"expectedAnswer,omitempty" firestore:"expectedAnswer,omitempty"`
	Task           string   `json:"task,omitempty" firestore:"task,omitempty"`
	Hints          []string `json:"hints,omitempty" firestore:"hints,omitempty"`
	Completed      bool     `json:"completed" firestore:"completed"`
	CompletedAt    int64    `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`
	UserAnswer     string   `json:"userAnswer,omitempty" firestore:"userAnswer,omitempty"`
	Score          float64  `json:"score,omitempty" firestore:"score,omitempty"`
	CreatedAt      int64    `json:"createdAt" firestore:"createdAt"`
}

// StepComplete represents the request to complete a step
// Deprecated: Use BlockCompleteRequest instead
type StepComplete struct {
	UserAnswer string  `json:"userAnswer,omitempty"`
	Score      float64 `json:"score,omitempty"`
}

// Memory represents the learning memory for a course (old model)
// Deprecated: Course-level progress is now tracked via CourseProgress
type Memory struct {
	Topics     map[string]TopicMemory `json:"topics" firestore:"topics"`
	Compaction *Compaction            `json:"compaction,omitempty" firestore:"compaction,omitempty"`
}

// TopicMemory represents memory for a specific topic
// Deprecated: Use LessonProgress instead
type TopicMemory struct {
	Confidence   float64 `json:"confidence" firestore:"confidence"`
	LastReviewed string  `json:"lastReviewed" firestore:"lastReviewed"`
	TimesTested  int     `json:"timesTested" firestore:"timesTested"`
}

// Compaction represents a compacted memory summary
// Deprecated: Use CourseProgress.Summary instead
type Compaction struct {
	Summary         string   `json:"summary" firestore:"summary"`
	Strengths       []string `json:"strengths" firestore:"strengths"`
	Weaknesses      []string `json:"weaknesses" firestore:"weaknesses"`
	Recommendations []string `json:"recommendations" firestore:"recommendations"`
	LastStepIndex   int      `json:"lastStepIndex" firestore:"lastStepIndex"`
	CompactedAt     int64    `json:"compactedAt" firestore:"compactedAt"`
}

// OutlinePosition tracks current position in the old course outline format
// Deprecated: Use LessonPosition instead
type OutlinePosition struct {
	ModuleIndex int    `json:"moduleIndex" firestore:"moduleIndex"`
	TopicIndex  int    `json:"topicIndex" firestore:"topicIndex"`
	ModuleID    string `json:"moduleId" firestore:"moduleId"`
	TopicID     string `json:"topicId" firestore:"topicId"`
}

// OutlineModule represents a module in the old outline format
// Deprecated: Use Section instead
type OutlineModule struct {
	ID               string         `json:"id" firestore:"id"`
	Title            string         `json:"title" firestore:"title"`
	Description      string         `json:"description" firestore:"description"`
	EstimatedMinutes int            `json:"estimatedMinutes" firestore:"estimatedMinutes"`
	LearningOutcomes []string       `json:"learningOutcomes" firestore:"learningOutcomes"`
	Topics           []OutlineTopic `json:"topics" firestore:"topics"`
	Status           string         `json:"status" firestore:"status"`
}

// OutlineTopic represents a topic in the old outline format
// Deprecated: Use Lesson instead
type OutlineTopic struct {
	ID               string            `json:"id" firestore:"id"`
	Title            string            `json:"title" firestore:"title"`
	ToolID           string            `json:"toolId" firestore:"toolId"`
	EstimatedMinutes int               `json:"estimatedMinutes" firestore:"estimatedMinutes"`
	Description      string            `json:"description" firestore:"description"`
	Prerequisites    []string          `json:"prerequisites" firestore:"prerequisites"`
	Status           string            `json:"status" firestore:"status"`
	StepID           string            `json:"stepId,omitempty" firestore:"stepId,omitempty"`
	Performance      *TopicPerformance `json:"performance,omitempty" firestore:"performance,omitempty"`
}

// TopicPerformance tracks performance on a topic
// Deprecated: Use BlockProgress instead
type TopicPerformance struct {
	Score       float64 `json:"score" firestore:"score"`
	CompletedAt int64   `json:"completedAt" firestore:"completedAt"`
}

// LegacyCourseOutline represents the old outline format with Modules
// Deprecated: Use CourseOutline with Sections instead
type LegacyCourseOutline struct {
	Title            string          `json:"title" firestore:"title"`
	Description      string          `json:"description" firestore:"description"`
	EstimatedMinutes int             `json:"estimatedMinutes" firestore:"estimatedMinutes"`
	Prerequisites    []string        `json:"prerequisites" firestore:"prerequisites"`
	LearningOutcomes []string        `json:"learningOutcomes" firestore:"learningOutcomes"`
	Modules          []OutlineModule `json:"modules" firestore:"modules"`
	Metadata         OutlineMetadata `json:"metadata" firestore:"metadata"`
	GeneratedAt      int64           `json:"generatedAt" firestore:"generatedAt"`
}

// HistoryEntry represents a learning history entry (old model)
// Deprecated: Use LessonProgress or BlockProgress instead
type HistoryEntry struct {
	Type      string  `json:"type" firestore:"type"`           // lesson, quiz, exercise
	Topic     string  `json:"topic" firestore:"topic"`
	Score     float64 `json:"score,omitempty" firestore:"score,omitempty"`
	Timestamp int64   `json:"timestamp" firestore:"timestamp"` // Unix milliseconds
}

// NextStep represents the user's next recommended learning step (old model)
// Deprecated: Use CurrentPosition in Course instead
type NextStep struct {
	Type        string `json:"type" firestore:"type"`               // lesson, quiz, exercise
	Topic       string `json:"topic" firestore:"topic"`
	CourseID    string `json:"courseId" firestore:"courseId"`
	Reason      string `json:"reason,omitempty" firestore:"reason,omitempty"`
	GeneratedAt int64  `json:"generatedAt" firestore:"generatedAt"` // Unix milliseconds
}
