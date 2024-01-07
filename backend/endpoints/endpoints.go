package endpoints

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"ishkul.org/backend/handler"
)

func GinHandleRegister(userDatabase handler.UserDatabase) func(*gin.Context) {

	return func(ctx *gin.Context) {
		var req handler.RegisterRequest
		if err := ctx.BindJSON(&req); err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		resp, err := handler.HandleRegister(ctx, userDatabase, req)
		if err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(ErrorHTTPCode(err), gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		ctx.JSON(http.StatusCreated, gin.H{"data": resp})
	}
}

func GinHandleLogin(userDatabase handler.UserDatabase) func(*gin.Context) {
	return func(ctx *gin.Context) {
		var req handler.LoginRequest
		if err := ctx.BindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		resp, err := handler.HandleLogin(ctx, userDatabase, req)
		if err != nil {
			ctx.JSON(ErrorHTTPCode(err), gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	}
}

func GinHandleSendVerificationCode(storage handler.AccountStorage, userDatabase handler.UserDatabase) func(*gin.Context) {
	return func(ctx *gin.Context) {
		var req handler.SendVerificationCodeRequest
		if err := ctx.BindJSON(&req); err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		resp, err := handler.HandleSendVerificationCode(ctx, storage, userDatabase, req)
		if err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(ErrorHTTPCode(err), gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	}
}

func GinHandleVerifyAccount(storage handler.AccountStorage, userDatabase handler.UserDatabase) func(*gin.Context) {
	return func(ctx *gin.Context) {
		var req handler.VerifyAccountRequest
		if err := ctx.BindJSON(&req); err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		resp, err := handler.HandleVerifyAccount(ctx, storage, userDatabase, req)
		if err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(ErrorHTTPCode(err), gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	}
}

func GinHandleChangePassword(storage handler.AccountStorage, userDatabase handler.UserDatabase) func(*gin.Context) {
	return func(ctx *gin.Context) {
		var req handler.ChangePasswordRequest
		if err := ctx.BindJSON(&req); err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		resp, err := handler.HandleChangePassword(ctx, userDatabase, req)
		if err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(ErrorHTTPCode(err), gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	}
}

func GinHandlePostDocuments(userDatabase handler.UserDatabase, documentDatabase handler.DocumentDatabase) func(*gin.Context) {
	return func(ctx *gin.Context) {
		var req handler.AddDocumentRequest
		if err := ctx.BindJSON(&req); err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		resp, err := handler.HandleAddDocument(ctx, documentDatabase, req)
		if err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(ErrorHTTPCode(err), gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	}
}

func GinHandleGetDocument(storage handler.DocumentLimitStorage, userDatabase handler.UserDatabase, documentDatabase handler.DocumentDatabase) func(*gin.Context) {
	return func(ctx *gin.Context) {
		var req handler.GetDocumentRequest
		if err := ctx.ShouldBindQuery(&req); err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		resp, err := handler.HandleGetDocument(ctx, storage, documentDatabase, req)
		if err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(ErrorHTTPCode(err), gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	}
}

func GinHandleGetDocuments(userDatabase handler.UserDatabase, documentDatabase handler.DocumentDatabase) func(*gin.Context) {
	return func(ctx *gin.Context) {
		var req handler.SearchDocumentRequest
		if err := ctx.ShouldBindQuery(&req); err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		resp, err := handler.HandleSearchDocument(ctx, documentDatabase, req)
		if err != nil {
			zap.L().Error("error", zap.Error(err))
			ctx.JSON(ErrorHTTPCode(err), gin.H{"error": err.Error()})
			ctx.Abort()
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"data": resp})
	}
}
