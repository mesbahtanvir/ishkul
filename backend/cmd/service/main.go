package main

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"ishkul.org/backend/db"
	"ishkul.org/backend/endpoints"
	"ishkul.org/backend/notification"
	"ishkul.org/backend/utils"
)

func init() {
	logger := zap.Must(zap.NewProduction())
	if utils.GetEnvOrDefault("APP_ENV", "development") == "development" {
		logger = zap.Must(zap.NewDevelopment())
	}
	zap.ReplaceGlobals(logger)
}

func main() {
	r := gin.Default()
	userDatabase := db.MustNewMongoUserDatabase()
	documentDatabase := db.MustNewMongoDocumentDatabase()
	storage := db.MustNewGlobalStorage()
	emailSender := notification.MustNewEmailNotificationSender()
	s3Storage := db.MustNewS3Storage()

	// Genenric Middleware settings
	r.Use(cors.Default())

	r.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "healthy", "timestamp": time.Now().UnixNano()})
	})
	r.POST("/register", endpoints.GinHandleRegister(userDatabase))
	r.POST("/login", endpoints.GinHandleLogin(userDatabase))
	r.POST("/send_verification_code", endpoints.GinHandleSendVerificationCode(storage, userDatabase, emailSender))
	r.POST("/verify_account", endpoints.GinHandleVerifyAccount(storage, userDatabase))
	r.POST("/change_password", endpoints.GinHandleChangePassword(storage, userDatabase))
	r.POST("/documents", endpoints.GinHandlePostDocuments(userDatabase, documentDatabase))
	r.GET("/document", endpoints.GinHandleGetDocument(storage, userDatabase, documentDatabase))
	r.GET("/documents", endpoints.GinHandleGetDocuments(userDatabase, documentDatabase))
	r.GET("/presign_url", endpoints.GinHandlePresignedURLHandler(userDatabase, s3Storage))

	// Start the server
	r.Run()
}
