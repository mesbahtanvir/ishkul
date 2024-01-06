package db

import (
	"errors"
)

var (
	ErrRedisKeyNotFound       = errors.New("key not found")
	ErrInternalRedisOperation = errors.New("internal database error")
	ErrReachedDocViewLimit    = errors.New("you've reached your limit today")
)
