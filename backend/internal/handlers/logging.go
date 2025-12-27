package handlers

import (
	"context"
	"log/slog"

	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

// Logging convenience wrappers that use the global appLogger.
// These eliminate the need for "if appLogger != nil" checks since
// the logger package already handles nil gracefully in LogWithContext.

// logDebug logs a debug message with the global appLogger
func logDebug(ctx context.Context, msg string, attrs ...slog.Attr) {
	logger.Debug(appLogger, ctx, msg, attrs...)
}

// logInfo logs an info message with the global appLogger
func logInfo(ctx context.Context, msg string, attrs ...slog.Attr) {
	logger.Info(appLogger, ctx, msg, attrs...)
}

// logWarn logs a warning message with the global appLogger
func logWarn(ctx context.Context, msg string, attrs ...slog.Attr) {
	logger.Warn(appLogger, ctx, msg, attrs...)
}

// logError logs an error message with the global appLogger
func logError(ctx context.Context, msg string, attrs ...slog.Attr) {
	logger.Error(appLogger, ctx, msg, attrs...)
}

// logErrorWithErr logs an error message with an error value
func logErrorWithErr(ctx context.Context, msg string, err error, attrs ...slog.Attr) {
	logger.ErrorWithErr(appLogger, ctx, msg, err, attrs...)
}
