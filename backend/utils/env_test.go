package utils

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetEnv(t *testing.T) {
	const envKey = "TEST_ENV_VAR"
	const envValue = "testValue"

	os.Setenv(envKey, envValue)
	defer os.Unsetenv(envKey)

	t.Run("Existing Environment Variable", func(t *testing.T) {
		assert.Equal(t, envValue, GetEnv(envKey), "GetEnv should return the value of an existing environment variable")
	})

	t.Run("Non-Existing Environment Variable", func(t *testing.T) {
		assert.Empty(t, GetEnv("NON_EXISTING_ENV_VAR"), "GetEnv should return an empty string for non-existing environment variables")
	})
}

func TestGetEnvOrDefault(t *testing.T) {
	const envKey = "TEST_ENV_VAR_DEFAULT"
	const envValue = "testDefaultValue"
	const defaultValue = "default"

	os.Setenv(envKey, envValue)
	defer os.Unsetenv(envKey)

	t.Run("Existing Environment Variable", func(t *testing.T) {
		assert.Equal(t, envValue, GetEnvOrDefault(envKey, defaultValue), "GetEnvOrDefault should return the value of an existing environment variable")
	})

	t.Run("Non-Existing Environment Variable", func(t *testing.T) {
		assert.Equal(t, defaultValue, GetEnvOrDefault("NON_EXISTING_ENV_VAR_DEFAULT", defaultValue), "GetEnvOrDefault should return the default value for non-existing environment variables")
	})
}
