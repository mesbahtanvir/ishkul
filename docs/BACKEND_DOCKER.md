# Docker Compose Guide for Local Backend Development

This guide explains how to run the Ishkul backend locally using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose installed (included with Docker Desktop)
- A `.env` file configured with your settings (copy from `.env.example` if needed)

## Quick Start

### 1. Build and Start the Backend

From the `backend/` directory:

```bash
docker-compose up -d
```

This will:
- Build the Docker image if it doesn't exist
- Start the backend service on `http://localhost:8080`
- Load environment variables from `.env`

### 2. View Logs

```bash
# View recent logs
docker-compose logs --tail=20

# Follow logs in real-time
docker-compose logs -f

# View logs for a specific service
docker-compose logs backend
```

### 3. Stop the Backend

```bash
docker-compose down
```

This stops and removes the container but keeps the image for faster restarts.

## Firebase Credentials

For the backend to fully initialize, you need a Firebase service account key:

### Get Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com) → Select your project
2. Settings (gear icon) → Service Accounts → Generate new private key
3. Save the file as `serviceAccountKey.json` in the `backend/` directory

```bash
# Move your downloaded key to the backend directory
mv ~/Downloads/ishkul-org-xxxxx.json ./serviceAccountKey.json
```

### Important: Don't Commit This File!

The `.dockerignore` file already prevents it from being included in Docker images. The `.gitignore` should also exclude it:

```bash
# Verify it's in .gitignore
grep serviceAccountKey.json .gitignore
```

## Common Tasks

### Rebuild After Code Changes

```bash
# Rebuild the image with your code changes
docker-compose build

# Restart the container with the new image
docker-compose up -d

# Or rebuild and start in one command
docker-compose up -d --build
```

### Run Without Hot Reload

By default, Docker Compose starts the server binary built into the image. Code changes require a rebuild and restart.

### Run with Auto-Reload (Advanced)

For automatic rebuilds on code changes, you can use the `air` tool:

1. Install air locally: `go install github.com/cosmtrek/air@latest`
2. Create an `.air.toml` configuration file
3. Uncomment the `command: air` line in docker-compose.yml

```bash
# Or use this one-liner to install and setup air
go install github.com/cosmtrek/air@latest
```

### Check Container Status

```bash
# Show running containers
docker-compose ps

# Example output:
# NAME                 IMAGE             COMMAND         SERVICE   STATUS
# ishkul-backend-dev   backend-backend   "/app/server"   backend   Up 2 minutes
```

### Access the Container Shell

```bash
# Open an interactive shell in the running container
docker-compose exec backend sh

# Example: Check if a file exists
docker-compose exec backend ls -la /app/
```

### View Resource Usage

```bash
# See CPU and memory usage of the container
docker stats ishkul-backend-dev

# Example output:
# CONTAINER ID   NAME                 CPU %     MEM USAGE / LIMIT
# abc12345def6   ishkul-backend-dev   0.01%     15.2MiB / 1.94GiB
```

## Troubleshooting

### Error: Container keeps restarting

**Cause**: Firebase initialization fails because `serviceAccountKey.json` is missing.

**Solution**: Get your service account key and save it to `backend/serviceAccountKey.json`

```bash
# Check logs for details
docker-compose logs backend
```

### Error: "Port 8080 is already in use"

**Cause**: Another service is using port 8080.

**Solution**: Either stop the other service or change the port in docker-compose.yml:

```yaml
ports:
  - "8081:8080"  # Maps host port 8081 to container port 8080
```

Then access the backend at `http://localhost:8081`

### Error: "bind: permission denied"

**Cause**: On macOS/Linux, ports < 1024 require sudo.

**Solution**: Use a port >= 1024 in docker-compose.yml (port 8080 should work fine)

### Backend not responding at localhost:8080

**Check**:
1. Container is running: `docker-compose ps`
2. Container is healthy: `docker-compose logs backend` (no error messages)
3. Correct port: `curl -v http://localhost:8080/health`

## Environment Variables

All environment variables are loaded from `.env` file and can be overridden in docker-compose.yml:

```env
# Required
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
FIREBASE_STORAGE_BUCKET=gs://your-project.appspot.com

# Server
PORT=8080
ENVIRONMENT=development

# Auth
JWT_SECRET=your-secret-key

# Optional (for Google Sign-In verification)
GOOGLE_WEB_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Override specific variables in docker-compose.yml:

```yaml
environment:
  - PORT=9000
  - ENVIRONMENT=staging
```

## Network

The `docker-compose.yml` creates a custom network called `ishkul-network`. This allows:

- Services to communicate by name (e.g., `http://backend:8080`)
- Isolation from other Docker containers
- Easy integration of additional services (database, cache, etc.)

Add more services to docker-compose.yml as needed:

```yaml
services:
  backend:
    # ... existing config
  redis:
    image: redis:7-alpine
    networks:
      - ishkul-network
  # ... more services
```

## Performance Tips

1. **Use docker-compose down between major changes**: This removes unused images and containers
   ```bash
   docker system prune -a  # Clean up all unused Docker resources
   ```

2. **Build with BuildKit for faster builds** (enabled by default in Docker Desktop):
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build --no-cache
   ```

3. **Monitor resource usage**: Adjust Docker Desktop's CPU/Memory limits if needed

## Next Steps

- Integrate the backend with the frontend React Native app
- Add more services to docker-compose.yml (database, cache, etc.)
- Set up CI/CD to automatically deploy to Cloud Run

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Go in Docker](https://golang.org/doc/tutorial/compile-install)
- [Firebase Admin SDK for Go](https://firebase.google.com/docs/database/admin/start)
