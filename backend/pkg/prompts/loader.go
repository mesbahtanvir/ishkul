package prompts

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Loader handles loading and parsing prompt templates
type Loader struct {
	promptsDir string
}

// NewLoader creates a new prompt loader
func NewLoader(promptsDir string) *Loader {
	if promptsDir == "" {
		promptsDir = "prompts"
	}
	return &Loader{
		promptsDir: promptsDir,
	}
}

// Load reads and parses a prompt template file
func (l *Loader) Load(promptPath string) (*PromptTemplate, error) {
	// Construct full path
	fullPath := filepath.Join(l.promptsDir, promptPath)

	// Ensure .prompt.yml extension
	if filepath.Ext(fullPath) != ".yml" && filepath.Ext(fullPath) != ".yaml" {
		fullPath += ".prompt.yml"
	}

	// Read file
	data, err := os.ReadFile(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read prompt file %s: %w", fullPath, err)
	}

	// Parse YAML
	var template PromptTemplate
	if err := yaml.Unmarshal(data, &template); err != nil {
		return nil, fmt.Errorf("failed to parse prompt YAML: %w", err)
	}

	return &template, nil
}

// LoadByName loads a prompt by name from the standard prompts directory structure
// Examples: "learning/next-step", "system/learning-coach"
func (l *Loader) LoadByName(name string) (*PromptTemplate, error) {
	return l.Load(name)
}

// List returns all available prompt files in a directory
func (l *Loader) List(subDir string) ([]string, error) {
	dir := filepath.Join(l.promptsDir, subDir)

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory %s: %w", dir, err)
	}

	var prompts []string
	for _, entry := range entries {
		if !entry.IsDir() {
			name := entry.Name()
			if filepath.Ext(name) == ".yml" || filepath.Ext(name) == ".yaml" {
				// Remove extension
				prompts = append(prompts, name[:len(name)-len(filepath.Ext(name))])
			}
		}
	}

	return prompts, nil
}
