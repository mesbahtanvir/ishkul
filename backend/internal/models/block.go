package models

// Block type constants
const (
	BlockTypeText      = "text"
	BlockTypeCode      = "code"
	BlockTypeQuestion  = "question"
	BlockTypeTask      = "task"
	BlockTypeFlashcard = "flashcard"
	BlockTypeSummary   = "summary"
)

// Content status constants
const (
	ContentStatusPending    = "pending"
	ContentStatusGenerating = "generating"
	ContentStatusReady      = "ready"
	ContentStatusError      = "error"
)

// Question type constants
const (
	QuestionTypeMultipleChoice = "multiple_choice"
	QuestionTypeTrueFalse      = "true_false"
	QuestionTypeFillBlank      = "fill_blank"
	QuestionTypeShortAnswer    = "short_answer"
	QuestionTypeCode           = "code"
)

// Block represents a content block within a lesson (Stage 2 + Stage 3 output)
type Block struct {
	ID            string        `json:"id" firestore:"id"`
	Type          string        `json:"type" firestore:"type"`       // text, code, question, task, flashcard, summary
	Title         string        `json:"title" firestore:"title"`     // Block title (from skeleton)
	Purpose       string        `json:"purpose" firestore:"purpose"` // What this block achieves (from skeleton)
	Order         int           `json:"order" firestore:"order"`
	ContentStatus string        `json:"contentStatus" firestore:"contentStatus"` // pending, generating, ready, error
	ContentError  string        `json:"contentError,omitempty" firestore:"contentError,omitempty"`
	Content       *BlockContent `json:"content,omitempty" firestore:"content,omitempty"` // Stage 3 output
}

// BlockContent holds the actual content for a block (Stage 3 output)
// Only one of these fields will be populated based on block type
type BlockContent struct {
	Text      *TextContent      `json:"text,omitempty" firestore:"text,omitempty"`
	Code      *CodeContent      `json:"code,omitempty" firestore:"code,omitempty"`
	Question  *QuestionContent  `json:"question,omitempty" firestore:"question,omitempty"`
	Task      *TaskContent      `json:"task,omitempty" firestore:"task,omitempty"`
	Flashcard *FlashcardContent `json:"flashcard,omitempty" firestore:"flashcard,omitempty"`
	Summary   *SummaryContent   `json:"summary,omitempty" firestore:"summary,omitempty"`
}

// TextContent represents explanatory text content
type TextContent struct {
	Markdown string `json:"markdown" firestore:"markdown"` // Markdown-formatted text
}

// CodeContent represents a code example block
type CodeContent struct {
	Language    string `json:"language" firestore:"language"`                           // python, javascript, go, etc.
	Code        string `json:"code" firestore:"code"`                                   // The code snippet
	Explanation string `json:"explanation,omitempty" firestore:"explanation,omitempty"` // Optional explanation
	Runnable    bool   `json:"runnable,omitempty" firestore:"runnable,omitempty"`       // Can user execute this?
}

// QuestionContent wraps a Question for the question block type
type QuestionContent struct {
	Question Question `json:"question" firestore:"question"`
}

// Question represents a quiz/knowledge check question
type Question struct {
	ID            string   `json:"id" firestore:"id"`
	Text          string   `json:"text" firestore:"text"`                                   // The question text
	Type          string   `json:"type" firestore:"type"`                                   // multiple_choice, true_false, fill_blank, short_answer, code
	Options       []Option `json:"options,omitempty" firestore:"options,omitempty"`         // For multiple choice / true-false
	CorrectAnswer string   `json:"correctAnswer" firestore:"correctAnswer"`                 // Correct answer (option ID or text)
	Explanation   string   `json:"explanation,omitempty" firestore:"explanation,omitempty"` // Why this is correct (shown after)
	Hints         []string `json:"hints,omitempty" firestore:"hints,omitempty"`             // Progressive hints
	Points        int      `json:"points,omitempty" firestore:"points,omitempty"`           // Score weight (default 1)
}

// Option represents a choice in a multiple choice question
type Option struct {
	ID   string `json:"id" firestore:"id"`     // Option identifier (a, b, c, d)
	Text string `json:"text" firestore:"text"` // Option text
}

// TaskContent represents a hands-on practice task
type TaskContent struct {
	Instruction     string   `json:"instruction" firestore:"instruction"`                             // What user needs to do
	Hints           []string `json:"hints,omitempty" firestore:"hints,omitempty"`                     // Progressive hints
	SuccessCriteria []string `json:"successCriteria,omitempty" firestore:"successCriteria,omitempty"` // How to verify completion
	Solution        string   `json:"solution,omitempty" firestore:"solution,omitempty"`               // Example solution (revealed after)
}

// FlashcardContent represents a flashcard for spaced repetition
type FlashcardContent struct {
	Front string `json:"front" firestore:"front"`                   // Question/term side
	Back  string `json:"back" firestore:"back"`                     // Answer/definition side
	Hint  string `json:"hint,omitempty" firestore:"hint,omitempty"` // Optional hint
}

// SummaryContent represents key takeaways for a lesson
type SummaryContent struct {
	KeyPoints []string `json:"keyPoints" firestore:"keyPoints"`               // Bullet points of main concepts
	NextUp    string   `json:"nextUp,omitempty" firestore:"nextUp,omitempty"` // Preview of what's coming next
}

// NewBlock creates a new block skeleton (Stage 2)
func NewBlock(id, blockType, title, purpose string, order int) *Block {
	return &Block{
		ID:            id,
		Type:          blockType,
		Title:         title,
		Purpose:       purpose,
		Order:         order,
		ContentStatus: ContentStatusPending,
	}
}
