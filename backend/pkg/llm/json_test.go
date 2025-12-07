package llm

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStripMarkdownCodeBlocks(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "plain JSON - no code blocks",
			input:    `{"key": "value"}`,
			expected: `{"key": "value"}`,
		},
		{
			name:     "JSON with json code fence",
			input:    "```json\n{\"key\": \"value\"}\n```",
			expected: `{"key": "value"}`,
		},
		{
			name:     "JSON with plain code fence",
			input:    "```\n{\"key\": \"value\"}\n```",
			expected: `{"key": "value"}`,
		},
		{
			name:     "JSON with JSON (uppercase) code fence",
			input:    "```JSON\n{\"key\": \"value\"}\n```",
			expected: `{"key": "value"}`,
		},
		{
			name:  "multiline JSON with code fence",
			input: "```json\n{\n    \"name\": \"test\",\n    \"value\": 123\n}\n```",
			expected: `{
    "name": "test",
    "value": 123
}`,
		},
		{
			name:     "JSON with whitespace around code fence",
			input:    "  ```json\n{\"key\": \"value\"}\n```  ",
			expected: `{"key": "value"}`,
		},
		{
			name:     "JSON with no newline after opening fence",
			input:    "```json{\"key\": \"value\"}```",
			expected: `{"key": "value"}`,
		},
		{
			name:     "empty JSON object",
			input:    "```json\n{}\n```",
			expected: `{}`,
		},
		{
			name:     "JSON array with code fence",
			input:    "```json\n[1, 2, 3]\n```",
			expected: `[1, 2, 3]`,
		},
		{
			name:  "complex nested JSON from DeepSeek",
			input: "```json\n{\n    \"updatedContext\": {\n        \"professional\": {\n            \"role\": \"software engineer\"\n        }\n    },\n    \"confidence\": 0.9\n}\n```",
			expected: `{
    "updatedContext": {
        "professional": {
            "role": "software engineer"
        }
    },
    "confidence": 0.9
}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := StripMarkdownCodeBlocks(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParseJSONResponse(t *testing.T) {
	type TestStruct struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	tests := []struct {
		name        string
		input       string
		expected    TestStruct
		expectError bool
	}{
		{
			name:     "plain JSON",
			input:    `{"name": "test", "value": 42}`,
			expected: TestStruct{Name: "test", Value: 42},
		},
		{
			name:     "JSON with code fence",
			input:    "```json\n{\"name\": \"test\", \"value\": 42}\n```",
			expected: TestStruct{Name: "test", Value: 42},
		},
		{
			name:        "invalid JSON",
			input:       `{"name": "test", "value":}`,
			expectError: true,
		},
		{
			name:        "invalid JSON with code fence",
			input:       "```json\n{\"name\": \"test\", \"value\":}\n```",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var result TestStruct
			err := ParseJSONResponse(tt.input, &result)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestParseJSONResponse_ContextUpdate(t *testing.T) {
	// Real-world example from DeepSeek response that was causing issues
	input := "```json\n{\n    \"updatedContext\": {\n        \"professional\": {\n            \"role\": \"software engineer\",\n            \"company\": \"\",\n            \"yearsExperience\": 0,\n            \"industry\": \"technology\"\n        }\n    },\n    \"changes\": [\n        {\n            \"type\": \"added\",\n            \"field\": \"professional.role\",\n            \"oldValue\": \"\",\n            \"newValue\": \"software engineer\"\n        }\n    ],\n    \"confidence\": 0.9,\n    \"summary\": \"A software engineer in the technology industry.\"\n}\n```"

	type Change struct {
		Type     string `json:"type"`
		Field    string `json:"field"`
		OldValue string `json:"oldValue"`
		NewValue string `json:"newValue"`
	}

	type Professional struct {
		Role            string `json:"role"`
		Company         string `json:"company"`
		YearsExperience int    `json:"yearsExperience"`
		Industry        string `json:"industry"`
	}

	type Context struct {
		Professional Professional `json:"professional"`
	}

	type Response struct {
		UpdatedContext Context  `json:"updatedContext"`
		Changes        []Change `json:"changes"`
		Confidence     float64  `json:"confidence"`
		Summary        string   `json:"summary"`
	}

	var result Response
	err := ParseJSONResponse(input, &result)
	require.NoError(t, err)

	assert.Equal(t, "software engineer", result.UpdatedContext.Professional.Role)
	assert.Equal(t, "technology", result.UpdatedContext.Professional.Industry)
	assert.Equal(t, 0.9, result.Confidence)
	assert.Len(t, result.Changes, 1)
	assert.Equal(t, "added", result.Changes[0].Type)
}
