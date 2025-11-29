# OpenAI Integration with Prompt Framework

This document describes the OpenAI backend integration added to the Ishkul learning platform.

## Overview

The OpenAI integration replaces the mock LLM engine with real AI-powered content generation using:

- **OpenAI GPT-4o-mini** for generating personalized learning content
- **GitHub-style .prompt.yml files** for managing reusable prompt templates
- **Backend API endpoints** for secure OpenAI API calls
- **Fallback mechanism** to mock data when OpenAI is unavailable

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React Native) │
└────────┬────────┘
         │ POST /api/llm/next-step
         │ (with Firebase auth token)
         ↓
┌─────────────────┐
│   Go Backend    │
│  LLM Handler    │
└────────┬────────┘
         │
         ├─→ Prompt Loader (.prompt.yml files)
         │
         ├─→ Prompt Renderer (variable substitution)
         │
         └─→ OpenAI Client (gpt-4o-mini)
```

## File Structure

```
ishkul/
├── prompts/                                # Prompt templates
│   ├── learning/
│   │   ├── next-step.prompt.yml           # Generate next learning step
│   │   ├── lesson-content.prompt.yml      # Create lesson content
│   │   ├── quiz-creator.prompt.yml        # Generate quiz questions
│   │   └── practice-exercise.prompt.yml   # Create practice tasks
│   └── system/
│       └── learning-coach.prompt.yml      # System prompt for learning coach
│
├── backend/
│   ├── pkg/
│   │   ├── openai/                        # OpenAI client library
│   │   │   ├── client.go                  # HTTP client for OpenAI API
│   │   │   └── types.go                   # Request/response types
│   │   └── prompts/                       # Prompt management
│   │       ├── loader.go                  # Load .prompt.yml files
│   │       ├── renderer.go                # Variable substitution
│   │       └── types.go                   # Prompt template types
│   └── internal/handlers/
│       └── llm.go                         # LLM API endpoints
│
└── frontend/src/services/
    └── llmEngine.ts                       # Updated to call backend API
```

## Prompt Template Format

Based on [GitHub Models prompt format](https://docs.github.com/en/github-models/use-github-models/storing-prompts-in-github-repositories).

### Example: next-step.prompt.yml

```yaml
name: Generate Next Learning Step
description: Determines the optimal next learning step based on user's progress
model: gpt-4o-mini
modelParameters:
  temperature: 0.8
  maxTokens: 1500
messages:
  - role: system
    content: |
      You are an expert curriculum designer...

      User Context:
      - Goal: {{goal}}
      - Level: {{level}}
      - Completed Steps: {{historyCount}}

  - role: user
    content: |
      Generate the next learning step for:
      Goal: {{goal}}
      Level: {{level}}
```

### Variable Substitution

Variables use `{{variableName}}` syntax and are replaced at runtime:

```go
variables := prompts.Variables{
    "goal": "Learn Python",
    "level": "beginner",
    "historyCount": "5",
}
```

## Backend API Endpoints

### POST /api/llm/generate

Generate content using any prompt template.

**Request:**
```json
{
  "promptName": "learning/next-step",
  "variables": {
    "goal": "Learn Python",
    "level": "beginner",
    "historyCount": "3",
    "memory": "Knows basic syntax",
    "recentHistory": "Variables, Data Types, Print Statements"
  }
}
```

**Response:**
```json
{
  "content": "{ \"type\": \"quiz\", \"topic\": \"Functions\", ... }",
  "model": "gpt-4o-mini",
  "usage": {
    "promptTokens": 245,
    "completionTokens": 180,
    "totalTokens": 425
  }
}
```

### POST /api/llm/next-step

Specialized endpoint for generating the next learning step.

**Request:**
```json
{
  "goal": "Learn Python",
  "level": "beginner",
  "history": ["Variables", "Data Types", "Print Statement"],
  "memory": "Understands basic syntax and variables",
  "recentHistory": "Variables, Data Types"
}
```

**Response:**
```json
{
  "nextStep": {
    "type": "lesson",
    "topic": "Functions",
    "title": "Python Functions: Reusable Code",
    "content": "Functions let you write code once..."
  },
  "model": "gpt-4o-mini",
  "usage": { ... }
}
```

### GET /api/llm/prompts?dir=learning

List available prompt templates.

**Response:**
```json
{
  "directory": "learning",
  "prompts": [
    "next-step",
    "lesson-content",
    "quiz-creator",
    "practice-exercise"
  ],
  "count": 4
}
```

## Configuration

### Backend Environment Variables

Add to `backend/.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
# Optional: Override default base URL
OPENAI_BASE_URL=https://api.openai.com/v1
```

### Frontend Configuration

The frontend automatically uses `apiConfig.baseURL` from `firebase.config.ts`:

```typescript
// Calls: https://your-backend.com/api/llm/next-step
const response = await fetch(`${apiConfig.baseURL}/llm/next-step`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ goal, level, history, memory })
});
```

## Frontend Integration

### Before (Mock Engine)

```typescript
// Old: Hardcoded mock data
export const getNextStep = async (request: LLMRequest) => {
  const stepIndex = request.history.length % lessonSet.length;
  return { nextStep: lessonSet[stepIndex] };
};
```

### After (OpenAI Backend)

```typescript
// New: Call backend API with fallback to mock
export const getNextStep = async (request: LLMRequest) => {
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`${apiConfig.baseURL}/llm/next-step`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        goal: request.goal,
        level: request.level,
        history: request.history.map(h => h.title),
        memory: request.memory,
      }),
    });

    const data = await response.json();
    return { nextStep: data.nextStep };
  } catch (error) {
    console.log('Falling back to mock data...');
    return getNextStepMock(request);
  }
};
```

## Usage Example

### 1. Create a Custom Prompt

```yaml
# prompts/custom/my-prompt.prompt.yml
name: Custom Lesson Generator
description: Creates custom lessons for specific topics
model: gpt-4o-mini
modelParameters:
  temperature: 0.7
  maxTokens: 1000
messages:
  - role: system
    content: You are a {{subject}} expert teacher.
  - role: user
    content: Create a lesson on {{topic}} for {{level}} students.
```

### 2. Call from Backend

```go
// Load prompt
template, _ := promptLoader.LoadByName("custom/my-prompt")

// Render with variables
vars := prompts.Variables{
    "subject": "mathematics",
    "topic": "quadratic equations",
    "level": "high school",
}
request, _ := promptRenderer.RenderToRequest(template, vars)

// Call OpenAI
completion, _ := openaiClient.CreateChatCompletion(*request)
```

### 3. Call from Frontend

```typescript
const response = await fetch(`${apiConfig.baseURL}/llm/generate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    promptName: 'custom/my-prompt',
    variables: {
      subject: 'mathematics',
      topic: 'quadratic equations',
      level: 'high school',
    },
  }),
});
```

## Deployment

### Local Development

```bash
# 1. Set OpenAI API key
cd backend
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-...

# 2. Start backend
go run cmd/server/main.go

# 3. Start frontend
cd ../frontend
npm start
```

### Production

```bash
# 1. Set environment variable in Cloud Run
gcloud run services update ishkul-backend \
  --set-env-vars OPENAI_API_KEY=sk-your-key-here \
  --region=europe-west1

# 2. Deploy backend (if needed)
cd backend
gcloud run deploy ishkul-backend --source .

# 3. Deploy frontend
cd ../frontend
vercel deploy --prod
```

## Cost Management

### OpenAI Pricing (as of 2025)

- **gpt-4o-mini**: $0.15 per 1M input tokens, $0.60 per 1M output tokens
- Typical request: ~250 input + 180 output tokens = **$0.000145 per request**
- 1,000 learning steps ≈ **$0.15**

### Optimization Tips

1. **Use gpt-4o-mini** (10x cheaper than gpt-4)
2. **Set maxTokens** to limit response length
3. **Cache common prompts** in Firestore
4. **Fallback to mocks** for development/testing
5. **Monitor usage** via OpenAI dashboard

## Testing

### Test Backend API

```bash
# Get auth token
TOKEN=$(firebase login:token)

# Test next-step endpoint
curl -X POST https://your-backend.com/api/llm/next-step \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Learn Python",
    "level": "beginner",
    "history": [],
    "memory": ""
  }'
```

### Test Prompt Loading

```bash
# List available prompts
curl https://your-backend.com/api/llm/prompts?dir=learning \
  -H "Authorization: Bearer $TOKEN"
```

## Security

- ✅ **Authentication required**: All LLM endpoints require Firebase auth token
- ✅ **API key server-side**: OpenAI API key never exposed to frontend
- ✅ **Rate limiting**: Middleware prevents API abuse
- ✅ **CORS protection**: Only allowed origins can access API
- ✅ **Input validation**: Request parameters validated before processing

## Future Enhancements

- [ ] Add streaming responses for real-time generation
- [ ] Implement response caching to reduce costs
- [ ] Add custom evaluation metrics for prompt quality
- [ ] Support multiple AI providers (Anthropic, Google)
- [ ] Add admin UI for editing prompts
- [ ] Track usage analytics per user
- [ ] A/B testing different prompts

## Troubleshooting

### "LLM not initialized" Error

**Cause**: OpenAI API key not set or invalid.

**Fix**:
```bash
# Check if key is set
echo $OPENAI_API_KEY

# Set in .env file
OPENAI_API_KEY=sk-your-key-here

# Restart backend
```

### "Failed to load prompt" Error

**Cause**: Prompt file not found or invalid YAML.

**Fix**:
```bash
# Check prompt file exists
ls prompts/learning/next-step.prompt.yml

# Validate YAML syntax
cat prompts/learning/next-step.prompt.yml | yq .
```

### "Unsubstituted variable" Error

**Cause**: Prompt template has `{{variable}}` that wasn't provided.

**Fix**: Ensure all variables in the prompt are provided in the request:
```json
{
  "variables": {
    "goal": "...",
    "level": "...",
    "historyCount": "..."
  }
}
```

## References

- [GitHub Models Prompts Documentation](https://docs.github.com/en/github-models/use-github-models/storing-prompts-in-github-repositories)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference/chat)
- [Microsoft Semantic Kernel YAML Schema](https://learn.microsoft.com/en-us/semantic-kernel/concepts/prompts/yaml-schema)
- [VS Code Prompt Files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)

---

**Last Updated**: 2025-11-29
**Version**: 1.0.0
**Status**: Ready for Testing 🚀
