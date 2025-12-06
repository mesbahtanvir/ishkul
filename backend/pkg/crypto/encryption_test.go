package crypto

import (
	"encoding/base64"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// Test Setup Helpers
// =============================================================================

// resetEncryptionState resets the encryption module state for testing
func resetEncryptionState() {
	encryptionKey = nil
	encryptionKeyOnce = sync.Once{}
	encryptionEnabled = false
}

// generateValidKey generates a valid 32-byte base64-encoded key for testing
func generateValidKey() string {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i)
	}
	return base64.StdEncoding.EncodeToString(key)
}

// =============================================================================
// GenerateEncryptionKey Tests
// =============================================================================

func TestGenerateEncryptionKey(t *testing.T) {
	t.Run("generates valid base64 key", func(t *testing.T) {
		key, err := GenerateEncryptionKey()

		require.NoError(t, err)
		assert.NotEmpty(t, key)

		// Decode to verify it's valid base64
		decoded, err := base64.StdEncoding.DecodeString(key)
		require.NoError(t, err)
		assert.Len(t, decoded, 32, "key should be 32 bytes (256 bits)")
	})

	t.Run("generates unique keys", func(t *testing.T) {
		key1, err1 := GenerateEncryptionKey()
		key2, err2 := GenerateEncryptionKey()

		require.NoError(t, err1)
		require.NoError(t, err2)
		assert.NotEqual(t, key1, key2, "keys should be unique")
	})
}

// =============================================================================
// InitEncryption Tests
// =============================================================================

func TestInitEncryption(t *testing.T) {
	t.Run("disables encryption when key not set in development", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Unsetenv("ENCRYPTION_KEY")
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()

		assert.NoError(t, err)
		assert.False(t, IsEnabled(), "encryption should be disabled without key")
	})

	t.Run("returns error when key not set in production", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Unsetenv("ENCRYPTION_KEY")
		os.Setenv("ENVIRONMENT", "production")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()

		assert.Error(t, err)
		assert.Equal(t, ErrEncryptionKeyNotSet, err)
	})

	t.Run("enables encryption with valid key", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()

		assert.NoError(t, err)
		assert.True(t, IsEnabled(), "encryption should be enabled with valid key")
	})

	t.Run("returns error for invalid base64 key", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		os.Setenv("ENCRYPTION_KEY", "not-valid-base64!!!")
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "base64")
	})

	t.Run("returns error for invalid key length", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		// Create a 16-byte key (too short for AES-256)
		shortKey := base64.StdEncoding.EncodeToString([]byte("shortkey12345678"))
		os.Setenv("ENCRYPTION_KEY", shortKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()

		assert.Error(t, err)
		assert.Equal(t, ErrInvalidKeyLength, err)
	})
}

// =============================================================================
// IsEnabled Tests
// =============================================================================

func TestIsEnabled(t *testing.T) {
	t.Run("returns false when not initialized", func(t *testing.T) {
		resetEncryptionState()
		defer resetEncryptionState()

		assert.False(t, IsEnabled())
	})
}

// =============================================================================
// Encrypt Tests
// =============================================================================

func TestEncrypt(t *testing.T) {
	t.Run("returns plaintext when encryption disabled", func(t *testing.T) {
		resetEncryptionState()
		defer resetEncryptionState()

		plaintext := "test data"
		result, err := Encrypt(plaintext)

		assert.NoError(t, err)
		assert.Equal(t, plaintext, result, "should return plaintext when disabled")
	})

	t.Run("encrypts data with enc: prefix when enabled", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		plaintext := "sensitive data"
		result, err := Encrypt(plaintext)

		assert.NoError(t, err)
		assert.True(t, strings.HasPrefix(result, "enc:"), "encrypted data should have enc: prefix")
		assert.NotEqual(t, plaintext, result)
	})

	t.Run("produces different ciphertext for same plaintext", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		plaintext := "test data"
		result1, err1 := Encrypt(plaintext)
		result2, err2 := Encrypt(plaintext)

		require.NoError(t, err1)
		require.NoError(t, err2)
		assert.NotEqual(t, result1, result2, "same plaintext should produce different ciphertext due to random nonce")
	})

	t.Run("handles empty string", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		result, err := Encrypt("")

		assert.NoError(t, err)
		assert.True(t, strings.HasPrefix(result, "enc:"))
	})

	t.Run("handles special characters", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		plaintext := "test!@#$%^&*()_+-=[]{}|;':\",./<>?`~"
		result, err := Encrypt(plaintext)

		assert.NoError(t, err)
		assert.True(t, strings.HasPrefix(result, "enc:"))
	})

	t.Run("handles unicode characters", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		plaintext := "日本語テスト 🎉 émojis"
		result, err := Encrypt(plaintext)

		assert.NoError(t, err)
		assert.True(t, strings.HasPrefix(result, "enc:"))
	})
}

// =============================================================================
// Decrypt Tests
// =============================================================================

func TestDecrypt(t *testing.T) {
	t.Run("returns plaintext without enc: prefix as-is", func(t *testing.T) {
		resetEncryptionState()
		defer resetEncryptionState()

		plaintext := "not encrypted"
		result, err := Decrypt(plaintext)

		assert.NoError(t, err)
		assert.Equal(t, plaintext, result)
	})

	t.Run("returns short strings as-is", func(t *testing.T) {
		resetEncryptionState()
		defer resetEncryptionState()

		shortText := "abc"
		result, err := Decrypt(shortText)

		assert.NoError(t, err)
		assert.Equal(t, shortText, result)
	})

	t.Run("returns error for encrypted data when encryption disabled", func(t *testing.T) {
		resetEncryptionState()
		defer resetEncryptionState()

		_, err := Decrypt("enc:somedata")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "encrypted data found but encryption is disabled")
	})

	t.Run("decrypts valid ciphertext", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		plaintext := "secret message"
		encrypted, err := Encrypt(plaintext)
		require.NoError(t, err)

		decrypted, err := Decrypt(encrypted)

		assert.NoError(t, err)
		assert.Equal(t, plaintext, decrypted)
	})

	t.Run("returns error for invalid base64", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		_, err = Decrypt("enc:not-valid-base64!!!")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "base64")
	})

	t.Run("returns error for invalid ciphertext (too short)", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		// Very short base64 data that's too short to contain nonce
		_, err = Decrypt("enc:" + base64.StdEncoding.EncodeToString([]byte("short")))

		assert.Error(t, err)
		assert.Equal(t, ErrInvalidCiphertext, err)
	})

	t.Run("returns error for tampered ciphertext", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		plaintext := "secret message"
		encrypted, err := Encrypt(plaintext)
		require.NoError(t, err)

		// Tamper with the ciphertext
		tampered := encrypted[:len(encrypted)-5] + "XXXXX"
		_, err = Decrypt(tampered)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "decryption failed")
	})

	t.Run("handles unicode in encrypted data", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		plaintext := "日本語テスト 🎉 émojis"
		encrypted, err := Encrypt(plaintext)
		require.NoError(t, err)

		decrypted, err := Decrypt(encrypted)

		assert.NoError(t, err)
		assert.Equal(t, plaintext, decrypted)
	})
}

// =============================================================================
// EncryptEmail / DecryptEmail Tests
// =============================================================================

func TestEncryptDecryptEmail(t *testing.T) {
	t.Run("encrypts and decrypts email", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		email := "user@example.com"
		encrypted, err := EncryptEmail(email)
		require.NoError(t, err)

		decrypted, err := DecryptEmail(encrypted)
		assert.NoError(t, err)
		assert.Equal(t, email, decrypted)
	})

	t.Run("returns plaintext email when encryption disabled", func(t *testing.T) {
		resetEncryptionState()
		defer resetEncryptionState()

		email := "user@example.com"
		result, err := EncryptEmail(email)

		assert.NoError(t, err)
		assert.Equal(t, email, result)
	})
}

// =============================================================================
// EncryptPII / DecryptPII Tests
// =============================================================================

func TestEncryptDecryptPII(t *testing.T) {
	t.Run("encrypts and decrypts PII", func(t *testing.T) {
		resetEncryptionState()
		originalKey := os.Getenv("ENCRYPTION_KEY")
		originalEnv := os.Getenv("ENVIRONMENT")
		validKey := generateValidKey()
		os.Setenv("ENCRYPTION_KEY", validKey)
		os.Setenv("ENVIRONMENT", "development")
		defer func() {
			if originalKey != "" {
				os.Setenv("ENCRYPTION_KEY", originalKey)
			} else {
				os.Unsetenv("ENCRYPTION_KEY")
			}
			os.Setenv("ENVIRONMENT", originalEnv)
			resetEncryptionState()
		}()

		err := InitEncryption()
		require.NoError(t, err)

		pii := "123-45-6789"
		encrypted, err := EncryptPII(pii)
		require.NoError(t, err)

		decrypted, err := DecryptPII(encrypted)
		assert.NoError(t, err)
		assert.Equal(t, pii, decrypted)
	})

	t.Run("returns plaintext PII when encryption disabled", func(t *testing.T) {
		resetEncryptionState()
		defer resetEncryptionState()

		pii := "sensitive-data"
		result, err := EncryptPII(pii)

		assert.NoError(t, err)
		assert.Equal(t, pii, result)
	})
}

// =============================================================================
// Error Constants Tests
// =============================================================================

func TestErrorConstants(t *testing.T) {
	t.Run("error constants are defined", func(t *testing.T) {
		assert.NotNil(t, ErrInvalidCiphertext)
		assert.NotNil(t, ErrEncryptionKeyNotSet)
		assert.NotNil(t, ErrInvalidKeyLength)

		assert.Equal(t, "invalid ciphertext", ErrInvalidCiphertext.Error())
		assert.Equal(t, "encryption key not configured", ErrEncryptionKeyNotSet.Error())
		assert.Equal(t, "encryption key must be 32 bytes (256 bits)", ErrInvalidKeyLength.Error())
	})
}
