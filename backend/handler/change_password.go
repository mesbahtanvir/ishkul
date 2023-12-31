package handler

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/model"
	"ishkul.org/backend/utils"
)

type ChangePasswordRequest struct {
	Email       string `json:"email"`
	Token       string `json:"token"`
	NewPassword string `json:"password"`
}

type ChangePasswordResponse struct {
	LoginResponse
}

func (r ChangePasswordRequest) Validate() error {
	if r.Email == "" {
		return &ErrHandlerBadParam{Msg: "Must provide a email address"}
	}
	if r.Token == "" {
		return &ErrHandlerBadParam{Msg: "Must provide a token"}
	}
	if r.NewPassword == "" {
		return &ErrHandlerBadParam{Msg: "Must provide a password"}
	}
	return nil
}

func HandleChangePassword(ctx context.Context, db UserDatabase, req ChangePasswordRequest) (resp ChangePasswordResponse, err error) {
	if err := req.Validate(); err != nil {
		return ChangePasswordResponse{}, err
	}
	if !utils.ValidateUserToken(req.Email, req.Token) {
		return ChangePasswordResponse{}, &ErrAuthenticationFailure{"invalid token or email"}
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return ChangePasswordResponse{}, &ErrResourceDoesNotExist{Msg: "User does not exist this email"}
	}
	hash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return ChangePasswordResponse{}, errors.New("internal server error")
	}
	user = model.User{
		FirstName:        user.FirstName,
		LastName:         user.LastName,
		Email:            user.Email,
		PasswordHash:     hash,
		AllowExtraEmails: user.AllowExtraEmails,
	}

	token, err := utils.EncodeJWTToken(user.Email)
	if err != nil {
		return ChangePasswordResponse{}, err
	}

	if err := db.UpdateUser(ctx, user); err != nil {
		return ChangePasswordResponse{}, err
	}

	resp.FirstName = user.FirstName
	resp.LastName = user.LastName
	resp.Email = user.Email
	resp.Token = token
	return resp, nil
}
