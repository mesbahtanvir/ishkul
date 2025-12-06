package prompts

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"gopkg.in/yaml.v3"
)

func TestModelParameters(t *testing.T) {
	t.Run("has correct YAML tags", func(t *testing.T) {
		yamlContent := `
temperature: 0.7
maxTokens: 1000
topP: 0.9
n: 2
`
		var params ModelParameters
		err := yaml.Unmarshal([]byte(yamlContent), &params)

		assert.NoError(t, err)
		assert.Equal(t, 0.7, params.Temperature)
		assert.Equal(t, 1000, params.MaxTokens)
		assert.Equal(t, 0.9, params.TopP)
		assert.Equal(t, 2, params.N)
	})

	t.Run("handles zero values", func(t *testing.T) {
		var params ModelParameters

		assert.Equal(t, 0.0, params.Temperature)
		assert.Equal(t, 0, params.MaxTokens)
		assert.Equal(t, 0.0, params.TopP)
		assert.Equal(t, 0, params.N)
	})

	t.Run("marshals to YAML correctly", func(t *testing.T) {
		params := ModelParameters{
			Temperature: 0.5,
			MaxTokens:   500,
			TopP:        0.8,
			N:           1,
		}

		data, err := yaml.Marshal(&params)
		assert.NoError(t, err)

		assert.Contains(t, string(data), "temperature: 0.5")
		assert.Contains(t, string(data), "maxTokens: 500")
		assert.Contains(t, string(data), "topP: 0.8")
		assert.Contains(t, string(data), "\"n\": 1")
	})
}

func TestPromptMessage(t *testing.T) {
	t.Run("parses from YAML", func(t *testing.T) {
		yamlContent := `
role: user
content: Hello, world!
`
		var msg PromptMessage
		err := yaml.Unmarshal([]byte(yamlContent), &msg)

		assert.NoError(t, err)
		assert.Equal(t, "user", msg.Role)
		assert.Equal(t, "Hello, world!", msg.Content)
	})

	t.Run("handles multiline content", func(t *testing.T) {
		yamlContent := `
role: system
content: |
  You are a helpful assistant.
  You help users learn new topics.
`
		var msg PromptMessage
		err := yaml.Unmarshal([]byte(yamlContent), &msg)

		assert.NoError(t, err)
		assert.Equal(t, "system", msg.Role)
		assert.Contains(t, msg.Content, "You are a helpful assistant.")
		assert.Contains(t, msg.Content, "You help users learn new topics.")
	})

	t.Run("supports different roles", func(t *testing.T) {
		roles := []string{"system", "user", "assistant"}

		for _, role := range roles {
			msg := PromptMessage{Role: role, Content: "Test"}
			assert.Equal(t, role, msg.Role)
		}
	})
}

func TestPromptTemplate(t *testing.T) {
	t.Run("parses complete template from YAML", func(t *testing.T) {
		yamlContent := `
name: test-template
description: A test template
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
		var template PromptTemplate
		err := yaml.Unmarshal([]byte(yamlContent), &template)

		assert.NoError(t, err)
		assert.Equal(t, "test-template", template.Name)
		assert.Equal(t, "A test template", template.Description)
		assert.Equal(t, "gpt-4o-mini", template.Model)
		assert.Equal(t, 0.7, template.ModelParameters.Temperature)
		assert.Equal(t, 1000, template.ModelParameters.MaxTokens)
		assert.Len(t, template.Messages, 2)
	})

	t.Run("handles minimal template", func(t *testing.T) {
		yamlContent := `
name: minimal
model: gpt-4o
messages:
  - role: user
    content: Hi
`
		var template PromptTemplate
		err := yaml.Unmarshal([]byte(yamlContent), &template)

		assert.NoError(t, err)
		assert.Equal(t, "minimal", template.Name)
		assert.Equal(t, "", template.Description)
		assert.Equal(t, "gpt-4o", template.Model)
		assert.Len(t, template.Messages, 1)
	})

	t.Run("handles empty messages", func(t *testing.T) {
		yamlContent := `
name: empty
model: gpt-4o
messages: []
`
		var template PromptTemplate
		err := yaml.Unmarshal([]byte(yamlContent), &template)

		assert.NoError(t, err)
		assert.Empty(t, template.Messages)
	})
}

func TestVariables(t *testing.T) {
	t.Run("is a map of strings", func(t *testing.T) {
		vars := Variables{
			"key1": "value1",
			"key2": "value2",
		}

		assert.Equal(t, "value1", vars["key1"])
		assert.Equal(t, "value2", vars["key2"])
	})

	t.Run("handles empty variables", func(t *testing.T) {
		vars := Variables{}

		assert.Empty(t, vars)
		assert.Equal(t, "", vars["missing"])
	})

	t.Run("can be modified", func(t *testing.T) {
		vars := Variables{}
		vars["new"] = "value"

		assert.Equal(t, "value", vars["new"])
	})

	t.Run("supports special characters in values", func(t *testing.T) {
		vars := Variables{
			"code":    "func() { return x; }",
			"newline": "line1\nline2",
			"unicode": "日本語",
		}

		assert.Equal(t, "func() { return x; }", vars["code"])
		assert.Contains(t, vars["newline"], "\n")
		assert.Equal(t, "日本語", vars["unicode"])
	})
}
