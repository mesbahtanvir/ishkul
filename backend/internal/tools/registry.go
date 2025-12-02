package tools

import (
	"fmt"
	"strings"
	"sync"
)

// Registry holds all registered learning tools.
type Registry struct {
	mu    sync.RWMutex
	tools map[string]LearningTool
}

// Global registry instance
var globalRegistry = &Registry{
	tools: make(map[string]LearningTool),
}

// Register adds a tool to the global registry.
func Register(tool LearningTool) {
	globalRegistry.mu.Lock()
	defer globalRegistry.mu.Unlock()

	id := tool.Metadata().ID
	if _, exists := globalRegistry.tools[id]; exists {
		// Already registered, skip
		return
	}
	globalRegistry.tools[id] = tool
}

// Get retrieves a tool by ID from the global registry.
func Get(id string) (LearningTool, bool) {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	tool, exists := globalRegistry.tools[id]
	return tool, exists
}

// GetAll returns all registered tools.
func GetAll() []LearningTool {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	result := make([]LearningTool, 0, len(globalRegistry.tools))
	for _, tool := range globalRegistry.tools {
		result = append(result, tool)
	}
	return result
}

// Has checks if a tool is registered.
func Has(id string) bool {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	_, exists := globalRegistry.tools[id]
	return exists
}

// GetToolDescriptions returns a formatted string describing all tools
// for use in LLM prompts.
func GetToolDescriptions() string {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	var descriptions []string
	for _, tool := range globalRegistry.tools {
		meta := tool.Metadata()
		desc := fmt.Sprintf("- **%s** (%s %s): %s [%d min]",
			meta.ID, meta.Icon, meta.Name, meta.Description, meta.TargetMinutes)
		descriptions = append(descriptions, desc)
	}
	return strings.Join(descriptions, "\n")
}

// GetToolIDs returns all registered tool IDs.
func GetToolIDs() []string {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	ids := make([]string, 0, len(globalRegistry.tools))
	for id := range globalRegistry.tools {
		ids = append(ids, id)
	}
	return ids
}

// GetSchemas returns all tool schemas as a map.
func GetSchemas() map[string]JSONSchema {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()

	schemas := make(map[string]JSONSchema)
	for id, tool := range globalRegistry.tools {
		schemas[id] = tool.Schema()
	}
	return schemas
}

// Clear removes all tools from the registry (for testing).
func Clear() {
	globalRegistry.mu.Lock()
	defer globalRegistry.mu.Unlock()

	globalRegistry.tools = make(map[string]LearningTool)
}
