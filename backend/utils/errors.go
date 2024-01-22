package utils

import "errors"

var (
	ErrUserNotAnAdmin         = errors.New("user not an admin")
	ErrUserNotAContributor    = errors.New("user not a contributor")
	ErrUserTokenIsInvalid     = errors.New("user token is invalid")
	ErrUserEmailTokenMismatch = errors.New("token & email mismatched")
	ErrUserUnverified         = errors.New("unverified user")
	ErrFailedToEncodeToken    = errors.New("failed to encode token")
	ErrFailedToParseJwt       = errors.New("failed to parse jwt token")
)
