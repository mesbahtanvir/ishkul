package models

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestNewLLMContext(t *testing.T) {
	ctx := NewLLMContext()

	if ctx == nil {
		t.Fatal("NewLLMContext returned nil")
	}
	if ctx.User == nil {
		t.Error("User context should not be nil")
	}
	if ctx.Course != nil {
		t.Error("Course context should be nil by default")
	}
	if ctx.Progress != nil {
		t.Error("Progress context should be nil by default")
	}
}

func TestBuildLLMContextFromUser(t *testing.T) {
	t.Run("handles nil user context", func(t *testing.T) {
		result := BuildLLMContextFromUser(nil)
		if result == nil {
			t.Error("Should return empty struct, not nil")
		}
	})

	t.Run("extracts professional info", func(t *testing.T) {
		userCtx := NewUserContext("user1")
		userCtx.Parsed.Professional.Role = "Software Engineer"
		userCtx.Parsed.Professional.Industry = "Technology"
		userCtx.Parsed.Professional.YearsExperience = 5

		result := BuildLLMContextFromUser(userCtx)

		if result.Role != "Software Engineer" {
			t.Errorf("Expected Role 'Software Engineer', got '%s'", result.Role)
		}
		if result.Industry != "Technology" {
			t.Errorf("Expected Industry 'Technology', got '%s'", result.Industry)
		}
		if result.YearsExperience != 5 {
			t.Errorf("Expected 5 years experience, got %d", result.YearsExperience)
		}
	})

	t.Run("extracts learning preferences", func(t *testing.T) {
		userCtx := NewUserContext("user1")
		userCtx.Parsed.Preferences.LearningStyle = "hands-on"
		userCtx.Parsed.Preferences.SessionLength = "30 minutes"
		userCtx.Parsed.Preferences.StudyTime = "evenings"

		result := BuildLLMContextFromUser(userCtx)

		if result.LearningStyle != "hands-on" {
			t.Errorf("Expected LearningStyle 'hands-on', got '%s'", result.LearningStyle)
		}
		if result.SessionLength != "30 minutes" {
			t.Errorf("Expected SessionLength '30 minutes', got '%s'", result.SessionLength)
		}
	})

	t.Run("categorizes skills by intent", func(t *testing.T) {
		userCtx := NewUserContext("user1")
		userCtx.Parsed.Skills = []UserSkill{
			{Name: "Python", Intent: SkillIntentKnow},
			{Name: "Go", Intent: SkillIntentKnow},
			{Name: "Rust", Intent: SkillIntentWantToLearn},
			{Name: "TypeScript", Intent: SkillIntentImproving},
		}

		result := BuildLLMContextFromUser(userCtx)

		if len(result.KnownSkills) != 2 {
			t.Errorf("Expected 2 known skills, got %d", len(result.KnownSkills))
		}
		if len(result.LearningSkills) != 2 {
			t.Errorf("Expected 2 learning skills, got %d", len(result.LearningSkills))
		}
	})

	t.Run("extracts derived stats", func(t *testing.T) {
		userCtx := NewUserContext("user1")
		userCtx.Derived.AvgQuizScore = 85.5
		userCtx.Derived.CompletedCourses = 3
		userCtx.Derived.CurrentStreak = 7

		result := BuildLLMContextFromUser(userCtx)

		if result.AvgQuizScore != 85.5 {
			t.Errorf("Expected AvgQuizScore 85.5, got %f", result.AvgQuizScore)
		}
		if result.CompletedCourses != 3 {
			t.Errorf("Expected 3 completed courses, got %d", result.CompletedCourses)
		}
	})
}

func TestBuildLLMContextFromCourse(t *testing.T) {
	t.Run("handles nil course", func(t *testing.T) {
		result := BuildLLMContextFromCourse(nil)
		if result != nil {
			t.Error("Should return nil for nil course")
		}
	})

	t.Run("extracts basic course info", func(t *testing.T) {
		course := NewCourse("user1", "Learn Go Programming", "🐹")
		course.ID = "course1"
		course.TotalLessons = 10

		result := BuildLLMContextFromCourse(course)

		if result.CourseID != "course1" {
			t.Errorf("Expected CourseID 'course1', got '%s'", result.CourseID)
		}
		if result.CourseTitle != "Learn Go Programming" {
			t.Errorf("Expected CourseTitle 'Learn Go Programming', got '%s'", result.CourseTitle)
		}
		if result.TotalLessons != 10 {
			t.Errorf("Expected 10 lessons, got %d", result.TotalLessons)
		}
	})

	t.Run("extracts outline info", func(t *testing.T) {
		course := NewCourse("user1", "Learn Go", "🐹")
		course.Outline = &CourseOutline{
			Sections: []Section{
				{ID: "s1", Title: "Basics", Lessons: []Lesson{{ID: "l1"}, {ID: "l2"}}},
				{ID: "s2", Title: "Advanced", Lessons: []Lesson{{ID: "l3"}}},
			},
		}

		result := BuildLLMContextFromCourse(course)

		if result.TotalSections != 2 {
			t.Errorf("Expected 2 sections, got %d", result.TotalSections)
		}
		if len(result.SectionTitles) != 2 {
			t.Errorf("Expected 2 section titles, got %d", len(result.SectionTitles))
		}
		if result.OutlineJSON == "" {
			t.Error("OutlineJSON should not be empty")
		}
	})

	t.Run("extracts current position", func(t *testing.T) {
		course := NewCourse("user1", "Learn Go", "🐹")
		course.Outline = &CourseOutline{
			Sections: []Section{
				{
					ID:    "s1",
					Title: "Basics",
					Lessons: []Lesson{
						{ID: "l1", Title: "Variables"},
						{ID: "l2", Title: "Functions"},
					},
				},
			},
		}
		course.CurrentPosition = &LessonPosition{
			SectionID: "s1",
			LessonID:  "l2",
		}

		result := BuildLLMContextFromCourse(course)

		if result.CurrentSectionID != "s1" {
			t.Errorf("Expected CurrentSectionID 's1', got '%s'", result.CurrentSectionID)
		}
		if result.CurrentLessonID != "l2" {
			t.Errorf("Expected CurrentLessonID 'l2', got '%s'", result.CurrentLessonID)
		}
		if result.CurrentSectionTitle != "Basics" {
			t.Errorf("Expected CurrentSectionTitle 'Basics', got '%s'", result.CurrentSectionTitle)
		}
		if result.CurrentLessonTitle != "Functions" {
			t.Errorf("Expected CurrentLessonTitle 'Functions', got '%s'", result.CurrentLessonTitle)
		}
	})
}

func TestBuildLLMContextFromProgress(t *testing.T) {
	t.Run("handles nil progress", func(t *testing.T) {
		result := BuildLLMContextFromProgress(nil, nil)
		if result == nil {
			t.Error("Should return empty struct, not nil")
		}
	})

	t.Run("calculates progress percentage", func(t *testing.T) {
		course := NewCourse("user1", "Learn Go", "🐹")
		course.TotalLessons = 10

		progress := NewCourseProgress()
		progress.CompletedLessons = []CompletedLessonSummary{
			{LessonID: "l1", Title: "Lesson 1"},
			{LessonID: "l2", Title: "Lesson 2"},
			{LessonID: "l3", Title: "Lesson 3"},
		}
		progress.OverallScore = 85.0
		progress.TotalTimeSpent = 45

		result := BuildLLMContextFromProgress(progress, course)

		if result.ProgressPercent != 30 {
			t.Errorf("Expected 30%% progress, got %d%%", result.ProgressPercent)
		}
		if result.LessonsCompleted != 3 {
			t.Errorf("Expected 3 lessons completed, got %d", result.LessonsCompleted)
		}
		if result.TotalLessons != 10 {
			t.Errorf("Expected 10 total lessons, got %d", result.TotalLessons)
		}
	})

	t.Run("extracts recent lessons", func(t *testing.T) {
		progress := NewCourseProgress()
		progress.CompletedLessons = []CompletedLessonSummary{
			{LessonID: "l1", Title: "Lesson 1"},
			{LessonID: "l2", Title: "Lesson 2"},
			{LessonID: "l3", Title: "Lesson 3"},
			{LessonID: "l4", Title: "Lesson 4"},
			{LessonID: "l5", Title: "Lesson 5"},
			{LessonID: "l6", Title: "Lesson 6"},
		}

		result := BuildLLMContextFromProgress(progress, nil)

		// Should only get last 5
		if len(result.RecentLessons) != 5 {
			t.Errorf("Expected 5 recent lessons, got %d", len(result.RecentLessons))
		}
		if result.RecentLessons[0] != "Lesson 2" {
			t.Errorf("Expected first recent to be 'Lesson 2', got '%s'", result.RecentLessons[0])
		}
		if result.RecentLessons[4] != "Lesson 6" {
			t.Errorf("Expected last recent to be 'Lesson 6', got '%s'", result.RecentLessons[4])
		}
	})

	t.Run("includes struggling topics", func(t *testing.T) {
		progress := NewCourseProgress()
		progress.StrugglingTopics = []string{"Pointers", "Concurrency"}

		result := BuildLLMContextFromProgress(progress, nil)

		if len(result.StrugglingTopics) != 2 {
			t.Errorf("Expected 2 struggling topics, got %d", len(result.StrugglingTopics))
		}
	})
}

func TestBuildLLMContext(t *testing.T) {
	t.Run("combines all contexts", func(t *testing.T) {
		userCtx := NewUserContext("user1")
		userCtx.Parsed.Professional.Role = "Developer"

		course := NewCourse("user1", "Learn Go", "🐹")
		course.ID = "course1"

		progress := NewCourseProgress()
		progress.OverallScore = 80

		result := BuildLLMContext(userCtx, course, progress)

		if result.User == nil {
			t.Error("User context should not be nil")
		}
		if result.Course == nil {
			t.Error("Course context should not be nil")
		}
		if result.Progress == nil {
			t.Error("Progress context should not be nil")
		}
		if result.User.Role != "Developer" {
			t.Error("User role should be extracted")
		}
		if result.Course.CourseID != "course1" {
			t.Error("Course ID should be extracted")
		}
		if result.Progress.OverallScore != 80 {
			t.Error("Progress score should be extracted")
		}
	})
}

func TestLLMCourseContext_WithLesson(t *testing.T) {
	courseCtx := &LLMCourseContext{
		CourseID:    "course1",
		CourseTitle: "Learn Go",
	}

	lesson := &Lesson{
		ID:          "l1",
		Title:       "Variables",
		Description: "Learn about Go variables",
		Blocks: []Block{
			{ID: "b1", Title: "Introduction", Type: BlockTypeText},
			{ID: "b2", Title: "Variable Quiz", Type: BlockTypeQuestion},
		},
	}

	result := courseCtx.WithLesson(lesson)

	if result.LessonTitle != "Variables" {
		t.Errorf("Expected LessonTitle 'Variables', got '%s'", result.LessonTitle)
	}
	if result.LessonDescription != "Learn about Go variables" {
		t.Errorf("Expected LessonDescription, got '%s'", result.LessonDescription)
	}
	if len(result.LessonBlocks) != 2 {
		t.Errorf("Expected 2 lesson blocks, got %d", len(result.LessonBlocks))
	}
}

func TestLLMCourseContext_WithBlock(t *testing.T) {
	courseCtx := &LLMCourseContext{
		CourseID: "course1",
	}

	block := &Block{
		ID:      "b1",
		Type:    BlockTypeQuestion,
		Title:   "Variable Quiz",
		Purpose: "Test understanding of variables",
	}

	result := courseCtx.WithBlock(block)

	if result.BlockID != "b1" {
		t.Errorf("Expected BlockID 'b1', got '%s'", result.BlockID)
	}
	if result.BlockType != BlockTypeQuestion {
		t.Errorf("Expected BlockType 'question', got '%s'", result.BlockType)
	}
	if result.BlockTitle != "Variable Quiz" {
		t.Errorf("Expected BlockTitle 'Variable Quiz', got '%s'", result.BlockTitle)
	}
}

func TestLLMProgressContext_WithLessonProgress(t *testing.T) {
	progressCtx := &LLMProgressContext{
		ProgressPercent: 50,
	}

	lessonProgress := &LessonProgress{
		CurrentBlockIndex: 2,
		BlockResults: []BlockResult{
			{BlockID: "b1", Completed: true},
			{BlockID: "b2", Completed: true},
		},
	}

	result := progressCtx.WithLessonProgress(lessonProgress, 5)

	if result.CurrentBlockIndex != 2 {
		t.Errorf("Expected CurrentBlockIndex 2, got %d", result.CurrentBlockIndex)
	}
	if result.BlocksCompleted != 2 {
		t.Errorf("Expected 2 blocks completed, got %d", result.BlocksCompleted)
	}
	if result.TotalBlocks != 5 {
		t.Errorf("Expected 5 total blocks, got %d", result.TotalBlocks)
	}
}

func TestLLMContext_ToVariables(t *testing.T) {
	t.Run("converts user context to variables", func(t *testing.T) {
		ctx := &LLMContext{
			User: &LLMUserContext{
				Name:            "John",
				Role:            "Developer",
				Industry:        "Tech",
				YearsExperience: 5,
				LearningStyle:   "hands-on",
				KnownSkills:     []string{"Python", "Go"},
				LearningSkills:  []string{"Rust"},
				Goals:           []string{"Learn systems programming"},
				AvgQuizScore:    85,
			},
		}

		vars := ctx.ToVariables()

		if vars["userName"] != "John" {
			t.Errorf("Expected userName 'John', got '%s'", vars["userName"])
		}
		if vars["userRole"] != "Developer" {
			t.Errorf("Expected userRole 'Developer', got '%s'", vars["userRole"])
		}
		if vars["learningStyle"] != "hands-on" {
			t.Errorf("Expected learningStyle 'hands-on', got '%s'", vars["learningStyle"])
		}
		if vars["knownSkills"] != "Python, Go" {
			t.Errorf("Expected knownSkills 'Python, Go', got '%s'", vars["knownSkills"])
		}
		if !strings.Contains(vars["userContext"], "Developer") {
			t.Error("userContext should contain role")
		}
	})

	t.Run("converts course context to variables", func(t *testing.T) {
		ctx := &LLMContext{
			User: &LLMUserContext{},
			Course: &LLMCourseContext{
				CourseID:            "c1",
				CourseTitle:         "Learn Go",
				TotalSections:       3,
				TotalLessons:        15,
				CurrentSectionTitle: "Basics",
				CurrentLessonTitle:  "Variables",
				LessonTitle:         "Variables",
				LessonDescription:   "Learn variables",
				BlockType:           "question",
				BlockTitle:          "Quiz",
			},
		}

		vars := ctx.ToVariables()

		if vars["courseId"] != "c1" {
			t.Errorf("Expected courseId 'c1', got '%s'", vars["courseId"])
		}
		if vars["courseTitle"] != "Learn Go" {
			t.Errorf("Expected courseTitle 'Learn Go', got '%s'", vars["courseTitle"])
		}
		if vars["lessonTitle"] != "Variables" {
			t.Errorf("Expected lessonTitle 'Variables', got '%s'", vars["lessonTitle"])
		}
		if vars["blockType"] != "question" {
			t.Errorf("Expected blockType 'question', got '%s'", vars["blockType"])
		}
		if !strings.Contains(vars["courseContext"], "Learn Go") {
			t.Error("courseContext should contain title")
		}
	})

	t.Run("converts progress context to variables", func(t *testing.T) {
		ctx := &LLMContext{
			User: &LLMUserContext{},
			Progress: &LLMProgressContext{
				ProgressPercent:  30,
				LessonsCompleted: 3,
				TotalLessons:     10,
				OverallScore:     85,
				TotalTimeSpent:   45,
				RecentLessons:    []string{"Lesson 1", "Lesson 2"},
				StrugglingTopics: []string{"Pointers"},
			},
		}

		vars := ctx.ToVariables()

		if vars["progressPercent"] != "30%" {
			t.Errorf("Expected progressPercent '30%%', got '%s'", vars["progressPercent"])
		}
		if vars["lessonsCompleted"] != "3" {
			t.Errorf("Expected lessonsCompleted '3', got '%s'", vars["lessonsCompleted"])
		}
		if vars["overallScore"] != "85%" {
			t.Errorf("Expected overallScore '85%%', got '%s'", vars["overallScore"])
		}
		if vars["strugglingTopics"] != "Pointers" {
			t.Errorf("Expected strugglingTopics 'Pointers', got '%s'", vars["strugglingTopics"])
		}
	})
}

func TestLLMUserContext_ToSummary(t *testing.T) {
	t.Run("empty user returns new learner", func(t *testing.T) {
		user := &LLMUserContext{}
		summary := user.ToSummary()
		if summary != "New learner" {
			t.Errorf("Expected 'New learner', got '%s'", summary)
		}
	})

	t.Run("includes professional info", func(t *testing.T) {
		user := &LLMUserContext{
			Role:            "Developer",
			Industry:        "Tech",
			YearsExperience: 5,
		}
		summary := user.ToSummary()
		if !strings.Contains(summary, "Developer") {
			t.Error("Summary should contain role")
		}
		if !strings.Contains(summary, "Tech") {
			t.Error("Summary should contain industry")
		}
		if !strings.Contains(summary, "5 years") {
			t.Error("Summary should contain experience")
		}
	})

	t.Run("includes skills", func(t *testing.T) {
		user := &LLMUserContext{
			KnownSkills:    []string{"Python"},
			LearningSkills: []string{"Go"},
		}
		summary := user.ToSummary()
		if !strings.Contains(summary, "Knows: Python") {
			t.Error("Summary should contain known skills")
		}
		if !strings.Contains(summary, "Learning: Go") {
			t.Error("Summary should contain learning skills")
		}
	})
}

func TestLLMCourseContext_ToSummary(t *testing.T) {
	course := &LLMCourseContext{
		CourseTitle:         "Learn Go Programming",
		TotalSections:       5,
		TotalLessons:        20,
		CurrentSectionTitle: "Concurrency",
		CurrentLessonTitle:  "Goroutines",
	}

	summary := course.ToSummary()

	if !strings.Contains(summary, "Learn Go Programming") {
		t.Error("Summary should contain course title")
	}
	if !strings.Contains(summary, "5 sections") {
		t.Error("Summary should contain section count")
	}
	if !strings.Contains(summary, "Concurrency") {
		t.Error("Summary should contain current section")
	}
}

func TestLLMProgressContext_ToSummary(t *testing.T) {
	progress := &LLMProgressContext{
		ProgressPercent:  50,
		LessonsCompleted: 10,
		TotalLessons:     20,
		OverallScore:     85,
		StrugglingTopics: []string{"Pointers", "Memory"},
		RecentLessons:    []string{"Variables", "Functions"},
	}

	summary := progress.ToSummary()

	if !strings.Contains(summary, "50%") {
		t.Error("Summary should contain progress percentage")
	}
	if !strings.Contains(summary, "10/20") {
		t.Error("Summary should contain lesson count")
	}
	if !strings.Contains(summary, "85%") {
		t.Error("Summary should contain score")
	}
	if !strings.Contains(summary, "Pointers") {
		t.Error("Summary should contain struggling topics")
	}
}

func TestLLMContext_ToJSON(t *testing.T) {
	ctx := &LLMContext{
		User: &LLMUserContext{
			Role: "Developer",
		},
		Course: &LLMCourseContext{
			CourseID:    "c1",
			CourseTitle: "Learn Go",
		},
	}

	jsonStr := ctx.ToJSON()

	// Verify it's valid JSON
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		t.Errorf("ToJSON should return valid JSON: %v", err)
	}

	// Verify content
	if !strings.Contains(jsonStr, "Developer") {
		t.Error("JSON should contain user role")
	}
	if !strings.Contains(jsonStr, "Learn Go") {
		t.Error("JSON should contain course title")
	}
}

func TestLLMContextIntegration(t *testing.T) {
	// Create a complete realistic scenario
	now := time.Now().UnixMilli()

	// User context
	userCtx := &UserContext{
		UserID: "user123",
		Parsed: ParsedContext{
			Professional: ProfessionalInfo{
				Role:            "Backend Developer",
				Industry:        "FinTech",
				YearsExperience: 3,
			},
			Skills: []UserSkill{
				{Name: "Python", Intent: SkillIntentKnow, Level: SkillLevelProficient},
				{Name: "Go", Intent: SkillIntentWantToLearn},
			},
			Preferences: LearningPreferences{
				LearningStyle: "hands-on",
				SessionLength: "30 minutes",
			},
			Goals: []string{"Learn Go for microservices"},
		},
		Derived: DerivedContext{
			AvgQuizScore:     82.5,
			CompletedCourses: 2,
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Course
	course := &Course{
		ID:           "course1",
		UserID:       "user123",
		Title:        "Go Programming Fundamentals",
		TotalLessons: 15,
		Outline: &CourseOutline{
			Sections: []Section{
				{
					ID:    "s1",
					Title: "Getting Started",
					Lessons: []Lesson{
						{ID: "l1", Title: "Installation", Status: LessonStatusCompleted},
						{ID: "l2", Title: "Hello World", Status: LessonStatusCompleted},
					},
				},
				{
					ID:    "s2",
					Title: "Variables & Types",
					Lessons: []Lesson{
						{ID: "l3", Title: "Basic Types", Status: LessonStatusInProgress},
						{ID: "l4", Title: "Variables", Status: LessonStatusPending},
					},
				},
			},
		},
		CurrentPosition: &LessonPosition{
			SectionID: "s2",
			LessonID:  "l3",
		},
	}

	// Progress
	progress := &CourseProgress{
		CompletedLessons: []CompletedLessonSummary{
			{LessonID: "l1", Title: "Installation", Score: 100, CompletedAt: now.Unix()},
			{LessonID: "l2", Title: "Hello World", Score: 90, CompletedAt: now.Unix()},
		},
		CurrentLessonID:  "l3",
		CurrentSectionID: "s2",
		OverallScore:     95,
		TotalTimeSpent:   30,
	}

	// Build complete context
	llmCtx := BuildLLMContext(userCtx, course, progress)

	// Verify user context
	if llmCtx.User.Role != "Backend Developer" {
		t.Error("User role not extracted")
	}
	if len(llmCtx.User.KnownSkills) != 1 || llmCtx.User.KnownSkills[0] != "Python" {
		t.Error("Known skills not categorized correctly")
	}
	if len(llmCtx.User.LearningSkills) != 1 || llmCtx.User.LearningSkills[0] != "Go" {
		t.Error("Learning skills not categorized correctly")
	}

	// Verify course context
	if llmCtx.Course.CourseTitle != "Go Programming Fundamentals" {
		t.Error("Course title not extracted")
	}
	if llmCtx.Course.TotalSections != 2 {
		t.Errorf("Expected 2 sections, got %d", llmCtx.Course.TotalSections)
	}
	if llmCtx.Course.CurrentSectionTitle != "Variables & Types" {
		t.Error("Current section not resolved")
	}
	if llmCtx.Course.CurrentLessonTitle != "Basic Types" {
		t.Error("Current lesson not resolved")
	}

	// Verify progress context
	if llmCtx.Progress.LessonsCompleted != 2 {
		t.Errorf("Expected 2 completed lessons, got %d", llmCtx.Progress.LessonsCompleted)
	}
	if llmCtx.Progress.OverallScore != 95 {
		t.Error("Overall score not extracted")
	}

	// Verify variables generation
	vars := llmCtx.ToVariables()
	if vars["userRole"] != "Backend Developer" {
		t.Error("Variables should include user role")
	}
	if vars["courseTitle"] != "Go Programming Fundamentals" {
		t.Error("Variables should include course title")
	}
	if vars["currentSection"] != "Variables & Types" {
		t.Error("Variables should include current section")
	}

	// Verify summaries are generated
	if vars["userContext"] == "" {
		t.Error("User context summary should not be empty")
	}
	if vars["courseContext"] == "" {
		t.Error("Course context summary should not be empty")
	}
	if vars["progressContext"] == "" {
		t.Error("Progress context summary should not be empty")
	}
}
