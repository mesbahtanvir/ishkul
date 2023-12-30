package middleware

import (
	"github.com/gin-gonic/gin"
)

// Define your models (structs) here
// ...

func auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// tokenString := c.GetHeader("Authorization")

		// // Validate token format
		// if !strings.HasPrefix(tokenString, "Bearer ") {
		// 	c.JSON(http.StatusUnauthorized, "Authorization header format must be Bearer {token}")
		// 	c.Abort()
		// 	return
		// }

		// tokenString = strings.TrimPrefix(tokenString, "Bearer ")

		// // Parse the token
		// token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 	// Don't forget to validate the alg is what you expect
		// 	if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
		// 		return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		// 	}

		// 	return []byte("your-secret-key"), nil
		// })

		// if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// 	// The token is valid and you can read the user ID from the claims
		// 	userID := claims["iss"].(string)
		// 	// Now you can use userID in your handler
		// } else {
		// 	// Token is invalid
		// 	c.JSON(http.StatusUnauthorized, "Invalid token")
		// 	c.Abort()
		// 	return
		// }

		c.Next()
	}
}
