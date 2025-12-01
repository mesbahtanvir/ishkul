# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files (from backend/ since build context is now project root)
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ ./

# Build the application with verbose output
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -v -a -installsuffix cgo -o server ./cmd/server

# Verify binary was created
RUN ls -lh /app/server

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server /app/server

# Copy prompts directory (from project root since build context is now root)
COPY prompts/ /app/prompts/

# Give executable permissions
RUN chmod +x /app/server

# Create directory for credentials (for local development)
RUN mkdir -p /app/credentials

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Run the server
CMD ["/app/server"]
