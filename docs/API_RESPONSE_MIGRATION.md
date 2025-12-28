# API Response Migration Guide

This guide explains how to migrate existing handlers to use the standardized API response format.

## Overview

The new `internal/api` package provides standardized response helpers that implement:
- Envelope pattern for all responses
- Consistent error format with codes and request IDs
- Built-in pagination support
- Automatic metadata (request ID, timestamp)

## Before/After Examples

### Example 1: Simple Success Response

**Before:**
```go
func GetMe(w http.ResponseWriter, r *http.Request) {
    // ... fetch user ...

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(user); err != nil {
        http.Error(w, "Error encoding response", http.StatusInternalServerError)
        return
    }
}
```

**After:**
```go
import "github.com/mesbahtanvir/ishkul/backend/internal/api"

func GetMe(w http.ResponseWriter, r *http.Request) {
    // ... fetch user ...

    api.Success(w, user)
}
```

**Response format change:**
```json
// Before: Raw object
{"id": "123", "email": "user@example.com"}

// After: Envelope pattern
{
  "data": {"id": "123", "email": "user@example.com"},
  "meta": {"requestId": "req_abc123", "timestamp": "2024-01-15T10:30:00Z"}
}
```

### Example 2: Created Response (201)

**Before:**
```go
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusCreated)
if err := json.NewEncoder(w).Encode(response); err != nil {
    // ...
}
```

**After:**
```go
api.Created(w, response)
```

### Example 3: Error Response

**Before:**
```go
http.Error(w, "User not found", http.StatusNotFound)
// or
sendErrorResponse(w, http.StatusNotFound, "NOT_FOUND", "User not found")
```

**After:**
```go
api.NotFound(w, "User")
// or for custom errors:
api.Error(w, http.StatusNotFound, "CUSTOM_CODE", "Custom message")
```

**Response format:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Example 4: Error with Details

**Before:**
```go
http.Error(w, "Invalid email format", http.StatusBadRequest)
```

**After:**
```go
api.ErrorWithDetails(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input", map[string]string{
    "field": "email",
    "constraint": "Must be valid email format",
})
```

### Example 5: Paginated List Response

**Before:**
```go
w.Header().Set("Content-Type", "application/json")
_ = json.NewEncoder(w).Encode(map[string]interface{}{
    "lessons": section.Lessons,
})
```

**After:**
```go
// Parse pagination from request
params := api.ParsePagination(r)

// Fetch data with pagination (example)
lessons, total := fetchLessonsWithPagination(params.Offset(), params.Limit)

// Create pagination info
pagination := api.NewPagination(params, total)
links := api.NewLinks(r.URL.Path, params, pagination.TotalPages)

// Send paginated response
api.List(w, lessons, pagination, links)
```

**Response format:**
```json
{
  "data": [{"id": "1", "title": "Lesson 1"}, ...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "links": {
    "self": "/api/lessons?page=1&limit=20",
    "first": "/api/lessons?page=1&limit=20",
    "next": "/api/lessons?page=2&limit=20",
    "last": "/api/lessons?page=3&limit=20"
  },
  "meta": {"requestId": "req_abc123", "timestamp": "..."}
}
```

### Example 6: No Content Response (DELETE)

**Before:**
```go
SendSuccess(w, map[string]interface{}{
    "success": true,
    "message": "Course deleted",
})
```

**After:**
```go
api.NoContent(w)  // Returns 204 with no body
```

### Example 7: Async Operation (202 Accepted)

**Before:**
```go
w.Header().Set("Content-Type", "application/json")
_ = json.NewEncoder(w).Encode(map[string]interface{}{
    "status": "pending",
    "jobId":  jobID,
})
```

**After:**
```go
api.Accepted(w, map[string]interface{}{
    "jobId":     jobID,
    "status":    "pending",
    "statusUrl": "/api/jobs/" + jobID,
})
```

## Migration Checklist

For each handler file:

1. [ ] Add import: `"github.com/mesbahtanvir/ishkul/backend/internal/api"`

2. [ ] Replace success responses:
   - `json.NewEncoder(w).Encode(...)` → `api.Success(w, ...)`
   - Status 201 → `api.Created(w, ...)`
   - Status 204 → `api.NoContent(w)`
   - Status 202 → `api.Accepted(w, ...)`

3. [ ] Replace error responses:
   - `http.Error(w, "Unauthorized", 401)` → `api.Unauthorized(w, "message")`
   - `http.Error(w, "Not found", 404)` → `api.NotFound(w, "Resource")`
   - `http.Error(w, "Bad request", 400)` → `api.BadRequest(w, "CODE", "message")`
   - `http.Error(w, "Internal error", 500)` → `api.InternalError(w, "message")`
   - `sendErrorResponse(...)` → `api.Error(w, status, code, message)`

4. [ ] Add pagination to list endpoints:
   - Parse params: `params := api.ParsePagination(r)`
   - Update queries to use `params.Offset()` and `params.Limit`
   - Use `api.List(w, data, pagination, links)`

5. [ ] Update tests to expect new response format

## Backward Compatibility

### Option A: Gradual Migration (Recommended)

Migrate handlers one at a time. The new format is a superset of the old format - clients can access `.data` for the wrapped content.

### Option B: Versioning

Add API version in URL and support both formats:
- `/api/courses` → legacy format (for backward compatibility)
- `/api/v2/courses` → new envelope format

## Error Code Reference

Standard error codes available in `api` package:

| Code | Status | Usage |
|------|--------|-------|
| `UNAUTHORIZED` | 401 | Missing/invalid auth |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `INVALID_REQUEST` | 400 | Malformed request |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service down |

## Rate Limit Headers

All responses now include rate limit headers:

```
X-RateLimit-Limit: 10        # Requests per second allowed
X-RateLimit-Remaining: 8     # Remaining requests in window
X-RateLimit-Reset: 1640000000 # Unix timestamp when limit resets
X-RateLimit-Tier: standard   # Rate limit tier (standard/auth/expensive)
```

## Testing the New Format

```bash
# Test endpoint with new format
curl -s http://localhost:8080/api/me | jq

# Expected output:
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

# Check rate limit headers
curl -I http://localhost:8080/api/me 2>/dev/null | grep X-RateLimit
```

## Files to Migrate

Priority order:

1. **High traffic endpoints:**
   - `handlers/me.go` - User profile
   - `handlers/context.go` - Learning context
   - `handlers/subscription.go` - Subscription status

2. **CRUD operations:**
   - `handlers/courses_crud.go`
   - `handlers/courses_creation.go`
   - `handlers/courses_lifecycle.go`

3. **Authentication:**
   - `handlers/auth.go` - Login, register, etc.

4. **Other:**
   - `handlers/lessons.go`
   - `handlers/lessons_progress.go`
   - `handlers/health.go`
