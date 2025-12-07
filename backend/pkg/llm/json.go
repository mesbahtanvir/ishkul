package llm

import (
	"encoding/json"
	"regexp"
	"strings"
)

// Common markdown code block patterns that LLMs may wrap JSON responses in
var (
	// Matches ```json\n...\n``` or ```\n...\n```
	codeBlockRegex = regexp.MustCompile("^\\s*```(?:json)?\\s*\n?(.*?)\\s*```\\s*$")
)

// StripMarkdownCodeBlocks removes markdown code fences from LLM responses.
// LLMs like DeepSeek often wrap JSON responses in ```json ... ``` blocks,
// which causes JSON parsing to fail.
//
// Examples of input that will be cleaned:
//   - ```json\n{"key": "value"}\n```
//   - ```\n{"key": "value"}\n```
//   - {"key": "value"} (returned as-is)
func StripMarkdownCodeBlocks(content string) string {
	content = strings.TrimSpace(content)

	// Try regex match first for standard code blocks
	if matches := codeBlockRegex.FindStringSubmatch(content); len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}

	// Handle edge cases with simple prefix/suffix stripping
	// This handles cases where regex might not match due to formatting variations
	if strings.HasPrefix(content, "```") {
		// Remove opening fence
		content = strings.TrimPrefix(content, "```json")
		content = strings.TrimPrefix(content, "```JSON")
		content = strings.TrimPrefix(content, "```")
		content = strings.TrimPrefix(content, "\n")

		// Remove closing fence
		if idx := strings.LastIndex(content, "```"); idx != -1 {
			content = content[:idx]
		}
		content = strings.TrimSpace(content)
	}

	return content
}

// ParseJSONResponse parses a JSON response from an LLM, automatically stripping
// markdown code blocks if present. This is the recommended way to parse LLM JSON responses.
//
// Usage:
//
//	var result MyStruct
//	if err := llm.ParseJSONResponse(llmContent, &result); err != nil {
//	    return err
//	}
func ParseJSONResponse(content string, v interface{}) error {
	cleaned := StripMarkdownCodeBlocks(content)
	return json.Unmarshal([]byte(cleaned), v)
}
