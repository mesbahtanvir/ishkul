package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"os"
	"sync"
)

var (
	// ErrInvalidCiphertext is returned when the ciphertext is malformed
	ErrInvalidCiphertext = errors.New("invalid ciphertext")
	// ErrEncryptionKeyNotSet is returned when the encryption key is not configured
	ErrEncryptionKeyNotSet = errors.New("encryption key not configured")
	// ErrInvalidKeyLength is returned when the key is not 32 bytes
	ErrInvalidKeyLength = errors.New("encryption key must be 32 bytes (256 bits)")
)

var (
	encryptionKey     []byte
	encryptionKeyOnce sync.Once
	encryptionEnabled bool
)

// InitEncryption initializes the encryption system
// Call this once at startup
func InitEncryption() error {
	var initErr error
	encryptionKeyOnce.Do(func() {
		keyStr := os.Getenv("ENCRYPTION_KEY")
		env := os.Getenv("ENVIRONMENT")
		isProduction := env == "production"

		if keyStr == "" {
			if isProduction {
				initErr = ErrEncryptionKeyNotSet
				return
			}
			// In development, encryption is disabled if key not set
			encryptionEnabled = false
			return
		}

		// Decode base64 key
		key, err := base64.StdEncoding.DecodeString(keyStr)
		if err != nil {
			initErr = errors.New("ENCRYPTION_KEY must be base64 encoded: " + err.Error())
			return
		}

		// AES-256 requires a 32-byte key
		if len(key) != 32 {
			initErr = ErrInvalidKeyLength
			return
		}

		encryptionKey = key
		encryptionEnabled = true
	})
	return initErr
}

// IsEnabled returns true if encryption is enabled
func IsEnabled() bool {
	return encryptionEnabled
}

// Encrypt encrypts plaintext using AES-256-GCM
// Returns base64-encoded ciphertext or the original plaintext if encryption is disabled
func Encrypt(plaintext string) (string, error) {
	if !encryptionEnabled {
		// Return plaintext if encryption is disabled (development mode)
		return plaintext, nil
	}

	if len(encryptionKey) == 0 {
		return "", ErrEncryptionKeyNotSet
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Create a nonce with the required size
	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Encrypt and append nonce to the beginning
	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)

	// Return base64-encoded ciphertext with a prefix to identify encrypted data
	return "enc:" + base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts base64-encoded ciphertext using AES-256-GCM
// If the string doesn't have the "enc:" prefix, it's returned as-is (plaintext)
func Decrypt(ciphertext string) (string, error) {
	// Check for encryption prefix
	if len(ciphertext) < 4 || ciphertext[:4] != "enc:" {
		// Not encrypted, return as-is
		return ciphertext, nil
	}

	if !encryptionEnabled {
		// Encryption is disabled but we have encrypted data
		// This shouldn't happen in normal operation
		return "", errors.New("encrypted data found but encryption is disabled")
	}

	if len(encryptionKey) == 0 {
		return "", ErrEncryptionKeyNotSet
	}

	// Remove the "enc:" prefix and decode base64
	data, err := base64.StdEncoding.DecodeString(ciphertext[4:])
	if err != nil {
		return "", errors.New("invalid base64 encoding: " + err.Error())
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(data) < nonceSize {
		return "", ErrInvalidCiphertext
	}

	// Extract nonce and ciphertext
	nonce, cipherData := data[:nonceSize], data[nonceSize:]

	// Decrypt
	plaintext, err := aesGCM.Open(nil, nonce, cipherData, nil)
	if err != nil {
		return "", errors.New("decryption failed: " + err.Error())
	}

	return string(plaintext), nil
}

// EncryptEmail encrypts an email address
func EncryptEmail(email string) (string, error) {
	return Encrypt(email)
}

// DecryptEmail decrypts an email address
func DecryptEmail(encryptedEmail string) (string, error) {
	return Decrypt(encryptedEmail)
}

// EncryptPII encrypts personally identifiable information
func EncryptPII(pii string) (string, error) {
	return Encrypt(pii)
}

// DecryptPII decrypts personally identifiable information
func DecryptPII(encryptedPII string) (string, error) {
	return Decrypt(encryptedPII)
}

// GenerateEncryptionKey generates a new random 256-bit encryption key
// Returns the key as a base64-encoded string
func GenerateEncryptionKey() (string, error) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(key), nil
}
