package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"ishkul.org/backend/utils"
)

type RequestMustHaveTokenAndEmail struct {
	Email string `json:"email"`
	Token string `json:"token"`
}

func AuthenticateUser() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var req RequestMustHaveTokenAndEmail
		if err := ctx.BindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if ok := utils.ValidateVerifiedUserToken(req.Email, req.Token); !ok {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "Invalid credentails provided"})
			return
		}
		ctx.Next()
	}
}

var currentAdmins = map[string]bool{
	"mesbah.tanvir.cs@gmail.com": true,
}

func AllowIfAdmin() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var req RequestMustHaveTokenAndEmail
		if err := ctx.BindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		claims, err := utils.DecodeJWT(req.Token)
		if err != nil {
			ctx.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		if !claims.Verified {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "Verify your account first"})
			return
		}
		if value, ok := currentAdmins[claims.Email]; !ok || !value {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "Only Admin can add documents"})
			return
		}
		ctx.Next()
	}
}
