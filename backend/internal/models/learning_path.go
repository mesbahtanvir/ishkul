package models

// MaxStepContentLength is the maximum character length for step content
const MaxStepContentLength = 2000

// Learning path status constants
const (
	PathStatusActive    = "active"
	PathStatusCompleted = "completed"
	PathStatusArchived  = "archived"
	PathStatusDeleted   = "deleted"
)

// LearningPath represents a user's learning journey for a specific goal
type LearningPath struct {
	ID               string  `json:"id" firestore:"id"`
	UserID           string  `json:"userId" firestore:"userId"`
	Goal             string  `json:"goal" firestore:"goal"`
	Level            string  `json:"level" firestore:"level"`
	Emoji            string  `json:"emoji" firestore:"emoji"`
	Status           string  `json:"status" firestore:"status"`                       // active, completed, archived, deleted
	Progress         int     `json:"progress" firestore:"progress"`                   // 0-100
	LessonsCompleted int     `json:"lessonsCompleted" firestore:"lessonsCompleted"`   // Number of completed steps
	TotalLessons     int     `json:"totalLessons" firestore:"totalLessons"`           // Estimated total steps in path
	Steps            []Step  `json:"steps" firestore:"steps"`                         // All steps (completed and current)
	Memory           *Memory `json:"memory" firestore:"memory"`
	CreatedAt        int64   `json:"createdAt" firestore:"createdAt"`
	UpdatedAt        int64   `json:"updatedAt" firestore:"updatedAt"`
	LastAccessedAt   int64   `json:"lastAccessedAt" firestore:"lastAccessedAt"`
	CompletedAt      int64   `json:"completedAt,omitempty" firestore:"completedAt,omitempty"` // When path was completed
	ArchivedAt       int64   `json:"archivedAt,omitempty" firestore:"archivedAt,omitempty"`   // When path was archived
	DeletedAt        int64   `json:"deletedAt,omitempty" firestore:"deletedAt,omitempty"`     // When path was soft deleted
}

// Step represents a single step in the learning path (lesson, quiz, practice, etc.)
type Step struct {
	ID             string   `json:"id" firestore:"id"`
	Index          int      `json:"index" firestore:"index"` // Position in path (0, 1, 2...)
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

// LearningPathCreate represents the request to create a new learning path
type LearningPathCreate struct {
	Goal  string `json:"goal"`
	Level string `json:"level"`
	Emoji string `json:"emoji"`
}

// LearningPathUpdate represents the request to update a learning path
type LearningPathUpdate struct {
	Goal             *string `json:"goal,omitempty"`
	Level            *string `json:"level,omitempty"`
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
