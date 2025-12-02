package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

// LoggingMiddleware adds structured logging with request tracing to HTTP handlers
func LoggingMiddleware(appLogger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Generate unique request ID
			requestID := uuid.New().String()

			// Add request ID to context
			ctx := logger.WithRequestID(r.Context(), requestID)
			r = r.WithContext(ctx)

			// Log request details
			logger.Info(appLogger, ctx, "incoming_request",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("remote_addr", r.RemoteAddr),
			)

			// Create a response writer wrapper to capture status code and response size
			wrapped := &responseWriter{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			// Record start time
			start := time.Now()

			// Call next handler
			next.ServeHTTP(wrapped, r)

			// Calculate duration
			duration := time.Since(start)

			// Log response details
			logger.Info(appLogger, ctx, "request_completed",
				slog.Int("status_code", wrapped.statusCode),
				slog.Int64("response_bytes", wrapped.bytesWritten),
				slog.Duration("duration_ms", duration),
			)
		})
	}
}

// responseWriter wraps http.ResponseWriter to capture status code and bytes written
type responseWriter struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int64
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytesWritten += int64(n)
	return n, err
}
