package handler

import (
	"context"
	"errors"
	"fmt"

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

func (r SendVerificationCodeRequest) Validate() error {
	if r.Email == "" {
		return ErrParamEmailIsRequired
	}
	return nil
}

func HandleSendVerificationCode(ctx context.Context, storage AccountStorage, db UserDatabase, req SendVerificationCodeRequest) (SendVerificationCodeResponse, error) {
	if err := req.Validate(); err != nil {
		return SendVerificationCodeResponse{}, err
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return SendVerificationCodeResponse{}, ErrUserEmailDoesNotExist
	}
	recovery_code := utils.GenerateRandomVerificationCode()
	// TODO Send the code to ther user
	fmt.Printf("email: %s, recovery code: %s", user.Email, recovery_code)

	err = storage.StoreAccountRecoveryKey(ctx, user.Email, recovery_code)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return SendVerificationCodeResponse{}, err
	}
	return SendVerificationCodeResponse{}, nil
}
