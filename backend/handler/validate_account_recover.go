package handler

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/utils"
)

type ValidateAccountRecoverRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type ValidateAccountRecoverResponse struct {
	LoginResponse
}

func (r ValidateAccountRecoverRequest) Validate() error {
	if r.Email == "" {
		return &ErrHandlerBadParam{Msg: "Must provide email address"}
	}
	if r.Code == "" {
		return &ErrHandlerBadParam{Msg: "Must provide a code"}
	}
	return nil
}

func HandleValidateAccountRecover(ctx context.Context, storage AccountRecoverStorage, db UserDatabase, req ValidateAccountRecoverRequest) (resp ValidateAccountRecoverResponse, err error) {
	if err := req.Validate(); err != nil {
		return ValidateAccountRecoverResponse{}, err
	}
	user, err := db.FindUserByEmail(ctx, req.Email)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return ValidateAccountRecoverResponse{}, &ErrResourceDoesNotExist{Msg: "User does not exist this email"}
	}
	expected_code, err := storage.RetriveAccountRecoveryKey(ctx, user.Email)
	if err != nil {
		return ValidateAccountRecoverResponse{}, err
	}
	if expected_code != req.Code {
		return ValidateAccountRecoverResponse{}, &ErrHandlerBadParam{"Invalid code provided"}
	}

	token, err := utils.EncodeJWTToken(user.Email)
	if err != nil {
		return ValidateAccountRecoverResponse{}, err
	}
	resp.FirstName = user.FirstName
	resp.LastName = user.LastName
	resp.Email = user.Email
	resp.Token = token
	return resp, nil
}
