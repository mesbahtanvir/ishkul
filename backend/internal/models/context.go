package models

import "time"

// SkillLevel represents proficiency in a skill
type SkillLevel string

const (
	SkillLevelBeginner     SkillLevel = "beginner"
	SkillLevelIntermediate SkillLevel = "intermediate"
	SkillLevelProficient   SkillLevel = "proficient"
	SkillLevelExpert       SkillLevel = "expert"
)

// SkillIntent represents the user's intent with a skill
type SkillIntent string

const (
	SkillIntentKnow        SkillIntent = "know"
	SkillIntentImproving   SkillIntent = "improving"
	SkillIntentWantToLearn SkillIntent = "want_to_learn"
)

// UserSkill represents a skill the user has or wants to learn
type UserSkill struct {
	Name        string      `json:"name" firestore:"name"`
	Level       SkillLevel  `json:"level" firestore:"level"`
	Intent      SkillIntent `json:"intent" firestore:"intent"`
	TargetLevel SkillLevel  `json:"targetLevel,omitempty" firestore:"targetLevel,omitempty"`
	Context     string      `json:"context,omitempty" firestore:"context,omitempty"`
}

// ProfessionalInfo represents user's professional background
type ProfessionalInfo struct {
	Role            string `json:"role,omitempty" firestore:"role,omitempty"`
	Company         string `json:"company,omitempty" firestore:"company,omitempty"`
	YearsExperience int    `json:"yearsExperience,omitempty" firestore:"yearsExperience,omitempty"`
	Industry        string `json:"industry,omitempty" firestore:"industry,omitempty"`
}

// LocationInfo represents user's location information
type LocationInfo struct {
	Current string   `json:"current,omitempty" firestore:"current,omitempty"`
	Journey []string `json:"journey,omitempty" firestore:"journey,omitempty"`
}

// LearningPreferences represents user's learning preferences
type LearningPreferences struct {
	LearningStyle string `json:"learningStyle,omitempty" firestore:"learningStyle,omitempty"` // visual, reading, hands-on, mixed
	StudyTime     string `json:"studyTime,omitempty" firestore:"studyTime,omitempty"`         // evenings, mornings
	SessionLength string `json:"sessionLength,omitempty" firestore:"sessionLength,omitempty"` // 15 minutes, 30 minutes
}

// ParsedContext represents the structured context extracted from user input
type ParsedContext struct {
	Professional ProfessionalInfo    `json:"professional" firestore:"professional"`
	Location     LocationInfo        `json:"location" firestore:"location"`
	Personality  string              `json:"personality,omitempty" firestore:"personality,omitempty"`
	Skills       []UserSkill         `json:"skills" firestore:"skills"`
	Interests    []string            `json:"interests" firestore:"interests"`
	Goals        []string            `json:"goals" firestore:"goals"`
	Preferences  LearningPreferences `json:"preferences" firestore:"preferences"`
}

// ContextInputHistory represents a single input from the user
type ContextInputHistory struct {
	Text           string   `json:"text" firestore:"text"`
	Timestamp      int64    `json:"timestamp" firestore:"timestamp"`
	ChangesApplied []string `json:"changesApplied" firestore:"changesApplied"`
}

// DerivedContext represents auto-calculated context from user activity
type DerivedContext struct {
	AvgQuizScore      float64  `json:"avgQuizScore" firestore:"avgQuizScore"`
	CompletedCourses  int      `json:"completedCourses" firestore:"completedCourses"`
	CurrentStreak     int      `json:"currentStreak" firestore:"currentStreak"`
	MostActiveHours   []int    `json:"mostActiveHours" firestore:"mostActiveHours"`
	TopicsStudied     []string `json:"topicsStudied" firestore:"topicsStudied"`
	TotalLearningTime int      `json:"totalLearningTime" firestore:"totalLearningTime"` // minutes
	LastUpdated       int64    `json:"lastUpdated" firestore:"lastUpdated"`
}

// UserContext represents the full user context for personalized learning
type UserContext struct {
	UserID       string                `json:"userId" firestore:"userId"`
	InputHistory []ContextInputHistory `json:"inputHistory" firestore:"inputHistory"`
	Parsed       ParsedContext         `json:"parsed" firestore:"parsed"`
	Derived      DerivedContext        `json:"derived" firestore:"derived"`
	Summary      string                `json:"summary" firestore:"summary"`
	Version      int                   `json:"version" firestore:"version"`
	CreatedAt    time.Time             `json:"createdAt" firestore:"createdAt"`
	UpdatedAt    time.Time             `json:"updatedAt" firestore:"updatedAt"`
}

// ContextChange represents a single change made to the context
type ContextChange struct {
	Type        string      `json:"type"` // added, updated, removed
	Field       string      `json:"field"`
	OldValue    interface{} `json:"oldValue,omitempty"`
	NewValue    interface{} `json:"newValue,omitempty"`
	Description string      `json:"description"`
}

// ContextUpdateResponse represents the response from context update
type ContextUpdateResponse struct {
	PreviousContext ParsedContext   `json:"previousContext"`
	UpdatedContext  ParsedContext   `json:"updatedContext"`
	Changes         []ContextChange `json:"changes"`
	Confidence      float64         `json:"confidence"`
	Summary         string          `json:"summary"`
}

// NewUserContext creates a new empty user context
func NewUserContext(userID string) *UserContext {
	now := time.Now()
	return &UserContext{
		UserID:       userID,
		InputHistory: []ContextInputHistory{},
		Parsed: ParsedContext{
			Professional: ProfessionalInfo{},
			Location:     LocationInfo{},
			Skills:       []UserSkill{},
			Interests:    []string{},
			Goals:        []string{},
			Preferences:  LearningPreferences{},
		},
		Derived: DerivedContext{
			MostActiveHours: []int{},
			TopicsStudied:   []string{},
		},
		Summary:   "",
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
}
