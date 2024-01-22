package handler

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
	"go.uber.org/zap"
	"ishkul.org/backend/utils"
)

type SendVerificationCodeRequest struct {
	Email string `json:"email"`
}

type SendVerificationCodeResponse struct{}

type AccountStorage interface {
	StoreAccountRecoveryKey(ctx context.Context, userID string, code string) error
	RetriveAccountRecoveryKey(ctx context.Context, userID string) (string, error)
	RemoveAccountRecoveryKey(ctx context.Context, userID string) error
}

type EmailSender interface {
	SendVerificationCode(ctx context.Context, email string, code string) error
}

func (r SendVerificationCodeRequest) Validate() error {
	if r.Email == "" {
		return ErrParamEmailIsRequired
	}
	return nil
}

func HandleSendVerificationCode(ctx context.Context, storage AccountStorage, db UserDatabase, emailSender EmailSender, req SendVerificationCodeRequest) (SendVerificationCodeResponse, error) {
	if err := req.Validate(); err != nil {
		return SendVerificationCodeResponse{}, err
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return SendVerificationCodeResponse{}, ErrUserEmailDoesNotExist
	}
	verification_code := utils.GenerateRandomVerificationCode()

	zap.L().Info("verification code", zap.String("email", user.Email), zap.String("code", verification_code))

	if err := emailSender.SendVerificationCode(ctx, user.Email, verification_code); err != nil {
		zap.L().Error("failed to send verification code", zap.Error(err))
		return SendVerificationCodeResponse{}, ErrFailedToSendVerificationCode
	}

	err = storage.StoreAccountRecoveryKey(ctx, user.Email, verification_code)
	if err != nil {
		zap.L().Error("failed to store verification code", zap.Error(err))
		return SendVerificationCodeResponse{}, ErrInternalFailedToUpdateDatabase
	}
	return SendVerificationCodeResponse{}, nil
}
