package handler

import (
	"context"
	"errors"
	"net/mail"

	"go.mongodb.org/mongo-driver/mongo"
	"go.uber.org/zap"
	"ishkul.org/backend/model"
	"ishkul.org/backend/utils"
)

type RegisterRequest struct {
	FirstName        string `json:"first_name"`
	LastName         string `json:"last_name"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	AllowExtraEmails bool   `json:"allow_extra_email"`
}

func (r RegisterRequest) Validate() error {
	if r.FirstName == "" {
		return ErrParamFirstNameIsRequired
	}
	if r.LastName == "" {
		return ErrParamLastNameIsRequired
	}
	if _, err := mail.ParseAddress(r.Email); err != nil {
		return ErrUserInvalidEmailAddressProvided
	}
	if r.Password == "" {
		return ErrParamPasswordIsRequired
	}
	return nil
}

type RegisterResponse struct{}

func HandleRegister(ctx context.Context, db UserDatabase, req RegisterRequest) (RegisterResponse, error) {
	if err := req.Validate(); err != nil {
		zap.L().Error("error", zap.Error(err))
		return RegisterResponse{}, err
	}
	_, err := db.FindUserByEmail(ctx, req.Email)
	if !errors.Is(err, mongo.ErrNoDocuments) {
		if err == nil {
			return RegisterResponse{}, ErrUserEmailAlreadyExists
		}
		return RegisterResponse{}, ErrInternalFailedToRetriveFromDatabase
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return RegisterResponse{}, ErrInternalFailedToGenerateHash
	}
	user := model.User{
		FirstName:        req.FirstName,
		LastName:         req.LastName,
		Email:            req.Email,
		PasswordHash:     hash,
		AllowExtraEmails: req.AllowExtraEmails,
	}

	if err := db.AddUser(ctx, user); err != nil {
		zap.L().Error("error", zap.Error(err))
		return RegisterResponse{}, ErrInternalFailedToUpdateDatabase
	}

	return RegisterResponse{}, nil
}
