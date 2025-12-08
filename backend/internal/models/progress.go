package models

// LessonProgress tracks user's progress through a lesson
type LessonProgress struct {
	CurrentBlockIndex int           `json:"currentBlockIndex" firestore:"currentBlockIndex"` // Which block user is on (0-indexed)
	BlockResults      []BlockResult `json:"blockResults" firestore:"blockResults"`           // Results for each completed block
	StartedAt         int64         `json:"startedAt" firestore:"startedAt"`                 // When user started the lesson
	CompletedAt       int64         `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`
	Score             float64       `json:"score,omitempty" firestore:"score,omitempty"`           // Aggregated score (0-100)
	TimeSpent         int           `json:"timeSpent,omitempty" firestore:"timeSpent,omitempty"`   // Total time in seconds
}

// BlockResult tracks how user performed on a specific block
type BlockResult struct {
	BlockID     string   `json:"blockId" firestore:"blockId"`
	BlockType   string   `json:"blockType" firestore:"blockType"` // text, code, question, task, etc.
	Completed   bool     `json:"completed" firestore:"completed"`
	CompletedAt int64    `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`

	// For question blocks
	UserAnswer string `json:"userAnswer,omitempty" firestore:"userAnswer,omitempty"` // User's answer
	IsCorrect  bool   `json:"isCorrect,omitempty" firestore:"isCorrect,omitempty"`   // Was the answer correct?
	Score      float64 `json:"score,omitempty" firestore:"score,omitempty"`          // Points earned (0-100)
	Attempts   int    `json:"attempts,omitempty" firestore:"attempts,omitempty"`     // How many tries

	// For task blocks
	SelfReportedComplete bool `json:"selfReportedComplete,omitempty" firestore:"selfReportedComplete,omitempty"`

	// Time tracking
	TimeSpent int `json:"timeSpent,omitempty" firestore:"timeSpent,omitempty"` // Seconds spent on this block
}

// CourseProgress tracks overall course progress
type CourseProgress struct {
	CompletedLessons   []CompletedLessonSummary `json:"completedLessons" firestore:"completedLessons"`
	CurrentLessonID    string                   `json:"currentLessonId,omitempty" firestore:"currentLessonId,omitempty"`
	CurrentSectionID   string                   `json:"currentSectionId,omitempty" firestore:"currentSectionId,omitempty"`
	OverallScore       float64                  `json:"overallScore" firestore:"overallScore"`             // Average score across all lessons
	TotalTimeSpent     int                      `json:"totalTimeSpent" firestore:"totalTimeSpent"`         // Total time in minutes
	StrugglingTopics   []string                 `json:"strugglingTopics" firestore:"strugglingTopics"`     // Topics with low scores
	LastAccessedAt     int64                    `json:"lastAccessedAt" firestore:"lastAccessedAt"`
}

// CompletedLessonSummary summarizes a completed lesson for context
type CompletedLessonSummary struct {
	LessonID           string   `json:"lessonId" firestore:"lessonId"`
	SectionID          string   `json:"sectionId" firestore:"sectionId"`
	Title              string   `json:"title" firestore:"title"`
	Score              float64  `json:"score" firestore:"score"`                           // 0-100
	TimeSpent          int      `json:"timeSpent" firestore:"timeSpent"`                   // seconds
	KeyConceptsLearned []string `json:"keyConceptsLearned" firestore:"keyConceptsLearned"` // Main takeaways
	CompletedAt        int64    `json:"completedAt" firestore:"completedAt"`
}

// NewLessonProgress creates a new lesson progress tracker
func NewLessonProgress() *LessonProgress {
	return &LessonProgress{
		CurrentBlockIndex: 0,
		BlockResults:      []BlockResult{},
	}
}

// NewCourseProgress creates a new course progress tracker
func NewCourseProgress() *CourseProgress {
	return &CourseProgress{
		CompletedLessons: []CompletedLessonSummary{},
		StrugglingTopics: []string{},
	}
}

// CalculateScore calculates the average score from block results
func (lp *LessonProgress) CalculateScore() float64 {
	if len(lp.BlockResults) == 0 {
		return 0
	}

	var totalScore float64
	var scoredBlocks int

	for _, result := range lp.BlockResults {
		// Only count question/task blocks that have scores
		if result.Score > 0 || result.BlockType == "question" {
			totalScore += result.Score
			scoredBlocks++
		}
	}

	if scoredBlocks == 0 {
		return 100 // No scored blocks means full credit for completing
	}

	return totalScore / float64(scoredBlocks)
}

// IsComplete checks if lesson is fully completed
func (lp *LessonProgress) IsComplete(totalBlocks int) bool {
	if len(lp.BlockResults) < totalBlocks {
		return false
	}

	for _, result := range lp.BlockResults {
		if !result.Completed {
			return false
		}
	}

	return true
}
