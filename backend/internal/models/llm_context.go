package models

import (
	"encoding/json"
	"fmt"
	"strings"
)

// LLMContext contains all context needed for LLM prompts
// This is the unified context object passed to all course-related LLM calls
type LLMContext struct {
	User     *LLMUserContext     `json:"user"`
	Course   *LLMCourseContext   `json:"course,omitempty"`
	Progress *LLMProgressContext `json:"progress,omitempty"`
}

// LLMUserContext contains user information for LLM prompts
// This is a simplified view of UserContext optimized for prompt injection
type LLMUserContext struct {
	// Core identity
	Name string `json:"name,omitempty"`

	// Professional background
	Role            string `json:"role,omitempty"`
	Industry        string `json:"industry,omitempty"`
	YearsExperience int    `json:"yearsExperience,omitempty"`

	// Skills
	KnownSkills    []string `json:"knownSkills,omitempty"`    // Skills user already has
	LearningSkills []string `json:"learningSkills,omitempty"` // Skills user wants to learn

	// Learning preferences
	LearningStyle string `json:"learningStyle,omitempty"` // visual, reading, hands-on, mixed
	SessionLength string `json:"sessionLength,omitempty"` // 15 minutes, 30 minutes
	StudyTime     string `json:"studyTime,omitempty"`     // evenings, mornings

	// Goals and interests
	Goals     []string `json:"goals,omitempty"`
	Interests []string `json:"interests,omitempty"`

	// Derived stats (from activity)
	AvgQuizScore     float64 `json:"avgQuizScore,omitempty"`
	CompletedCourses int     `json:"completedCourses,omitempty"`
	CurrentStreak    int     `json:"currentStreak,omitempty"`
}

// LLMCourseContext contains course information for LLM prompts
type LLMCourseContext struct {
	// Course identification
	CourseID    string `json:"courseId"`
	CourseTitle string `json:"courseTitle"`

	// Course structure (outline summary)
	TotalSections int `json:"totalSections"`
	TotalLessons  int `json:"totalLessons"`

	// Current position
	CurrentSectionID    string `json:"currentSectionId,omitempty"`
	CurrentSectionTitle string `json:"currentSectionTitle,omitempty"`
	CurrentLessonID     string `json:"currentLessonId,omitempty"`
	CurrentLessonTitle  string `json:"currentLessonTitle,omitempty"`

	// Section details (for lesson/block generation)
	SectionTitles []string `json:"sectionTitles,omitempty"` // All section titles for context

	// Lesson details (for block content generation)
	LessonTitle       string   `json:"lessonTitle,omitempty"`
	LessonDescription string   `json:"lessonDescription,omitempty"`
	LessonBlocks      []string `json:"lessonBlocks,omitempty"` // Block titles/types for context

	// Block details (for specific block content generation)
	BlockID      string `json:"blockId,omitempty"`
	BlockType    string `json:"blockType,omitempty"`
	BlockTitle   string `json:"blockTitle,omitempty"`
	BlockPurpose string `json:"blockPurpose,omitempty"`

	// Full outline as JSON (for complete context)
	OutlineJSON string `json:"outlineJson,omitempty"`
}

// LLMProgressContext contains progress information for LLM prompts
type LLMProgressContext struct {
	// Overall progress
	ProgressPercent  int `json:"progressPercent"`
	LessonsCompleted int `json:"lessonsCompleted"`
	TotalLessons     int `json:"totalLessons"`

	// Performance
	OverallScore   float64 `json:"overallScore,omitempty"`
	TotalTimeSpent int     `json:"totalTimeSpent,omitempty"` // minutes

	// Recent activity
	RecentLessons    []string `json:"recentLessons,omitempty"`    // Last 3-5 completed lesson titles
	StrugglingTopics []string `json:"strugglingTopics,omitempty"` // Topics where user scored low

	// Current lesson progress (if in a lesson)
	CurrentBlockIndex int `json:"currentBlockIndex,omitempty"`
	BlocksCompleted   int `json:"blocksCompleted,omitempty"`
	TotalBlocks       int `json:"totalBlocks,omitempty"`
}

// NewLLMContext creates a new empty LLMContext
func NewLLMContext() *LLMContext {
	return &LLMContext{
		User: &LLMUserContext{},
	}
}

// BuildLLMContextFromUser creates LLMUserContext from a full UserContext
func BuildLLMContextFromUser(userCtx *UserContext) *LLMUserContext {
	if userCtx == nil {
		return &LLMUserContext{}
	}

	llmUser := &LLMUserContext{
		// Professional info
		Role:            userCtx.Parsed.Professional.Role,
		Industry:        userCtx.Parsed.Professional.Industry,
		YearsExperience: userCtx.Parsed.Professional.YearsExperience,

		// Learning preferences
		LearningStyle: userCtx.Parsed.Preferences.LearningStyle,
		SessionLength: userCtx.Parsed.Preferences.SessionLength,
		StudyTime:     userCtx.Parsed.Preferences.StudyTime,

		// Goals and interests
		Goals:     userCtx.Parsed.Goals,
		Interests: userCtx.Parsed.Interests,

		// Derived stats
		AvgQuizScore:     userCtx.Derived.AvgQuizScore,
		CompletedCourses: userCtx.Derived.CompletedCourses,
		CurrentStreak:    userCtx.Derived.CurrentStreak,
	}

	// Extract skills by intent
	for _, skill := range userCtx.Parsed.Skills {
		switch skill.Intent {
		case SkillIntentKnow:
			llmUser.KnownSkills = append(llmUser.KnownSkills, skill.Name)
		case SkillIntentWantToLearn, SkillIntentImproving:
			llmUser.LearningSkills = append(llmUser.LearningSkills, skill.Name)
		}
	}

	return llmUser
}

// BuildLLMContextFromCourse creates LLMCourseContext from a Course
func BuildLLMContextFromCourse(course *Course) *LLMCourseContext {
	if course == nil {
		return nil
	}

	llmCourse := &LLMCourseContext{
		CourseID:      course.ID,
		CourseTitle:   course.Title,
		TotalLessons:  course.TotalLessons,
		TotalSections: 0,
	}

	// Extract section info from outline
	if course.Outline != nil {
		llmCourse.TotalSections = len(course.Outline.Sections)

		// Extract section titles
		for _, section := range course.Outline.Sections {
			llmCourse.SectionTitles = append(llmCourse.SectionTitles, section.Title)
		}

		// Serialize outline to JSON for full context
		if outlineBytes, err := json.Marshal(course.Outline); err == nil {
			llmCourse.OutlineJSON = string(outlineBytes)
		}
	}

	// Set current position if available
	if course.CurrentPosition != nil {
		llmCourse.CurrentSectionID = course.CurrentPosition.SectionID
		llmCourse.CurrentLessonID = course.CurrentPosition.LessonID

		// Find current section and lesson titles
		if course.Outline != nil {
			for _, section := range course.Outline.Sections {
				if section.ID == course.CurrentPosition.SectionID {
					llmCourse.CurrentSectionTitle = section.Title
					for _, lesson := range section.Lessons {
						if lesson.ID == course.CurrentPosition.LessonID {
							llmCourse.CurrentLessonTitle = lesson.Title
							break
						}
					}
					break
				}
			}
		}
	}

	return llmCourse
}

// BuildLLMContextFromProgress creates LLMProgressContext from CourseProgress
func BuildLLMContextFromProgress(progress *CourseProgress, course *Course) *LLMProgressContext {
	if progress == nil {
		return &LLMProgressContext{}
	}

	llmProgress := &LLMProgressContext{
		OverallScore:     progress.OverallScore,
		TotalTimeSpent:   progress.TotalTimeSpent,
		LessonsCompleted: len(progress.CompletedLessons),
		StrugglingTopics: progress.StrugglingTopics,
	}

	// Calculate total lessons from course
	if course != nil {
		llmProgress.TotalLessons = course.TotalLessons
		if llmProgress.TotalLessons > 0 {
			llmProgress.ProgressPercent = (llmProgress.LessonsCompleted * 100) / llmProgress.TotalLessons
		}
	}

	// Extract recent lesson titles (last 5)
	recentCount := 5
	if len(progress.CompletedLessons) < recentCount {
		recentCount = len(progress.CompletedLessons)
	}
	startIdx := len(progress.CompletedLessons) - recentCount
	for i := startIdx; i < len(progress.CompletedLessons); i++ {
		llmProgress.RecentLessons = append(llmProgress.RecentLessons, progress.CompletedLessons[i].Title)
	}

	return llmProgress
}

// BuildLLMContext creates a complete LLMContext from all available data
func BuildLLMContext(userCtx *UserContext, course *Course, progress *CourseProgress) *LLMContext {
	return &LLMContext{
		User:     BuildLLMContextFromUser(userCtx),
		Course:   BuildLLMContextFromCourse(course),
		Progress: BuildLLMContextFromProgress(progress, course),
	}
}

// WithLesson adds lesson-specific context for block generation
func (c *LLMCourseContext) WithLesson(lesson *Lesson) *LLMCourseContext {
	if lesson == nil {
		return c
	}

	c.LessonTitle = lesson.Title
	c.LessonDescription = lesson.Description
	c.CurrentLessonID = lesson.ID

	// Extract block info
	c.LessonBlocks = nil
	for _, block := range lesson.Blocks {
		blockInfo := fmt.Sprintf("%s (%s)", block.Title, block.Type)
		c.LessonBlocks = append(c.LessonBlocks, blockInfo)
	}

	return c
}

// WithBlock adds block-specific context for content generation
func (c *LLMCourseContext) WithBlock(block *Block) *LLMCourseContext {
	if block == nil {
		return c
	}

	c.BlockID = block.ID
	c.BlockType = block.Type
	c.BlockTitle = block.Title
	c.BlockPurpose = block.Purpose

	return c
}

// WithLessonProgress adds current lesson progress context
func (p *LLMProgressContext) WithLessonProgress(lessonProgress *LessonProgress, totalBlocks int) *LLMProgressContext {
	if lessonProgress == nil {
		return p
	}

	p.CurrentBlockIndex = lessonProgress.CurrentBlockIndex
	p.TotalBlocks = totalBlocks
	p.BlocksCompleted = len(lessonProgress.BlockResults)

	return p
}

// ToVariables converts LLMContext to prompt Variables (map[string]string)
// This is used by the prompt renderer for variable substitution
func (c *LLMContext) ToVariables() map[string]string {
	vars := make(map[string]string)

	// User context variables
	if c.User != nil {
		if c.User.Name != "" {
			vars["userName"] = c.User.Name
		}
		if c.User.Role != "" {
			vars["userRole"] = c.User.Role
		}
		if c.User.Industry != "" {
			vars["userIndustry"] = c.User.Industry
		}
		if c.User.YearsExperience > 0 {
			vars["userExperience"] = fmt.Sprintf("%d years", c.User.YearsExperience)
		}
		if c.User.LearningStyle != "" {
			vars["learningStyle"] = c.User.LearningStyle
		}
		if c.User.SessionLength != "" {
			vars["sessionLength"] = c.User.SessionLength
		}
		if len(c.User.KnownSkills) > 0 {
			vars["knownSkills"] = strings.Join(c.User.KnownSkills, ", ")
		}
		if len(c.User.LearningSkills) > 0 {
			vars["learningSkills"] = strings.Join(c.User.LearningSkills, ", ")
		}
		if len(c.User.Goals) > 0 {
			vars["userGoals"] = strings.Join(c.User.Goals, ", ")
		}
		if len(c.User.Interests) > 0 {
			vars["userInterests"] = strings.Join(c.User.Interests, ", ")
		}
		if c.User.AvgQuizScore > 0 {
			vars["avgQuizScore"] = fmt.Sprintf("%.0f%%", c.User.AvgQuizScore)
		}
		if c.User.CompletedCourses > 0 {
			vars["completedCourses"] = fmt.Sprintf("%d", c.User.CompletedCourses)
		}

		// Generate user summary
		vars["userContext"] = c.User.ToSummary()
	}

	// Course context variables
	if c.Course != nil {
		vars["courseId"] = c.Course.CourseID
		vars["courseTitle"] = c.Course.CourseTitle
		vars["totalSections"] = fmt.Sprintf("%d", c.Course.TotalSections)
		vars["totalLessons"] = fmt.Sprintf("%d", c.Course.TotalLessons)

		if c.Course.CurrentSectionTitle != "" {
			vars["currentSection"] = c.Course.CurrentSectionTitle
		}
		if c.Course.CurrentLessonTitle != "" {
			vars["currentLesson"] = c.Course.CurrentLessonTitle
		}
		if c.Course.LessonTitle != "" {
			vars["lessonTitle"] = c.Course.LessonTitle
		}
		if c.Course.LessonDescription != "" {
			vars["lessonDescription"] = c.Course.LessonDescription
		}
		if len(c.Course.SectionTitles) > 0 {
			vars["sectionTitles"] = strings.Join(c.Course.SectionTitles, ", ")
		}
		if len(c.Course.LessonBlocks) > 0 {
			vars["lessonBlocks"] = strings.Join(c.Course.LessonBlocks, "\n")
		}
		if c.Course.BlockType != "" {
			vars["blockType"] = c.Course.BlockType
		}
		if c.Course.BlockTitle != "" {
			vars["blockTitle"] = c.Course.BlockTitle
		}
		if c.Course.BlockPurpose != "" {
			vars["blockPurpose"] = c.Course.BlockPurpose
		}
		if c.Course.OutlineJSON != "" {
			vars["courseOutline"] = c.Course.OutlineJSON
		}

		// Generate course summary
		vars["courseContext"] = c.Course.ToSummary()
	}

	// Progress context variables
	if c.Progress != nil {
		vars["progressPercent"] = fmt.Sprintf("%d%%", c.Progress.ProgressPercent)
		vars["lessonsCompleted"] = fmt.Sprintf("%d", c.Progress.LessonsCompleted)
		vars["progressTotalLessons"] = fmt.Sprintf("%d", c.Progress.TotalLessons)

		if c.Progress.OverallScore > 0 {
			vars["overallScore"] = fmt.Sprintf("%.0f%%", c.Progress.OverallScore)
		}
		if c.Progress.TotalTimeSpent > 0 {
			vars["totalTimeSpent"] = fmt.Sprintf("%d minutes", c.Progress.TotalTimeSpent)
		}
		if len(c.Progress.RecentLessons) > 0 {
			vars["recentLessons"] = strings.Join(c.Progress.RecentLessons, ", ")
		}
		if len(c.Progress.StrugglingTopics) > 0 {
			vars["strugglingTopics"] = strings.Join(c.Progress.StrugglingTopics, ", ")
		}
		if c.Progress.TotalBlocks > 0 {
			vars["blocksCompleted"] = fmt.Sprintf("%d", c.Progress.BlocksCompleted)
			vars["totalBlocks"] = fmt.Sprintf("%d", c.Progress.TotalBlocks)
		}

		// Generate progress summary
		vars["progressContext"] = c.Progress.ToSummary()
	}

	return vars
}

// ToSummary generates a human-readable summary of user context
func (u *LLMUserContext) ToSummary() string {
	if u == nil {
		return ""
	}

	var parts []string

	// Professional background
	if u.Role != "" || u.Industry != "" {
		prof := ""
		if u.Role != "" {
			prof = u.Role
		}
		if u.Industry != "" {
			if prof != "" {
				prof += " in " + u.Industry
			} else {
				prof = "Works in " + u.Industry
			}
		}
		if u.YearsExperience > 0 {
			prof += fmt.Sprintf(" (%d years experience)", u.YearsExperience)
		}
		parts = append(parts, prof)
	}

	// Skills
	if len(u.KnownSkills) > 0 {
		parts = append(parts, fmt.Sprintf("Knows: %s", strings.Join(u.KnownSkills, ", ")))
	}
	if len(u.LearningSkills) > 0 {
		parts = append(parts, fmt.Sprintf("Learning: %s", strings.Join(u.LearningSkills, ", ")))
	}

	// Learning preferences
	if u.LearningStyle != "" {
		parts = append(parts, fmt.Sprintf("Prefers %s learning", u.LearningStyle))
	}

	// Performance
	if u.AvgQuizScore > 0 || u.CompletedCourses > 0 {
		perf := ""
		if u.CompletedCourses > 0 {
			perf = fmt.Sprintf("Completed %d courses", u.CompletedCourses)
		}
		if u.AvgQuizScore > 0 {
			if perf != "" {
				perf += fmt.Sprintf(" with %.0f%% avg quiz score", u.AvgQuizScore)
			} else {
				perf = fmt.Sprintf("%.0f%% avg quiz score", u.AvgQuizScore)
			}
		}
		parts = append(parts, perf)
	}

	if len(parts) == 0 {
		return "New learner"
	}

	return strings.Join(parts, ". ") + "."
}

// ToSummary generates a human-readable summary of course context
func (c *LLMCourseContext) ToSummary() string {
	if c == nil {
		return ""
	}

	var parts []string

	parts = append(parts, fmt.Sprintf("Course: %s", c.CourseTitle))

	if c.TotalSections > 0 && c.TotalLessons > 0 {
		parts = append(parts, fmt.Sprintf("%d sections, %d lessons", c.TotalSections, c.TotalLessons))
	}

	if c.CurrentSectionTitle != "" {
		current := fmt.Sprintf("Currently in: %s", c.CurrentSectionTitle)
		if c.CurrentLessonTitle != "" {
			current += fmt.Sprintf(" > %s", c.CurrentLessonTitle)
		}
		parts = append(parts, current)
	}

	return strings.Join(parts, ". ") + "."
}

// ToSummary generates a human-readable summary of progress context
func (p *LLMProgressContext) ToSummary() string {
	if p == nil {
		return ""
	}

	var parts []string

	parts = append(parts, fmt.Sprintf("Progress: %d%% (%d/%d lessons)", p.ProgressPercent, p.LessonsCompleted, p.TotalLessons))

	if p.OverallScore > 0 {
		parts = append(parts, fmt.Sprintf("Score: %.0f%%", p.OverallScore))
	}

	if len(p.StrugglingTopics) > 0 {
		parts = append(parts, fmt.Sprintf("Needs help with: %s", strings.Join(p.StrugglingTopics, ", ")))
	}

	if len(p.RecentLessons) > 0 {
		parts = append(parts, fmt.Sprintf("Recently completed: %s", strings.Join(p.RecentLessons, ", ")))
	}

	return strings.Join(parts, ". ") + "."
}

// ToJSON serializes LLMContext to JSON string
func (c *LLMContext) ToJSON() string {
	bytes, err := json.Marshal(c)
	if err != nil {
		return "{}"
	}
	return string(bytes)
}
