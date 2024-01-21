package handler

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
	"go.uber.org/zap"
	"ishkul.org/backend/utils"
)

type VerifyAccountRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type VerifyAccountResponse struct {
	LoginResponse
}

func (r VerifyAccountRequest) Validate() error {
	if r.Email == "" {
		return ErrParamEmailIsRequired
	}
	if r.Code == "" {
		return ErrParamCodeIsRequired
	}
	return nil
}

func HandleVerifyAccount(ctx context.Context, accountStorage AccountStorage, userDatabase UserDatabase, req VerifyAccountRequest) (resp VerifyAccountResponse, err error) {
	if err := req.Validate(); err != nil {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, err
	}
	user, err := userDatabase.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, ErrUserEmailDoesNotExist
	}
	expected_code, err := accountStorage.RetriveAccountRecoveryKey(ctx, user.Email)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, err
	}
	if expected_code != req.Code {
		zap.L().Info("code mistmatched", zap.String("expected", expected_code), zap.String("code", req.Code))
		return VerifyAccountResponse{}, ErrUserInvalidCodeProvided
	}

	if err := accountStorage.RemoveAccountRecoveryKey(ctx, user.Email); err != nil {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, err
	}

	user.EmailVerified = true
	if err := userDatabase.UpdateUser(ctx, user); err != nil {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, ErrInternalFailedToUpdateDatabase
	}

	token, err := utils.EncodeJWTToken(user)
	if err != nil {
		zap.L().Error("failed to encode json", zap.Error(err))
		return VerifyAccountResponse{}, err
	}
	resp.Token = token
	return resp, nil
}
