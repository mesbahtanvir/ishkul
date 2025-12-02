package models

import "time"

// User represents a user in the system (basic profile)
type User struct {
	ID                   string     `json:"id" firestore:"id"`
	Email                string     `json:"email" firestore:"email"`
	DisplayName          string     `json:"displayName" firestore:"displayName"`
	PhotoURL             string     `json:"photoUrl,omitempty" firestore:"photoUrl,omitempty"`
	CreatedAt            time.Time  `json:"createdAt" firestore:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt" firestore:"updatedAt"`
	Goal                 string     `json:"goal,omitempty" firestore:"goal,omitempty"`
	Level                string     `json:"level,omitempty" firestore:"level,omitempty"`
	Tier                 string     `json:"tier" firestore:"tier"`                                                     // "free" or "pro"
	PaidUntil            *time.Time `json:"paidUntil,omitempty" firestore:"paidUntil,omitempty"`                       // Subscription expiration
	DeletedAt            *time.Time `json:"deletedAt,omitempty" firestore:"deletedAt,omitempty"`                       // Soft delete timestamp
	PermanentlyDeletedAt *time.Time `json:"permanentlyDeletedAt,omitempty" firestore:"permanentlyDeletedAt,omitempty"` // Hard delete timestamp

	// Stripe integration fields
	StripeCustomerID     string `json:"-" firestore:"stripeCustomerId,omitempty"`                              // Stripe customer ID (not exposed to client)
	StripeSubscriptionID string `json:"-" firestore:"stripeSubscriptionId,omitempty"`                          // Stripe subscription ID (not exposed to client)
	SubscriptionStatus   string `json:"subscriptionStatus,omitempty" firestore:"subscriptionStatus,omitempty"` // active, canceled, past_due, trialing

	// Trial info
	TrialEndsAt  *time.Time `json:"trialEndsAt,omitempty" firestore:"trialEndsAt,omitempty"`   // When trial ends
	HasUsedTrial bool       `json:"hasUsedTrial,omitempty" firestore:"hasUsedTrial,omitempty"` // Whether user has used trial
}

// UserDocument represents the full user document including learning data
type UserDocument struct {
	User
	Memory   *Memory        `json:"memory,omitempty" firestore:"memory,omitempty"`
	History  []HistoryEntry `json:"history,omitempty" firestore:"history,omitempty"`
	NextStep *NextStep      `json:"nextStep,omitempty" firestore:"nextStep,omitempty"`
}

// Memory represents the user's learning memory
type Memory struct {
	Topics     map[string]TopicMemory `json:"topics" firestore:"topics"`
	Compaction *Compaction            `json:"compaction,omitempty" firestore:"compaction,omitempty"`
}

// Compaction represents the compacted learning history summary
type Compaction struct {
	Summary         string   `json:"summary" firestore:"summary"`                 // LLM-generated narrative summary
	Strengths       []string `json:"strengths" firestore:"strengths"`             // What user demonstrates mastery in
	Weaknesses      []string `json:"weaknesses" firestore:"weaknesses"`           // Areas needing reinforcement
	Recommendations []string `json:"recommendations" firestore:"recommendations"` // What to focus on next
	LastStepIndex   int      `json:"lastStepIndex" firestore:"lastStepIndex"`     // Compacted up to step N
	CompactedAt     int64    `json:"compactedAt" firestore:"compactedAt"`         // Timestamp
}

// TopicMemory represents memory for a specific topic
type TopicMemory struct {
	Confidence   float64 `json:"confidence" firestore:"confidence"`
	LastReviewed string  `json:"lastReviewed" firestore:"lastReviewed"`
	TimesTested  int     `json:"timesTested" firestore:"timesTested"`
}

// HistoryEntry represents a single entry in the user's learning history
type HistoryEntry struct {
	Type      string  `json:"type" firestore:"type"` // "lesson", "quiz", "practice"
	Topic     string  `json:"topic" firestore:"topic"`
	Score     float64 `json:"score,omitempty" firestore:"score,omitempty"`
	Timestamp int64   `json:"timestamp" firestore:"timestamp"`
}

// NextStep represents the next recommended learning step
type NextStep struct {
	Type           string   `json:"type" firestore:"type"` // "lesson", "quiz", "practice"
	Topic          string   `json:"topic" firestore:"topic"`
	Title          string   `json:"title,omitempty" firestore:"title,omitempty"`
	Content        string   `json:"content,omitempty" firestore:"content,omitempty"`
	Question       string   `json:"question,omitempty" firestore:"question,omitempty"`
	Options        []string `json:"options,omitempty" firestore:"options,omitempty"`
	ExpectedAnswer string   `json:"expectedAnswer,omitempty" firestore:"expectedAnswer,omitempty"`
	Task           string   `json:"task,omitempty" firestore:"task,omitempty"`
}

// Progress represents user's learning progress
type Progress struct {
	UserID           string    `json:"userId" firestore:"userId"`
	LessonID         string    `json:"lessonId" firestore:"lessonId"`
	Completed        bool      `json:"completed" firestore:"completed"`
	Score            int       `json:"score,omitempty" firestore:"score,omitempty"`
	TimeSpentMinutes int       `json:"timeSpentMinutes,omitempty" firestore:"timeSpentMinutes,omitempty"`
	LastAttempt      time.Time `json:"lastAttempt" firestore:"lastAttempt"`
	Attempts         int       `json:"attempts" firestore:"attempts"`
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
