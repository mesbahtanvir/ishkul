package utils

import (
	"log"
	"os"
)

// GetEnv retrieves the value of the environment variable named by the key.
// It returns the value, which will be empty if the variable is not present.
func GetEnv(key string) string {
	value, exists := os.LookupEnv(key)
	if !exists {
		log.Printf("Warning: Environment variable %s not set.\n", key)
	}
	return value
}

// GetEnvOrDefault works like GetEnv but returns a default value if the specified env variable is not found.
func GetEnvOrDefault(key, defaultValue string) string {
	value := GetEnv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
