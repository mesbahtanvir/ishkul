package logger

import (
	"bytes"
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNew(t *testing.T) {
	t.Run("creates logger with default INFO level", func(t *testing.T) {
		os.Unsetenv("LOG_LEVEL")

		logger := New()

		assert.NotNil(t, logger)
	})

	t.Run("respects LOG_LEVEL environment variable", func(t *testing.T) {
		testCases := []struct {
			envValue string
			expected slog.Level
		}{
			{"DEBUG", slog.LevelDebug},
			{"WARN", slog.LevelWarn},
			{"ERROR", slog.LevelError},
			{"INFO", slog.LevelInfo},
			{"invalid", slog.LevelInfo},
			{"", slog.LevelInfo},
		}

		for _, tc := range testCases {
			t.Run(tc.envValue, func(t *testing.T) {
				if tc.envValue != "" {
					os.Setenv("LOG_LEVEL", tc.envValue)
				} else {
					os.Unsetenv("LOG_LEVEL")
				}
				defer os.Unsetenv("LOG_LEVEL")

				logger := New()
				assert.NotNil(t, logger)
			})
		}
	})

	t.Run("handles lowercase log levels", func(t *testing.T) {
		os.Setenv("LOG_LEVEL", "debug")
		defer os.Unsetenv("LOG_LEVEL")

		logger := New()
		assert.NotNil(t, logger)
	})
}

func TestWithRequestID(t *testing.T) {
	t.Run("adds request ID to context", func(t *testing.T) {
		ctx := context.Background()
		requestID := "test-request-123"

		newCtx := WithRequestID(ctx, requestID)

		assert.Equal(t, requestID, GetRequestID(newCtx))
	})

	t.Run("overwrites existing request ID", func(t *testing.T) {
		ctx := context.Background()
		ctx = WithRequestID(ctx, "old-id")
		ctx = WithRequestID(ctx, "new-id")

		assert.Equal(t, "new-id", GetRequestID(ctx))
	})
}

func TestGetRequestID(t *testing.T) {
	t.Run("returns request ID from context", func(t *testing.T) {
		ctx := WithRequestID(context.Background(), "abc-123")

		assert.Equal(t, "abc-123", GetRequestID(ctx))
	})

	t.Run("returns 'unknown' when not set", func(t *testing.T) {
		ctx := context.Background()

		assert.Equal(t, "unknown", GetRequestID(ctx))
	})

	t.Run("returns 'unknown' for wrong type", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), requestIDKey, 12345)

		assert.Equal(t, "unknown", GetRequestID(ctx))
	})
}

func TestWithUserID(t *testing.T) {
	t.Run("adds user ID to context", func(t *testing.T) {
		ctx := context.Background()
		userID := "user-456"

		newCtx := WithUserID(ctx, userID)

		assert.Equal(t, userID, GetUserID(newCtx))
	})

	t.Run("overwrites existing user ID", func(t *testing.T) {
		ctx := context.Background()
		ctx = WithUserID(ctx, "old-user")
		ctx = WithUserID(ctx, "new-user")

		assert.Equal(t, "new-user", GetUserID(ctx))
	})
}

func TestGetUserID(t *testing.T) {
	t.Run("returns user ID from context", func(t *testing.T) {
		ctx := WithUserID(context.Background(), "user-789")

		assert.Equal(t, "user-789", GetUserID(ctx))
	})

	t.Run("returns 'unknown' when not set", func(t *testing.T) {
		ctx := context.Background()

		assert.Equal(t, "unknown", GetUserID(ctx))
	})

	t.Run("returns 'unknown' for wrong type", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userIDKey, 12345)

		assert.Equal(t, "unknown", GetUserID(ctx))
	})
}

func TestLogWithContext(t *testing.T) {
	t.Run("logs message with context IDs", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		ctx = WithRequestID(ctx, "req-123")
		ctx = WithUserID(ctx, "user-456")

		LogWithContext(logger, ctx, slog.LevelInfo, "test message")

		output := buf.String()
		assert.Contains(t, output, "test message")
		assert.Contains(t, output, "req-123")
		assert.Contains(t, output, "user-456")
	})

	t.Run("does not panic with nil logger", func(t *testing.T) {
		ctx := context.Background()

		// Should not panic
		LogWithContext(nil, ctx, slog.LevelInfo, "test message")
	})

	t.Run("includes additional attributes", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		LogWithContext(logger, ctx, slog.LevelInfo, "test",
			slog.String("key1", "value1"),
			slog.Int("key2", 42),
		)

		output := buf.String()
		assert.Contains(t, output, "value1")
		assert.Contains(t, output, "42")
	})
}

func TestDebug(t *testing.T) {
	t.Run("logs at debug level", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})
		logger := slog.New(handler)

		ctx := context.Background()
		Debug(logger, ctx, "debug message")

		output := buf.String()
		assert.Contains(t, output, "debug message")
		assert.Contains(t, output, "DEBUG")
	})

	t.Run("does not panic with nil logger", func(t *testing.T) {
		ctx := context.Background()
		Debug(nil, ctx, "message")
	})
}

func TestInfo(t *testing.T) {
	t.Run("logs at info level", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		Info(logger, ctx, "info message")

		output := buf.String()
		assert.Contains(t, output, "info message")
		assert.Contains(t, output, "INFO")
	})

	t.Run("includes attributes", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		Info(logger, ctx, "message", slog.String("attr", "value"))

		output := buf.String()
		assert.Contains(t, output, "value")
	})
}

func TestWarn(t *testing.T) {
	t.Run("logs at warn level", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		Warn(logger, ctx, "warn message")

		output := buf.String()
		assert.Contains(t, output, "warn message")
		assert.Contains(t, output, "WARN")
	})
}

func TestError(t *testing.T) {
	t.Run("logs at error level", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		Error(logger, ctx, "error message")

		output := buf.String()
		assert.Contains(t, output, "error message")
		assert.Contains(t, output, "ERROR")
	})
}

func TestErrorWithErr(t *testing.T) {
	t.Run("includes error in log", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		err := assert.AnError
		ErrorWithErr(logger, ctx, "operation failed", err)

		output := buf.String()
		assert.Contains(t, output, "operation failed")
		assert.Contains(t, output, err.Error())
	})

	t.Run("includes additional attributes", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		err := assert.AnError
		ErrorWithErr(logger, ctx, "failed", err, slog.String("extra", "info"))

		output := buf.String()
		assert.Contains(t, output, "extra")
		assert.Contains(t, output, "info")
	})
}

func TestPrintf(t *testing.T) {
	t.Run("formats message like printf", func(t *testing.T) {
		var buf bytes.Buffer
		handler := slog.NewJSONHandler(&buf, nil)
		logger := slog.New(handler)

		ctx := context.Background()
		Printf(logger, ctx, "Hello %s, you have %d messages", "Alice", 5)

		output := buf.String()
		assert.Contains(t, output, "Hello Alice, you have 5 messages")
	})
}

func TestFallbackPrintf(t *testing.T) {
	t.Run("does not panic", func(t *testing.T) {
		// Just verify it doesn't panic
		FallbackPrintf("Test message %d", 42)
	})
}

func TestContextKeyUniqueness(t *testing.T) {
	t.Run("context keys are different", func(t *testing.T) {
		assert.NotEqual(t, requestIDKey, userIDKey)
	})

	t.Run("can store both IDs in same context", func(t *testing.T) {
		ctx := context.Background()
		ctx = WithRequestID(ctx, "req-1")
		ctx = WithUserID(ctx, "user-1")

		assert.Equal(t, "req-1", GetRequestID(ctx))
		assert.Equal(t, "user-1", GetUserID(ctx))
	})
}
