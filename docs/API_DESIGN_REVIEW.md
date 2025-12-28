# API Design Review - Ishkul Backend

**Date**: 2025-12-28
**Reviewer**: API Design Audit
**Version**: 1.0

---

## Executive Summary

This document provides a comprehensive review of the Ishkul backend API design, identifying areas of strength and opportunities for improvement based on REST best practices, HTTP standards, and developer experience principles.

### Overall Assessment: **B+** (Good with Room for Improvement)

**Strengths:**
- Well-structured authentication with JWT tokens and refresh flow
- Sophisticated security (tiered DDoS protection, rate limiting)
- Consistent use of JSON for request/response bodies
- Good separation of concerns in handler files
- Real-time subscriptions via Firebase for performance

**Areas for Improvement:**
- Response format inconsistencies
- Some REST anti-patterns (verbs in URLs, POST for state changes)
- Missing pagination on list endpoints
- Inconsistent error response formats

---

## API Endpoint Inventory

### Public Endpoints (No Auth)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/health` | `HealthCheck` | Health check |
| GET | `/metrics` | `GetMetrics` | JSON metrics |
| GET | `/metrics/prometheus` | `GetPrometheusMetrics` | Prometheus format |
| GET | `/dev/test-token` | `DevGetTestToken` | Dev-only test token |

### Authentication Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/auth/login` | `Login` | Login (Google/email) |
| POST | `/api/auth/register` | `Register` | New user registration |
| POST | `/api/auth/refresh` | `Refresh` | Token refresh |
| POST | `/api/auth/logout` | `Logout` | Logout |

### User Profile Endpoints (Auth Required)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/me` | `GetMe` | Get user profile |
| PUT/PATCH | `/api/me` | `UpdateMe` | Update profile |
| GET | `/api/me/document` | `GetMeDocument` | Full user document |
| POST | `/api/me/document` | `CreateMeDocument` | Initialize user |
| DELETE/POST | `/api/me/delete` | `DeleteAccount` | Delete account |

### Context Endpoints (Auth Required)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/context` | `GetContext` | Get learning context |
| PUT/POST | `/api/context` | `ApplyContext` | Save context |
| GET | `/api/context/derived` | `GetDerivedContext` | Derived context |
| GET | `/api/context/summary` | `GetContextSummary` | Context summary |
| PUT/POST | `/api/context/update` | `UpdateContext` | LLM parse + merge |

### Subscription Endpoints (Auth Required)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/subscription/status` | `GetSubscriptionStatus` | Subscription status |
| POST | `/api/subscription/checkout` | `CreateCheckoutSession` | Stripe checkout |
| POST | `/api/subscription/verify` | `VerifyCheckoutSession` | Verify checkout |
| POST | `/api/subscription/portal` | `CreatePortalSession` | Customer portal |
| POST | `/api/subscription/cancel` | `CancelSubscription` | Cancel subscription |
| GET | `/api/subscription/payment-sheet` | `GetPaymentSheetParams` | Mobile payments |

### Course Endpoints (Auth Required)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/courses` | `createCourse` | Create course |
| PATCH/PUT | `/api/courses/{id}` | `updateCourse` | Update course |
| DELETE | `/api/courses/{id}` | `deleteCourse` | Delete course |
| POST | `/api/courses/{id}/archive` | `archiveCourse` | Archive course |
| POST | `/api/courses/{id}/unarchive` | `unarchiveCourse` | Unarchive course |

### Lesson Endpoints (Auth Required)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/courses/{id}/sections/{sid}/lessons` | `listSectionLessons` | List lessons |
| GET | `/api/courses/{id}/sections/{sid}/lessons/{lid}` | `getLesson` | Get lesson |
| POST | `/api/courses/{id}/sections/{sid}/lessons/{lid}/generate-blocks` | `generateLessonBlocks` | Generate blocks |
| PATCH | `/api/courses/{id}/sections/{sid}/lessons/{lid}/progress` | `updateLessonProgress` | Update progress |
| POST | `/api/courses/{id}/sections/{sid}/lessons/{lid}/blocks/{bid}/generate` | `generateBlockContent` | Generate content |
| POST | `/api/courses/{id}/sections/{sid}/lessons/{lid}/blocks/{bid}/complete` | `completeBlock` | Complete block |

### Webhook Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/webhooks/stripe` | `HandleStripeWebhook` | Stripe events |

---

## Issues Found

### Critical Issues

#### 1. Inconsistent Response Formats

**Problem:** Some handlers wrap responses, others return directly.

```go
// Wrapped (courses, context)
{"course": {...}}
{"context": {...}}

// Direct (me, subscription)
{...user object...}
{...subscription status...}
```

**Impact:** Frontend must handle both patterns, leading to inconsistent client code.

**Recommendation:** Standardize on envelope pattern:
```json
{
  "data": {...},
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  }
}
```

#### 2. Error Response Inconsistency

**Problem:** Multiple error response patterns used:

```go
// Pattern 1: http.Error (plain text)
http.Error(w, "Unauthorized", http.StatusUnauthorized)

// Pattern 2: sendErrorResponse (structured)
sendErrorResponse(w, http.StatusUnauthorized, "INVALID_TOKEN", "message")

// Pattern 3: SendError (different structure)
SendError(w, http.StatusBadRequest, "INVALID_BODY", "message")
```

**Impact:** Clients can't reliably parse errors.

**Recommendation:** Use single error format:
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "User-friendly message",
    "details": {}
  }
}
```

### Medium Issues

#### 3. Verbs in URLs (REST Anti-Pattern)

**Current:**
```
POST /api/courses/{id}/archive
POST /api/courses/{id}/unarchive
POST /api/.../generate-blocks
POST /api/.../generate
POST /api/.../complete
```

**Better Alternatives:**
```
# Option A: Use PATCH with status
PATCH /api/courses/{id}
Body: {"status": "archived"}

# Option B: Use action sub-resources (acceptable for complex operations)
POST /api/courses/{id}/actions/archive
```

**Recommendation:** For simple state changes, use PATCH. For complex async operations (generate), keep POST but document clearly.

#### 4. POST for Non-Creating Operations

**Current:**
```
POST /api/auth/logout          # No resource created
POST /api/auth/refresh         # Returns tokens (could be GET with auth)
POST /api/subscription/verify  # Verification, not creation
POST /api/subscription/cancel  # Cancellation, not creation
```

**Recommendation:**
- `logout`: Keep POST (invalidates server state)
- `refresh`: Keep POST (security best practice for tokens)
- `verify`: Consider `GET /api/subscription/sessions/{id}` or keep POST
- `cancel`: Use `DELETE /api/subscription` or `POST /api/subscription/cancellation`

#### 5. Missing Pagination

**Problem:** List endpoints return all items:
```
GET /api/courses/{id}/sections/{sid}/lessons
→ Returns all lessons, no pagination
```

**Recommendation:** Add pagination:
```
GET /lessons?page=1&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "links": {
    "next": "/lessons?page=2&limit=20",
    "prev": null
  }
}
```

#### 6. Inconsistent Naming Conventions

**Problem:** Mixed casing in endpoints:
```
/api/subscription/payment-sheet   # kebab-case ✓
/api/context/derived              # camelCase in Go
/api/me/document                  # camelCase in Go
```

**Recommendation:** Standardize on kebab-case for URLs.

### Minor Issues

#### 7. Dual HTTP Method Support

**Current:**
```go
if r.Method != http.MethodPut && r.Method != http.MethodPatch {
    http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
```

**Problem:** Supporting both PUT and PATCH can confuse clients about semantics.

**Recommendation:**
- Use PUT for full replacement
- Use PATCH for partial updates
- Don't support both for the same endpoint

#### 8. Deep URL Nesting

**Current:**
```
/api/courses/{id}/sections/{sid}/lessons/{lid}/blocks/{bid}/generate
```

**Impact:** 7 path segments makes parsing complex.

**Recommendation:** Consider flattening for block operations:
```
/api/blocks/{bid}/generate
/api/blocks/{bid}/complete
```
(Block ID is globally unique, no need for full hierarchy)

#### 9. Missing Rate Limit Headers in Response

**Recommendation:** Add standard rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1640000000
```

#### 10. No API Versioning in URL

**Current:** `/api/courses`

**Recommendation:** Add version prefix: `/api/v1/courses`

This allows for future breaking changes without disrupting existing clients.

---

## Recommendations Summary

### High Priority (Should Fix)

| # | Issue | Fix |
|---|-------|-----|
| 1 | Inconsistent response formats | Adopt envelope pattern |
| 2 | Multiple error formats | Standardize on structured errors |
| 3 | Missing pagination | Add to all list endpoints |
| 4 | Add API versioning | Use `/api/v1/` prefix |

### Medium Priority (Nice to Have)

| # | Issue | Fix |
|---|-------|-----|
| 5 | Verbs in URLs | Use PATCH for state changes |
| 6 | Rate limit headers | Add X-RateLimit-* headers |
| 7 | URL naming | Standardize on kebab-case |

### Low Priority (Future)

| # | Issue | Fix |
|---|-------|-----|
| 8 | Deep nesting | Flatten block URLs |
| 9 | Dual method support | Pick one method per endpoint |

---

## Proposed Standard Response Formats

### Success Response

```json
{
  "data": {
    "id": "course_123",
    "type": "course",
    "attributes": {
      "title": "Learn Go",
      "status": "active"
    }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Collection Response

```json
{
  "data": [
    {"id": "lesson_1", "type": "lesson", "attributes": {...}},
    {"id": "lesson_2", "type": "lesson", "attributes": {...}}
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "links": {
    "self": "/api/v1/lessons?page=1",
    "next": "/api/v1/lessons?page=2",
    "prev": null
  },
  "meta": {
    "requestId": "req_def456"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "notanemail",
      "constraint": "Must be valid email format"
    },
    "requestId": "req_xyz789",
    "documentation": "https://docs.ishkul.org/errors/validation"
  }
}
```

---

## Migration Path

### Phase 1: Response Standardization (Non-Breaking)
1. Update handlers to use helper functions
2. Add `meta` to all responses
3. Standardize error responses

### Phase 2: API Versioning (Breaking - New Version)
1. Add `/api/v1/` prefix to all endpoints
2. Maintain `/api/` as alias for v1 during transition
3. Document deprecation timeline

### Phase 3: Endpoint Improvements (In v2)
1. Flatten deep nested URLs
2. Remove verb-based URLs
3. Add full pagination support

---

## Appendix: HTTP Status Codes in Use

| Status | Count | Usage |
|--------|-------|-------|
| 200 OK | 25+ | Successful GET/PATCH/PUT |
| 201 Created | 2 | Successful POST (register, create) |
| 400 Bad Request | 10+ | Validation errors |
| 401 Unauthorized | 10+ | Missing/invalid auth |
| 403 Forbidden | 2 | Access denied |
| 404 Not Found | 8+ | Resource not found |
| 405 Method Not Allowed | 15+ | Wrong HTTP method |
| 409 Conflict | 1 | Email exists |
| 429 Too Many Requests | 1 | Rate limit exceeded |
| 500 Internal Server Error | 20+ | Server errors |
| 503 Service Unavailable | 2 | Service down |

### Missing Status Codes to Consider

- **202 Accepted** - For async operations (generate-blocks)
- **204 No Content** - For DELETE operations
- **422 Unprocessable Entity** - For semantic validation errors

---

## Conclusion

The Ishkul API is well-designed with strong security foundations. The main areas for improvement center around consistency (response formats, error handling) and adherence to REST principles (URL design, HTTP methods). Most issues are minor and can be addressed incrementally without breaking existing clients.

The recommended approach is to:
1. Fix non-breaking consistency issues first
2. Introduce API versioning
3. Make breaking improvements in a new API version
