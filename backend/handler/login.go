package handler

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"ishkul.org/backend/model"
	"ishkul.org/backend/utils"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `jons:"password"`
}

func (r LoginRequest) Validate() error {
	// To keep things backward compatible we should not do
	// the same check we do during register endpoint call.
	// ParseAddress may evolve and have breaking changes;
	if r.Email == "" {
		return ErrParamEmailIsRequired
	}
	if r.Password == "" {
		return ErrParamPasswordIsRequired
	}
	return nil
}

type LoginResponse struct {
	Token string `json:"token"`
}

type UserDatabase interface {
	AddUser(ctx context.Context, user model.User) error
	FindUserByEmail(ctx context.Context, email string) (model.User, error)
	UpdateUser(ctx context.Context, user model.User) error
}

func HandleLogin(ctx context.Context, db UserDatabase, req LoginRequest) (LoginResponse, error) {
	if err := req.Validate(); err != nil {
		zap.L().Error("error", zap.Error(err))
		return LoginResponse{}, err
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		zap.L().Error("error", zap.Error(err))
		return LoginResponse{}, ErrUserEmailDoesNotExist
	}
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return LoginResponse{}, ErrInternalFailedToRetriveFromDatabase
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return LoginResponse{}, ErrUserEmailAndPasswordMismatched
	}
	token, err := utils.EncodeJWTToken(user)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return LoginResponse{}, err
	}
	return LoginResponse{
		Token: token,
	}, nil
}
