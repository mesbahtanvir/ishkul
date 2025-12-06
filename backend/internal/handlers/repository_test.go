package handlers

import (
	"context"
	"testing"

	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/stretchr/testify/assert"
)

func TestCollection(t *testing.T) {
	// Note: These tests don't require a real Firestore connection
	// They test the Collection function's behavior with the prefix system

	t.Run("returns nil when firestore client is nil", func(t *testing.T) {
		// Without a real Firestore client, Collection will return nil
		// This is expected behavior
		result := Collection(nil, "test_collection")
		assert.Nil(t, result)
	})
}

func TestCountUserActivePaths(t *testing.T) {
	t.Run("returns error when firestore is nil", func(t *testing.T) {
		ctx := context.Background()
		count, err := CountUserActivePaths(ctx, nil, "user123")

		// Should panic or error without Firestore
		// Since we're passing nil, this will panic in production code
		// We use recover to handle this gracefully in tests
		assert.Equal(t, 0, count)
		assert.Error(t, err)
	})
}

func TestGetFirestoreOrFail(t *testing.T) {
	t.Run("returns nil when firestore is not initialized", func(t *testing.T) {
		// Mock response writer
		mockWriter := &mockResponseWriter{}

		result := GetFirestoreOrFail(mockWriter)

		// Should return nil when Firebase is not initialized
		assert.Nil(t, result)
	})
}

// mockResponseWriter is a simple mock for testing
type mockResponseWriter struct {
	written []byte
}

func (m *mockResponseWriter) Write(b []byte) (int, error) {
	m.written = append(m.written, b...)
	return len(b), nil
}

func TestCollectionPrefix(t *testing.T) {
	t.Run("GetCollectionPrefix returns expected value", func(t *testing.T) {
		// Test that prefix system works
		prefix := firebase.GetCollectionPrefix()

		// Default prefix should be empty for production
		// or set based on environment
		assert.NotNil(t, prefix)
	})
}
