# PRD-000: Ishkul Platform Baseline

**Status:** Done
**Author:** Development Team
**Date:** 2026-01-28
**Type:** Baseline Documentation

---

## Overview

This PRD documents the current state of Ishkul - an adaptive learning platform that generates personalized courses using AI. This serves as the baseline reference for all future PRDs.

---

## Problem Solved

Traditional learning platforms offer static, one-size-fits-all content. Learners struggle with:
- Content that's too easy or too hard for their level
- No personalization based on learning goals
- Lack of engagement through varied learning activities
- No progress persistence across devices

---

## Solution Implemented

Ishkul is an AI-powered adaptive learning platform that:
1. Generates personalized course outlines based on user goals
2. Creates lesson content progressively as the learner advances
3. Offers varied learning modes (lessons, quizzes, practice tasks)
4. Syncs progress across all devices via Firebase

---

## Core Features

### 1. Authentication & User Management

| Feature | Status | Implementation |
|---------|--------|----------------|
| Google Sign-In | ✅ Done | Firebase Auth + OAuth |
| JWT Token Validation | ✅ Done | Backend middleware |
| Firebase Custom Tokens | ✅ Done | Real-time subscriptions |
| Session Persistence | ✅ Done | SecureStore + auto-refresh |

**Key Files:**
- `frontend/src/services/api/auth.ts`
- `backend/internal/handlers/auth.go`
- `frontend/src/hooks/useFirebaseAuth.ts`

### 2. Course Creation

| Feature | Status | Implementation |
|---------|--------|----------------|
| Goal input | ✅ Done | Free-text with emoji selection |
| Skill level selection | ✅ Done | Beginner/Intermediate/Advanced |
| Course outline generation | ✅ Done | LLM-powered via queue system |
| Category inference | ✅ Done | Auto-detected from goal |

**User Flow:**
```
GoalSelectionScreen → Enter goal → Select emoji → Create course
                                                        ↓
                                              CourseViewScreen
                                              (shows generating status)
```

**Key Files:**
- `frontend/src/screens/GoalSelectionScreen.tsx`
- `backend/internal/handlers/courses.go`
- `backend/internal/queue/processor_outline.go`

### 3. AI Content Generation

| Feature | Status | Implementation |
|---------|--------|----------------|
| Course outline generation | ✅ Done | Queued async processing |
| Lesson skeleton generation | ✅ Done | On-demand when viewing lesson |
| Block content generation | ✅ Done | Progressive with 2-lesson lookahead |
| Cascade generation | ✅ Done | Auto-generates upcoming content |

**Generation Pipeline:**
```
Stage 1: Course Outline (on course creation)
    ↓
Stage 2: Block Skeletons (when user views lesson)
    ↓
Stage 3: Block Content (on-demand + pre-generated lookahead)
```

**Pre-generation Strategy:**
- Current lesson: Full content generated
- Next 2 lessons: Pre-generated in background
- Reduces wait time when advancing

**Key Files:**
- `backend/internal/queue/processor_outline.go`
- `backend/internal/queue/processor_blocks.go`
- `backend/internal/queue/processor_content.go`

### 4. Real-time Content Updates

| Feature | Status | Implementation |
|---------|--------|----------------|
| Firebase subscriptions | ✅ Done | Firestore onSnapshot listeners |
| Progressive block rendering | ✅ Done | Blocks appear as they're ready |
| Connection error handling | ✅ Done | User notifications + retry |
| Polling fallback | ✅ Done | 2s interval when subscriptions fail |

**Data Flow:**
```
LLM generates content → Queue Worker saves to Firestore
                                    ↓
                        Firestore triggers listener
                                    ↓
                        Frontend updates immediately
```

**Key Files:**
- `frontend/src/hooks/useCourseSubscription.ts`
- `frontend/src/services/firebase/subscriptions.ts`
- `frontend/src/hooks/useLesson.ts`

### 5. Learning Interface

| Feature | Status | Implementation |
|---------|--------|----------------|
| Course overview | ✅ Done | Section/lesson hierarchy |
| Lesson view | ✅ Done | SPA with blur loading states |
| Block types | ✅ Done | Text, Quiz, Flashcard, Practice |
| Progress tracking | ✅ Done | Per-block completion status |
| Skeleton loading | ✅ Done | Shows during content generation |

**Block Types:**
- **Text Block**: Educational content with markdown
- **Quiz Block**: Multiple choice questions
- **Flashcard Block**: Term/definition cards
- **Practice Block**: Hands-on exercises

**Key Files:**
- `frontend/src/screens/CourseViewScreen.tsx`
- `frontend/src/screens/LessonScreen.tsx`
- `frontend/src/components/blocks/`

### 6. Cross-Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Web | ✅ Done | Vercel deployment |
| iOS | ✅ Done | Expo managed workflow |
| Android | ✅ Done | Expo managed workflow |
| Tablet | ✅ Done | Responsive design |

**Key Files:**
- `frontend/app.json` (Expo config)
- `frontend/src/navigation/AppNavigator.tsx`

### 7. Backend API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/courses` | POST | Create course |
| `/api/courses/{id}` | GET | Get course details |
| `/api/courses/{id}/lessons/{lessonId}` | GET | Get lesson content |
| `/api/courses/{id}/lessons/{lessonId}/blocks/{blockId}/generate` | POST | Trigger block generation |
| `/api/users/create` | POST | Create/update user |
| `/api/progress` | GET | Get user progress |

**Authentication:** All `/api/*` endpoints require Firebase ID token.

**Key Files:**
- `backend/cmd/server/main.go` (routes)
- `backend/internal/handlers/` (implementations)

### 8. Queue System

| Feature | Status | Implementation |
|---------|--------|----------------|
| Task queue | ✅ Done | Firestore-backed queue |
| Outline processor | ✅ Done | Course outline generation |
| Blocks processor | ✅ Done | Lesson skeleton generation |
| Content processor | ✅ Done | Block content generation |
| Cascade triggers | ✅ Done | Auto-generate lookahead content |

**Queue Tasks Collection:** `queue_tasks`

**Key Files:**
- `backend/internal/queue/manager.go`
- `backend/internal/queue/processor_*.go`

---

## Technical Architecture

### Frontend Stack
- **Framework:** React Native / Expo SDK
- **Language:** TypeScript 5.9
- **State Management:** Zustand
- **Navigation:** React Navigation 7
- **Firebase:** Client SDK for Auth + Firestore subscriptions

### Backend Stack
- **Language:** Go 1.24
- **Deployment:** Google Cloud Run
- **Database:** Cloud Firestore
- **Auth:** Firebase Admin SDK
- **LLM:** DeepSeek/OpenAI API

### Infrastructure
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Cloud Run (northamerica-northeast1)
- **Database:** Firestore
- **CI/CD:** GitHub Actions

---

## Data Model

### Course Document (`courses/{courseId}`)
```typescript
{
  id: string;
  userId: string;
  goal: string;
  emoji: string;
  status: "active" | "completed";
  outlineStatus: "pending" | "generating" | "ready" | "failed";
  outline: {
    title: string;
    description: string;
    sections: Section[];
    estimatedDuration: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Section
```typescript
{
  id: string;
  title: string;
  lessons: Lesson[];
}
```

### Lesson
```typescript
{
  id: string;
  title: string;
  blocksStatus: "pending" | "generating" | "ready" | "failed";
  blocks: Block[];
}
```

### Block
```typescript
{
  id: string;
  type: "text" | "quiz" | "flashcard" | "practice";
  title: string;
  contentStatus: "pending" | "generating" | "ready" | "error";
  content: BlockContent; // varies by type
  completed: boolean;
}
```

---

## Acceptance Criteria (Baseline Verification)

- [x] Users can sign in with Google
- [x] Users can create courses with custom goals
- [x] Course outlines are generated via LLM
- [x] Lesson content generates progressively
- [x] Content updates appear in real-time via Firebase
- [x] Progress persists across devices
- [x] App works on web, iOS, and Android
- [x] Backend handles concurrent requests
- [x] Queue system processes generation tasks reliably

---

## Known Limitations

1. **No Offline Mode** - Requires internet connection
2. **No Spaced Repetition** - Linear progression only
3. **No Dark Mode** - Light theme only
4. **No Push Notifications** - No reminders
5. **No Social Features** - Solo learning only
6. **LLM Rate Limits** - May queue during high traffic

---

## Related Documentation

- [ROADMAP.md](../ROADMAP.md) - Future enhancements
- [COURSE_FLOW_DIAGRAM.md](../COURSE_FLOW_DIAGRAM.md) - Detailed flow diagrams
- [PRD-001-realtime-content-preview.md](PRD-001-realtime-content-preview.md) - Firebase subscriptions feature

---

## Metrics (Current)

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | <500ms | ✅ Met |
| Uptime | 99.9% | ✅ Met |
| Content Generation | <30s | ✅ Met |
| Cross-Platform Support | 3 platforms | ✅ Met |

---

**Document Status:** Baseline Complete
**Last Verified:** 2026-01-28
