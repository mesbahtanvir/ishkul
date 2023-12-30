package handler

import (
	"errors"
	"net/http"
)

type HandlerBadParamError struct {
	Msg string
}

type ResourceAlreadyExists struct {
	Msg string
}

type ResourceDoesNotExist struct {
	Msg string
}

func (e *HandlerBadParamError) Error() string {
	return e.Msg
}
func (e *ResourceAlreadyExists) Error() string {
	return e.Msg
}
func (e *ResourceDoesNotExist) Error() string {
	return e.Msg
}

func ErrorHTTPCode(err error) int {

	var badParamErr *HandlerBadParamError
	if errors.As(err, &badParamErr) {
		return http.StatusBadRequest
	}

	var existsErr *ResourceAlreadyExists
	if errors.As(err, &existsErr) {
		return http.StatusConflict
	}

	var notFoundErr *ResourceDoesNotExist
	if errors.As(err, &notFoundErr) {
		return http.StatusNotFound
	}

	return http.StatusBadRequest
}
