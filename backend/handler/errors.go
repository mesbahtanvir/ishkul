package handler

import (
	"errors"
	"net/http"

	"ishkul.org/backend/db"
)

type ErrHandlerBadParam struct {
	Msg string
}

func (e *ErrHandlerBadParam) Error() string {
	return e.Msg
}

type ErrResourceAlreadyExists struct {
	Msg string
}

func (e *ErrResourceAlreadyExists) Error() string {
	return e.Msg
}

type ErrResourceDoesNotExist struct {
	Msg string
}

func (e *ErrResourceDoesNotExist) Error() string {
	return e.Msg
}

type ErrAuthenticationFailure struct {
	Msg string
}

func (e *ErrAuthenticationFailure) Error() string {
	return e.Msg
}

func ErrorHTTPCode(err error) int {
	var badParamErr *ErrHandlerBadParam
	if errors.As(err, &badParamErr) {
		return http.StatusBadRequest
	}

	var existsErr *ErrResourceAlreadyExists
	if errors.As(err, &existsErr) {
		return http.StatusConflict
	}

	var notFoundErr *ErrResourceDoesNotExist
	if errors.As(err, &notFoundErr) {
		return http.StatusNotFound
	}

	var errAuth *ErrAuthenticationFailure
	if errors.As(err, &errAuth) {
		return http.StatusForbidden
	}

	return db.ErrorHTTPCode(err)
}
