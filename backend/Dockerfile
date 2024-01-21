# Start by building the application.
# Use the official Golang image to create a build artifact.
# This is called a multi-stage build. This stage is named as builder.
FROM golang:1.19 AS builder

# Set the working directory inside the container.
WORKDIR /app

# Copy go.mod and go.sum to download all dependencies.
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code into the container.
COPY . .

# Build the application.
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/service/main.go

# Use a Docker multi-stage build to create a lean production image.
# Start from the alpine:latest image for a small footprint.
FROM alpine:latest  

# Set the working directory to /root/.
WORKDIR /root/

# Copy the pre-built binary file from the previous stage.
COPY --from=builder /app/main .

# Expose port 8080 to the outside world.
EXPOSE 8080

# Command to run the executable.
CMD ["./main"]
