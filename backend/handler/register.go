package handler

import (
	"context"
	"errors"
	"fmt"
	"net/mail"

	"go.mongodb.org/mongo-driver/mongo"
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
		return &ErrHandlerBadParam{Msg: "Must provide first name"}
	}
	if r.LastName == "" {
		return &ErrHandlerBadParam{Msg: "Must provide last name"}
	}
	if _, err := mail.ParseAddress(r.Email); err != nil {
		return &ErrHandlerBadParam{Msg: fmt.Sprintf("Must provide a valid email address. %s", err.Error())}
	}
	if r.Password == "" {
		return &ErrHandlerBadParam{"Must provide password"}
	}
	return nil
}

type RegisterResponse struct{}

func HandleRegister(ctx context.Context, db UserDatabase, req RegisterRequest) (resp RegisterResponse, err error) {
	if err := req.Validate(); err != nil {
		return RegisterResponse{}, err
	}
	if _, err := db.FindUserByEmail(ctx, req.Email); !errors.Is(err, mongo.ErrNoDocuments) {
		return RegisterResponse{}, &ErrResourceAlreadyExists{Msg: "A user with this email already exists"}
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return RegisterResponse{}, errors.New("internal server error")
	}
	user := model.User{
		FirstName:        req.FirstName,
		LastName:         req.LastName,
		Email:            req.Email,
		PasswordHash:     hash,
		AllowExtraEmails: req.AllowExtraEmails,
	}

	if err := db.AddUser(ctx, user); err != nil {
		return RegisterResponse{}, err
	}

	return RegisterResponse{}, nil
}
