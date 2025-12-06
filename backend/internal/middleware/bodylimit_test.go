package middleware

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// BodyLimit Middleware Tests
// =============================================================================

func TestBodyLimit(t *testing.T) {
	t.Run("allows request within limit", func(t *testing.T) {
		handlerCalled := false
		handler := BodyLimit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			body, err := io.ReadAll(r.Body)
			require.NoError(t, err)
			assert.Equal(t, "small body", string(body))
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader("small body"))
		req.ContentLength = int64(len("small body"))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("skips requests without body", func(t *testing.T) {
		handlerCalled := false
		handler := BodyLimit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("skips requests with zero content length", func(t *testing.T) {
		handlerCalled := false
		handler := BodyLimit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader(""))
		req.ContentLength = 0
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// =============================================================================
// BodyLimitWithSize Middleware Tests
// =============================================================================

func TestBodyLimitWithSize(t *testing.T) {
	t.Run("allows request within custom limit", func(t *testing.T) {
		handlerCalled := false
		// 100 byte limit
		handler := BodyLimitWithSize(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			body, err := io.ReadAll(r.Body)
			require.NoError(t, err)
			assert.Equal(t, "test body", string(body))
			w.WriteHeader(http.StatusOK)
		}), 100)

		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader("test body"))
		req.ContentLength = int64(len("test body"))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("blocks request exceeding custom limit", func(t *testing.T) {
		// 10 byte limit
		handler := BodyLimitWithSize(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Try to read the body - this should fail
			_, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "request too large", http.StatusRequestEntityTooLarge)
				return
			}
			w.WriteHeader(http.StatusOK)
		}), 10)

		// Body larger than 10 bytes
		largeBody := strings.Repeat("a", 100)
		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader(largeBody))
		req.ContentLength = int64(len(largeBody))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		// Handler should receive an error when trying to read past the limit
		assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
	})

	t.Run("handles exactly at limit", func(t *testing.T) {
		bodyContent := "exactly10!"
		handler := BodyLimitWithSize(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			body, err := io.ReadAll(r.Body)
			require.NoError(t, err)
			assert.Equal(t, bodyContent, string(body))
			w.WriteHeader(http.StatusOK)
		}), int64(len(bodyContent)))

		req := httptest.NewRequest(http.MethodPost, "/test", strings.NewReader(bodyContent))
		req.ContentLength = int64(len(bodyContent))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("handles nil body", func(t *testing.T) {
		handlerCalled := false
		handler := BodyLimitWithSize(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}), 100)

		req := httptest.NewRequest(http.MethodPost, "/test", nil)
		req.Body = nil
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("wraps body with MaxBytesReader", func(t *testing.T) {
		// Verify the body is wrapped by checking we can't read more than limit
		handler := BodyLimitWithSize(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Read in chunks
			buf := make([]byte, 50)
			totalRead := 0
			for {
				n, err := r.Body.Read(buf)
				totalRead += n
				if err != nil {
					break
				}
			}
			// Should only be able to read up to the limit
			assert.LessOrEqual(t, totalRead, 20)
			w.WriteHeader(http.StatusOK)
		}), 20)

		largeBody := bytes.Repeat([]byte("x"), 100)
		req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader(largeBody))
		req.ContentLength = int64(len(largeBody))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)
	})
}

// =============================================================================
// MaxBodySize Constant Test
// =============================================================================

func TestMaxBodySize(t *testing.T) {
	t.Run("MaxBodySize is 10MB", func(t *testing.T) {
		expected := 10 * 1024 * 1024
		assert.Equal(t, expected, MaxBodySize)
	})
}

// =============================================================================
// Integration Tests
// =============================================================================

func TestBodyLimit_Integration(t *testing.T) {
	t.Run("works with POST JSON body", func(t *testing.T) {
		handler := BodyLimit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			body, err := io.ReadAll(r.Body)
			require.NoError(t, err)
			assert.Contains(t, string(body), "name")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status": "ok"}`))
		}))

		jsonBody := `{"name": "test", "value": 123}`
		req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.ContentLength = int64(len(jsonBody))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	})

	t.Run("works with PUT request", func(t *testing.T) {
		handlerCalled := false
		handler := BodyLimit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusNoContent)
		}))

		req := httptest.NewRequest(http.MethodPut, "/api/resource/1", strings.NewReader("update data"))
		req.ContentLength = int64(len("update data"))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusNoContent, w.Code)
	})

	t.Run("works with PATCH request", func(t *testing.T) {
		handlerCalled := false
		handler := BodyLimit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodPatch, "/api/resource/1", strings.NewReader(`{"field": "value"}`))
		req.ContentLength = int64(len(`{"field": "value"}`))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}
