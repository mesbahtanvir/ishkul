#!/bin/bash

# Setup Pre-Commit Hooks
# Installs and configures Husky pre-commit hooks to enforce code quality

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Setup Pre-Commit Hooks for Testing Enforcement${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get the project root directory (script location/../..)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js found: $NODE_VERSION"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓${NC} npm found: v$NPM_VERSION"
echo ""

# Install Husky
echo -e "${BLUE}→ Installing Husky...${NC}"
if npm install husky --save-dev; then
    echo -e "${GREEN}✓${NC} Husky installed"
else
    echo -e "${RED}✗ Failed to install Husky${NC}"
    exit 1
fi
echo ""

# Initialize Husky
echo -e "${BLUE}→ Initializing Husky...${NC}"
if npx husky install; then
    echo -e "${GREEN}✓${NC} Husky initialized"
else
    echo -e "${RED}✗ Failed to initialize Husky${NC}"
    exit 1
fi
echo ""

# Make pre-commit hook executable
echo -e "${BLUE}→ Setting up pre-commit hook...${NC}"
if [ -f ".husky/pre-commit" ]; then
    chmod +x ".husky/pre-commit"
    echo -e "${GREEN}✓${NC} Pre-commit hook is executable"
else
    echo -e "${RED}✗ Pre-commit hook not found at .husky/pre-commit${NC}"
    exit 1
fi
echo ""

# Verify hook is working
echo -e "${BLUE}→ Verifying hook installation...${NC}"
if [ -x ".husky/pre-commit" ]; then
    echo -e "${GREEN}✓${NC} Pre-commit hook verified"
else
    echo -e "${RED}✗ Pre-commit hook is not executable${NC}"
    exit 1
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Pre-commit hooks setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "What happens next:"
echo "  • When you run 'git commit', the hook will automatically run:"
echo "    - Frontend tests (lint, type-check, tests)"
echo "    - Backend tests (formatting, tests)"
echo ""
echo "  • If any check fails, your commit will be blocked"
echo "  • Fix the issues and try committing again"
echo ""

echo "To test it:"
echo "  $ git commit -m 'test'"
echo "  (The hook should run and either allow or block the commit)"
echo ""

echo "To bypass (⚠️  only for urgent hotfixes):"
echo "  $ git commit --no-verify"
echo ""

echo "For more info, see: docs/PRE_COMMIT_HOOKS.md"
echo ""
