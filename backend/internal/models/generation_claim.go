package models

import "time"

// Claim expiration duration - how long a task can be claimed before expiring
const ClaimExpirationDuration = 10 * time.Minute

// Generation status constants
const (
	GenerationStatusPending    = "pending"     // Not yet started
	GenerationStatusQueued     = "queued"      // Added to queue, waiting for worker
	GenerationStatusGenerating = "generating"  // Currently being generated
	GenerationStatusReady      = "ready"       // Successfully generated
	GenerationStatusError      = "error"       // Generation failed
	GenerationStatusTokenLimit = "token_limit" // Paused due to token limit
)

// GenerationClaim represents a claim on a generation task
// Used for distributed locking to prevent duplicate work across Cloud Run instances
type GenerationClaim struct {
	ClaimedBy string    `json:"claimedBy" firestore:"claimedBy"` // Instance ID that claimed this task
	ClaimedAt time.Time `json:"claimedAt" firestore:"claimedAt"` // When the claim was made
	ExpiresAt time.Time `json:"expiresAt" firestore:"expiresAt"` // When the claim expires
	Version   int64     `json:"version" firestore:"version"`     // Optimistic locking version
}

// GenerationTask represents a task in the generation queue
type GenerationTask struct {
	ID          string             `json:"id" firestore:"id"`             // Unique task ID
	Type        GenerationTaskType `json:"type" firestore:"type"`         // Type of generation task
	Priority    int                `json:"priority" firestore:"priority"` // 0 = highest priority
	CourseID    string             `json:"courseId" firestore:"courseId"` // Course this belongs to
	SectionID   string             `json:"sectionId,omitempty" firestore:"sectionId,omitempty"`
	LessonID    string             `json:"lessonId,omitempty" firestore:"lessonId,omitempty"`
	BlockID     string             `json:"blockId,omitempty" firestore:"blockId,omitempty"`
	UserID      string             `json:"userId" firestore:"userId"`     // User who owns the course
	UserTier    string             `json:"userTier" firestore:"userTier"` // User's tier for model selection
	Status      string             `json:"status" firestore:"status"`     // Current status
	Claim       *GenerationClaim   `json:"claim,omitempty" firestore:"claim,omitempty"`
	Error       string             `json:"error,omitempty" firestore:"error,omitempty"`
	CreatedAt   time.Time          `json:"createdAt" firestore:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt" firestore:"updatedAt"`
	CompletedAt *time.Time         `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`
}

// GenerationTaskType defines the type of content to generate
type GenerationTaskType string

const (
	TaskTypeOutline       GenerationTaskType = "outline"        // Generate course outline
	TaskTypeBlockSkeleton GenerationTaskType = "block_skeleton" // Generate block skeletons for a lesson
	TaskTypeBlockContent  GenerationTaskType = "block_content"  // Generate content for a specific block
)

// Task priority levels
const (
	PriorityUrgent = 0 // Block content (user is waiting)
	PriorityHigh   = 1 // Block skeletons (user will need soon)
	PriorityMedium = 2 // Outline generation
	PriorityLow    = 3 // Pre-generation (background)
)

// Pre-generation configuration
const (
	PreGenerationDepth  = 10              // How many blocks ahead to pre-generate
	RecoveryJobInterval = 5 * time.Minute // How often to check for stuck tasks
)

// NewGenerationClaim creates a new claim for the given instance
func NewGenerationClaim(instanceID string) *GenerationClaim {
	now := time.Now().UTC()
	return &GenerationClaim{
		ClaimedBy: instanceID,
		ClaimedAt: now,
		ExpiresAt: now.Add(ClaimExpirationDuration),
		Version:   1,
	}
}

// IsValid checks if the claim is still valid (not expired)
func (c *GenerationClaim) IsValid() bool {
	if c == nil {
		return false
	}
	return time.Now().UTC().Before(c.ExpiresAt)
}

// IsExpired checks if the claim has expired
func (c *GenerationClaim) IsExpired() bool {
	if c == nil {
		return true
	}
	return time.Now().UTC().After(c.ExpiresAt)
}

// Extend extends the claim expiration time
func (c *GenerationClaim) Extend() {
	c.ExpiresAt = time.Now().UTC().Add(ClaimExpirationDuration)
	c.Version++
}

// NewGenerationTask creates a new generation task
func NewGenerationTask(taskType GenerationTaskType, priority int, courseID, userID, userTier string) *GenerationTask {
	now := time.Now().UTC()
	return &GenerationTask{
		ID:        generateTaskID(taskType, courseID),
		Type:      taskType,
		Priority:  priority,
		CourseID:  courseID,
		UserID:    userID,
		UserTier:  userTier,
		Status:    GenerationStatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// generateTaskID creates a unique task ID based on type and course
func generateTaskID(taskType GenerationTaskType, courseID string) string {
	return string(taskType) + "_" + courseID + "_" + time.Now().UTC().Format("20060102150405")
}

// CanBeClaimed checks if the task can be claimed
func (t *GenerationTask) CanBeClaimed() bool {
	// Can claim if pending/queued or if previous claim expired
	if t.Status == GenerationStatusPending || t.Status == GenerationStatusQueued {
		return t.Claim == nil || t.Claim.IsExpired()
	}
	// Can reclaim if generating but claim expired (stuck task)
	if t.Status == GenerationStatusGenerating && t.Claim != nil && t.Claim.IsExpired() {
		return true
	}
	return false
}

// SetClaim sets the claim on this task
func (t *GenerationTask) SetClaim(claim *GenerationClaim) {
	t.Claim = claim
	t.Status = GenerationStatusGenerating
	t.UpdatedAt = time.Now().UTC()
}

// Complete marks the task as completed
func (t *GenerationTask) Complete() {
	now := time.Now().UTC()
	t.Status = GenerationStatusReady
	t.CompletedAt = &now
	t.UpdatedAt = now
	t.Claim = nil
}

// Fail marks the task as failed
func (t *GenerationTask) Fail(err string) {
	t.Status = GenerationStatusError
	t.Error = err
	t.UpdatedAt = time.Now().UTC()
	t.Claim = nil
}

// PauseForTokenLimit marks the task as paused due to token limit
func (t *GenerationTask) PauseForTokenLimit() {
	t.Status = GenerationStatusTokenLimit
	t.UpdatedAt = time.Now().UTC()
	t.Claim = nil
}
