---
name: code-reviewer
description: Comprehensive code review for Ishkul's React Native/TypeScript frontend and Go backend. Checks for quality, security, performance, and adherence to project conventions. Use after implementing features or during PR review.
---

# Code Reviewer

Comprehensive code review skill for the Ishkul codebase (React Native/Expo + Go).

## Tech Stack Context

- **Frontend**: React Native/Expo, TypeScript 5.9, Zustand, React Navigation 7
- **Backend**: Go 1.24, Cloud Run, Firestore
- **Auth**: Firebase + Custom JWT
- **Testing**: Jest + React Testing Library (frontend), Go testing + testify (backend)

## Review Checklist

### Frontend (TypeScript/React Native)

#### Critical Issues
- [ ] **React Rules of Hooks** - All hooks at top, before conditionals (see hooks-validator skill)
- [ ] **No `any` types** - Use `unknown` or proper types
- [ ] **No hardcoded secrets** - Use environment variables
- [ ] **Proper error handling** - Try-catch with typed ApiError

#### TypeScript Quality
- [ ] Interfaces for public APIs (props, return types)
- [ ] Types for internal structures
- [ ] No type assertions without validation (`as` keyword)
- [ ] Proper null/undefined handling with optional chaining

#### Component Patterns
```typescript
// GOOD - Follows Ishkul patterns
interface ComponentProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export const Component: React.FC<ComponentProps> = ({
  title,
  onPress,
  variant = 'primary',
}) => {
  const { colors } = useTheme();  // Theme hook
  // ...
};

// BAD
export const Component = (props: any) => { // No type
  const { colors } = useTheme();
  if (loading) return null; // Hook after this could crash
  const [state] = useState(); // BAD!
};
```

#### State Management (Zustand)
- [ ] Store actions properly typed
- [ ] Selectors for derived state
- [ ] No state mutations (use set())
- [ ] Clear separation of concerns

```typescript
// GOOD - Follows lessonStore.ts pattern
interface LessonState {
  currentLesson: Lesson | null;
  lessonLoading: boolean;
  error: string | null;

  // Actions
  fetchLesson: (courseId: string, lessonId: string) => Promise<Lesson | null>;
  clearError: () => void;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  currentLesson: null,
  lessonLoading: false,
  error: null,

  fetchLesson: async (courseId, lessonId) => {
    set({ lessonLoading: true, error: null });
    try {
      const lesson = await lessonsApi.getLesson(courseId, lessonId);
      set({ currentLesson: lesson, lessonLoading: false });
      return lesson;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, lessonLoading: false });
      return null;
    }
  },
}));
```

#### API Client Usage
- [ ] Use ApiClient from `services/api/client.ts`
- [ ] Proper error handling with ApiError
- [ ] No raw fetch() calls for authenticated endpoints

```typescript
// GOOD
try {
  const data = await apiClient.get<ResponseType>('/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) { /* handle auth */ }
    console.error(error.code, error.message);
  }
}

// BAD
const response = await fetch('/endpoint'); // Missing auth, error handling
```

### Backend (Go)

#### Critical Issues
- [ ] **Input validation** - Validate all request bodies
- [ ] **Error codes** - Use defined error codes (ErrCodeInvalidRequest, etc.)
- [ ] **Context usage** - Pass context through for cancellation
- [ ] **No panics in handlers** - Always return proper errors

#### Handler Patterns
```go
// GOOD - Follows Ishkul handler pattern
func HandleResource(w http.ResponseWriter, r *http.Request) {
    // Method check first
    if !RequireMethod(w, r, http.MethodPost) {
        return
    }

    // Parse request
    var req RequestType
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidRequest, "Invalid request format")
        return
    }

    // Validate
    if req.Field == "" {
        sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidRequest, "Field is required")
        return
    }

    // Get user from context (set by auth middleware)
    userID := middleware.GetUserID(r.Context())
    if userID == "" {
        sendErrorResponse(w, http.StatusUnauthorized, ErrCodeUnauthorized, "User not authenticated")
        return
    }

    // Business logic
    result, err := processRequest(r.Context(), req)
    if err != nil {
        sendErrorResponse(w, http.StatusInternalServerError, ErrCodeInternalError, "Processing failed")
        return
    }

    JSONSuccess(w, result)
}

// BAD
func HandleResource(w http.ResponseWriter, r *http.Request) {
    var req RequestType
    json.NewDecoder(r.Body).Decode(&req) // Error ignored!
    result := process(req) // No validation, no error handling
    json.NewEncoder(w).Encode(result) // No content-type
}
```

#### Error Response Pattern
```go
// Use defined error codes
const (
    ErrCodeInvalidRequest     = "INVALID_REQUEST"
    ErrCodeUnauthorized       = "UNAUTHORIZED"
    ErrCodeNotFound           = "NOT_FOUND"
    ErrCodeInternalError      = "INTERNAL_ERROR"
)

// Send structured error
sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidRequest, "Human-readable message")
```

#### Logging Pattern
```go
// Use structured logging
appLogger.Info("action_completed",
    slog.String("user_id", userID),
    slog.String("resource_id", resourceID),
    slog.Int("count", len(items)),
)

appLogger.Error("action_failed",
    slog.String("error", err.Error()),
    slog.String("user_id", userID),
)
```

### Security Review

#### Frontend Security
- [ ] No secrets in code (use config files)
- [ ] Proper token storage (tokenStorage service)
- [ ] No sensitive data in logs
- [ ] Input sanitization for user-generated content

#### Backend Security
- [ ] All `/api/*` routes use Auth middleware
- [ ] Firebase Admin SDK for server-side auth
- [ ] No SQL injection (Firestore is NoSQL, but validate inputs)
- [ ] Rate limiting on auth endpoints
- [ ] CORS properly configured

#### Firebase Security Rules
- [ ] Users can only read/write own documents
- [ ] No wildcard write permissions
- [ ] Validation rules on document structure

### Performance Review

#### Frontend Performance
- [ ] No N+1 patterns in data fetching
- [ ] Memoization where needed (useMemo, useCallback)
- [ ] Proper list virtualization for long lists
- [ ] Images use proper sizing

#### Backend Performance
- [ ] Firestore queries use proper indexes
- [ ] No unbounded queries (always limit)
- [ ] Batch operations for multiple writes
- [ ] Connection pooling for external services

### Testing Requirements

#### Frontend Tests
- [ ] Test file exists for new screens/components
- [ ] Loading, error, success states tested
- [ ] **State transition tests** (critical for hooks safety)
- [ ] User interactions tested

#### Backend Tests
- [ ] Test file exists for new handlers
- [ ] Success and error cases covered
- [ ] Edge cases handled

## Output Format

```markdown
## Code Review Summary

**Files Reviewed**: 5
**Issues Found**: 3 Critical, 2 Medium, 5 Low

### Critical Issues

#### Issue #1: React Hooks Violation
- **File**: `src/screens/NewScreen.tsx:45`
- **Issue**: `useCallback` called after conditional return
- **Impact**: Will crash on state transitions
- **Fix**:
  ```typescript
  // Move before conditional return
  const handleSubmit = useCallback(() => {...}, [deps]);

  if (loading) return <Spinner />;
  ```

#### Issue #2: Missing Input Validation
- **File**: `internal/handlers/users.go:67`
- **Issue**: Request body parsed without validation
- **Impact**: Could crash or allow invalid data
- **Fix**:
  ```go
  if req.Email == "" {
      sendErrorResponse(w, http.StatusBadRequest, ErrCodeInvalidRequest, "Email required")
      return
  }
  ```

### Medium Issues
...

### Low Issues
...

### Positive Notes
- Good separation of concerns in store
- Proper TypeScript types throughout
- Comprehensive error handling
```

## When to Use

- After implementing a new feature
- Before creating a PR
- During PR code review
- After major refactoring
