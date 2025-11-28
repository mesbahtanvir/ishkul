package firebase

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetAuth(t *testing.T) {
	t.Run("returns nil when not initialized", func(t *testing.T) {
		// Reset state
		authClient = nil
		result := GetAuth()
		assert.Nil(t, result)
	})
}

func TestGetStorage(t *testing.T) {
	t.Run("returns nil when not initialized", func(t *testing.T) {
		// Reset state
		storageClient = nil
		result := GetStorage()
		assert.Nil(t, result)
	})
}

func TestGetFirestore(t *testing.T) {
	t.Run("returns nil when not initialized", func(t *testing.T) {
		// Reset state
		firestoreClient = nil
		result := GetFirestore()
		assert.Nil(t, result)
	})
}

func TestCloseFirestore(t *testing.T) {
	t.Run("returns nil when client is nil", func(t *testing.T) {
		firestoreClient = nil
		err := CloseFirestore()
		assert.NoError(t, err)
	})
}

func TestEnvironmentVariables(t *testing.T) {
	t.Run("FIREBASE_DATABASE_URL is optional", func(t *testing.T) {
		os.Unsetenv("FIREBASE_DATABASE_URL")
		result := os.Getenv("FIREBASE_DATABASE_URL")
		assert.Empty(t, result)
	})

	t.Run("FIREBASE_STORAGE_BUCKET is optional", func(t *testing.T) {
		os.Unsetenv("FIREBASE_STORAGE_BUCKET")
		result := os.Getenv("FIREBASE_STORAGE_BUCKET")
		assert.Empty(t, result)
	})

	t.Run("GOOGLE_APPLICATION_CREDENTIALS is optional", func(t *testing.T) {
		os.Unsetenv("GOOGLE_APPLICATION_CREDENTIALS")
		result := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
		assert.Empty(t, result)
	})

	t.Run("reads FIREBASE_DATABASE_URL when set", func(t *testing.T) {
		os.Setenv("FIREBASE_DATABASE_URL", "https://test-project.firebaseio.com")
		defer os.Unsetenv("FIREBASE_DATABASE_URL")

		result := os.Getenv("FIREBASE_DATABASE_URL")
		assert.Equal(t, "https://test-project.firebaseio.com", result)
	})

	t.Run("reads FIREBASE_STORAGE_BUCKET when set", func(t *testing.T) {
		os.Setenv("FIREBASE_STORAGE_BUCKET", "test-project.appspot.com")
		defer os.Unsetenv("FIREBASE_STORAGE_BUCKET")

		result := os.Getenv("FIREBASE_STORAGE_BUCKET")
		assert.Equal(t, "test-project.appspot.com", result)
	})

	t.Run("reads GOOGLE_APPLICATION_CREDENTIALS when set", func(t *testing.T) {
		os.Setenv("GOOGLE_APPLICATION_CREDENTIALS", "/path/to/credentials.json")
		defer os.Unsetenv("GOOGLE_APPLICATION_CREDENTIALS")

		result := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
		assert.Equal(t, "/path/to/credentials.json", result)
	})
}

func TestFirebaseConfiguration(t *testing.T) {
	t.Run("app is nil before initialization", func(t *testing.T) {
		app = nil
		assert.Nil(t, app)
	})

	t.Run("authClient is nil before initialization", func(t *testing.T) {
		authClient = nil
		assert.Nil(t, authClient)
	})

	t.Run("storageClient is nil before initialization", func(t *testing.T) {
		storageClient = nil
		assert.Nil(t, storageClient)
	})

	t.Run("firestoreClient is nil before initialization", func(t *testing.T) {
		firestoreClient = nil
		assert.Nil(t, firestoreClient)
	})
}

func TestCleanup(t *testing.T) {
	t.Run("Cleanup handles nil clients gracefully", func(t *testing.T) {
		// Reset all clients
		app = nil
		authClient = nil
		storageClient = nil
		firestoreClient = nil

		// Should not panic
		assert.NotPanics(t, func() {
			Cleanup()
		})
	})
}
