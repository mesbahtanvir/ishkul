package models

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

// Lesson status constants (within outline)
const (
	LessonStatusPending    = "pending"
	LessonStatusLocked     = "locked"
	LessonStatusInProgress = "in_progress"
	LessonStatusCompleted  = "completed"
	LessonStatusSkipped    = "skipped"
)

// Section status constants
const (
	SectionStatusPending    = "pending"
	SectionStatusInProgress = "in_progress"
	SectionStatusCompleted  = "completed"
)

// Course represents a user's learning course
type Course struct {
	ID            string `json:"id" firestore:"id"`
	UserID        string `json:"userId" firestore:"userId"`
	Title         string `json:"title" firestore:"title"` // was: Goal
	Emoji         string `json:"emoji" firestore:"emoji"`
	Status        string `json:"status" firestore:"status"`               // active, completed, archived, deleted
	OutlineStatus string `json:"outlineStatus" firestore:"outlineStatus"` // generating, ready, failed

	// Progress tracking
	Progress         int `json:"progress" firestore:"progress"` // 0-100 (percentage complete)
	LessonsCompleted int `json:"lessonsCompleted" firestore:"lessonsCompleted"`
	TotalLessons     int `json:"totalLessons" firestore:"totalLessons"`

	// Course outline - auto-generated curriculum structure
	Outline         *CourseOutline  `json:"outline,omitempty" firestore:"outline,omitempty"`
	CurrentPosition *LessonPosition `json:"currentPosition,omitempty" firestore:"currentPosition,omitempty"`

	// Course-level progress (aggregated from lessons)
	CourseProgress *CourseProgress `json:"courseProgress,omitempty" firestore:"courseProgress,omitempty"`

	// Timestamps
	CreatedAt      int64 `json:"createdAt" firestore:"createdAt"`
	UpdatedAt      int64 `json:"updatedAt" firestore:"updatedAt"`
	LastAccessedAt int64 `json:"lastAccessedAt" firestore:"lastAccessedAt"`
	CompletedAt    int64 `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`
	ArchivedAt     int64 `json:"archivedAt,omitempty" firestore:"archivedAt,omitempty"`
	DeletedAt      int64 `json:"deletedAt,omitempty" firestore:"deletedAt,omitempty"`
}

// CourseCreate represents the request to create a new course
type CourseCreate struct {
	Title string `json:"title"`
	Emoji string `json:"emoji"`
}

// CourseUpdate represents the request to update a course
type CourseUpdate struct {
	Title            *string `json:"title,omitempty"`
	Emoji            *string `json:"emoji,omitempty"`
	Progress         *int    `json:"progress,omitempty"`
	LessonsCompleted *int    `json:"lessonsCompleted,omitempty"`
	TotalLessons     *int    `json:"totalLessons,omitempty"`
}

// CourseOutline represents the auto-generated curriculum structure for a course
type CourseOutline struct {
	Title            string          `json:"title" firestore:"title"`
	Description      string          `json:"description" firestore:"description"`
	EstimatedMinutes int             `json:"estimatedMinutes" firestore:"estimatedMinutes"`
	Prerequisites    []string        `json:"prerequisites" firestore:"prerequisites"`
	LearningOutcomes []string        `json:"learningOutcomes" firestore:"learningOutcomes"`
	Sections         []Section       `json:"sections" firestore:"sections"`
	Metadata         OutlineMetadata `json:"metadata" firestore:"metadata"`
	GeneratedAt      int64           `json:"generatedAt" firestore:"generatedAt"`
}

// Section represents a chapter/module in the course outline (was: OutlineModule)
type Section struct {
	ID               string   `json:"id" firestore:"id"`
	Title            string   `json:"title" firestore:"title"`
	Description      string   `json:"description" firestore:"description"`
	EstimatedMinutes int      `json:"estimatedMinutes" firestore:"estimatedMinutes"`
	LearningOutcomes []string `json:"learningOutcomes" firestore:"learningOutcomes"`
	Lessons          []Lesson `json:"lessons" firestore:"lessons"` // was: Topics
	Status           string   `json:"status" firestore:"status"`   // pending, in_progress, completed
}

// Lesson represents a lesson within a section (was: OutlineTopic)
// A lesson contains multiple blocks that are generated progressively
type Lesson struct {
	ID               string `json:"id" firestore:"id"`
	Title            string `json:"title" firestore:"title"`
	Description      string `json:"description" firestore:"description"`
	EstimatedMinutes int    `json:"estimatedMinutes" firestore:"estimatedMinutes"`

	// Block generation status (Stage 2)
	BlocksStatus string `json:"blocksStatus" firestore:"blocksStatus"` // pending, generating, ready, error
	BlocksError  string `json:"blocksError,omitempty" firestore:"blocksError,omitempty"`

	// Content blocks (populated after Stage 2, content filled in Stage 3)
	Blocks []Block `json:"blocks,omitempty" firestore:"blocks,omitempty"`

	// Lesson completion status
	Status      string `json:"status" firestore:"status"`                               // pending, in_progress, completed, skipped
	CompletedAt int64  `json:"completedAt,omitempty" firestore:"completedAt,omitempty"` // Unix timestamp in milliseconds

	// Progress tracking for this lesson
	Progress *LessonProgress `json:"progress,omitempty" firestore:"progress,omitempty"`
}

// LessonPosition tracks current position in the course (was: OutlinePosition)
type LessonPosition struct {
	SectionIndex int    `json:"sectionIndex" firestore:"sectionIndex"`
	LessonIndex  int    `json:"lessonIndex" firestore:"lessonIndex"`
	SectionID    string `json:"sectionId" firestore:"sectionId"`
	LessonID     string `json:"lessonId" firestore:"lessonId"`
}

// OutlineMetadata contains categorization info for the course
type OutlineMetadata struct {
	Difficulty string   `json:"difficulty" firestore:"difficulty"` // beginner, intermediate, advanced
	Category   string   `json:"category" firestore:"category"`
	Tags       []string `json:"tags" firestore:"tags"`
}

// BlockCompleteRequest represents the request to complete a block
type BlockCompleteRequest struct {
	UserAnswer string  `json:"userAnswer,omitempty"` // User's answer for questions
	Score      float64 `json:"score,omitempty"`      // Score for questions (0-100)
	TimeSpent  int     `json:"timeSpent,omitempty"`  // Time spent in seconds
}

// NewCourse creates a new course with default values
func NewCourse(userID, title, emoji string) *Course {
	return &Course{
		UserID:         userID,
		Title:          title,
		Emoji:          emoji,
		Status:         CourseStatusActive,
		OutlineStatus:  OutlineStatusGenerating,
		Progress:       0,
		CourseProgress: NewCourseProgress(),
	}
}

// NewLesson creates a new lesson with default values
func NewLesson(id, title, description string, estimatedMinutes int) *Lesson {
	return &Lesson{
		ID:               id,
		Title:            title,
		Description:      description,
		EstimatedMinutes: estimatedMinutes,
		BlocksStatus:     ContentStatusPending,
		Status:           LessonStatusPending,
		Blocks:           []Block{},
	}
}

// GetCurrentLesson returns the lesson at the current position
func (c *Course) GetCurrentLesson() *Lesson {
	if c.Outline == nil || c.CurrentPosition == nil {
		return nil
	}

	if c.CurrentPosition.SectionIndex >= len(c.Outline.Sections) {
		return nil
	}

	section := &c.Outline.Sections[c.CurrentPosition.SectionIndex]
	if c.CurrentPosition.LessonIndex >= len(section.Lessons) {
		return nil
	}

	return &section.Lessons[c.CurrentPosition.LessonIndex]
}

// GetLesson returns a lesson by ID
func (c *Course) GetLesson(lessonID string) *Lesson {
	if c.Outline == nil {
		return nil
	}

	for i := range c.Outline.Sections {
		for j := range c.Outline.Sections[i].Lessons {
			if c.Outline.Sections[i].Lessons[j].ID == lessonID {
				return &c.Outline.Sections[i].Lessons[j]
			}
		}
	}

	return nil
}

// GetLessonWithSection returns a lesson and its parent section by lesson ID
func (c *Course) GetLessonWithSection(lessonID string) (*Lesson, *Section) {
	if c.Outline == nil {
		return nil, nil
	}

	for i := range c.Outline.Sections {
		for j := range c.Outline.Sections[i].Lessons {
			if c.Outline.Sections[i].Lessons[j].ID == lessonID {
				return &c.Outline.Sections[i].Lessons[j], &c.Outline.Sections[i]
			}
		}
	}

	return nil, nil
}

// CountTotalLessons returns the total number of lessons in the course
func (c *Course) CountTotalLessons() int {
	if c.Outline == nil {
		return 0
	}

	total := 0
	for _, section := range c.Outline.Sections {
		total += len(section.Lessons)
	}
	return total
}

// CountCompletedLessons returns the number of completed lessons
func (c *Course) CountCompletedLessons() int {
	if c.Outline == nil {
		return 0
	}

	completed := 0
	for _, section := range c.Outline.Sections {
		for _, lesson := range section.Lessons {
			if lesson.Status == LessonStatusCompleted {
				completed++
			}
		}
	}
	return completed
}

// CalculateProgress calculates the course progress percentage
func (c *Course) CalculateProgress() int {
	total := c.CountTotalLessons()
	if total == 0 {
		return 0
	}

	completed := c.CountCompletedLessons()
	return (completed * 100) / total
}

// FindNextIncompleteLesson finds the next lesson that isn't completed
func (c *Course) FindNextIncompleteLesson() (*Lesson, *Section, int, int) {
	if c.Outline == nil {
		return nil, nil, -1, -1
	}

	for i := range c.Outline.Sections {
		for j := range c.Outline.Sections[i].Lessons {
			lesson := &c.Outline.Sections[i].Lessons[j]
			if lesson.Status != LessonStatusCompleted && lesson.Status != LessonStatusSkipped {
				return lesson, &c.Outline.Sections[i], i, j
			}
		}
	}

	return nil, nil, -1, -1
}

// =============================================================================
// Entity Finding Helpers (Clean Code: DRY principle)
// =============================================================================

// FindSection returns a section by ID, or nil if not found.
func (c *Course) FindSection(sectionID string) *Section {
	if c.Outline == nil {
		return nil
	}

	for i := range c.Outline.Sections {
		if c.Outline.Sections[i].ID == sectionID {
			return &c.Outline.Sections[i]
		}
	}
	return nil
}

// FindLessonInSection returns the section and lesson for given IDs.
// Returns nil for both if either is not found.
func (c *Course) FindLessonInSection(sectionID, lessonID string) (*Section, *Lesson) {
	section := c.FindSection(sectionID)
	if section == nil {
		return nil, nil
	}

	for j := range section.Lessons {
		if section.Lessons[j].ID == lessonID {
			return section, &section.Lessons[j]
		}
	}
	return section, nil
}

// FindBlock returns the section, lesson, and block for given IDs.
// Returns nil for any entity not found.
func (c *Course) FindBlock(sectionID, lessonID, blockID string) (*Section, *Lesson, *Block) {
	section, lesson := c.FindLessonInSection(sectionID, lessonID)
	if lesson == nil {
		return section, nil, nil
	}

	for k := range lesson.Blocks {
		if lesson.Blocks[k].ID == blockID {
			return section, lesson, &lesson.Blocks[k]
		}
	}
	return section, lesson, nil
}

// FindLessonIndices returns the section and lesson indices for given IDs.
// Returns -1, -1 if not found.
func (c *Course) FindLessonIndices(sectionID, lessonID string) (sectionIdx, lessonIdx int) {
	if c.Outline == nil {
		return -1, -1
	}

	for i := range c.Outline.Sections {
		if c.Outline.Sections[i].ID == sectionID {
			for j := range c.Outline.Sections[i].Lessons {
				if c.Outline.Sections[i].Lessons[j].ID == lessonID {
					return i, j
				}
			}
			return i, -1
		}
	}
	return -1, -1
}

// FindBlockIndices returns the section, lesson, and block indices for given IDs.
// Returns -1 for any index not found.
func (c *Course) FindBlockIndices(sectionID, lessonID, blockID string) (sectionIdx, lessonIdx, blockIdx int) {
	if c.Outline == nil {
		return -1, -1, -1
	}

	for i := range c.Outline.Sections {
		if c.Outline.Sections[i].ID == sectionID {
			for j := range c.Outline.Sections[i].Lessons {
				if c.Outline.Sections[i].Lessons[j].ID == lessonID {
					for k := range c.Outline.Sections[i].Lessons[j].Blocks {
						if c.Outline.Sections[i].Lessons[j].Blocks[k].ID == blockID {
							return i, j, k
						}
					}
					return i, j, -1
				}
			}
			return i, -1, -1
		}
	}
	return -1, -1, -1
}

// IsLessonUnlocked checks if a lesson at the given position is accessible to the user.
// A lesson is unlocked if:
// - It's the first lesson (always accessible)
// - It's completed or in-progress
// - Its block generation has started (blocksStatus != pending)
// This enables progressive unlocking: lessons unlock as the user progresses.
func (c *Course) IsLessonUnlocked(sectionIdx, lessonIdx int) bool {
	if c.Outline == nil {
		return false
	}

	// Bounds check
	if sectionIdx < 0 || sectionIdx >= len(c.Outline.Sections) {
		return false
	}
	section := &c.Outline.Sections[sectionIdx]
	if lessonIdx < 0 || lessonIdx >= len(section.Lessons) {
		return false
	}

	lesson := &section.Lessons[lessonIdx]

	// First lesson is always unlocked
	if sectionIdx == 0 && lessonIdx == 0 {
		return true
	}

	// Completed or in-progress = unlocked
	if lesson.Status == LessonStatusCompleted || lesson.Status == LessonStatusInProgress {
		return true
	}

	// Generation started = unlocked (blocksStatus is not pending/empty)
	if lesson.BlocksStatus != "" && lesson.BlocksStatus != ContentStatusPending {
		return true
	}

	return false
}
