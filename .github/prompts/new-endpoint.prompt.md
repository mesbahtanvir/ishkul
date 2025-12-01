---
description: Create a new Go API endpoint for Ishkul backend
---

# Create New API Endpoint

Create a new Go API endpoint following the Ishkul backend patterns.

## Requirements

1. Create handler in `backend/internal/handlers/`
2. Register route in `backend/cmd/server/main.go`
3. Use proper HTTP status codes
4. Include auth middleware for protected routes
5. Handle errors appropriately
6. Add request/response types if needed

## Handler Template

```go
package handlers

import (
    "encoding/json"
    "net/http"
)

type NewHandler struct {
    // Dependencies
}

func NewNewHandler() *NewHandler {
    return &NewHandler{}
}

func (h *NewHandler) HandleRequest(w http.ResponseWriter, r *http.Request) {
    // Validate request method
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // Parse request body
    // Process request
    // Return response

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

## Checklist

- [ ] Handler created in `internal/handlers/`
- [ ] Route registered in `main.go`
- [ ] Auth middleware added if needed
- [ ] Error handling implemented
- [ ] Tests written
