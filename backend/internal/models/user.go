package models

import "time"

// User represents a user in the system
type User struct {
	ID           string    `json:"id" firestore:"id"`
	Email        string    `json:"email" firestore:"email"`
	DisplayName  string    `json:"displayName" firestore:"displayName"`
	PhotoURL     string    `json:"photoUrl,omitempty" firestore:"photoUrl,omitempty"`
	CreatedAt    time.Time `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt" firestore:"updatedAt"`
	LastLogin    time.Time `json:"lastLogin,omitempty" firestore:"lastLogin,omitempty"`
	Goal         string    `json:"goal,omitempty" firestore:"goal,omitempty"`
	Level        string    `json:"level,omitempty" firestore:"level,omitempty"`
	TargetLevel  string    `json:"targetLevel,omitempty" firestore:"targetLevel,omitempty"`
	DailyGoalMinutes int   `json:"dailyGoalMinutes,omitempty" firestore:"dailyGoalMinutes,omitempty"`
}

// Progress represents user's learning progress
type Progress struct {
	UserID          string    `json:"userId" firestore:"userId"`
	LessonID        string    `json:"lessonId" firestore:"lessonId"`
	Completed       bool      `json:"completed" firestore:"completed"`
	Score           int       `json:"score,omitempty" firestore:"score,omitempty"`
	TimeSpentMinutes int      `json:"timeSpentMinutes,omitempty" firestore:"timeSpentMinutes,omitempty"`
	LastAttempt     time.Time `json:"lastAttempt" firestore:"lastAttempt"`
	Attempts        int       `json:"attempts" firestore:"attempts"`
}

// Lesson represents a learning lesson
type Lesson struct {
	ID          string   `json:"id" firestore:"id"`
	Title       string   `json:"title" firestore:"title"`
	Description string   `json:"description" firestore:"description"`
	Level       string   `json:"level" firestore:"level"`
	Category    string   `json:"category" firestore:"category"`
	Content     string   `json:"content" firestore:"content"`
	Order       int      `json:"order" firestore:"order"`
	Duration    int      `json:"duration" firestore:"duration"`
	Tags        []string `json:"tags,omitempty" firestore:"tags,omitempty"`
}

// UserStats represents aggregated user statistics
type UserStats struct {
	UserID              string    `json:"userId" firestore:"userId"`
	TotalLessons        int       `json:"totalLessons" firestore:"totalLessons"`
	CompletedLessons    int       `json:"completedLessons" firestore:"completedLessons"`
	TotalTimeMinutes    int       `json:"totalTimeMinutes" firestore:"totalTimeMinutes"`
	CurrentStreak       int       `json:"currentStreak" firestore:"currentStreak"`
	LongestStreak       int       `json:"longestStreak" firestore:"longestStreak"`
	LastActivityDate    time.Time `json:"lastActivityDate" firestore:"lastActivityDate"`
	UpdatedAt           time.Time `json:"updatedAt" firestore:"updatedAt"`
}
