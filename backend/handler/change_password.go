package handler

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
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
	if !utils.ValidateVerifiedUserToken(req.Email, req.Token) {
		return ChangePasswordResponse{}, &ErrAuthenticationFailure{"Invalid Credentials or email not verified"}
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return ChangePasswordResponse{}, &ErrResourceDoesNotExist{Msg: "User does not exist with this email"}
	}
	hash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return ChangePasswordResponse{}, errors.New("internal server error")
	}

	user.PasswordHash = hash

	token, err := utils.EncodeJWTToken(user.Email, user.EmailVerified)
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
	resp.EmailVerified = user.EmailVerified
	return resp, nil
}
