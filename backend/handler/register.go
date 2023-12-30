package handler

import (
	"context"
	"errors"
	"fmt"
	"net/mail"

	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/db"
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
		return &HandlerBadParamError{Msg: "Must provide first name"}
	}
	if r.LastName == "" {
		return &HandlerBadParamError{Msg: "Must provide last name"}
	}
	if _, err := mail.ParseAddress(r.Email); err != nil {
		return &HandlerBadParamError{Msg: fmt.Sprintf("Must provide a valid email address. %s", err.Error())}
	}
	if r.Password == "" {
		return &HandlerBadParamError{"Must provide password"}
	}
	return nil
}

type RegisterResponse struct{}

func HandleRegister(c context.Context, db *db.UserDatabase, req RegisterRequest) (resp RegisterResponse, err error) {
	if err := req.Validate(); err != nil {
		return RegisterResponse{}, err
	}
	if _, err := db.FindUserByEmail(c, req.Email); !errors.Is(err, mongo.ErrNoDocuments) {
		return RegisterResponse{}, &ResourceAlreadyExists{Msg: "A user with this email already exists"}
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		return RegisterResponse{}, errors.New("Internal Server Error")
	}

	user := model.User{
		FirstName:        req.FirstName,
		LastName:         req.LastName,
		Email:            req.Email,
		PasswordHash:     hash,
		AllowExtraEmails: req.AllowExtraEmails,
	}

	if err := db.AddUser(c, user); err != nil {
		return RegisterResponse{}, err
	}

	return RegisterResponse{}, nil
}
