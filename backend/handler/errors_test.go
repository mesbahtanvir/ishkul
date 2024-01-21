package handler

import (
	"errors"
	"net/http"
	"testing"

	"ishkul.org/backend/utils"
)

func TestErrorHTTPCode(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		// BadRequest errors
		{
			name: "BadRequest - ErrParamPasswordIsRequired",
			err:  ErrParamPasswordIsRequired,
			want: http.StatusBadRequest,
		},
		{
			name: "BadRequest - ErrParamOldPasswordIsRequired",
			err:  ErrParamOldPasswordIsRequired,
			want: http.StatusBadRequest,
		},
		{
			name: "BadRequest - ErrParamEmailIsRequired",
			err:  ErrParamEmailIsRequired,
			want: http.StatusBadRequest,
		},
		{
			name: "BadRequest - ErrParamTokenIsRequired",
			err:  ErrParamTokenIsRequired,
			want: http.StatusBadRequest,
		},
		{
			name: "BadRequest - ErrParamCodeIsRequired",
			err:  ErrParamCodeIsRequired,
			want: http.StatusBadRequest,
		},
		{
			name: "BadRequest - ErrParamIdIsRequired",
			err:  ErrParamIdIsRequired,
			want: http.StatusBadRequest,
		},
		{
			name: "BadRequest - ErrParamFirstNameIsRequired",
			err:  ErrParamFirstNameIsRequired,
			want: http.StatusBadRequest,
		},
		{
			name: "BadRequest - ErrParamLastNameIsRequired",
			err:  ErrParamLastNameIsRequired,
			want: http.StatusBadRequest,
		},

		// NotFound errors
		{
			name: "NotFound - ErrUserEmailDoesNotExist",
			err:  ErrUserEmailDoesNotExist,
			want: http.StatusNotFound,
		},
		{
			name: "NotFound - ErrRequestedResourceDoesNotExist",
			err:  ErrRequestedResourceDoesNotExist,
			want: http.StatusNotFound,
		},

		// Conflict errors
		{
			name: "Conflict - ErrUserEmailAlreadyExists",
			err:  ErrUserEmailAlreadyExists,
			want: http.StatusConflict,
		},

		// Unauthorized errors
		{
			name: "Unauthorized - ErrUserInvalidCodeProvided",
			err:  ErrUserInvalidCodeProvided,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - ErrUserInvalidEmailAddressProvided",
			err:  ErrUserInvalidEmailAddressProvided,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - ErrUserAuthenticationFailure",
			err:  ErrUserAuthenticationFailure,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - ErrUserProvidedPasswordDidntMatchTheRecord",
			err:  ErrUserProvidedPasswordDidntMatchTheRecord,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - ErrUserEmailAndPasswordMismatched",
			err:  ErrUserEmailAndPasswordMismatched,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - utils.ErrUserNotAnAdmin",
			err:  utils.ErrUserNotAnAdmin,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - utils.ErrUserTokenIsInvalid",
			err:  utils.ErrUserTokenIsInvalid,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - utils.ErrUserEmailTokenMismatch",
			err:  utils.ErrUserEmailTokenMismatch,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - utils.ErrUserUnverified",
			err:  utils.ErrUserUnverified,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - utils.ErrFailedToEncodeToken",
			err:  utils.ErrFailedToEncodeToken,
			want: http.StatusUnauthorized,
		},
		{
			name: "Unauthorized - utils.ErrFailedToParseJwt",
			err:  utils.ErrFailedToParseJwt,
			want: http.StatusUnauthorized,
		},

		// InternalServerError errors
		{
			name: "InternalServerError - ErrInternalFailedToGenerateHash",
			err:  ErrInternalFailedToGenerateHash,
			want: http.StatusInternalServerError,
		},
		{
			name: "InternalServerError - ErrInternalFailedToRetrieveFromDatabase",
			err:  ErrInternalFailedToRetriveFromDatabase,
			want: http.StatusInternalServerError,
		},
		{
			name: "InternalServerError - ErrInternalFailedToUpdateDatabase",
			err:  ErrInternalFailedToUpdateDatabase,
			want: http.StatusInternalServerError,
		},

		// Test for unknown error
		{
			name: "Unknown error",
			err:  errors.New("unknown error"),
			want: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ErrorHTTPCode(tt.err); got != tt.want {
				t.Errorf("ErrorHTTPCode() = %v, want %v for error %v", got, tt.want, tt.err)
			}
		})
	}
}
