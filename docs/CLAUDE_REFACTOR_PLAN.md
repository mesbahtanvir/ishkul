# CLAUDE.md Refactoring Plan

## Analysis: What to Keep vs. Move

### 📋 CLAUDE.md SHOULD BE LEAN & ACTIONABLE

The goal is to keep only information Claude needs **every time** for development. Verbose reference docs should be separate.

---

## ✅ KEEP IN CLAUDE.md (Compact & Essential)

### 1. Project Overview (KEEP - 2-3 lines)
- What the project is (adaptive learning platform)
- Three main parts: Frontend (React Native), Backend (Go), Infrastructure (Firebase)

### 2. Project Structure (KEEP - Minimal tree only)
- Show folder layout briefly
- Key file locations for quick navigation
- **Current**: 40+ lines | **Should be**: 15 lines

### 3. Tech Stack (KEEP - But Compressed)
- Only key technologies for each component
- Versions for troubleshooting
- **Current**: 25 lines | **Should be**: 10 lines

### 4. Key Commands (KEEP - Most Important)
- Frontend: `npm start`, `npm run lint`, `npm run type-check`
- Backend: `go run cmd/server/main.go`, `gcloud run deploy`
- **Current**: Good | **Should be**: Reduce to 10 essential commands only

### 5. Development Guidelines (KEEP - Critical)
- TypeScript required (frontend)
- Go conventions (backend)
- Project-specific patterns to follow
- **Current**: Good | **Should be**: Keep as is

### 6. When to Update CLAUDE.md (KEEP - NEW SECTION)
- **This is critical** - when architecture changes
- When adding new deployment patterns
- When tech stack changes
- **Format**: Checklist for developers

### 7. After Code Changes: What Claude Should Do (KEEP - NEW SECTION)
- Run linting/type-checking before committing
- Test on affected platforms
- Update documentation if structure changed
- Run full test suite
- **Format**: Step-by-step checklist

### 8. Firebase Integration (KEEP - Brief)
- Collections: `users/`
- Auth setup
- **Current**: Good | **Should be**: Reduce to essentials only

### 9. Design System (KEEP - Reference Only)
- Link to `frontend/DESIGN_SYSTEM.md`
- Don't duplicate content
- **Current**: Duplicates content | **Should be**: Just point to external file

### 10. Troubleshooting (KEEP - Common Issues Only)
- 3-5 most frequent problems
- Quick fixes
- **Current**: 9 issues | **Should be**: Top 5 with links to detailed guides

---

## 🚚 MOVE TO SEPARATE DOCS (Reference Material)

### ➡️ Create: `DEVELOPMENT_SETUP.md`
**What goes here:**
- Detailed environment variable configuration
- `.env.example` explanations
- Local development setup steps
- Port configurations
- Google OAuth setup details
- Firebase credentials setup

**Current locations to consolidate:**
- Environment Variables section (entire)
- Setting Up the Frontend to Use Cloud Run section

### ➡️ Create: `DEPLOYMENT_GUIDE.md` (or enhance existing)
**What goes here:**
- Complete CI/CD pipeline explanation
- Conditional deployment details
- Manual deployment steps
- Vercel configuration details
- Cloud Build trigger setup
- Firebase rules deployment

**Current locations to consolidate:**
- CI/CD Pipeline (entire - 50+ lines)
- Deployment section (most of it)
- Quick Setup: Conditional Deployments

### ➡️ Keep/Enhance: `PROJECT_SUMMARY.md`
**What goes here:**
- Detailed architecture diagrams
- Data flow explanations
- Component relationships
- Database schema
- API endpoint documentation

### ➡️ Keep/Enhance: `FRONTEND/DESIGN_SYSTEM.md`
**What goes here:**
- All design system details (already there)
- Component library documentation
- Color palette details
- Typography scale
- Spacing system

**Note:** CLAUDE.md should just link to this, not duplicate

### ➡️ Keep/Enhance: `INFRASTRUCTURE.md` (create if needed)
**What goes here:**
- Cloud Run service management details
- Health check configuration
- Scaling setup
- Environment-specific deployments
- Monitoring and logging setup

**Current locations to move:**
- Cloud Run Service Management section
- Service Health Checks section
- Infrastructure section (parts of it)

### ➡️ Keep/Enhance: `TROUBLESHOOTING.md` (or `COMMON_ISSUES.md`)
**What goes here:**
- All 9 troubleshooting issues (detailed explanations)
- Debug commands
- Log analysis tips
- Performance issues
- Common error messages

**Current location to move:**
- Troubleshooting section (entire)

### ➡️ Keep: `Future Enhancements` (create `ROADMAP.md`)
**What goes here:**
- Features to implement
- Optimization opportunities
- Architecture improvements
- Technical debt

---

## 📊 CLAUDE.md Size Comparison

### Before
- **Current**: 704 lines
- **Breakdown**:
  - Tech Stack: 25 lines
  - Key Commands: 30 lines
  - Development Guidelines: 40 lines
  - Environment Variables: 60 lines ❌ MOVE
  - CI/CD Pipeline: 80 lines ❌ MOVE
  - Deployment Details: 120 lines ❌ MOVE
  - Troubleshooting: 50 lines ❌ MOVE
  - Other reference: 299 lines

### After (Target)
- **Compact**: 150-200 lines
- **Content**:
  - Project Overview: 5 lines
  - Structure: 15 lines
  - Tech Stack: 10 lines
  - Key Commands: 15 lines
  - Development Guidelines: 25 lines
  - When to Update: 10 lines
  - After Code Changes: 15 lines
  - Firebase (brief): 10 lines
  - Design System Link: 3 lines
  - Common Troubleshooting: 15 lines
  - Links to other docs: 20 lines

---

## 🎯 REFACTORING STEPS

### Phase 1: Analyze & Plan ✅ (Current)
- [ ] Identify what stays
- [ ] Identify what moves
- [ ] Document rationale

### Phase 2: Create External Docs (Next)
- [ ] `DEVELOPMENT_SETUP.md` - Environment & setup details
- [ ] `DEPLOYMENT_GUIDE.md` - CI/CD & deployment details
- [ ] `INFRASTRUCTURE.md` - Cloud Run & scaling details
- [ ] `TROUBLESHOOTING.md` - Common issues & debug tips
- [ ] `ROADMAP.md` - Future enhancements

### Phase 3: Compact CLAUDE.md (Final)
- [ ] Reduce to 150-200 lines
- [ ] Add "After Code Changes" checklist
- [ ] Add "When to Update CLAUDE.md" guidelines
- [ ] Link to external docs
- [ ] Keep only essential information

---

## 📚 New Section: "After Code Changes"

This should be in CLAUDE.md:

```markdown
## After Making Code Changes

### Always Do This

1. **Frontend Changes**
   ```bash
   npm run lint                # Fix style issues
   npm run type-check          # Catch type errors
   npm test -- --watchAll=false # Run tests
   ```

2. **Backend Changes**
   ```bash
   gofmt -w .                  # Auto-format code
   go build ./...              # Check compilation
   go test ./internal/...      # Run tests
   ```

3. **Documentation**
   - [ ] Update CLAUDE.md if structure changed
   - [ ] Update relevant guide (DEPLOYMENT_GUIDE.md, etc.)
   - [ ] Update code comments if logic is complex

4. **Before Committing**
   - [ ] All linting passes
   - [ ] All tests pass
   - [ ] No type errors
   - [ ] Clear commit message

5. **For Deployment Changes**
   - [ ] Test locally first
   - [ ] Verify all env vars
   - [ ] Check CI logs
   - [ ] Monitor Cloud Run after deploy
```

---

## 🔗 New Section: "When to Update CLAUDE.md"

This should be in CLAUDE.md:

```markdown
## When to Update CLAUDE.md

Update CLAUDE.md when:

- **Architecture changes** - New folder structure, major refactoring
- **Tech stack changes** - Upgrade to new versions, switch libraries
- **Development patterns** - New conventions, best practices
- **Key commands change** - Different build/test/deploy commands
- **Critical workflows** - New deployment process, CI/CD changes

❌ Do NOT update CLAUDE.md for:
- Environment variables (→ `DEVELOPMENT_SETUP.md`)
- Deployment details (→ `DEPLOYMENT_GUIDE.md`)
- Troubleshooting steps (→ `TROUBLESHOOTING.md`)
- Feature ideas (→ `ROADMAP.md`)
- Design details (→ `frontend/DESIGN_SYSTEM.md`)
```

---

## 💡 Key Principles

1. **Lean**: Only essential info per session
2. **Actionable**: Shows what to do, not just info
3. **Linked**: Points to detailed external docs
4. **Maintained**: Updated only when architecture changes
5. **Developer-Friendly**: Quick reference, not a manual

---

## ✨ Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **File Size** | 704 lines | 150-200 lines |
| **Quick Read** | 10+ minutes | 3-5 minutes |
| **Easy to Maintain** | Hard (changes scattered) | Easy (one place per topic) |
| **Finding Answers** | Multiple sections to check | Dedicated docs for each topic |
| **For Claude** | Too much info per session | Right amount of info |
| **For Developers** | Reference overload | Quick reference + external docs |

---

## Next Action

User decision needed:
1. **Approve this plan** → Proceed with Phase 2
2. **Modify plan** → Adjust sections before implementation
3. **Different approach** → Suggest alternative structure

Recommend: **Approve and proceed with Phase 2** (creating external docs)
