package handler

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
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
		return &HandlerBadParamError{Msg: "Must provide a valid email address"}
	}
	if r.Password == "" {
		return &HandlerBadParamError{"Must provide password"}
	}
	return nil
}

type LoginResponse struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Token     string `json:"token"`
}

type UserDatabase interface {
	AddUser(ctx context.Context, user model.User) error
	FindUserByEmail(ctx context.Context, email string) (model.User, error)
}

func HandleLogin(ctx context.Context, db UserDatabase, req LoginRequest) (LoginResponse, error) {
	if err := req.Validate(); err != nil {
		return LoginResponse{}, err
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return LoginResponse{}, &ResourceDoesNotExist{Msg: "User does not exists"}
	}
	if err != nil {
		return LoginResponse{}, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return LoginResponse{}, &HandlerBadParamError{Msg: "Password and email mismatched"}
	}
	token, err := utils.EncodeJWTToken(user.Email)
	if err != nil {
		return LoginResponse{}, err
	}
	return LoginResponse{
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		Token:     token,
	}, nil
}
