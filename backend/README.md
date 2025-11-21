# Ishkul Backend

Go backend service for Ishkul learning platform with Firebase integration.

## Features

- **Firebase Authentication**: User authentication using Firebase Auth
- **Firestore Database**: NoSQL database for storing user data, progress, and lessons
- **Firebase Storage**: File storage for user uploads and media
- **RESTful API**: Clean API endpoints for frontend integration
- **CORS Support**: Configurable CORS for cross-origin requests
- **Graceful Shutdown**: Proper server shutdown handling

## Project Structure

```
backend/
├── cmd/
│   └── server/          # Application entry point
│       └── main.go
├── internal/
│   ├── handlers/        # HTTP request handlers
│   │   ├── health.go
│   │   ├── users.go
│   │   ├── progress.go
│   │   ├── lessons.go
│   │   └── upload.go
│   ├── middleware/      # HTTP middleware
│   │   ├── auth.go
│   │   └── cors.go
│   └── models/          # Data models
│       └── user.go
└── pkg/
    └── firebase/        # Firebase integration
        ├── firebase.go
        └── firestore.go
```

## Prerequisites

- Go 1.21 or higher
- Firebase project with Firestore and Storage enabled
- Firebase service account key

## Setup

1. **Install Dependencies**
   ```bash
   go mod tidy
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your Firebase configuration:
   - `FIREBASE_CREDENTIALS_PATH`: Path to your service account key JSON
   - `FIREBASE_DATABASE_URL`: Your Firebase Realtime Database URL (optional)
   - `FIREBASE_STORAGE_BUCKET`: Your Firebase Storage bucket name
   - `PORT`: Server port (default: 8080)
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

3. **Download Firebase Credentials**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in the backend directory

## Running Locally

```bash
# Development mode
go run cmd/server/main.go

# Build and run
go build -o server cmd/server/main.go
./server
```

The server will start on `http://localhost:8080` (or your configured PORT).

## API Endpoints

### Public Endpoints

- `GET /health` - Health check endpoint

### Protected Endpoints (Require Authentication)

- `GET /api/users` - Get all users
- `POST /api/users/create` - Create or update user
- `GET /api/progress` - Get user's learning progress
- `POST /api/progress/update` - Update lesson progress
- `GET /api/lessons?level=beginner` - Get lessons (optional level filter)
- `POST /api/upload` - Upload file to Firebase Storage

### Authentication

All `/api/*` endpoints require a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## Development

### Running Tests

```bash
go test ./...
```

### Code Formatting

```bash
go fmt ./...
```

### Linting

```bash
golangci-lint run
```

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase service account key | Yes | `serviceAccountKey.json` |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL | No | - |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name | Yes | - |
| `PORT` | Server port | No | `8080` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | No | `http://localhost:3000,http://localhost:8081,http://localhost:19006` |
| `ENVIRONMENT` | Environment name | No | `development` |

## License

MIT
