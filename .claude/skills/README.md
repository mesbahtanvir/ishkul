# Claude Code Skills for Ishkul

Custom Claude Code skills for developing the Ishkul adaptive learning platform.

## Available Skills

| Skill | Description | When to Use |
|-------|-------------|-------------|
| **backend-verification** | Runs Go checks (vet, fmt, test) | After any backend code changes |
| **feature-implementation** | Full feature implementation checklist | Starting work on a new feature |
| **testing-standards** | Testing requirements and patterns | Creating/modifying screens, components, handlers |
| **hooks-validator** | Detects React Rules of Hooks violations | Creating/modifying React components |
| **code-reviewer** | Comprehensive code review | Before PRs, during code review |
| **test-generator** | Generates tests with state transitions | Adding test coverage |
| **screen-generator** | Creates new React Native screens | Adding new app screens |
| **handler-generator** | Creates new Go HTTP handlers | Adding new API endpoints |
| **component-generator** | Creates new React Native components | Adding reusable UI components |

## Quick Reference

### Critical: Preventing Hooks Crashes

The codebase experienced production crashes from React Rules of Hooks violations. Always:

1. **Call all hooks at the top** of the component, before any conditionals
2. **Include state transition tests** in all screen/component tests
3. **Use the hooks-validator skill** when modifying React code

```typescript
// WRONG - Will crash on state transitions
export const Screen = () => {
  if (loading) return <Spinner />;
  const [state] = useState(null); // Called after conditional!
};

// RIGHT - Safe pattern
export const Screen = () => {
  const [state] = useState(null); // All hooks first
  if (loading) return <Spinner />;
};
```

### Skill Usage Examples

```bash
# In Claude Code IDE, invoke skills like:
# (skills are automatically invoked based on context)

# After modifying backend code:
# → backend-verification runs automatically

# When creating a new screen:
# → screen-generator provides templates

# Before creating a PR:
# → code-reviewer analyzes changes
```

## Skills Directory Structure

```
.claude/skills/
├── README.md                    # This file
├── backend-verification/
│   └── SKILL.md                 # Go verification commands
├── feature-implementation/
│   └── SKILL.md                 # Feature checklist
├── testing-standards/
│   └── SKILL.md                 # Testing requirements
├── hooks-validator/
│   └── SKILL.md                 # React hooks validation
├── code-reviewer/
│   └── SKILL.md                 # Code review checklist
├── test-generator/
│   └── SKILL.md                 # Test generation templates
├── screen-generator/
│   └── SKILL.md                 # Screen creation templates
├── handler-generator/
│   └── SKILL.md                 # Handler creation templates
└── component-generator/
    └── SKILL.md                 # Component creation templates
```

## Adding New Skills

1. Create a new directory: `.claude/skills/skill-name/`
2. Create the skill file: `SKILL.md`
3. Use the standard format:

```markdown
---
name: skill-name
description: Brief description of what the skill does. Use when [specific scenarios].
---

# Skill Title

Detailed instructions for the skill.

## When to Use

- Scenario 1
- Scenario 2

## Instructions

Step-by-step guidance...

## Examples

Code examples and templates...
```

4. Update this README with the new skill

## Tech Stack Reference

- **Frontend**: React Native/Expo, TypeScript 5.9, Zustand, React Navigation 7
- **Backend**: Go 1.24, Cloud Run, Firestore
- **Auth**: Firebase + Custom JWT
- **Testing**: Jest + RTL (frontend), Go testing + testify (backend)

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Main project instructions
- [frontend/DESIGN_SYSTEM.md](/frontend/DESIGN_SYSTEM.md) - UI design tokens
- [docs/TESTING.md](/docs/TESTING.md) - Testing guide
