package handler

import (
	"errors"
	"net/http"

	"go.uber.org/zap"
	"ishkul.org/backend/utils"
)

var (
	// params related
	ErrParamPasswordIsRequired    = errors.New("password is required")
	ErrParamOldPasswordIsRequired = errors.New("old password is required")
	ErrParamNewPasswordIsRequired = errors.New("new password is required")
	ErrParamEmailIsRequired       = errors.New("email is required")
	ErrParamTokenIsRequired       = errors.New("token is required")
	ErrParamCodeIsRequired        = errors.New("code is required")
	ErrParamIdIsRequired          = errors.New("id is required")
	ErrParamFirstNameIsRequired   = errors.New("first name is required")
	ErrParamLastNameIsRequired    = errors.New("last name is required")

	// User error
	ErrUserInvalidCodeProvided                 = errors.New("invalid code provided")
	ErrUserInvalidEmailAddressProvided         = errors.New("invalid email address provided")
	ErrUserEmailDoesNotExist                   = errors.New("email does not exist")
	ErrUserAuthenticationFailure               = errors.New("authentication failure")
	ErrUserEmailAndPasswordMismatched          = errors.New("email and password mismatched")
	ErrUserEmailAlreadyExists                  = errors.New("a user with this email already exists")
	ErrUserProvidedPasswordDidntMatchTheRecord = errors.New("password didn't match")
	ErrRequestedResourceDoesNotExist           = errors.New("resource does not exists")

	// Internal error
	ErrInternalFailedToGenerateHash        = errors.New("failed to generate password hash")
	ErrInternalFailedToRetriveFromDatabase = errors.New("internal server error")
	ErrInternalFailedToUpdateDatabase      = errors.New("internal server error")

	//  Verification code
	ErrFailedToSendVerificationCode = errors.New("failed to sent code")
)

func ErrorHTTPCode(err error) int {

	switch {
	case errors.Is(err, ErrParamPasswordIsRequired),
		errors.Is(err, ErrParamOldPasswordIsRequired),
		errors.Is(err, ErrParamNewPasswordIsRequired),
		errors.Is(err, ErrParamEmailIsRequired),
		errors.Is(err, ErrParamTokenIsRequired),
		errors.Is(err, ErrParamCodeIsRequired),
		errors.Is(err, ErrParamIdIsRequired),
		errors.Is(err, ErrParamFirstNameIsRequired),
		errors.Is(err, ErrParamLastNameIsRequired):
		return http.StatusBadRequest

	case
		errors.Is(err, ErrUserEmailDoesNotExist),
		errors.Is(err, ErrRequestedResourceDoesNotExist):
		return http.StatusNotFound

	case errors.Is(err, ErrUserEmailAlreadyExists):
		return http.StatusConflict

	case errors.Is(err, ErrUserInvalidCodeProvided),
		errors.Is(err, ErrUserInvalidEmailAddressProvided),
		errors.Is(err, ErrUserAuthenticationFailure),
		errors.Is(err, ErrUserProvidedPasswordDidntMatchTheRecord),
		errors.Is(err, ErrUserEmailAndPasswordMismatched),
		errors.Is(err, utils.ErrUserNotAnAdmin),
		errors.Is(err, utils.ErrUserTokenIsInvalid),
		errors.Is(err, utils.ErrUserEmailTokenMismatch),
		errors.Is(err, utils.ErrUserUnverified),
		errors.Is(err, utils.ErrFailedToEncodeToken),
		errors.Is(err, utils.ErrFailedToParseJwt):
		return http.StatusUnauthorized

	case errors.Is(err, ErrInternalFailedToGenerateHash),
		errors.Is(err, ErrInternalFailedToRetriveFromDatabase),
		errors.Is(err, ErrInternalFailedToUpdateDatabase),
		errors.Is(err, ErrFailedToSendVerificationCode):
		return http.StatusInternalServerError

	default:
		zap.L().Warn("error not handled in server", zap.Error(err))
		return http.StatusInternalServerError
	}

}
