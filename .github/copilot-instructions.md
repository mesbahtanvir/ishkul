# GitHub Copilot Instructions for Ishkul

This repository contains **Ishkul**, an adaptive learning platform with a React Native/Expo frontend and Go backend.

## Project Structure

- `frontend/` - React Native/Expo app (TypeScript 5.9, Zustand, React Navigation 7)
- `backend/` - Go 1.23 service running on Cloud Run
- `firebase/` - Firestore security rules and configuration
- `prompts/` - Application LLM prompts for learning features (NOT Copilot prompts)

## Coding Standards

### Frontend (TypeScript/React Native)

- Use TypeScript strictly - no `any` types
- State management with Zustand stores in `src/state/`
- Follow React Navigation 7 patterns in `src/navigation/`
- Services go in `src/services/` (Firebase, auth, LLM)
- Types defined in `src/types/`
- Follow the design system in `frontend/DESIGN_SYSTEM.md`

### Backend (Go)

- Follow Go conventions and use `gofmt`
- Handlers in `internal/handlers/`
- Firebase Admin SDK usage in `pkg/firebase/`
- All `/api/*` endpoints require auth middleware
- Use proper HTTP status codes for errors

## Key Patterns

### Adding a New Screen

1. Create screen in `frontend/src/screens/`
2. Add to navigation in `frontend/src/navigation/AppNavigator.tsx`
3. Update types in `frontend/src/types/app.ts`

### Adding an API Endpoint

1. Create handler in `backend/internal/handlers/`
2. Register route in `backend/cmd/server/main.go`
3. Add auth middleware if needed

## Testing

- Frontend: `npm test` in `frontend/`
- Backend: `go test ./...` in `backend/`
- Type checking: `npm run type-check`

## Environment

- Frontend builds deploy to Vercel
- Backend deploys to Google Cloud Run (europe-west1)
- Database: Cloud Firestore
- Auth: Google Sign-In + JWT tokens

## Important Notes

- Never commit secrets or `.env` files
- Run pre-commit hooks before pushing
- Check `docs/` folder for detailed guides
