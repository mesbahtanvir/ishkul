package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

// UploadFile handles file uploads to Firebase Storage
func UploadFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get storage client
	storageClient := firebase.GetStorage()
	if storageClient == nil {
		http.Error(w, "Storage not initialized", http.StatusInternalServerError)
		return
	}

	bucket, err := storageClient.DefaultBucket()
	if err != nil {
		http.Error(w, "Error accessing storage bucket", http.StatusInternalServerError)
		return
	}

	// Create unique filename
	timestamp := time.Now().Unix()
	ext := filepath.Ext(handler.Filename)
	filename := fmt.Sprintf("uploads/%s/%d%s", userID, timestamp, ext)

	// Create object writer
	obj := bucket.Object(filename)
	wc := obj.NewWriter(ctx)
	wc.ContentType = handler.Header.Get("Content-Type")

	// Copy file to storage
	if _, err := io.Copy(wc, file); err != nil {
		http.Error(w, "Error uploading file", http.StatusInternalServerError)
		return
	}

	if err := wc.Close(); err != nil {
		http.Error(w, "Error finalizing upload", http.StatusInternalServerError)
		return
	}

	// Generate public URL (or signed URL for private files)
	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s",
		bucket.BucketName(), filename)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"filename": filename,
		"url":      publicURL,
		"size":     handler.Size,
	}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
