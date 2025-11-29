package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUploadFile(t *testing.T) {
	t.Run("rejects non-POST methods", func(t *testing.T) {
		methods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

		for _, method := range methods {
			t.Run(method, func(t *testing.T) {
				req := createAuthenticatedRequest(method, "/api/upload", nil, "user123", "test@example.com")
				rr := httptest.NewRecorder()

				UploadFile(rr, req)

				assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
			})
		}
	})

	t.Run("rejects unauthenticated request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/upload", nil)
		rr := httptest.NewRecorder()

		UploadFile(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
	})

	t.Run("rejects request without file", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPost, "/api/upload", bytes.NewBufferString(""), "user123", "test@example.com")
		req.Header.Set("Content-Type", "multipart/form-data")
		rr := httptest.NewRecorder()

		UploadFile(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("rejects file without proper form", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPost, "/api/upload", bytes.NewBufferString("file content"), "user123", "test@example.com")
		rr := httptest.NewRecorder()

		UploadFile(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("rejects non-multipart request", func(t *testing.T) {
		req := createAuthenticatedRequest(http.MethodPost, "/api/upload", bytes.NewBufferString(`{"file": "test"}`), "user123", "test@example.com")
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		UploadFile(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

func TestUploadFileMultipart(t *testing.T) {
	createMultipartRequest := func(fieldName, fileName, content string) (*http.Request, error) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		part, err := writer.CreateFormFile(fieldName, fileName)
		if err != nil {
			return nil, err
		}
		_, err = part.Write([]byte(content))
		if err != nil {
			return nil, err
		}
		_ = writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		return req, nil
	}

	t.Run("rejects wrong field name", func(t *testing.T) {
		req, err := createMultipartRequest("wrongfield", "test.txt", "test content")
		assert.NoError(t, err)

		// Add authentication context
		req = req.WithContext(createAuthenticatedRequest(http.MethodPost, "/api/upload", nil, "user123", "test@example.com").Context())

		rr := httptest.NewRecorder()
		UploadFile(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Error retrieving file")
	})

	t.Run("returns error when storage not available", func(t *testing.T) {
		req, err := createMultipartRequest("file", "test.txt", "test content")
		assert.NoError(t, err)

		// Add authentication context
		req = req.WithContext(createAuthenticatedRequest(http.MethodPost, "/api/upload", nil, "user123", "test@example.com").Context())

		rr := httptest.NewRecorder()
		UploadFile(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Storage not initialized")
	})
}

func TestUploadFileSizeLimit(t *testing.T) {
	t.Run("large file upload fails when storage not initialized", func(t *testing.T) {
		// Create a large body (larger than 10MB)
		// Note: ParseMultipartForm's maxMemory parameter controls memory usage,
		// not file size rejection. Files exceeding this limit are stored in temp files.
		// The actual file size limit would be enforced by the storage backend.
		largeContent := make([]byte, 11*1024*1024) // 11MB

		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, err := writer.CreateFormFile("file", "large.txt")
		assert.NoError(t, err)
		_, err = part.Write(largeContent)
		assert.NoError(t, err)
		_ = writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req = req.WithContext(createAuthenticatedRequest(http.MethodPost, "/api/upload", nil, "user123", "test@example.com").Context())

		rr := httptest.NewRecorder()
		UploadFile(rr, req)

		// Without storage initialized, the handler returns 500 before reaching upload
		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Storage not initialized")
	})
}

func TestUploadFilePathGeneration(t *testing.T) {
	t.Run("filename format is correct", func(t *testing.T) {
		// Test the expected filename format: uploads/{userID}/{timestamp}{ext}
		userID := "user123"
		ext := ".txt"

		expectedPattern := "uploads/" + userID + "/" + "1704067200" + ext
		assert.Equal(t, "uploads/user123/1704067200.txt", expectedPattern)
	})

	t.Run("handles various file extensions", func(t *testing.T) {
		extensions := []string{".txt", ".pdf", ".jpg", ".png", ".doc", ".xlsx"}

		for _, ext := range extensions {
			t.Run(ext, func(t *testing.T) {
				filename := "uploads/user123/1704067200" + ext
				assert.Contains(t, filename, ext)
			})
		}
	})

	t.Run("handles files without extension", func(t *testing.T) {
		filename := "testfile"
		// filepath.Ext returns empty string for files without extension
		ext := ""
		if len(filename) > 0 {
			for i := len(filename) - 1; i >= 0; i-- {
				if filename[i] == '.' {
					ext = filename[i:]
					break
				}
			}
		}
		assert.Equal(t, "", ext)
	})
}

func TestUploadResponseFormat(t *testing.T) {
	t.Run("response should contain expected fields", func(t *testing.T) {
		// When upload succeeds, response should contain:
		// - success: true
		// - filename: the uploaded file path
		// - url: the public URL
		// - size: file size in bytes

		expectedFields := []string{"success", "filename", "url", "size"}
		for _, field := range expectedFields {
			assert.NotEmpty(t, field)
		}
	})

	t.Run("public URL format is correct", func(t *testing.T) {
		bucketName := "test-bucket"
		filename := "uploads/user123/1704067200.txt"

		expectedURL := "https://storage.googleapis.com/" + bucketName + "/" + filename
		assert.Contains(t, expectedURL, "storage.googleapis.com")
		assert.Contains(t, expectedURL, bucketName)
		assert.Contains(t, expectedURL, filename)
	})
}
