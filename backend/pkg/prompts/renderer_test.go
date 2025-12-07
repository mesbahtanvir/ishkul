package prompts

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewRenderer(t *testing.T) {
	t.Run("creates new renderer", func(t *testing.T) {
		renderer := NewRenderer()
		assert.NotNil(t, renderer)
	})
}

func TestRendererRender(t *testing.T) {
	renderer := NewRenderer()

	t.Run("renders simple template without variables", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "system", Content: "You are a helpful assistant."},
				{Role: "user", Content: "Hello!"},
			},
		}

		messages, err := renderer.Render(template, Variables{})

		require.NoError(t, err)
		assert.Len(t, messages, 2)
		assert.Equal(t, "system", messages[0].Role)
		assert.Equal(t, "You are a helpful assistant.", messages[0].Content)
		assert.Equal(t, "user", messages[1].Role)
		assert.Equal(t, "Hello!", messages[1].Content)
	})

	t.Run("substitutes variables", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "system", Content: "You are learning {{topic}} at {{level}} level."},
				{Role: "user", Content: "Teach me about {{topic}}."},
			},
		}

		vars := Variables{
			"topic": "mathematics",
			"level": "beginner",
		}

		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Len(t, messages, 2)
		assert.Equal(t, "You are learning mathematics at beginner level.", messages[0].Content)
		assert.Equal(t, "Teach me about mathematics.", messages[1].Content)
	})

	t.Run("returns error for unsubstituted variables", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello {{name}}!"},
			},
		}

		messages, err := renderer.Render(template, Variables{})

		assert.Error(t, err)
		assert.Nil(t, messages)
		assert.Contains(t, err.Error(), "unsubstituted variable: name")
	})

	t.Run("handles multiple same variables", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "{{name}} said hello to {{name}}."},
			},
		}

		vars := Variables{"name": "Alice"}
		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Alice said hello to Alice.", messages[0].Content)
	})

	t.Run("handles empty template", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{},
		}

		messages, err := renderer.Render(template, Variables{})

		require.NoError(t, err)
		assert.Empty(t, messages)
	})
}

func TestRendererConditionalBlocks(t *testing.T) {
	renderer := NewRenderer()

	t.Run("includes content when variable is set", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello{{#if name}}, {{name}}{{/if}}!"},
			},
		}

		vars := Variables{"name": "Alice"}
		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Hello, Alice!", messages[0].Content)
	})

	t.Run("removes content when variable is not set", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello{{#if name}}, {{name}}{{/if}}!"},
			},
		}

		messages, err := renderer.Render(template, Variables{})

		require.NoError(t, err)
		assert.Equal(t, "Hello!", messages[0].Content)
	})

	t.Run("removes content when variable is empty", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello{{#if name}}, {{name}}{{/if}}!"},
			},
		}

		vars := Variables{"name": ""}
		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Hello!", messages[0].Content)
	})

	t.Run("handles multiple conditional blocks", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "{{#if greeting}}Hello{{/if}}{{#if name}} {{name}}{{/if}}!"},
			},
		}

		vars := Variables{"greeting": "yes", "name": "Bob"}
		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Hello Bob!", messages[0].Content)
	})

	t.Run("handles nested conditionals", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "{{#if outer}}Outer{{#if inner}} Inner{{/if}}{{/if}}"},
			},
		}

		vars := Variables{"outer": "yes", "inner": "yes"}
		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Outer Inner", messages[0].Content)
	})

	t.Run("handles nested conditionals with only outer", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "{{#if outer}}Outer{{#if inner}} Inner{{/if}}{{/if}}"},
			},
		}

		vars := Variables{"outer": "yes"}
		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Outer", messages[0].Content)
	})
}

func TestRendererRenderToRequest(t *testing.T) {
	renderer := NewRenderer()

	t.Run("creates complete request from template", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4o-mini",
			ModelParameters: ModelParameters{
				Temperature: 0.7,
				MaxTokens:   1000,
			},
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello!"},
			},
		}

		req, err := renderer.RenderToRequest(template, Variables{})

		require.NoError(t, err)
		assert.NotNil(t, req)
		assert.Equal(t, "gpt-4.1-nano", req.Model) // RenderToRequest uses free tier by default
		assert.Equal(t, 0.7, req.Temperature)
		assert.Equal(t, 1000, req.MaxTokens)
		assert.Len(t, req.Messages, 1)
	})

	t.Run("includes optional parameters when set", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4o",
			ModelParameters: ModelParameters{
				Temperature: 0.5,
				MaxTokens:   500,
				TopP:        0.9,
				N:           2,
			},
			Messages: []PromptMessage{
				{Role: "user", Content: "Test"},
			},
		}

		req, err := renderer.RenderToRequest(template, Variables{})

		require.NoError(t, err)
		assert.Equal(t, 0.9, req.TopP)
		assert.Equal(t, 2, req.N)
	})

	t.Run("excludes optional parameters when zero", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4o",
			ModelParameters: ModelParameters{
				Temperature: 0.5,
				MaxTokens:   500,
				TopP:        0,
				N:           0,
			},
			Messages: []PromptMessage{
				{Role: "user", Content: "Test"},
			},
		}

		req, err := renderer.RenderToRequest(template, Variables{})

		require.NoError(t, err)
		assert.Equal(t, 0.0, req.TopP)
		assert.Equal(t, 0, req.N)
	})

	t.Run("returns error for invalid variables", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4o",
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello {{undefined}}!"},
			},
		}

		req, err := renderer.RenderToRequest(template, Variables{})

		assert.Error(t, err)
		assert.Nil(t, req)
	})
}

func TestRendererRenderToRequestWithTier(t *testing.T) {
	renderer := NewRenderer()

	t.Run("free tier uses default free model", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4o-mini",
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello!"},
			},
		}

		req, err := renderer.RenderToRequestWithTier(template, Variables{}, "free")

		require.NoError(t, err)
		assert.Equal(t, "gpt-4.1-nano", req.Model) // Free tier uses gpt-4.1-nano
	})

	t.Run("pro tier upgrades mini to gpt-4.1", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4o-mini",
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello!"},
			},
		}

		req, err := renderer.RenderToRequestWithTier(template, Variables{}, "pro")

		require.NoError(t, err)
		assert.Equal(t, "gpt-4.1", req.Model) // Pro tier uses gpt-4.1
	})

	t.Run("pro tier keeps non-mini models unchanged", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4o",
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello!"},
			},
		}

		req, err := renderer.RenderToRequestWithTier(template, Variables{}, "pro")

		require.NoError(t, err)
		assert.Equal(t, "gpt-4o", req.Model)
	})

	t.Run("unknown tier uses original model", func(t *testing.T) {
		template := &PromptTemplate{
			Model: "gpt-4o-mini",
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello!"},
			},
		}

		req, err := renderer.RenderToRequestWithTier(template, Variables{}, "unknown")

		require.NoError(t, err)
		assert.Equal(t, "gpt-4o-mini", req.Model)
	})
}

func TestRendererSubstituteVariables(t *testing.T) {
	renderer := NewRenderer()

	t.Run("handles complex variable names", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "Hello {{user_name}} from {{location_city}}!"},
			},
		}

		vars := Variables{
			"user_name":     "Alice",
			"location_city": "New York",
		}

		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Hello Alice from New York!", messages[0].Content)
	})

	t.Run("handles variables with special characters in value", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "Code: {{code}}"},
			},
		}

		vars := Variables{
			"code": "function() { return x + y; }",
		}

		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Code: function() { return x + y; }", messages[0].Content)
	})

	t.Run("handles multiline content", func(t *testing.T) {
		template := &PromptTemplate{
			Messages: []PromptMessage{
				{Role: "user", Content: "Content:\n{{content}}\nEnd"},
			},
		}

		vars := Variables{
			"content": "Line 1\nLine 2\nLine 3",
		}

		messages, err := renderer.Render(template, vars)

		require.NoError(t, err)
		assert.Equal(t, "Content:\nLine 1\nLine 2\nLine 3\nEnd", messages[0].Content)
	})
}
