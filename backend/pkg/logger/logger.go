package logger

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"os"
	"strings"
)

// contextKey is a type for context keys to avoid collisions
type contextKey string

const (
	requestIDKey contextKey = "request_id"
	userIDKey    contextKey = "user_id"
)

// New creates a structured logger with JSON output
func New() *slog.Logger {
	opts := &slog.HandlerOptions{
		Level: getLogLevel(),
	}

	handler := slog.NewJSONHandler(os.Stdout, opts)
	return slog.New(handler)
}

// getLogLevel returns the log level from environment or defaults to INFO
func getLogLevel() slog.Level {
	level := os.Getenv("LOG_LEVEL")
	switch strings.ToUpper(level) {
	case "DEBUG":
		return slog.LevelDebug
	case "WARN":
		return slog.LevelWarn
	case "ERROR":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// WithRequestID adds a request ID to the context
func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

// GetRequestID extracts the request ID from context
func GetRequestID(ctx context.Context) string {
	id, ok := ctx.Value(requestIDKey).(string)
	if !ok {
		return "unknown"
	}
	return id
}

// WithUserID adds a user ID to the context
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// GetUserID extracts the user ID from context
func GetUserID(ctx context.Context) string {
	id, ok := ctx.Value(userIDKey).(string)
	if !ok {
		return "unknown"
	}
	return id
}

// LogWithContext logs a message with request and user IDs from context
func LogWithContext(logger *slog.Logger, ctx context.Context, level slog.Level, msg string, attrs ...slog.Attr) {
	// Add context IDs to attributes
	allAttrs := append(attrs,
		slog.String(string(requestIDKey), GetRequestID(ctx)),
		slog.String(string(userIDKey), GetUserID(ctx)),
	)

	// Convert to any slice for Log method
	anyAttrs := make([]any, len(allAttrs))
	for i, attr := range allAttrs {
		anyAttrs[i] = attr
	}
	logger.Log(ctx, level, msg, anyAttrs...)
}

// Helper functions for common log levels
func Debug(logger *slog.Logger, ctx context.Context, msg string, attrs ...slog.Attr) {
	LogWithContext(logger, ctx, slog.LevelDebug, msg, attrs...)
}

func Info(logger *slog.Logger, ctx context.Context, msg string, attrs ...slog.Attr) {
	LogWithContext(logger, ctx, slog.LevelInfo, msg, attrs...)
}

func Warn(logger *slog.Logger, ctx context.Context, msg string, attrs ...slog.Attr) {
	LogWithContext(logger, ctx, slog.LevelWarn, msg, attrs...)
}

func Error(logger *slog.Logger, ctx context.Context, msg string, attrs ...slog.Attr) {
	LogWithContext(logger, ctx, slog.LevelError, msg, attrs...)
}

// ErrorWithErr is a convenience function for logging errors with an error value
func ErrorWithErr(logger *slog.Logger, ctx context.Context, msg string, err error, attrs ...slog.Attr) {
	attrs = append(attrs, slog.String("error", err.Error()))
	Error(logger, ctx, msg, attrs...)
}

// Legacy compatibility - use log.Printf style with context
func Printf(logger *slog.Logger, ctx context.Context, format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	Info(logger, ctx, msg)
}

// Fallback to standard library logging when logger is not available
func FallbackPrintf(format string, args ...interface{}) {
	log.Printf(format, args...)
}
