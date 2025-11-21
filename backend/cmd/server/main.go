package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/internal/handlers"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

func main() {
	// Initialize Firebase
	ctx := context.Background()
	if err := firebase.Initialize(ctx); err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}
	defer firebase.Cleanup()

	// Setup router
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", handlers.HealthCheck)

	// API routes
	api := http.NewServeMux()
	api.HandleFunc("/api/users", handlers.GetUsers)
	api.HandleFunc("/api/users/create", handlers.CreateUser)
	api.HandleFunc("/api/progress", handlers.GetProgress)
	api.HandleFunc("/api/progress/update", handlers.UpdateProgress)
	api.HandleFunc("/api/lessons", handlers.GetLessons)
	api.HandleFunc("/api/upload", handlers.UploadFile)

	// Apply middleware
	mux.Handle("/api/", middleware.CORS(middleware.Auth(api)))

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Create server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Server shutting down...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
