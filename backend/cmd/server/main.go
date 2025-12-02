package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/mesbahtanvir/ishkul/backend/internal/handlers"
	"github.com/mesbahtanvir/ishkul/backend/internal/middleware"
	"github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

func main() {
	// Load .env file only in development mode
	// In production (Cloud Run), ENVIRONMENT is set to "production"
	// and we use Cloud Run's native environment variables
	// Deployed to Toronto, Canada (northamerica-northeast2)
	if os.Getenv("ENVIRONMENT") == "" || os.Getenv("ENVIRONMENT") == "development" {
		// Load .env file for local development
		// godotenv returns an error if file doesn't exist, which is fine -
		// if it doesn't exist, we'll use system environment variables
		_ = godotenv.Load()

		// Ensure ENVIRONMENT is set to development if not already set
		if os.Getenv("ENVIRONMENT") == "" {
			os.Setenv("ENVIRONMENT", "development")
		}
	}

	// Initialize structured logger
	appLogger := logger.New()

	ctx := context.Background()

	// Log application startup
	environment := os.Getenv("ENVIRONMENT")
	logger.Info(appLogger, ctx, "application_startup",
		slog.String("version", os.Getenv("APP_VERSION")),
		slog.String("environment", environment),
	)

	// Initialize Firebase
	if err := firebase.Initialize(ctx); err != nil {
		logger.ErrorWithErr(appLogger, ctx, "firebase_initialization_failed", err)
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}
	defer firebase.Cleanup()
	logger.Info(appLogger, ctx, "firebase_initialized")

	// Initialize LLM components (OpenAI + prompt loader)
	// Try multiple paths: /app/prompts (Cloud Run), ../prompts (running from backend dir), ./prompts (running from project root)
	promptsDir := "/app/prompts"
	if _, err := os.Stat(promptsDir); os.IsNotExist(err) {
		// Try parent directory (when running from backend directory)
		promptsDir = "../prompts"
		if _, err := os.Stat(promptsDir); os.IsNotExist(err) {
			// Try current directory (when running from project root)
			promptsDir = "prompts"
		}
	}
	logger.Info(appLogger, ctx, "llm_initialization_attempt",
		slog.String("prompts_dir", promptsDir),
	)

	// Set the logger instance for handlers package
	handlers.SetAppLogger(appLogger)

	if err := handlers.InitializeLLM(promptsDir); err != nil {
		logger.Warn(appLogger, ctx, "llm_initialization_failed",
			slog.String("error", err.Error()),
		)
		logger.Info(appLogger, ctx, "llm_endpoints_disabled")
	} else {
		logger.Info(appLogger, ctx, "llm_initialized")
	}

	// Initialize Stripe
	if err := handlers.InitializeStripe(); err != nil {
		logger.Warn(appLogger, ctx, "stripe_initialization_failed",
			slog.String("error", err.Error()),
		)
		logger.Info(appLogger, ctx, "stripe_endpoints_disabled")
	} else {
		logger.Info(appLogger, ctx, "stripe_initialized")
	}

	// Initialize rate limiter
	rateLimiter := middleware.DefaultRateLimiter()

	// Setup router
	mux := http.NewServeMux()

	// Wrap mux with logging middleware
	var handler http.Handler = mux
	handler = middleware.LoggingMiddleware(appLogger)(handler)

	logger.Info(appLogger, ctx, "router_setup_complete")

	// Health check endpoint (no auth required)
	mux.HandleFunc("/health", handlers.HealthCheck)

	// Development-only endpoint (no auth required, only available in development)
	mux.HandleFunc("/dev/test-token", handlers.DevGetTestToken)

	// Auth routes (no auth required - these issue tokens)
	// Rate limiting applied to prevent brute force attacks
	authMux := http.NewServeMux()
	authMux.HandleFunc("/api/auth/login", handlers.Login)
	authMux.HandleFunc("/api/auth/register", handlers.Register)
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
	api.HandleFunc("/api/me/delete", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodDelete, http.MethodPost:
			handlers.DeleteAccount(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
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

	// Learning paths endpoints
	api.HandleFunc("/api/learning-paths", handlers.LearningPathsHandler)
	api.HandleFunc("/api/learning-paths/", handlers.LearningPathsHandler)

	// Subscription endpoints (protected)
	api.HandleFunc("/api/subscription/status", handlers.GetSubscriptionStatus)
	api.HandleFunc("/api/subscription/checkout", handlers.CreateCheckoutSession)
	api.HandleFunc("/api/subscription/portal", handlers.CreatePortalSession)
	api.HandleFunc("/api/subscription/cancel", handlers.CancelSubscription)
	api.HandleFunc("/api/subscription/payment-sheet", handlers.GetPaymentSheetParams)

	// Apply middleware to protected routes (rate limit -> CORS -> auth)
	protectedHandler := rateLimiter.Limit(middleware.CORS(middleware.Auth(api)))
	mux.Handle("/api/me", protectedHandler)
	mux.Handle("/api/me/", protectedHandler)
	mux.Handle("/api/learning-paths", protectedHandler)
	mux.Handle("/api/learning-paths/", protectedHandler)
	mux.Handle("/api/subscription/", protectedHandler)

	// Stripe webhook (no auth - uses signature verification)
	webhookMux := http.NewServeMux()
	webhookMux.HandleFunc("/api/webhooks/stripe", handlers.HandleStripeWebhook)
	mux.Handle("/api/webhooks/", middleware.CORS(webhookMux))

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Create server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info(appLogger, ctx, "server_starting",
			slog.String("port", port),
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.ErrorWithErr(appLogger, ctx, "server_failed_to_start", err)
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info(appLogger, ctx, "server_shutdown_signal_received")

	// Graceful shutdown with timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.ErrorWithErr(appLogger, ctx, "server_forced_shutdown", err)
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	logger.Info(appLogger, ctx, "server_exited")
}
