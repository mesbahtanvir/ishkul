# PRD-001: Real-time Content Preview via Firebase Subscriptions

**Status:** Done
**Author:** Claude (Technical Analysis)
**Date:** 2025-12-27
**Issue:** N/A
**PR:** N/A (implemented before PRD workflow)

---

## Problem

The Ishkul platform uses 2-second polling intervals during async content generation, causing:
1. Up to 2 seconds latency after content is ready
2. Wasted API requests during polling
3. High backend load from continuous poll handling
4. Poor UX with spinning indicators and no progress feedback

---

## Solution

Replace polling with Firestore `onSnapshot` listeners for real-time content updates during generation. Keep API for writes and initial loads (hybrid approach).

---

## Acceptance Criteria

- [x] Content appears within 100ms of Firestore write (vs current 0-2000ms)
- [x] Zero increase in error rates
- [x] No memory leaks from listener management
- [x] Graceful fallback to polling when Firebase unavailable
- [x] All existing tests pass

---

## Out of Scope

- Replacing API for write operations
- Full offline support (deferred to future enhancement)

---

## Notes

**Original Document**: This PRD was migrated from `docs/PRD_REALTIME_CONTENT_PREVIEW.md` during PRD workflow setup.

See the original document for detailed technical design, implementation phases, and architecture diagrams.

### Implementation Status

All 4 phases completed:
- Phase 1: Firebase SDK foundation
- Phase 2: Subscription infrastructure
- Phase 3: Integration
- Phase 4: Polish & testing

### Key Files Created
- `frontend/src/services/firebase/index.ts`
- `frontend/src/services/firebase/auth.ts`
- `frontend/src/services/firebase/subscriptions.ts`
- `frontend/src/hooks/useFirebaseAuth.ts`
- `frontend/src/hooks/useCourseSubscription.ts`
