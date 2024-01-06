package handler

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"ishkul.org/backend/utils"
)

type ChangePasswordRequest struct {
	Email       string `json:"email"`
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
	Token       string `json:"token"`
}

type ChangePasswordResponse struct {
	LoginResponse
}

func (r ChangePasswordRequest) Validate() error {
	if r.Email == "" {
		return ErrParamEmailIsRequired
	}
	if r.OldPassword == "" {
		return ErrParamOldPasswordIsRequired
	}
	if r.NewPassword == "" {
		return ErrParamPasswordIsRequired
	}
	if r.Token == "" {
		return ErrParamTokenIsRequired
	}
	return nil
}

func HandleChangePassword(ctx context.Context, db UserDatabase, req ChangePasswordRequest) (ChangePasswordResponse, error) {
	if err := req.Validate(); err != nil {
		zap.L().Error("error", zap.Error(err))
		return ChangePasswordResponse{}, err
	}
	if err := utils.ValidateVerifiedUserEmail(req.Email, req.Token); err != nil {
		return ChangePasswordResponse{}, err
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return ChangePasswordResponse{}, ErrUserEmailDoesNotExist
	}

	if err != nil {
		return ChangePasswordResponse{}, ErrInternalFailedToRetriveFromDatabase
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return ChangePasswordResponse{}, ErrUserProvidedPasswordDidntMatchTheRecord
	}

	hash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return ChangePasswordResponse{}, ErrInternalFailedToGenerateHash
	}

	user.PasswordHash = hash

	token, err := utils.EncodeJWTToken(user)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return ChangePasswordResponse{}, err
	}

	if err := db.UpdateUser(ctx, user); err != nil {
		zap.L().Error("error", zap.Error(err))
		return ChangePasswordResponse{}, ErrInternalFailedToUpdateDatabase
	}
	return ChangePasswordResponse{
		LoginResponse: LoginResponse{Token: token},
	}, nil
}
