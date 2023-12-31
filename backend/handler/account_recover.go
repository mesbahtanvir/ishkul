package handler

import (
	"context"
	"errors"
	"fmt"

	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/utils"
)

type AccountRecoverRequest struct {
	Email string `json:"email"`
}

type AccountRecoverResponse struct{}

type AccountRecoverStorage interface {
	StoreAccountRecoveryKey(ctx context.Context, userID string, code string) error
	RetriveAccountRecoveryKey(ctx context.Context, userID string) (string, error)
}

func (r AccountRecoverRequest) Validate() error {
	if r.Email == "" {
		return &ErrHandlerBadParam{Msg: "Must provide email address"}
	}
	return nil
}

func HandleAccountRecover(ctx context.Context, storage AccountRecoverStorage, db UserDatabase, req AccountRecoverRequest) (AccountRecoverResponse, error) {
	if err := req.Validate(); err != nil {
		return AccountRecoverResponse{}, err
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return AccountRecoverResponse{}, &ErrResourceDoesNotExist{Msg: "User does not exist this email"}
	}
	recovery_code := utils.GenerateRandomVerificationCode()
	// TODO Send the code to ther user
	fmt.Printf("email: %s, recovery code: %s", user.Email, recovery_code)

	err = storage.StoreAccountRecoveryKey(ctx, user.Email, recovery_code)
	if err != nil {
		return AccountRecoverResponse{}, err
	}
	return AccountRecoverResponse{}, nil
}
