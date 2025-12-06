package models

// MaxStepContentLength is the maximum character length for step content
const MaxStepContentLength = 2000

// Course status constants
const (
	CourseStatusActive    = "active"
	CourseStatusCompleted = "completed"
	CourseStatusArchived  = "archived"
	CourseStatusDeleted   = "deleted"
)

// Outline status constants
const (
	OutlineStatusGenerating = "generating"
	OutlineStatusReady      = "ready"
	OutlineStatusFailed     = "failed"
)

// Course represents a user's learning journey for a specific goal
type Course struct {
	ID               string  `json:"id" firestore:"id"`
	UserID           string  `json:"userId" firestore:"userId"`
	Goal             string  `json:"goal" firestore:"goal"`
	Emoji            string  `json:"emoji" firestore:"emoji"`
	Status           string  `json:"status" firestore:"status"`               // active, completed, archived, deleted
	OutlineStatus    string  `json:"outlineStatus" firestore:"outlineStatus"` // generating, ready, failed
	Progress         int     `json:"progress" firestore:"progress"`           // 0-100
	LessonsCompleted int     `json:"lessonsCompleted" firestore:"lessonsCompleted"`
	TotalLessons     int     `json:"totalLessons" firestore:"totalLessons"`
	Steps            []Step  `json:"steps" firestore:"steps"`
	Memory           *Memory `json:"memory" firestore:"memory"`
	// Course outline - auto-generated curriculum structure
	Outline         *CourseOutline   `json:"outline,omitempty" firestore:"outline,omitempty"`
	OutlinePosition *OutlinePosition `json:"outlinePosition,omitempty" firestore:"outlinePosition,omitempty"`
	CreatedAt       int64            `json:"createdAt" firestore:"createdAt"`
	UpdatedAt       int64            `json:"updatedAt" firestore:"updatedAt"`
	LastAccessedAt  int64            `json:"lastAccessedAt" firestore:"lastAccessedAt"`
	CompletedAt     int64            `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`
	ArchivedAt      int64            `json:"archivedAt,omitempty" firestore:"archivedAt,omitempty"`
	DeletedAt       int64            `json:"deletedAt,omitempty" firestore:"deletedAt,omitempty"`
}

// Step represents a single step in the course (lesson, quiz, practice, etc.)
type Step struct {
	ID             string   `json:"id" firestore:"id"`
	Index          int      `json:"index" firestore:"index"` // Position in course (0, 1, 2...)
	Type           string   `json:"type" firestore:"type"`   // "lesson", "quiz", "practice", "review", "summary"
	Topic          string   `json:"topic" firestore:"topic"`
	Title          string   `json:"title" firestore:"title"`
	Content        string   `json:"content,omitempty" firestore:"content,omitempty"`               // For lessons (max 2k chars)
	Question       string   `json:"question,omitempty" firestore:"question,omitempty"`             // For quizzes
	Options        []string `json:"options,omitempty" firestore:"options,omitempty"`               // For multiple choice quizzes
	ExpectedAnswer string   `json:"expectedAnswer,omitempty" firestore:"expectedAnswer,omitempty"` // Correct answer for quizzes
	Task           string   `json:"task,omitempty" firestore:"task,omitempty"`                     // For practice
	Hints          []string `json:"hints,omitempty" firestore:"hints,omitempty"`                   // For practice
	Completed      bool     `json:"completed" firestore:"completed"`
	CompletedAt    int64    `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`
	UserAnswer     string   `json:"userAnswer,omitempty" firestore:"userAnswer,omitempty"` // User's answer for quizzes
	Score          float64  `json:"score,omitempty" firestore:"score,omitempty"`           // Score for quizzes (0-100)
	CreatedAt      int64    `json:"createdAt" firestore:"createdAt"`
}

// CourseCreate represents the request to create a new course
type CourseCreate struct {
	Goal  string `json:"goal"`
	Emoji string `json:"emoji"`
}

// CourseUpdate represents the request to update a course
type CourseUpdate struct {
	Goal             *string `json:"goal,omitempty"`
	Emoji            *string `json:"emoji,omitempty"`
	Progress         *int    `json:"progress,omitempty"`
	LessonsCompleted *int    `json:"lessonsCompleted,omitempty"`
	TotalLessons     *int    `json:"totalLessons,omitempty"`
}

// StepComplete represents the request to complete a step
type StepComplete struct {
	UserAnswer string  `json:"userAnswer,omitempty"` // User's answer for quizzes
	Score      float64 `json:"score,omitempty"`      // Score for quizzes (0-100)
}

// CompactionInterval defines how many steps trigger a memory compaction
const CompactionInterval = 10

// CourseOutline represents the auto-generated curriculum structure for a course
type CourseOutline struct {
	Title            string          `json:"title" firestore:"title"`
	Description      string          `json:"description" firestore:"description"`
	EstimatedMinutes int             `json:"estimatedMinutes" firestore:"estimatedMinutes"`
	Prerequisites    []string        `json:"prerequisites" firestore:"prerequisites"`
	LearningOutcomes []string        `json:"learningOutcomes" firestore:"learningOutcomes"`
	Modules          []OutlineModule `json:"modules" firestore:"modules"`
	Metadata         OutlineMetadata `json:"metadata" firestore:"metadata"`
	GeneratedAt      int64           `json:"generatedAt" firestore:"generatedAt"`
}

// OutlineModule represents a module in the course outline
type OutlineModule struct {
	ID               string         `json:"id" firestore:"id"`
	Title            string         `json:"title" firestore:"title"`
	Description      string         `json:"description" firestore:"description"`
	EstimatedMinutes int            `json:"estimatedMinutes" firestore:"estimatedMinutes"`
	LearningOutcomes []string       `json:"learningOutcomes" firestore:"learningOutcomes"`
	Topics           []OutlineTopic `json:"topics" firestore:"topics"`
	Status           string         `json:"status" firestore:"status"` // pending, in_progress, completed, skipped
}

// OutlineTopic represents a topic within a module
type OutlineTopic struct {
	ID               string            `json:"id" firestore:"id"`
	Title            string            `json:"title" firestore:"title"`
	ToolID           string            `json:"toolId" firestore:"toolId"` // lesson, quiz, practice, flashcard, inline-code-execution, pronunciation, etc.
	EstimatedMinutes int               `json:"estimatedMinutes" firestore:"estimatedMinutes"`
	Description      string            `json:"description" firestore:"description"`
	Prerequisites    []string          `json:"prerequisites" firestore:"prerequisites"`
	Status           string            `json:"status" firestore:"status"`                     // pending, completed, skipped, needs_review
	StepID           string            `json:"stepId,omitempty" firestore:"stepId,omitempty"` // Links to generated Step
	Performance      *TopicPerformance `json:"performance,omitempty" firestore:"performance,omitempty"`
}

// TopicPerformance tracks how the user performed on a topic
type TopicPerformance struct {
	Score       float64 `json:"score" firestore:"score"`
	TimeSpent   int     `json:"timeSpent" firestore:"timeSpent"` // seconds
	CompletedAt int64   `json:"completedAt" firestore:"completedAt"`
}

// OutlineMetadata contains categorization info for the course
type OutlineMetadata struct {
	Difficulty string   `json:"difficulty" firestore:"difficulty"` // beginner, intermediate, advanced
	Category   string   `json:"category" firestore:"category"`
	Tags       []string `json:"tags" firestore:"tags"`
}

// OutlinePosition tracks current position in the outline
type OutlinePosition struct {
	ModuleIndex int    `json:"moduleIndex" firestore:"moduleIndex"`
	TopicIndex  int    `json:"topicIndex" firestore:"topicIndex"`
	ModuleID    string `json:"moduleId" firestore:"moduleId"`
	TopicID     string `json:"topicId" firestore:"topicId"`
}

// ============================================
// Legacy type aliases for backward compatibility
// ============================================

// LearningPath is an alias for Course (deprecated)
type LearningPath = Course

// LearningPathCreate is an alias for CourseCreate (deprecated)
type LearningPathCreate = CourseCreate

// LearningPathUpdate is an alias for CourseUpdate (deprecated)
type LearningPathUpdate = CourseUpdate

// Legacy path status constants (deprecated, use CourseStatus* instead)
const (
	PathStatusActive    = CourseStatusActive
	PathStatusCompleted = CourseStatusCompleted
	PathStatusArchived  = CourseStatusArchived
	PathStatusDeleted   = CourseStatusDeleted
)
