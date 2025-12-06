package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoggingMiddleware(t *testing.T) {
	t.Run("logs request and response", func(t *testing.T) {
		var buf bytes.Buffer
		testLogger := slog.New(slog.NewJSONHandler(&buf, nil))

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, err := w.Write([]byte("Hello, World!"))
			if err != nil {
				t.Fatal(err)
			}
		})

		req := httptest.NewRequest(http.MethodGet, "/test-path", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		rr := httptest.NewRecorder()

		LoggingMiddleware(testLogger)(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "Hello, World!", rr.Body.String())

		logOutput := buf.String()
		assert.Contains(t, logOutput, "incoming_request")
		assert.Contains(t, logOutput, "request_completed")
		assert.Contains(t, logOutput, "/test-path")
		assert.Contains(t, logOutput, "GET")
	})

	t.Run("captures correct status code", func(t *testing.T) {
		var buf bytes.Buffer
		testLogger := slog.New(slog.NewJSONHandler(&buf, nil))

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			_, err := w.Write([]byte("Not Found"))
			if err != nil {
				t.Fatal(err)
			}
		})

		req := httptest.NewRequest(http.MethodGet, "/missing", nil)
		rr := httptest.NewRecorder()

		LoggingMiddleware(testLogger)(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		logOutput := buf.String()
		assert.Contains(t, logOutput, "404")
	})

	t.Run("adds request ID to context", func(t *testing.T) {
		var buf bytes.Buffer
		testLogger := slog.New(slog.NewJSONHandler(&buf, nil))

		var capturedRequestID string
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedRequestID = logger.GetRequestID(r.Context())
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		LoggingMiddleware(testLogger)(handler).ServeHTTP(rr, req)

		assert.NotEmpty(t, capturedRequestID)
		assert.NotEqual(t, "unknown", capturedRequestID)
	})

	t.Run("handles POST request", func(t *testing.T) {
		var buf bytes.Buffer
		testLogger := slog.New(slog.NewJSONHandler(&buf, nil))

		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusCreated)
			_, err := w.Write([]byte(`{"id": "123"}`))
			if err != nil {
				t.Fatal(err)
			}
		})

		req := httptest.NewRequest(http.MethodPost, "/api/resource", nil)
		rr := httptest.NewRecorder()

		LoggingMiddleware(testLogger)(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code)
		logOutput := buf.String()
		assert.Contains(t, logOutput, "POST")
		assert.Contains(t, logOutput, "/api/resource")
	})

	t.Run("tracks response bytes written", func(t *testing.T) {
		var buf bytes.Buffer
		testLogger := slog.New(slog.NewJSONHandler(&buf, nil))

		responseBody := "This is a test response with some content"
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, err := w.Write([]byte(responseBody))
			if err != nil {
				t.Fatal(err)
			}
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		LoggingMiddleware(testLogger)(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, len(responseBody), rr.Body.Len())
	})

	t.Run("works with nil logger", func(t *testing.T) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		// Should not panic with nil logger
		LoggingMiddleware(nil)(handler).ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
}

func TestResponseWriter(t *testing.T) {
	t.Run("captures status code", func(t *testing.T) {
		rr := httptest.NewRecorder()
		wrapped := &responseWriter{
			ResponseWriter: rr,
			statusCode:     http.StatusOK, // Default
		}

		wrapped.WriteHeader(http.StatusNotFound)

		assert.Equal(t, http.StatusNotFound, wrapped.statusCode)
		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	t.Run("tracks bytes written", func(t *testing.T) {
		rr := httptest.NewRecorder()
		wrapped := &responseWriter{
			ResponseWriter: rr,
			statusCode:     http.StatusOK,
		}

		n1, err := wrapped.Write([]byte("Hello"))
		require.NoError(t, err)
		assert.Equal(t, 5, n1)

		n2, err := wrapped.Write([]byte(" World!"))
		require.NoError(t, err)
		assert.Equal(t, 7, n2)

		assert.Equal(t, int64(12), wrapped.bytesWritten)
	})

	t.Run("default status code is 200", func(t *testing.T) {
		rr := httptest.NewRecorder()
		wrapped := &responseWriter{
			ResponseWriter: rr,
			statusCode:     http.StatusOK,
		}

		assert.Equal(t, http.StatusOK, wrapped.statusCode)
	})

	t.Run("multiple writes accumulate bytes", func(t *testing.T) {
		rr := httptest.NewRecorder()
		wrapped := &responseWriter{
			ResponseWriter: rr,
			statusCode:     http.StatusOK,
		}

		for i := 0; i < 10; i++ {
			_, err := wrapped.Write([]byte("a"))
			require.NoError(t, err)
		}

		assert.Equal(t, int64(10), wrapped.bytesWritten)
	})
}

func TestLoggingMiddlewareChaining(t *testing.T) {
	t.Run("can be chained with other middleware", func(t *testing.T) {
		var buf bytes.Buffer
		testLogger := slog.New(slog.NewJSONHandler(&buf, nil))

		handlerCalled := false
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})

		// Create a simple middleware that adds a header
		addHeaderMiddleware := func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("X-Test-Header", "test-value")
				next.ServeHTTP(w, r)
			})
		}

		// Chain: LoggingMiddleware -> addHeaderMiddleware -> handler
		chain := LoggingMiddleware(testLogger)(addHeaderMiddleware(handler))

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rr := httptest.NewRecorder()

		chain.ServeHTTP(rr, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "test-value", rr.Header().Get("X-Test-Header"))
	})
}

func TestLoggingMiddlewareHTTPMethods(t *testing.T) {
	methods := []string{
		http.MethodGet,
		http.MethodPost,
		http.MethodPut,
		http.MethodDelete,
		http.MethodPatch,
		http.MethodHead,
		http.MethodOptions,
	}

	for _, method := range methods {
		t.Run("handles "+method+" method", func(t *testing.T) {
			var buf bytes.Buffer
			testLogger := slog.New(slog.NewJSONHandler(&buf, nil))

			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			req := httptest.NewRequest(method, "/test", nil)
			rr := httptest.NewRecorder()

			LoggingMiddleware(testLogger)(handler).ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)
			logOutput := buf.String()
			assert.Contains(t, logOutput, method)
		})
	}
}
