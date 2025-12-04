package middleware

import (
	"net/http"
)

// MaxBodySize is the default maximum request body size (10 MB)
// This prevents denial of service attacks via large request payloads
const MaxBodySize = 10 * 1024 * 1024 // 10 MB

// BodyLimit middleware limits the size of request bodies to prevent DoS attacks
// It wraps the request body with http.MaxBytesReader which returns an error
// if the body exceeds the specified limit
func BodyLimit(next http.Handler) http.Handler {
	return BodyLimitWithSize(next, MaxBodySize)
}

// BodyLimitWithSize middleware limits the size of request bodies to a custom size
func BodyLimitWithSize(next http.Handler, maxBytes int64) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip body limit for requests without a body
		if r.Body == nil || r.ContentLength == 0 {
			next.ServeHTTP(w, r)
			return
		}

		// Wrap the body with a size limiter
		r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

		next.ServeHTTP(w, r)
	})
}
