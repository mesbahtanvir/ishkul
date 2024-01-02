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
		return &ErrHandlerBadParam{Msg: "Must provide email address"}
	}
	if r.Code == "" {
		return &ErrHandlerBadParam{Msg: "Must provide a code"}
	}
	return nil
}

func HandleVerifyAccount(ctx context.Context, storage AccountStorage, db UserDatabase, req VerifyAccountRequest) (resp VerifyAccountResponse, err error) {
	if err := req.Validate(); err != nil {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, err
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, &ErrResourceDoesNotExist{Msg: "User does not exist this email"}
	}
	expected_code, err := storage.RetriveAccountRecoveryKey(ctx, user.Email)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, err
	}
	if expected_code != req.Code {
		zap.L().Info("code mistmatched", zap.String("expected", expected_code), zap.String("code", req.Code))
		return VerifyAccountResponse{}, &ErrHandlerBadParam{"Invalid code provided"}
	}

	if err := storage.RemoveAccountRecoveryKey(ctx, user.Email); err != nil {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, err
	}

	user.EmailVerified = true
	if err := db.UpdateUser(ctx, user); err != nil {
		zap.L().Error("error", zap.Error(err))
		return VerifyAccountResponse{}, err
	}

	token, err := utils.EncodeJWTToken(user.Email, user.EmailVerified)
	if err != nil {
		zap.L().Error("failed to encode json", zap.Error(err))
		return VerifyAccountResponse{}, err
	}
	resp.FirstName = user.FirstName
	resp.LastName = user.LastName
	resp.Email = user.Email
	resp.EmailVerified = user.EmailVerified
	resp.Token = token
	return resp, nil
}
