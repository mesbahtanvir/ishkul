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

	// Initialize rate limiter
	rateLimiter := middleware.DefaultRateLimiter()

	// Setup router
	mux := http.NewServeMux()

	// Health check endpoint (no auth required)
	mux.HandleFunc("/health", handlers.HealthCheck)

	// Auth routes (no auth required - these issue tokens)
	// Rate limiting applied to prevent brute force attacks
	authMux := http.NewServeMux()
	authMux.HandleFunc("/api/auth/login", handlers.Login)
	authMux.HandleFunc("/api/auth/refresh", handlers.Refresh)
	authMux.HandleFunc("/api/auth/logout", handlers.Logout)
	mux.Handle("/api/auth/", rateLimiter.Limit(middleware.CORS(authMux)))

	// Protected API routes (auth required)
	api := http.NewServeMux()

	// User profile and document endpoints
	api.HandleFunc("/api/me", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetMe(w, r)
		case http.MethodPut, http.MethodPatch:
			handlers.UpdateMe(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	api.HandleFunc("/api/me/document", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetMeDocument(w, r)
		case http.MethodPost:
			handlers.CreateMeDocument(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	api.HandleFunc("/api/me/history", handlers.AddHistory)
	api.HandleFunc("/api/me/memory", handlers.UpdateMemory)
	api.HandleFunc("/api/me/next-step", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetNextStep(w, r)
		case http.MethodPut, http.MethodPost:
			handlers.SetNextStep(w, r)
		case http.MethodDelete:
			handlers.ClearNextStep(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Legacy endpoints (keeping for compatibility)
	api.HandleFunc("/api/users", handlers.GetUsers)
	api.HandleFunc("/api/users/create", handlers.CreateUser)
	api.HandleFunc("/api/progress", handlers.GetProgress)
	api.HandleFunc("/api/progress/update", handlers.UpdateProgress)
	api.HandleFunc("/api/lessons", handlers.GetLessons)
	api.HandleFunc("/api/upload", handlers.UploadFile)

	// Apply middleware to protected routes (rate limit -> CORS -> auth)
	protectedHandler := rateLimiter.Limit(middleware.CORS(middleware.Auth(api)))
	mux.Handle("/api/me", protectedHandler)
	mux.Handle("/api/me/", protectedHandler)
	mux.Handle("/api/users", protectedHandler)
	mux.Handle("/api/users/", protectedHandler)
	mux.Handle("/api/progress", protectedHandler)
	mux.Handle("/api/progress/", protectedHandler)
	mux.Handle("/api/lessons", protectedHandler)
	mux.Handle("/api/lessons/", protectedHandler)
	mux.Handle("/api/upload", protectedHandler)

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
