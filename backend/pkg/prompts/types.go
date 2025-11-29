package prompts

// ModelParameters represents model configuration parameters
type ModelParameters struct {
	Temperature float64 `yaml:"temperature"`
	MaxTokens   int     `yaml:"maxTokens"`
	TopP        float64 `yaml:"topP"`
	N           int     `yaml:"n"`
}

// PromptMessage represents a single message in the prompt template
type PromptMessage struct {
	Role    string `yaml:"role"`
	Content string `yaml:"content"`
}

// PromptTemplate represents a .prompt.yml file structure
type PromptTemplate struct {
	Name            string          `yaml:"name"`
	Description     string          `yaml:"description"`
	Model           string          `yaml:"model"`
	ModelParameters ModelParameters `yaml:"modelParameters"`
	Messages        []PromptMessage `yaml:"messages"`
}

// Variables represents the key-value pairs for template substitution
type Variables map[string]string
