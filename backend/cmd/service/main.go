package main

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"ishkul.org/backend/db"
	"ishkul.org/backend/handler"
)

func main() {
	r := gin.Default()
	userDatabase := db.MustNewMongoUserDatabase()
	storage := db.MustNewGlobalStorage()

	// CORS Middleware settings
	r.Use(cors.Default())

	// Health Check Endpoint
	r.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "healthy", "timestamp": time.Now().UnixNano()})
	})

	// Register Endpoint
	r.POST("/register", func(ctx *gin.Context) {
		var req handler.RegisterRequest
		if err := ctx.BindJSON(&req); err != nil {
			// handle error, e.g., return a bad request response
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := handler.HandleRegister(ctx, userDatabase, req)
		if err != nil {
			ctx.JSON(handler.ErrorHTTPCode(err), gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusCreated, gin.H{"data": resp})
	})

	// Login Endpoint
	r.POST("/login", func(ctx *gin.Context) {
		// Your logic here
		var req handler.LoginRequest
		if err := ctx.BindJSON(&req); err != nil {
			// handle error, e.g., return a bad request response
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := handler.HandleLogin(ctx, userDatabase, req)
		if err != nil {
			ctx.JSON(handler.ErrorHTTPCode(err), gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	})

	// Account Recover Endpoint
	r.POST("/send_verification_code", func(ctx *gin.Context) {
		// Your logic here
		var req handler.SendVerificationCodeRequest
		if err := ctx.BindJSON(&req); err != nil {
			// handle error, e.g., return a bad request response
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := handler.HandleSendVerificationCode(ctx, storage, userDatabase, req)
		if err != nil {
			ctx.JSON(handler.ErrorHTTPCode(err), gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	})

	// Account Recover Endpoint
	r.POST("/verify_account", func(ctx *gin.Context) {
		// Your logic here
		var req handler.VerifyAccountRequest
		if err := ctx.BindJSON(&req); err != nil {
			// handle error, e.g., return a bad request response
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := handler.HandleVerifyAccount(ctx, storage, userDatabase, req)
		if err != nil {
			ctx.JSON(handler.ErrorHTTPCode(err), gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	})

	// Account Recover Endpoint
	r.POST("/change_password", func(ctx *gin.Context) {
		// Your logic here
		var req handler.ChangePasswordRequest
		if err := ctx.BindJSON(&req); err != nil {
			// handle error, e.g., return a bad request response
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := handler.HandleChangePassword(ctx, userDatabase, req)
		if err != nil {
			ctx.JSON(handler.ErrorHTTPCode(err), gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	})

	// Start the server
	r.Run()
}
