package utils

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/golang-jwt/jwt"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"ishkul.org/backend/model"
)

var secretKey = []byte("023945wdjefsfa409534f")

type Claims struct {
	ID            string `json:"id"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	Email         string `json:"email"`
	IsVerified    bool   `json:"is_verified"`
	IsAdmin       bool   `json:"is_admin"`
	IsContributor bool   `json:"is_contributor"`
	jwt.StandardClaims
}

// EncodeJWTToken generates a JWT token for the given email.
func EncodeJWTToken(user model.User) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token expiration set to 1 day
	claims := &Claims{
		ID:            user.ID.Hex(),
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Email:         user.Email,
		IsVerified:    user.EmailVerified,
		IsAdmin:       IsAdmin(user.Email),
		IsContributor: IsContributor(user.Email),
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(secretKey)
	if err != nil {
		zap.L().Error("failed to encode jwt token", zap.Error(err))
		return "", ErrFailedToEncodeToken
	}
	return tokenStr, nil
}

// DecodeJWT decodes a JWT token and returns the claims.
func DecodeJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return secretKey, nil
	})
	if err != nil {
		zap.L().Warn("Failed to parse jwt token", zap.Error(err))
		return nil, ErrFailedToParseJwt
	}
	if !token.Valid {
		return nil, ErrUserTokenIsInvalid
	}
	return claims, nil
}

// ValidateToken validates the JWT token and returns the email from the claims.
func ValidateToken(tokenString string) (email string, verified bool, validated bool) {
	claims, err := DecodeJWT(tokenString)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return "", false, false
	}
	return claims.Email, claims.IsVerified, true
}

// ValidateToken validates the JWT token and returns the email from the claims.
func ValidateUserToken(email string, tokenString string) bool {
	claims, err := DecodeJWT(tokenString)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return false
	}
	return claims.Email == email
}

func ValidateVerifiedUserEmail(email string, tokenString string) error {
	claims, err := DecodeJWT(tokenString)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return ErrUserTokenIsInvalid
	}
	if claims.Email != email {
		return ErrUserEmailTokenMismatch
	}

	if !claims.IsVerified {
		return ErrUserUnverified
	}
	return nil
}

// TODO refactor rename
func VerifiedUserToken(tokenString string) error {
	claims, err := DecodeJWT(tokenString)
	if err != nil {
		zap.L().Error("failed to decode token", zap.Error(err))
		return ErrUserTokenIsInvalid
	}
	if !claims.IsVerified {
		return ErrUserUnverified
	}
	return nil
}

// HashPassword takes a plain text password and returns a hashed version.
func HashPassword(password string) (string, error) {
	// Generate a hashed version of the password
	// DefaultCost is usually a good balance of security and performance
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		zap.L().Error("failed to generate password", zap.Error(err))
		// If there's an error, return an empty string and the error
		return "", err
	}
	// Return the hashed password as a string
	return string(hashedPassword), nil
}

func GenerateRandomVerificationCode() string {
	srand := rand.New(rand.NewSource(time.Now().UnixNano()))
	code := srand.Intn(1000000)      // generates a number in [0, 1000000)
	return fmt.Sprintf("%06d", code) // formats the number as a 6-digit code
}

var currentAdmins = map[string]bool{
	"mesbah.tanvir.cs@gmail.com": true,
}

var currentContributor = map[string]bool{
	"mesbah.tanvir.cs@gmail.com": true,
}

func IsAdmin(email string) bool {
	if value, ok := currentAdmins[email]; !ok || !value {
		return false
	}
	return true
}

func IsContributor(email string) bool {
	if value, ok := currentContributor[email]; !ok || !value {
		return false
	}
	return true
}

func IsAuthenticatedUser(token string) (*Claims, error) {
	claims, err := DecodeJWT(token)
	if err != nil {
		return nil, ErrUserTokenIsInvalid
	}
	if !claims.IsVerified {
		return nil, ErrUserUnverified
	}
	return claims, nil
}

func IsAuthenticatedAdmin(token string) error {
	claims, err := IsAuthenticatedUser(token)
	if err != nil {
		return err
	}
	if value, ok := currentAdmins[claims.Email]; !ok || !value {
		return ErrUserNotAnAdmin
	}
	return nil
}

func IsAuthenticatedContributor(token string) error {
	claims, err := IsAuthenticatedUser(token)
	if err != nil {
		return err
	}
	if value, ok := currentContributor[claims.Email]; !ok || !value {
		return ErrUserNotAContributor
	}
	return nil
}
