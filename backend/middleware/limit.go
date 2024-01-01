package middleware

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

func getLimit(email string) int64 {
	if val, ok := currentAdmins[email]; val && ok {
		return 100000
	}
	return 100
}

type Storage interface {
	IncrUserResourceRequest(context.Context, string, string, int64) error
}

func DenyIfEndpointLimitReached(storage Storage) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var req RequestMustHaveTokenAndEmail
		if err := ctx.BindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		path := ctx.Request.URL.Path
		if err := storage.IncrUserResourceRequest(ctx, path, req.Email, getLimit(req.Email)); err != nil {
			ctx.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
			return
		}
		ctx.Next()
	}
}
