---
description: Systematic approach to fixing bugs in Ishkul
---

# Fix Bug

Follow this systematic approach to diagnose and fix bugs.

## Steps

1. **Understand the bug**: Read the error message, stack trace, or reproduction steps
2. **Locate the source**: Find the relevant code files
3. **Identify root cause**: Determine why the bug occurs
4. **Plan the fix**: Consider the minimal change needed
5. **Implement fix**: Make the necessary code changes
6. **Test**: Verify the fix works and doesn't break other things
7. **Document**: Add comments if the fix isn't obvious

## Common Locations

- Frontend errors: Check `frontend/src/` components and services
- Backend errors: Check `backend/internal/handlers/` and `pkg/`
- Auth issues: Check `frontend/src/services/auth.ts` and backend auth middleware
- Firebase issues: Check security rules in `firebase/`

## Testing Commands

```bash
# Frontend
cd frontend && npm run type-check
cd frontend && npm test

# Backend
cd backend && go test ./...
```

## Checklist

- [ ] Bug reproduced and understood
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests pass
- [ ] No regressions introduced
