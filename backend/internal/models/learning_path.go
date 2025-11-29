package models

// LearningPath represents a user's learning journey for a specific goal
type LearningPath struct {
	ID               string         `json:"id" firestore:"id"`
	UserID           string         `json:"userId" firestore:"userId"`
	Goal             string         `json:"goal" firestore:"goal"`
	Level            string         `json:"level" firestore:"level"`
	Emoji            string         `json:"emoji" firestore:"emoji"`
	Progress         int            `json:"progress" firestore:"progress"`                 // 0-100
	LessonsCompleted int            `json:"lessonsCompleted" firestore:"lessonsCompleted"` // Number of completed lessons
	TotalLessons     int            `json:"totalLessons" firestore:"totalLessons"`         // Total lessons in path
	CurrentStep      *NextStep      `json:"currentStep,omitempty" firestore:"currentStep,omitempty"`
	Memory           *Memory        `json:"memory" firestore:"memory"`
	History          []HistoryEntry `json:"history" firestore:"history"`
	CreatedAt        int64          `json:"createdAt" firestore:"createdAt"`
	UpdatedAt        int64          `json:"updatedAt" firestore:"updatedAt"`
	LastAccessedAt   int64          `json:"lastAccessedAt" firestore:"lastAccessedAt"`
}

// LearningPathCreate represents the request to create a new learning path
type LearningPathCreate struct {
	Goal  string `json:"goal"`
	Level string `json:"level"`
	Emoji string `json:"emoji"`
}

// LearningPathUpdate represents the request to update a learning path
type LearningPathUpdate struct {
	Goal             *string   `json:"goal,omitempty"`
	Level            *string   `json:"level,omitempty"`
	Emoji            *string   `json:"emoji,omitempty"`
	Progress         *int      `json:"progress,omitempty"`
	LessonsCompleted *int      `json:"lessonsCompleted,omitempty"`
	TotalLessons     *int      `json:"totalLessons,omitempty"`
	CurrentStep      *NextStep `json:"currentStep,omitempty"`
}
