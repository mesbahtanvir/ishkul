package endpoints

import (
	"errors"
	"net/http"

	"ishkul.org/backend/handler"
	"ishkul.org/backend/utils"
)

func ErrorHTTPCode(err error) int {

	switch {
	case errors.Is(err, handler.ErrParamPasswordIsRequired),
		errors.Is(err, handler.ErrParamEmailIsRequired),
		errors.Is(err, handler.ErrParamTokenIsRequired),
		errors.Is(err, handler.ErrParamCodeIsRequired),
		errors.Is(err, handler.ErrParamFirstNameIsRequired),
		errors.Is(err, handler.ErrParamLastNameIsRequired),
		errors.Is(err, utils.ErrFailedToParseJwt),
		errors.Is(err, utils.ErrUserTokenIsInvalid):
		return http.StatusBadRequest

	case
		errors.Is(err, handler.ErrUserEmailDoesNotExist):
		return http.StatusNotFound

	case errors.Is(err, handler.ErrUserEmailAlreadyExists):
		return http.StatusConflict

	case errors.Is(err, handler.ErrUserInvalidCodeProvided),
		errors.Is(err, handler.ErrUserInvalidEmailAddressProvided),
		errors.Is(err, handler.ErrUserAuthenticationFailure),
		errors.Is(err, handler.ErrUserEmailAndPasswordMismatched),
		errors.Is(err, utils.ErrUserEmailTokenMismatch):
		return http.StatusUnauthorized

	case errors.Is(err, utils.ErrUserUnverified),
		errors.Is(err, utils.ErrUserNotAnAdmin):
		return http.StatusForbidden

	case errors.Is(err, utils.ErrFailedToEncodeToken):
		return http.StatusInternalServerError

	default:
		return http.StatusInternalServerError
	}

}
