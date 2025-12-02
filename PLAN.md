# Implementation Plan: Tiered LLM System for Paid Users

## Overview
Implement a user tier system (Free vs Pro) where Pro users get access to GPT-4o (premium LLM) while Free users get GPT-4o-mini. This requires:
1. Adding user tier fields to the User model
2. Creating tier checking middleware
3. Modifying the LLM selection logic to respect user tier
4. Updating prompts to support multiple model versions

## Architecture

### 1. User Model Changes
**File**: `/backend/internal/models/user.go`

Add fields to `User` struct:
```go
Tier string          // "free" or "pro"
PaidUntil *time.Time // Expiration date (nil = not paid)
```

### 2. Tier Selection Logic
**File**: `/backend/internal/services/pregenerate.go`

Modify `generateStep()` to:
- Accept user tier as a parameter
- Pass tier to prompt renderer
- Renderer selects model based on tier:
  - Free tier: `gpt-4o-mini`
  - Pro tier: `gpt-4o`

### 3. Prompt Template Updates
**Files**:
- `/prompts/learning/next-step.prompt.yml`
- All other learning prompts

Create parametric model selection:
- Keep `gpt-4o-mini` as default
- Add conditional override for `gpt-4o` when tier is "pro"
- Adjust temperature/maxTokens if needed for premium experience

### 4. Service Layer Updates
**File**: `/backend/internal/services/pregenerate.go`

Modify function signatures:
```go
func (s *PregenerateService) TriggerPregeneration(path *models.LearningPath, userTier string)
func (s *PregenerateService) generateStep(ctx context.Context, path *models.LearningPath, userTier string)
```

### 5. Handler Updates
**Files**:
- `/backend/internal/handlers/learning_paths.go` (wherever pregeneration is triggered)

Pass user tier from authenticated context when calling pregeneration.

### 6. Frontend Changes (Optional)
**Files**:
- `/frontend/src/types/app.ts` - Update LearningPath type to include tier info
- `/frontend/src/components/` - Show "Pro" badge/label in UI if using better model

## Implementation Steps

### Step 1: Update User Model
- Add `Tier` field (default: "free")
- Add `PaidUntil` field (optional)
- Update Firestore rules if needed

### Step 2: Create Tier Helper Functions
- `getTierForUser(user *User) string` - Determine current tier (check PaidUntil if present)
- `isProUser(user *User) bool` - Check if user is currently Pro

### Step 3: Update Prompt Renderer
- Modify `RenderToRequest()` to accept optional `tier` parameter
- Implement model selection logic:
  ```go
  func (r *Renderer) RenderToRequest(template *PromptTemplate, vars Variables, tier string) (*openai.ChatCompletionRequest, error) {
      // ...
      if tier == "pro" && template.Model == "gpt-4o-mini" {
          req.Model = "gpt-4o"
      }
      // ...
  }
  ```

### Step 4: Update Pregenerate Service
- Modify `TriggerPregeneration()` to accept `userTier`
- Pass tier to `generateStep()`
- Pass tier to `renderer.RenderToRequest()`

### Step 5: Update Learning Path Handlers
- Get authenticated user
- Fetch user tier from database (or pass through context)
- Pass tier to pregeneration trigger

### Step 6: Update Frontend Types (Optional)
- Add `tier` field to Step/LearningPath types if showing in UI
- Display "Pro" badge if applicable

## Data Model Changes

### User (in Firestore)
```
{
  id: string
  email: string
  displayName: string
  goal: string
  level: string
  tier: "free" | "pro"
  paidUntil: timestamp | null
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Files to Modify

### Backend
1. `backend/internal/models/user.go` - Add tier fields
2. `backend/pkg/prompts/renderer.go` - Add tier-aware model selection
3. `backend/internal/services/pregenerate.go` - Pass tier through generation
4. `backend/internal/handlers/learning_paths.go` - Get and pass user tier
5. `prompts/learning/next-step.prompt.yml` - Document tier behavior

### Frontend (Optional)
1. `frontend/src/types/app.ts` - Add tier field if needed
2. UI components - Show Pro badge if desired

## Testing Strategy

1. **Unit Tests**:
   - Test tier determination logic
   - Test prompt rendering with different tiers
   - Verify correct model is selected

2. **Integration Tests**:
   - Free user generates step → should use gpt-4o-mini
   - Pro user generates step → should use gpt-4o
   - Model selection respects tier

3. **Manual Testing**:
   - Create free and pro test users
   - Generate steps and verify OpenAI API calls use correct models
   - Check API response quality difference (if noticeable)

## Considerations

### Cost Optimization
- GPT-4o is ~2x more expensive than gpt-4o-mini
- Consider limiting Pro tier (quota system) if needed
- Could add token tracking to prevent abuse

### Backward Compatibility
- Default tier: "free" for existing users
- Existing users unaffected unless we implement migration
- New signups can be set to "free" by default

### Future Enhancements
1. Add quota system (API calls per day/month)
2. Implement token usage tracking
3. Add stripe/payment integration
4. Create admin panel to assign tiers

## Timeline
- **Step 1-2**: Model changes (30 min)
- **Step 3**: Renderer updates (30 min)
- **Step 4-5**: Service layer updates (45 min)
- **Step 6**: Frontend updates (15 min)
- **Testing**: Full E2E testing (30 min)

**Total**: ~2.5 hours for complete implementation
