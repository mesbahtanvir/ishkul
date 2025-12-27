# Backend Logging Guide

## Overview

The backend now includes comprehensive structured logging with request tracing. All logs are output in JSON format and automatically sent to Cloud Logging.

## Log Features

### Request Tracing
- Every HTTP request receives a unique `request_id` (UUID)
- Request IDs appear in all logs related to that request
- Enables end-to-end tracing of requests through the system

### User Context
- User IDs are captured from authenticated requests
- Logs can be filtered by `user_id` for user-specific debugging
- User ID is "unknown" for unauthenticated requests

### Structured Output
- All logs are JSON format for easy parsing
- Fields are queryable in Cloud Logging console
- Automatic inclusion of timestamp and severity level

## Log Levels

Set via `LOG_LEVEL` environment variable:
- `DEBUG` - Detailed debugging information
- `INFO` - General informational messages (default)
- `WARN` - Warning messages
- `ERROR` - Error messages

Example:
```bash
gcloud run services update ishkul-backend \
  --set-env-vars=LOG_LEVEL=DEBUG \
  --region=europe-west1
```

## Common Log Messages

### Application Startup
```json
{
  "msg": "application_startup",
  "version": "...",
  "environment": "production"
}
```

### Firebase Initialization
```json
{
  "msg": "firebase_initialized"
}
```

### LLM Initialization
```json
{
  "msg": "llm_initialization_attempt",
  "prompts_dir": "/app/prompts"
}
```

If LLM initialization fails:
```json
{
  "msg": "llm_initialization_failed",
  "error": "OPENAI_API_KEY environment variable not set"
}
```

### HTTP Requests
```json
{
  "msg": "incoming_request",
  "method": "POST",
  "path": "/api/learning-paths",
  "remote_addr": "192.168.1.1",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### HTTP Responses
```json
{
  "msg": "request_completed",
  "status_code": 200,
  "response_bytes": 1024,
  "duration_ms": 150,
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### LLM Not Initialized Error
```json
{
  "msg": "llm_not_initialized",
  "path_id": "...",
  "openai_client_nil": "true",
  "prompt_loader_nil": "true",
  "request_id": "...",
  "user_id": "..."
}
```

## Querying Logs in Cloud Logging

### View all recent logs
```bash
gcloud run services logs read ishkul-backend --region=europe-west1 --limit=50
```

### Filter by request ID
```
resource.type="cloud_run_revision"
AND resource.labels.service_name="ishkul-backend"
AND jsonPayload.request_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Filter by user ID
```
resource.type="cloud_run_revision"
AND resource.labels.service_name="ishkul-backend"
AND jsonPayload.user_id="user123"
```

### Filter by message type
```
resource.type="cloud_run_revision"
AND resource.labels.service_name="ishkul-backend"
AND jsonPayload.msg="llm_not_initialized"
```

### View errors only
```
resource.type="cloud_run_revision"
AND resource.labels.service_name="ishkul-backend"
AND severity="ERROR"
```

## Troubleshooting

### LLM Not Initialized

**Symptom**: Logs show `llm_not_initialized` errors when trying to generate learning steps.

**Solution**: Check that `OPENAI_API_KEY` environment variable is set:

```bash
gcloud run services describe ishkul-backend --region=europe-west1 --format='value(spec.template.spec.containers[0].env)'
```

If missing, set it:
```bash
gcloud run services update ishkul-backend \
  --set-env-vars=OPENAI_API_KEY=sk-... \
  --region=europe-west1
```

### Slow Requests

Check `duration_ms` in request logs:
```
resource.type="cloud_run_revision"
AND resource.labels.service_name="ishkul-backend"
AND jsonPayload.msg="request_completed"
AND jsonPayload.duration_ms > 5000
```

### Request Failures

Search for errors in a specific request:
```
resource.type="cloud_run_revision"
AND resource.labels.service_name="ishkul-backend"
AND jsonPayload.request_id="REQUEST_ID_HERE"
AND severity="ERROR"
```

## Local Development

The logging system gracefully handles the development environment:
- If `appLogger` is nil (e.g., in tests), logging is skipped
- No errors thrown for missing logger
- Unit tests pass without logger initialization

## Architecture

### Logger Package (`pkg/logger/`)
- `New()` - Creates structured logger with JSON output
- `Info()`, `Warn()`, `Error()`, `Debug()` - Log at different levels
- `WithRequestID()`, `WithUserID()` - Add context to logs
- `ErrorWithErr()` - Convenience function for error logging

### Logging Middleware (`internal/middleware/logging.go`)
- Automatically generates request IDs
- Logs incoming requests with method/path
- Logs responses with status code/duration
- Captures metrics automatically

### Handler Logging (`internal/handlers/`)
- Learning paths handler logs requests
- LLM initialization logs each component
- "LLM not initialized" errors logged with diagnostics

## Best Practices

1. **Always pass context**: Use `logger.Info(appLogger, ctx, "message", ...)`
2. **Include relevant fields**: Add context about what operation is happening
3. **Check for nil logger**: In test code, always check `if appLogger != nil`
4. **Use appropriate log levels**: ERROR for failures, WARN for concerns, INFO for state changes
5. **Structured fields**: Use `slog.String()`, `slog.Int()`, etc. for fields

## Example Usage in Code

```go
import (
	"log/slog"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

// In handler
ctx := r.Context()
userId := middleware.GetUserID(ctx)
ctx = logger.WithUserID(ctx, userId)

logger.Info(appLogger, ctx, "processing_request",
	slog.String("operation", "create_learning_path"),
	slog.String("user_id", userId),
)

// If error occurs
if err != nil {
	logger.ErrorWithErr(appLogger, ctx, "failed_to_create_path", err)
}
```

## Further Reading

- [Go slog documentation](https://pkg.go.dev/log/slog)
- [Cloud Logging documentation](https://cloud.google.com/logging/docs)
- [Cloud Logging Query Language](https://cloud.google.com/logging/docs/view/logging-query-language)
