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
	db := db.MustNewMongoUserDatabase()

	// CORS Middleware settings
	r.Use(cors.Default())

	// Health Check Endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "timestamp": time.Now().UnixNano()})
	})

	// Register Endpoint
	r.POST("/register", func(c *gin.Context) {
		var req handler.RegisterRequest
		if err := c.BindJSON(&req); err != nil {
			// handle error, e.g., return a bad request response
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := handler.HandleRegister(c, db, req)
		if err != nil {
			c.JSON(handler.ErrorHTTPCode(err), gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"data": resp})
	})

	// Login Endpoint
	r.POST("/login", func(c *gin.Context) {
		// Your logic here
		var req handler.LoginRequest
		if err := c.BindJSON(&req); err != nil {
			// handle error, e.g., return a bad request response
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := handler.HandleLogin(c, db, req)
		if err != nil {
			c.JSON(handler.ErrorHTTPCode(err), gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": resp})
	})

	// Start the server
	r.Run()
}
