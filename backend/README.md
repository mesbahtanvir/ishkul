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

- Go 1.24 or higher
- Firebase project with Firestore and Storage enabled
- Firebase service account key

## Setup

1. **Install Dependencies**

   **Note**: Internet connectivity is required to download Go modules.

   ```bash
   go mod tidy
   ```

2. **Download Firebase Credentials** (for local development only)
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in the backend directory
   - **IMPORTANT**: Add to `.gitignore` to prevent committing secrets

3. **Configure Environment**
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your configuration:
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key (local dev only)
   - `FIREBASE_DATABASE_URL`: Your Firebase Realtime Database URL (optional)
   - `FIREBASE_STORAGE_BUCKET`: Your Firebase Storage bucket name
   - `PORT`: Server port (default: 8080)
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

   **Note on Credentials**:
   - **Local development**: Set `GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json`
   - **Cloud Run**: Leave unset - uses Application Default Credentials automatically

## Running Locally

### Using Go directly

```bash
# Development mode
go run cmd/server/main.go

# Build and run
go build -o server cmd/server/main.go
./server
```

The server will start on `http://localhost:8080` (or your configured PORT).

### Using Docker

```bash
# Build the Docker image
docker build -t ishkul-backend:latest .

# Run with environment variables and credentials
docker run -p 8080:8080 \
  -e FIREBASE_CREDENTIALS_PATH=/credentials/serviceAccountKey.json \
  -e FIREBASE_STORAGE_BUCKET=your-project.appspot.com \
  -v /path/to/serviceAccountKey.json:/credentials/serviceAccountKey.json:ro \
  ishkul-backend:latest
```

#### About Firebase Warnings When Running Locally

When running the backend locally (either with `go run` or Docker) without proper Firebase credentials:

```
Warning: FIREBASE_DATABASE_URL not set
Warning: FIREBASE_STORAGE_BUCKET not set
Failed to initialize Firebase: cannot read credentials file: open serviceAccountKey.json: no such file or directory
```

**These warnings are expected and indicate the backend is operating in local development mode.** The backend will:

1. Log warnings about missing environment variables (informational only)
2. Attempt to load credentials from the specified path
3. Fail gracefully if credentials are not available
4. Skip Firebase-dependent operations if credentials fail

**For full local development**, you need:
1. A Firebase service account key (download from Firebase Console)
2. Set `FIREBASE_CREDENTIALS_PATH` to point to it
3. Set other Firebase environment variables in `.env`

**In Cloud Run (production)**, credentials are injected securely via Google Secret Manager, so these warnings will not appear.

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
