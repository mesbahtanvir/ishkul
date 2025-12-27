# PRD: Real-time Content Preview via Firebase Subscriptions

**Document Version**: 1.0
**Status**: Draft - Awaiting Approval
**Created**: 2025-12-27
**Author**: Claude (Technical Analysis)

---

## Executive Summary

This document proposes redesigning the content preview system to use **direct Firebase/Firestore subscriptions** instead of polling through the backend API. This change addresses latency issues in the current 2-second polling approach during async content generation.

---

## 1. Problem Statement

### Current Architecture

The Ishkul platform uses a **3-stage async content generation system**:

```
Stage 1: Course Outline Generation (on course creation)
Stage 2: Block Skeletons Generation (when user views lesson)
Stage 3: Block Content Generation (on-demand or pre-generated)
```

**Data Flow (Current)**:
```
LLM generates content → Queue Worker saves to Firestore → Frontend polls API every 2s → API reads Firestore → Returns to frontend
```

### Pain Points

1. **Latency**: 2-second polling interval means users wait up to 2 seconds after content is ready
2. **Wasted Requests**: Continuous polling even when no updates exist
3. **Backend Load**: Each poll = API request + Firestore read + auth validation
4. **Poor UX During Generation**: Users see spinning indicators with no progress feedback
5. **Network Inefficiency**: Polling continues regardless of connection quality

### Current Implementation Details

| Component | File | Current Behavior |
|-----------|------|------------------|
| Polling Hook | `frontend/src/hooks/useLesson.ts:146-161` | Polls every 2s during block generation |
| Content Polling | `frontend/src/hooks/useLesson.ts:207-223` | Polls every 2s during content generation |
| Course Generation | `frontend/src/screens/CourseViewScreen.tsx:67-128` | Polls every 2s for outline status |
| Firebase Client | `frontend/src/services/firebase.ts` | Intentionally empty - "All Firebase ops handled by backend" |

---

## 2. Proposed Solution

### Real-time Firebase Subscriptions

Replace polling with **Firestore `onSnapshot` listeners** for content that is being generated.

**Data Flow (Proposed)**:
```
LLM generates content → Queue Worker saves to Firestore → Firestore triggers listener → Frontend updates immediately
```

### Key Changes

1. **Re-introduce Firebase Client SDK** to frontend (with limited scope)
2. **Subscribe to course documents** during generation phases
3. **Keep API for writes and initial loads** (hybrid approach)
4. **Use Firebase Auth Custom Claims** for authorization

---

## 3. Feasibility Analysis

### ✅ What Makes This Feasible

#### 3.1 Security Rules Already Support Client Read Access

**Current rules** (`firebase/firestore.rules:88-92`):
```javascript
match /courses/{courseId} {
  allow read: if request.auth != null &&
                 request.auth.uid == resource.data.userId;
  allow write: if false; // All writes must go through backend Admin SDK
}
```

**Analysis**: The security rules **already allow authenticated users to read their own courses**. No rule changes are needed for read access.

#### 3.2 Data Structure is Compatible

The denormalized course structure (Course → Sections → Lessons → Blocks) means:
- A single document subscription provides all content
- No need for complex multi-collection joins
- Nested arrays update atomically

#### 3.3 Firebase SDK Bundle Size is Acceptable

| Package | Size (gzipped) |
|---------|----------------|
| `firebase/firestore` | ~25KB |
| `firebase/auth` | ~15KB |

For a learning platform with rich content, this is acceptable overhead.

---

### ⚠️ Challenges & Mitigations

#### 3.4 Auth Token Synchronization

**Challenge**: Frontend uses custom JWT tokens; Firebase requires Firebase Auth tokens.

**Current Auth Flow**:
```
Google Sign-In → Custom JWT from Backend → Stored in SecureStore
```

**Mitigation Options**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A. Firebase Custom Tokens** | Full Firebase Auth compatibility | Requires backend changes to generate custom tokens | ✅ Recommended |
| **B. Dual Auth** | No backend changes needed | Complex, potential sync issues | ❌ Not recommended |
| **C. Replace with Firebase Auth** | Cleanest solution | Major refactor, breaks existing flow | ❌ Too disruptive |

**Recommended Approach (Option A)**:
1. Backend generates **Firebase Custom Token** during login (in addition to custom JWT)
2. Frontend calls `signInWithCustomToken()` once on login
3. Firebase SDK handles token refresh automatically

#### 3.5 Mixed Data Access Patterns

**Challenge**: Using API for writes and Firebase for reads creates potential consistency issues.

**Mitigation**:
- Firebase listeners receive updates within milliseconds of writes
- Cache invalidation triggers on Firebase updates, not API responses
- Use optimistic updates for user actions (writes), Firebase for passive updates (generation status)

#### 3.6 Listener Lifecycle Management

**Challenge**: Improper listener cleanup can cause memory leaks or duplicate listeners.

**Mitigation**:
```typescript
// React hook pattern
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (doc) => {
    // handle update
  });
  return () => unsubscribe(); // Cleanup on unmount
}, [courseId]);
```

#### 3.7 Offline Handling

**Challenge**: Firebase SDK has complex offline behavior.

**Mitigation**:
- Configure Firestore with `enableIndexedDbPersistence()` for offline support
- Show clear UI indicators for offline state
- Fall back to polling if Firebase connection fails

---

## 4. Technical Design

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌──────────────────────────────┐    │
│  │   API Client        │    │   Firebase Client            │    │
│  │   (Write Operations)│    │   (Real-time Subscriptions)  │    │
│  └─────────┬───────────┘    └──────────────┬───────────────┘    │
│            │                               │                    │
│            │                               │                    │
│            v                               v                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Zustand Stores                       │    │
│  │  (coursesStore, lessonStore - unified state)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                    │                         │
                    │ HTTPS/REST              │ WebSocket (Firestore)
                    │                         │
                    v                         v
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│  ┌─────────────────────┐                                       │
│  │   API Handlers      │                                       │
│  │   (CRUD, Auth)      │                                       │
│  └─────────┬───────────┘                                       │
│            │                                                    │
│            v                                                    │
│  ┌─────────────────────┐    ┌──────────────────────────────┐    │
│  │   Queue System      │───>│   Firestore                  │<───┤
│  │   (Content Gen)     │    │   (Source of Truth)          │    │
│  └─────────────────────┘    └──────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Scope of Firebase Usage

| Use Case | Current | Proposed |
|----------|---------|----------|
| **Initial course load** | API → Backend → Firestore | API → Backend → Firestore (unchanged) |
| **Content generation updates** | API polling (2s) | Firebase subscription (real-time) |
| **User actions (complete block)** | API → Backend → Firestore | API → Backend → Firestore (unchanged) |
| **Create/Update/Delete** | API → Backend → Firestore | API → Backend → Firestore (unchanged) |

**Principle**: Firebase subscriptions are **read-only and limited to generation status monitoring**.

### 4.3 New Files & Components

```
frontend/src/
├── services/
│   ├── firebase/                       # NEW: Firebase client module
│   │   ├── index.ts                    # Firebase app initialization
│   │   ├── auth.ts                     # Firebase auth with custom tokens
│   │   └── subscriptions.ts            # Firestore subscription helpers
│   └── api/
│       └── auth.ts                     # MODIFIED: Get custom token from backend
│
├── hooks/
│   ├── useFirebaseAuth.ts              # NEW: Firebase auth lifecycle
│   ├── useCourseSubscription.ts        # NEW: Course document subscription
│   └── useLesson.ts                    # MODIFIED: Use subscription instead of polling
│
└── state/
    └── coursesStore.ts                 # MODIFIED: Handle Firebase updates
```

### 4.4 Backend Changes

```go
// backend/internal/handlers/auth.go

// ADDED: Generate Firebase custom token during login
type LoginResponse struct {
    AccessToken      string `json:"accessToken"`
    RefreshToken     string `json:"refreshToken"`
    FirebaseToken    string `json:"firebaseToken"`    // NEW
    User             User   `json:"user"`
}

// Uses Firebase Admin SDK to create custom token
func generateFirebaseCustomToken(uid string) (string, error) {
    client, _ := app.Auth(ctx)
    token, err := client.CustomToken(ctx, uid)
    return token, err
}
```

### 4.5 Subscription Hook Design

```typescript
// frontend/src/hooks/useCourseSubscription.ts

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useCourseSubscription(
  courseId: string,
  enabled: boolean = true  // Only subscribe during generation
) {
  const updateCourseInStore = useCoursesStore((s) => s.updateCourse);

  useEffect(() => {
    if (!enabled || !courseId) return;

    const courseRef = doc(db, 'courses', courseId);

    const unsubscribe = onSnapshot(
      courseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Course;
          updateCourseInStore(courseId, data);
        }
      },
      (error) => {
        console.error('Course subscription error:', error);
        // Fall back to polling on error
      }
    );

    return () => unsubscribe();
  }, [courseId, enabled, updateCourseInStore]);
}
```

### 4.6 Modified Lesson Hook

```typescript
// frontend/src/hooks/useLesson.ts (MODIFIED)

// BEFORE: Polling every 2 seconds
useEffect(() => {
  const pollInterval = setInterval(() => {
    refreshLesson(courseId, lessonId, sectionId);
  }, CONTENT_POLL_INTERVAL);  // 2000ms
  return () => clearInterval(pollInterval);
}, [...]);

// AFTER: Firebase subscription (only during generation)
const isGenerating = currentLesson?.blocksStatus === 'generating' ||
                     currentLesson?.blocks?.some(b => b.contentStatus === 'generating');

useCourseSubscription(courseId, isGenerating);

// No more polling interval needed during generation
```

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1)

| Task | Files Affected | Effort |
|------|----------------|--------|
| Add Firebase client SDK to frontend | `package.json`, new `services/firebase/` | 2h |
| Create Firebase initialization module | `services/firebase/index.ts` | 1h |
| Add custom token generation to backend | `handlers/auth.go` | 2h |
| Create `useFirebaseAuth` hook | `hooks/useFirebaseAuth.ts` | 2h |
| Update login flow to get Firebase token | `services/api/auth.ts`, `state/authStore.ts` | 2h |

**Phase 1 Deliverable**: Firebase Auth working, no functionality change yet

### Phase 2: Subscription Infrastructure (Week 2)

| Task | Files Affected | Effort |
|------|----------------|--------|
| Create `useCourseSubscription` hook | `hooks/useCourseSubscription.ts` | 3h |
| Create subscription helper utilities | `services/firebase/subscriptions.ts` | 2h |
| Add subscription state to stores | `state/coursesStore.ts` | 2h |
| Implement connection status handling | New UI components | 2h |

**Phase 2 Deliverable**: Subscription infrastructure ready, not used yet

### Phase 3: Integration (Week 3)

| Task | Files Affected | Effort |
|------|----------------|--------|
| Replace polling in `useLesson` | `hooks/useLesson.ts` | 3h |
| Replace polling in `CourseViewScreen` | `screens/CourseViewScreen.tsx` | 2h |
| Add fallback to polling on Firebase errors | `hooks/useCourseSubscription.ts` | 2h |
| Update tests | `__tests__/` files | 4h |

**Phase 3 Deliverable**: Real-time updates working

### Phase 4: Polish & Optimization (Week 4)

| Task | Files Affected | Effort |
|------|----------------|--------|
| Add offline support | Firebase config | 2h |
| Performance testing | N/A | 4h |
| Documentation update | `CLAUDE.md`, `docs/` | 2h |
| Remove old polling code | Multiple files | 1h |

---

## 6. Metrics & Success Criteria

### 6.1 Performance Metrics

| Metric | Current (Polling) | Target (Subscriptions) |
|--------|-------------------|------------------------|
| Time to see generated content | 0-2000ms after ready | <100ms after ready |
| API requests during generation | ~30/minute (every 2s) | 0 (WebSocket) |
| Backend CPU during generation | Medium (handling polls) | Low (no poll handling) |

### 6.2 User Experience Metrics

| Metric | How to Measure |
|--------|----------------|
| Perceived generation speed | User surveys, session recordings |
| Generation wait abandonment | Analytics: users leaving during generation |
| Error rates during generation | Error tracking (Sentry) |

### 6.3 Success Criteria

- [ ] Content appears within 100ms of Firestore write (vs current 0-2000ms)
- [ ] Zero increase in error rates
- [ ] No memory leaks from listener management
- [ ] Graceful fallback to polling when Firebase unavailable
- [ ] All existing tests pass

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Firebase connection issues | Medium | Medium | Automatic fallback to polling |
| Auth token sync failures | Low | High | Retry mechanism, user-friendly error |
| Increased bundle size | Certain | Low | Lazy load Firebase SDK |
| Listener leaks | Medium | Medium | Strict cleanup in hooks |
| Cost increase (Firestore reads) | Low | Low | Subscriptions are more efficient than polling |

---

## 8. Alternatives Considered

### 8.1 Server-Sent Events (SSE)

**Pros**: No Firebase SDK needed, simple protocol
**Cons**: Need to build streaming endpoint, manage connections
**Decision**: Rejected - Firebase already handles this

### 8.2 WebSocket Custom Implementation

**Pros**: Full control over protocol
**Cons**: Significant backend work, connection management
**Decision**: Rejected - reinventing Firestore

### 8.3 Reduce Polling Interval

**Pros**: Simple change (2s → 500ms)
**Cons**: 4x more API requests, still not truly real-time
**Decision**: Rejected - doesn't solve core problem

### 8.4 Keep Current Architecture (Do Nothing)

**Pros**: No development effort
**Cons**: Poor UX remains, wasted resources
**Decision**: Rejected - UX improvement is valuable

---

## 9. Backward Compatibility

### What Stays the Same

- All API endpoints remain functional
- Course creation, updates, deletes go through API
- Authentication flow (enhanced, not replaced)
- Data models in Firestore
- Security rules

### What Changes

- Frontend adds Firebase SDK (was intentionally removed)
- Login response includes Firebase custom token
- Polling replaced with subscriptions during generation

### Migration Path

- Feature flag to enable/disable subscriptions
- A/B test subscription vs polling users
- Gradual rollout with monitoring

---

## 10. Open Questions

1. **Should we subscribe to the entire course document or just specific fields?**
   - Full document is simpler but more data transferred
   - Field-specific is more efficient but more complex

2. **How long should subscriptions remain active after content is ready?**
   - Immediate unsubscribe saves resources
   - Brief delay ensures user sees final state

3. **Should we show real-time progress (e.g., "3 of 5 blocks generated")?**
   - Better UX but requires intermediate Firestore writes
   - Could use generation_queue collection for progress

4. **What's the fallback strategy for Firebase outages?**
   - Silent fallback to polling?
   - Show user notification?

---

## 11. Appendix

### A. Current Code References

| Purpose | File | Lines |
|---------|------|-------|
| Empty Firebase service | `frontend/src/services/firebase.ts` | 1-19 |
| Polling implementation | `frontend/src/hooks/useLesson.ts` | 134-223 |
| Course generation polling | `frontend/src/screens/CourseViewScreen.tsx` | 67-128 |
| Firestore security rules | `firebase/firestore.rules` | 88-92 |
| Queue worker writing to Firestore | `backend/internal/queue/processor_blocks.go` | 125-234 |
| Auth handler | `backend/internal/handlers/auth.go` | - |

### B. Firebase SDK Packages Needed

```json
{
  "dependencies": {
    "firebase": "^10.x.x"  // Modular SDK
  }
}
```

With tree-shaking, only import what's needed:
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
```

### C. Estimated Firestore Costs

| Scenario | Polling (Current) | Subscriptions (Proposed) |
|----------|-------------------|--------------------------|
| 1 lesson generation (30s) | 15 reads | 1 read + ~5 snapshot updates |
| 100 users generating content | 1,500 reads/30s | 600 reads/30s |
| Monthly (1000 lessons/day) | 450K reads | 180K reads |

**Subscriptions are ~60% more efficient** for this use case.

---

## 12. Decision Request

Please review this PRD and provide feedback on:

1. **Approval to proceed** with the proposed solution
2. **Phase prioritization** - should we do all 4 phases or start smaller?
3. **Open questions** - guidance on the items in Section 10
4. **Timeline constraints** - any hard deadlines to consider?

---

**Document Status**: Ready for Review
**Next Step**: Await approval before implementation
