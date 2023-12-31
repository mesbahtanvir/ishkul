package db

import (
	"errors"
	"net/http"
)

type ErrKeyNotFound struct {
	Msg string
}

func (k *ErrKeyNotFound) Error() string {
	return k.Msg
}

func ErrorHTTPCode(err error) int {
	var knf *ErrKeyNotFound
	if errors.As(err, &knf) {
		return http.StatusNotFound
	}
	return http.StatusBadRequest
}
