package prompts

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewLoader(t *testing.T) {
	t.Run("uses default prompts directory when empty", func(t *testing.T) {
		loader := NewLoader("")
		assert.NotNil(t, loader)
		assert.Equal(t, "prompts", loader.promptsDir)
	})

	t.Run("uses provided directory", func(t *testing.T) {
		loader := NewLoader("/custom/path")
		assert.NotNil(t, loader)
		assert.Equal(t, "/custom/path", loader.promptsDir)
	})

	t.Run("preserves relative paths", func(t *testing.T) {
		loader := NewLoader("./my-prompts")
		assert.Equal(t, "./my-prompts", loader.promptsDir)
	})
}

func TestLoaderLoad(t *testing.T) {
	// Create temp directory for test prompts
	tempDir, err := os.MkdirTemp("", "prompts-test-*")
	require.NoError(t, err)
	defer func() {
		err := os.RemoveAll(tempDir)
		if err != nil {
			t.Logf("Warning: failed to remove temp dir: %v", err)
		}
	}()

	t.Run("loads valid YAML prompt file", func(t *testing.T) {
		promptContent := `name: test-prompt
description: A test prompt
model: gpt-4o-mini
modelParameters:
  temperature: 0.7
  maxTokens: 1000
messages:
  - role: system
    content: You are a helpful assistant.
  - role: user
    content: Hello!
`
		promptPath := filepath.Join(tempDir, "test.prompt.yml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		template, err := loader.Load("test")

		require.NoError(t, err)
		assert.NotNil(t, template)
		assert.Equal(t, "test-prompt", template.Name)
		assert.Equal(t, "A test prompt", template.Description)
		assert.Equal(t, "gpt-4o-mini", template.Model)
		assert.Equal(t, 0.7, template.ModelParameters.Temperature)
		assert.Equal(t, 1000, template.ModelParameters.MaxTokens)
		assert.Len(t, template.Messages, 2)
		assert.Equal(t, "system", template.Messages[0].Role)
		assert.Equal(t, "user", template.Messages[1].Role)
	})

	t.Run("automatically adds .prompt.yml extension", func(t *testing.T) {
		promptContent := `name: auto-ext
description: Test auto extension
model: gpt-4o
messages:
  - role: user
    content: Test
`
		promptPath := filepath.Join(tempDir, "auto-ext.prompt.yml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		template, err := loader.Load("auto-ext")

		require.NoError(t, err)
		assert.Equal(t, "auto-ext", template.Name)
	})

	t.Run("loads file with full extension", func(t *testing.T) {
		promptContent := `name: full-ext
description: Full extension test
model: gpt-4o
messages:
  - role: user
    content: Test
`
		promptPath := filepath.Join(tempDir, "full-ext.prompt.yml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		template, err := loader.Load("full-ext.prompt.yml")

		require.NoError(t, err)
		assert.Equal(t, "full-ext", template.Name)
	})

	t.Run("returns error for non-existent file", func(t *testing.T) {
		loader := NewLoader(tempDir)
		template, err := loader.Load("nonexistent")

		assert.Error(t, err)
		assert.Nil(t, template)
		assert.Contains(t, err.Error(), "failed to read prompt file")
	})

	t.Run("returns error for invalid YAML", func(t *testing.T) {
		invalidYAML := `name: invalid
this is not: valid: yaml:
  - broken
`
		promptPath := filepath.Join(tempDir, "invalid.prompt.yml")
		err := os.WriteFile(promptPath, []byte(invalidYAML), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		template, err := loader.Load("invalid")

		assert.Error(t, err)
		assert.Nil(t, template)
		assert.Contains(t, err.Error(), "failed to parse prompt YAML")
	})

	t.Run("handles subdirectories", func(t *testing.T) {
		subDir := filepath.Join(tempDir, "learning")
		err := os.MkdirAll(subDir, 0755)
		require.NoError(t, err)

		promptContent := `name: learning-prompt
description: Learning prompt
model: gpt-4o
messages:
  - role: user
    content: Learn something
`
		promptPath := filepath.Join(subDir, "lesson.prompt.yml")
		err = os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		template, err := loader.Load("learning/lesson")

		require.NoError(t, err)
		assert.Equal(t, "learning-prompt", template.Name)
	})
}

func TestLoaderLoadByName(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "prompts-test-*")
	require.NoError(t, err)
	defer func() {
		err := os.RemoveAll(tempDir)
		if err != nil {
			t.Logf("Warning: failed to remove temp dir: %v", err)
		}
	}()

	t.Run("delegates to Load", func(t *testing.T) {
		promptContent := `name: byname
description: Test
model: gpt-4o
messages:
  - role: user
    content: Test
`
		promptPath := filepath.Join(tempDir, "byname.prompt.yml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		template, err := loader.LoadByName("byname")

		require.NoError(t, err)
		assert.Equal(t, "byname", template.Name)
	})
}

func TestLoaderList(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "prompts-test-*")
	require.NoError(t, err)
	defer func() {
		err := os.RemoveAll(tempDir)
		if err != nil {
			t.Logf("Warning: failed to remove temp dir: %v", err)
		}
	}()

	t.Run("lists prompt files in directory", func(t *testing.T) {
		// Create some prompt files
		for _, name := range []string{"first.prompt.yml", "second.prompt.yml", "third.yml"} {
			path := filepath.Join(tempDir, name)
			err := os.WriteFile(path, []byte("name: test"), 0644)
			require.NoError(t, err)
		}

		// Create a non-yml file (should be ignored)
		err := os.WriteFile(filepath.Join(tempDir, "readme.md"), []byte("# Readme"), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		prompts, err := loader.List("")

		require.NoError(t, err)
		assert.Len(t, prompts, 3)
		assert.Contains(t, prompts, "first.prompt")
		assert.Contains(t, prompts, "second.prompt")
		assert.Contains(t, prompts, "third")
	})

	t.Run("lists prompts in subdirectory", func(t *testing.T) {
		subDir := filepath.Join(tempDir, "subdir")
		err := os.MkdirAll(subDir, 0755)
		require.NoError(t, err)

		for _, name := range []string{"a.prompt.yml", "b.prompt.yml"} {
			path := filepath.Join(subDir, name)
			err := os.WriteFile(path, []byte("name: test"), 0644)
			require.NoError(t, err)
		}

		loader := NewLoader(tempDir)
		prompts, err := loader.List("subdir")

		require.NoError(t, err)
		assert.Len(t, prompts, 2)
		assert.Contains(t, prompts, "a.prompt")
		assert.Contains(t, prompts, "b.prompt")
	})

	t.Run("returns error for non-existent directory", func(t *testing.T) {
		loader := NewLoader(tempDir)
		prompts, err := loader.List("nonexistent")

		assert.Error(t, err)
		assert.Nil(t, prompts)
		assert.Contains(t, err.Error(), "failed to read directory")
	})

	t.Run("returns empty slice for empty directory", func(t *testing.T) {
		emptyDir := filepath.Join(tempDir, "empty")
		err := os.MkdirAll(emptyDir, 0755)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		prompts, err := loader.List("empty")

		require.NoError(t, err)
		assert.Empty(t, prompts)
	})

	t.Run("ignores directories in list", func(t *testing.T) {
		mixedDir := filepath.Join(tempDir, "mixed")
		err := os.MkdirAll(mixedDir, 0755)
		require.NoError(t, err)

		// Create a file
		err = os.WriteFile(filepath.Join(mixedDir, "file.prompt.yml"), []byte("name: test"), 0644)
		require.NoError(t, err)

		// Create a subdirectory (should be ignored)
		err = os.MkdirAll(filepath.Join(mixedDir, "subdir"), 0755)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		prompts, err := loader.List("mixed")

		require.NoError(t, err)
		assert.Len(t, prompts, 1)
		assert.Contains(t, prompts, "file.prompt")
	})
}

func TestLoaderWithYamlExtension(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "prompts-test-*")
	require.NoError(t, err)
	defer func() {
		err := os.RemoveAll(tempDir)
		if err != nil {
			t.Logf("Warning: failed to remove temp dir: %v", err)
		}
	}()

	t.Run("loads .yaml files", func(t *testing.T) {
		promptContent := `name: yaml-ext
description: Test yaml extension
model: gpt-4o
messages:
  - role: user
    content: Test
`
		promptPath := filepath.Join(tempDir, "test.yaml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		template, err := loader.Load("test.yaml")

		require.NoError(t, err)
		assert.Equal(t, "yaml-ext", template.Name)
	})

	t.Run("lists .yaml files", func(t *testing.T) {
		yamlDir := filepath.Join(tempDir, "yaml-test")
		err := os.MkdirAll(yamlDir, 0755)
		require.NoError(t, err)

		err = os.WriteFile(filepath.Join(yamlDir, "test1.yaml"), []byte("name: t1"), 0644)
		require.NoError(t, err)
		err = os.WriteFile(filepath.Join(yamlDir, "test2.yml"), []byte("name: t2"), 0644)
		require.NoError(t, err)

		loader := NewLoader(tempDir)
		prompts, err := loader.List("yaml-test")

		require.NoError(t, err)
		assert.Len(t, prompts, 2)
	})
}
