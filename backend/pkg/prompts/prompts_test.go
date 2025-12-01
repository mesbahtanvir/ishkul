package prompts

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// Loader Tests
// =============================================================================

func TestNewLoader(t *testing.T) {
	t.Run("uses default prompts dir when empty", func(t *testing.T) {
		loader := NewLoader("")
		assert.Equal(t, "prompts", loader.promptsDir)
	})

	t.Run("uses provided prompts dir", func(t *testing.T) {
		loader := NewLoader("/custom/path")
		assert.Equal(t, "/custom/path", loader.promptsDir)
	})
}

func TestLoaderLoad(t *testing.T) {
	// Create a temporary directory for test prompts
	tempDir := t.TempDir()
	loader := NewLoader(tempDir)

	t.Run("loads valid prompt file", func(t *testing.T) {
		promptContent := `
name: test-prompt
description: A test prompt
model: gpt-4
modelParameters:
  temperature: 0.7
  maxTokens: 1000
messages:
  - role: system
    content: You are a helpful assistant.
  - role: user
    content: Hello, {{name}}!
`
		promptPath := filepath.Join(tempDir, "test.prompt.yml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		template, err := loader.Load("test")
		require.NoError(t, err)

		assert.Equal(t, "test-prompt", template.Name)
		assert.Equal(t, "A test prompt", template.Description)
		assert.Equal(t, "gpt-4", template.Model)
		assert.Equal(t, 0.7, template.ModelParameters.Temperature)
		assert.Equal(t, 1000, template.ModelParameters.MaxTokens)
		assert.Len(t, template.Messages, 2)
		assert.Equal(t, "system", template.Messages[0].Role)
		assert.Equal(t, "user", template.Messages[1].Role)
	})

	t.Run("adds .prompt.yml extension automatically", func(t *testing.T) {
		promptContent := `
name: auto-ext
model: gpt-4
messages:
  - role: user
    content: Test
`
		promptPath := filepath.Join(tempDir, "auto.prompt.yml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		template, err := loader.Load("auto")
		require.NoError(t, err)
		assert.Equal(t, "auto-ext", template.Name)
	})

	t.Run("handles .yml extension in path", func(t *testing.T) {
		promptContent := `
name: with-ext
model: gpt-4
messages:
  - role: user
    content: Test
`
		promptPath := filepath.Join(tempDir, "with-ext.yml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		template, err := loader.Load("with-ext.yml")
		require.NoError(t, err)
		assert.Equal(t, "with-ext", template.Name)
	})

	t.Run("returns error for non-existent file", func(t *testing.T) {
		_, err := loader.Load("non-existent")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to read prompt file")
	})

	t.Run("returns error for invalid YAML", func(t *testing.T) {
		invalidPath := filepath.Join(tempDir, "invalid.prompt.yml")
		err := os.WriteFile(invalidPath, []byte("invalid: yaml: content:"), 0644)
		require.NoError(t, err)

		_, err = loader.Load("invalid")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse prompt YAML")
	})

	t.Run("loads prompt in subdirectory", func(t *testing.T) {
		subDir := filepath.Join(tempDir, "learning")
		err := os.MkdirAll(subDir, 0755)
		require.NoError(t, err)

		promptContent := `
name: learning-prompt
model: gpt-4
messages:
  - role: user
    content: Learn
`
		promptPath := filepath.Join(subDir, "next-step.prompt.yml")
		err = os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		template, err := loader.Load("learning/next-step")
		require.NoError(t, err)
		assert.Equal(t, "learning-prompt", template.Name)
	})
}

func TestLoaderLoadByName(t *testing.T) {
	tempDir := t.TempDir()
	loader := NewLoader(tempDir)

	t.Run("loads by name (delegates to Load)", func(t *testing.T) {
		promptContent := `
name: by-name
model: gpt-4
messages:
  - role: user
    content: Test
`
		promptPath := filepath.Join(tempDir, "by-name.prompt.yml")
		err := os.WriteFile(promptPath, []byte(promptContent), 0644)
		require.NoError(t, err)

		template, err := loader.LoadByName("by-name")
		require.NoError(t, err)
		assert.Equal(t, "by-name", template.Name)
	})
}

func TestLoaderList(t *testing.T) {
	tempDir := t.TempDir()
	loader := NewLoader(tempDir)

	t.Run("lists prompts in directory", func(t *testing.T) {
		subDir := filepath.Join(tempDir, "learning")
		err := os.MkdirAll(subDir, 0755)
		require.NoError(t, err)

		// Create multiple prompt files
		files := []string{"next-step.prompt.yml", "quiz.prompt.yml", "lesson.yaml"}
		for _, f := range files {
			err = os.WriteFile(filepath.Join(subDir, f), []byte("name: test"), 0644)
			require.NoError(t, err)
		}

		// Create a non-yaml file (should be ignored)
		err = os.WriteFile(filepath.Join(subDir, "readme.txt"), []byte("readme"), 0644)
		require.NoError(t, err)

		prompts, err := loader.List("learning")
		require.NoError(t, err)

		assert.Len(t, prompts, 3)
		assert.Contains(t, prompts, "next-step.prompt")
		assert.Contains(t, prompts, "quiz.prompt")
		assert.Contains(t, prompts, "lesson")
	})

	t.Run("returns empty slice for empty directory", func(t *testing.T) {
		emptyDir := filepath.Join(tempDir, "empty")
		err := os.MkdirAll(emptyDir, 0755)
		require.NoError(t, err)

		prompts, err := loader.List("empty")
		require.NoError(t, err)
		assert.Empty(t, prompts)
	})

	t.Run("returns error for non-existent directory", func(t *testing.T) {
		_, err := loader.List("non-existent")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to read directory")
	})

	t.Run("ignores subdirectories", func(t *testing.T) {
		testDir := filepath.Join(tempDir, "with-subdir")
		err := os.MkdirAll(testDir, 0755)
		require.NoError(t, err)

		// Create a prompt file
		err = os.WriteFile(filepath.Join(testDir, "prompt.yml"), []byte("name: test"), 0644)
		require.NoError(t, err)

		// Create a subdirectory
		err = os.MkdirAll(filepath.Join(testDir, "subdir"), 0755)
		require.NoError(t, err)

		prompts, err := loader.List("with-subdir")
		require.NoError(t, err)

		assert.Len(t, prompts, 1)
		assert.Contains(t, prompts, "prompt")
	})
}

// =============================================================================
// Renderer Tests
// =============================================================================

func TestNewRenderer(t *testing.T) {
	t.Run("creates new renderer", func(t *testing.T) {
		renderer := NewRenderer()
		assert.NotNil(t, renderer)
	})
}

func TestRendererRender(t *testing.T) {
	renderer := NewRenderer()

	t.Run("renders template with variables", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "system", Content: "You are a {{role}} assistant."},
				{Role: "user", Content: "Hello, my name is {{name}}."},
			},
		}
		vars := Variables{
			"role": "helpful",
			"name": "Alice",
		}

		messages, err := renderer.Render(template, vars)
		require.NoError(t, err)

		assert.Len(t, messages, 2)
		assert.Equal(t, "system", messages[0].Role)
		assert.Equal(t, "You are a helpful assistant.", messages[0].Content)
		assert.Equal(t, "user", messages[1].Role)
		assert.Equal(t, "Hello, my name is Alice.", messages[1].Content)
	})

	t.Run("renders template without variables", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "No variables here."},
			},
		}
		vars := Variables{}

		messages, err := renderer.Render(template, vars)
		require.NoError(t, err)

		assert.Len(t, messages, 1)
		assert.Equal(t, "No variables here.", messages[0].Content)
	})

	t.Run("replaces multiple occurrences of same variable", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "{{name}} said hello to {{name}}."},
			},
		}
		vars := Variables{"name": "Bob"}

		messages, err := renderer.Render(template, vars)
		require.NoError(t, err)

		assert.Equal(t, "Bob said hello to Bob.", messages[0].Content)
	})

	t.Run("returns error for unsubstituted variable", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello, {{name}}! Your goal is {{goal}}."},
			},
		}
		vars := Variables{"name": "Alice"} // Missing "goal"

		_, err := renderer.Render(template, vars)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsubstituted variable: goal")
	})

	t.Run("handles empty messages", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{},
		}
		vars := Variables{}

		messages, err := renderer.Render(template, vars)
		require.NoError(t, err)
		assert.Empty(t, messages)
	})

	t.Run("preserves message roles", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "system", Content: "System message"},
				{Role: "user", Content: "User message"},
				{Role: "assistant", Content: "Assistant message"},
			},
		}
		vars := Variables{}

		messages, err := renderer.Render(template, vars)
		require.NoError(t, err)

		assert.Equal(t, "system", messages[0].Role)
		assert.Equal(t, "user", messages[1].Role)
		assert.Equal(t, "assistant", messages[2].Role)
	})
}

func TestRendererRenderToRequest(t *testing.T) {
	renderer := NewRenderer()

	t.Run("creates complete request", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4",
			ModelParameters: ModelParameters{
				Temperature: 0.7,
				MaxTokens:   1000,
				TopP:        0.9,
				N:           1,
			},
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello, {{name}}!"},
			},
		}
		vars := Variables{"name": "World"}

		req, err := renderer.RenderToRequest(template, vars)
		require.NoError(t, err)

		assert.Equal(t, "gpt-4", req.Model)
		assert.Equal(t, 0.7, req.Temperature)
		assert.Equal(t, 1000, req.MaxTokens)
		assert.Equal(t, 0.9, req.TopP)
		assert.Equal(t, 1, req.N)
		assert.Len(t, req.Messages, 1)
		assert.Equal(t, "Hello, World!", req.Messages[0].Content)
	})

	t.Run("skips optional parameters when zero", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4",
			ModelParameters: ModelParameters{
				Temperature: 0.5,
				MaxTokens:   500,
				TopP:        0, // Should not be set
				N:           0, // Should not be set
			},
			Messages: []PromptMessage{
				{Role: "user", Content: "Test"},
			},
		}
		vars := Variables{}

		req, err := renderer.RenderToRequest(template, vars)
		require.NoError(t, err)

		assert.Equal(t, 0.5, req.Temperature)
		assert.Equal(t, 500, req.MaxTokens)
		assert.Equal(t, float64(0), req.TopP)
		assert.Equal(t, 0, req.N)
	})

	t.Run("returns error when rendering fails", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4",
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello, {{missing}}!"},
			},
		}
		vars := Variables{}

		_, err := renderer.RenderToRequest(template, vars)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsubstituted variable")
	})
}

func TestSubstituteVariables(t *testing.T) {
	renderer := NewRenderer()

	t.Run("substitutes simple variable", func(t *testing.T) {
		result, err := renderer.substituteVariables("Hello, {{name}}!", Variables{"name": "Alice"})
		require.NoError(t, err)
		assert.Equal(t, "Hello, Alice!", result)
	})

	t.Run("substitutes multiple variables", func(t *testing.T) {
		result, err := renderer.substituteVariables(
			"{{greeting}}, {{name}}! Welcome to {{place}}.",
			Variables{
				"greeting": "Hello",
				"name":     "Bob",
				"place":    "Go",
			},
		)
		require.NoError(t, err)
		assert.Equal(t, "Hello, Bob! Welcome to Go.", result)
	})

	t.Run("handles empty content", func(t *testing.T) {
		result, err := renderer.substituteVariables("", Variables{})
		require.NoError(t, err)
		assert.Equal(t, "", result)
	})

	t.Run("handles content with no variables", func(t *testing.T) {
		result, err := renderer.substituteVariables("No variables here", Variables{"unused": "value"})
		require.NoError(t, err)
		assert.Equal(t, "No variables here", result)
	})

	t.Run("handles variable with empty value", func(t *testing.T) {
		result, err := renderer.substituteVariables("Value: {{empty}}", Variables{"empty": ""})
		require.NoError(t, err)
		assert.Equal(t, "Value: ", result)
	})

	t.Run("handles special characters in variable value", func(t *testing.T) {
		result, err := renderer.substituteVariables("Code: {{code}}", Variables{"code": "func() { return 42 }"})
		require.NoError(t, err)
		assert.Equal(t, "Code: func() { return 42 }", result)
	})

	t.Run("handles multiline variable value", func(t *testing.T) {
		result, err := renderer.substituteVariables("Content: {{content}}", Variables{"content": "Line 1\nLine 2\nLine 3"})
		require.NoError(t, err)
		assert.Equal(t, "Content: Line 1\nLine 2\nLine 3", result)
	})

	t.Run("detects unsubstituted variable", func(t *testing.T) {
		_, err := renderer.substituteVariables("Hello, {{name}}!", Variables{})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsubstituted variable: name")
	})

	t.Run("detects first unsubstituted variable when multiple missing", func(t *testing.T) {
		_, err := renderer.substituteVariables("{{first}} and {{second}}", Variables{})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsubstituted variable: first")
	})
}

// =============================================================================
// Types Tests
// =============================================================================

func TestPromptTemplate(t *testing.T) {
	t.Run("creates template with all fields", func(t *testing.T) {
		template := PromptTemplate{
			Name:        "test-template",
			Description: "A test template",
			Model:       "gpt-4",
			ModelParameters: ModelParameters{
				Temperature: 0.7,
				MaxTokens:   1000,
				TopP:        0.9,
				N:           1,
			},
			Messages: []PromptMessage{
				{Role: "system", Content: "You are helpful."},
				{Role: "user", Content: "Hello"},
			},
		}

		assert.Equal(t, "test-template", template.Name)
		assert.Equal(t, "A test template", template.Description)
		assert.Equal(t, "gpt-4", template.Model)
		assert.Equal(t, 0.7, template.ModelParameters.Temperature)
		assert.Equal(t, 1000, template.ModelParameters.MaxTokens)
		assert.Len(t, template.Messages, 2)
	})
}

func TestModelParameters(t *testing.T) {
	t.Run("creates parameters with all fields", func(t *testing.T) {
		params := ModelParameters{
			Temperature: 0.8,
			MaxTokens:   2000,
			TopP:        0.95,
			N:           2,
		}

		assert.Equal(t, 0.8, params.Temperature)
		assert.Equal(t, 2000, params.MaxTokens)
		assert.Equal(t, 0.95, params.TopP)
		assert.Equal(t, 2, params.N)
	})

	t.Run("default values are zero", func(t *testing.T) {
		params := ModelParameters{}

		assert.Equal(t, float64(0), params.Temperature)
		assert.Equal(t, 0, params.MaxTokens)
		assert.Equal(t, float64(0), params.TopP)
		assert.Equal(t, 0, params.N)
	})
}

func TestPromptMessage(t *testing.T) {
	t.Run("creates message with role and content", func(t *testing.T) {
		msg := PromptMessage{
			Role:    "system",
			Content: "You are a helpful assistant.",
		}

		assert.Equal(t, "system", msg.Role)
		assert.Equal(t, "You are a helpful assistant.", msg.Content)
	})
}

func TestVariables(t *testing.T) {
	t.Run("creates variables map", func(t *testing.T) {
		vars := Variables{
			"name":  "Alice",
			"goal":  "Learn Go",
			"level": "beginner",
		}

		assert.Equal(t, "Alice", vars["name"])
		assert.Equal(t, "Learn Go", vars["goal"])
		assert.Equal(t, "beginner", vars["level"])
	})

	t.Run("allows empty values", func(t *testing.T) {
		vars := Variables{
			"empty": "",
		}

		assert.Equal(t, "", vars["empty"])
	})

	t.Run("returns zero value for missing key", func(t *testing.T) {
		vars := Variables{}

		assert.Equal(t, "", vars["missing"])
	})
}
