// Package api provides standardized API response types and helpers.
// This implements the envelope pattern for consistent API responses.
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// =============================================================================
// Standard Response Types
// =============================================================================

// Response is the standard envelope for all API responses.
// All successful responses should use this structure.
type Response struct {
	Data interface{} `json:"data"`
	Meta *Meta       `json:"meta,omitempty"`
}

// ListResponse is the standard envelope for paginated list responses.
type ListResponse struct {
	Data       interface{} `json:"data"`
	Pagination *Pagination `json:"pagination,omitempty"`
	Links      *Links      `json:"links,omitempty"`
	Meta       *Meta       `json:"meta,omitempty"`
}

// Meta contains metadata about the response.
type Meta struct {
	RequestID string `json:"requestId"`
	Timestamp string `json:"timestamp"`
}

// Pagination contains pagination information for list responses.
type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
}

// Links contains HATEOAS links for navigation.
type Links struct {
	Self  string  `json:"self"`
	First *string `json:"first,omitempty"`
	Prev  *string `json:"prev,omitempty"`
	Next  *string `json:"next,omitempty"`
	Last  *string `json:"last,omitempty"`
}

// =============================================================================
// Standard Error Types
// =============================================================================

// ErrorResponse is the standard envelope for all error responses.
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail contains detailed error information.
type ErrorDetail struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	Details   map[string]string `json:"details,omitempty"`
	RequestID string            `json:"requestId,omitempty"`
	Timestamp string            `json:"timestamp,omitempty"`
	DocURL    string            `json:"documentation,omitempty"`
}

// ValidationError represents a field-level validation error.
type ValidationError struct {
	Field      string `json:"field"`
	Value      string `json:"value,omitempty"`
	Constraint string `json:"constraint"`
}

// =============================================================================
// Error Codes
// =============================================================================

// Standard error codes for consistent error handling across the API.
const (
	// Authentication errors
	ErrCodeUnauthorized       = "UNAUTHORIZED"
	ErrCodeInvalidCredentials = "INVALID_CREDENTIALS"
	ErrCodeTokenExpired       = "TOKEN_EXPIRED"
	ErrCodeInvalidToken       = "INVALID_TOKEN"

	// Authorization errors
	ErrCodeForbidden = "FORBIDDEN"

	// Validation errors
	ErrCodeValidationError = "VALIDATION_ERROR"
	ErrCodeInvalidRequest  = "INVALID_REQUEST"
	ErrCodeInvalidBody     = "INVALID_BODY"
	ErrCodeMissingField    = "MISSING_FIELD"

	// Resource errors
	ErrCodeNotFound      = "NOT_FOUND"
	ErrCodeAlreadyExists = "ALREADY_EXISTS"
	ErrCodeConflict      = "CONFLICT"

	// Rate limiting
	ErrCodeRateLimited = "RATE_LIMITED"

	// Server errors
	ErrCodeInternalError      = "INTERNAL_ERROR"
	ErrCodeServiceUnavailable = "SERVICE_UNAVAILABLE"
	ErrCodeDatabaseError      = "DATABASE_ERROR"
)

// =============================================================================
// Response Writers
// =============================================================================

// generateRequestID creates a unique request identifier.
func generateRequestID() string {
	return "req_" + uuid.New().String()[:8]
}

// newMeta creates metadata for a response.
func newMeta() *Meta {
	return &Meta{
		RequestID: generateRequestID(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

// WriteJSON writes a JSON response with the given status code.
func WriteJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

// Success writes a successful response with the standard envelope.
func Success(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusOK, Response{
		Data: data,
		Meta: newMeta(),
	})
}

// Created writes a 201 Created response with the standard envelope.
func Created(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusCreated, Response{
		Data: data,
		Meta: newMeta(),
	})
}

// Accepted writes a 202 Accepted response for async operations.
func Accepted(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusAccepted, Response{
		Data: data,
		Meta: newMeta(),
	})
}

// NoContent writes a 204 No Content response.
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// List writes a paginated list response.
func List(w http.ResponseWriter, data interface{}, pagination *Pagination, links *Links) {
	WriteJSON(w, http.StatusOK, ListResponse{
		Data:       data,
		Pagination: pagination,
		Links:      links,
		Meta:       newMeta(),
	})
}

// =============================================================================
// Error Writers
// =============================================================================

// Error writes a standardized error response.
func Error(w http.ResponseWriter, statusCode int, code, message string) {
	meta := newMeta()
	WriteJSON(w, statusCode, ErrorResponse{
		Error: ErrorDetail{
			Code:      code,
			Message:   message,
			RequestID: meta.RequestID,
			Timestamp: meta.Timestamp,
		},
	})
}

// ErrorWithDetails writes an error response with additional details.
func ErrorWithDetails(w http.ResponseWriter, statusCode int, code, message string, details map[string]string) {
	meta := newMeta()
	WriteJSON(w, statusCode, ErrorResponse{
		Error: ErrorDetail{
			Code:      code,
			Message:   message,
			Details:   details,
			RequestID: meta.RequestID,
			Timestamp: meta.Timestamp,
		},
	})
}

// Convenience error methods for common status codes

// BadRequest writes a 400 Bad Request error.
func BadRequest(w http.ResponseWriter, code, message string) {
	Error(w, http.StatusBadRequest, code, message)
}

// Unauthorized writes a 401 Unauthorized error.
func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, ErrCodeUnauthorized, message)
}

// Forbidden writes a 403 Forbidden error.
func Forbidden(w http.ResponseWriter, message string) {
	Error(w, http.StatusForbidden, ErrCodeForbidden, message)
}

// NotFound writes a 404 Not Found error.
func NotFound(w http.ResponseWriter, resource string) {
	Error(w, http.StatusNotFound, ErrCodeNotFound, resource+" not found")
}

// Conflict writes a 409 Conflict error.
func Conflict(w http.ResponseWriter, message string) {
	Error(w, http.StatusConflict, ErrCodeConflict, message)
}

// RateLimited writes a 429 Too Many Requests error.
func RateLimited(w http.ResponseWriter, retryAfter int) {
	w.Header().Set("Retry-After", string(rune(retryAfter)))
	Error(w, http.StatusTooManyRequests, ErrCodeRateLimited, "Rate limit exceeded. Please try again later.")
}

// InternalError writes a 500 Internal Server Error.
func InternalError(w http.ResponseWriter, message string) {
	Error(w, http.StatusInternalServerError, ErrCodeInternalError, message)
}

// ServiceUnavailable writes a 503 Service Unavailable error.
func ServiceUnavailable(w http.ResponseWriter, message string) {
	Error(w, http.StatusServiceUnavailable, ErrCodeServiceUnavailable, message)
}

// =============================================================================
// Pagination Helpers
// =============================================================================

// DefaultPageSize is the default number of items per page.
const DefaultPageSize = 20

// MaxPageSize is the maximum allowed items per page.
const MaxPageSize = 100

// PaginationParams holds pagination parameters from a request.
type PaginationParams struct {
	Page  int
	Limit int
}

// ParsePagination extracts pagination parameters from a request.
func ParsePagination(r *http.Request) PaginationParams {
	params := PaginationParams{
		Page:  1,
		Limit: DefaultPageSize,
	}

	if page := r.URL.Query().Get("page"); page != "" {
		if p, err := parseInt(page); err == nil && p > 0 {
			params.Page = p
		}
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := parseInt(limit); err == nil && l > 0 {
			if l > MaxPageSize {
				l = MaxPageSize
			}
			params.Limit = l
		}
	}

	return params
}

// Offset calculates the offset for database queries.
func (p PaginationParams) Offset() int {
	return (p.Page - 1) * p.Limit
}

// NewPagination creates pagination info from params and total count.
func NewPagination(params PaginationParams, total int64) *Pagination {
	totalPages := int(total) / params.Limit
	if int(total)%params.Limit > 0 {
		totalPages++
	}

	return &Pagination{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

// NewLinks creates navigation links for pagination.
func NewLinks(basePath string, params PaginationParams, totalPages int) *Links {
	links := &Links{
		Self: buildPageURL(basePath, params.Page, params.Limit),
	}

	first := buildPageURL(basePath, 1, params.Limit)
	links.First = &first

	if totalPages > 0 {
		last := buildPageURL(basePath, totalPages, params.Limit)
		links.Last = &last
	}

	if params.Page > 1 {
		prev := buildPageURL(basePath, params.Page-1, params.Limit)
		links.Prev = &prev
	}

	if params.Page < totalPages {
		next := buildPageURL(basePath, params.Page+1, params.Limit)
		links.Next = &next
	}

	return links
}

// =============================================================================
// Utility Functions
// =============================================================================

func parseInt(s string) (int, error) {
	var n int
	err := json.Unmarshal([]byte(s), &n)
	return n, err
}

func buildPageURL(basePath string, page, limit int) string {
	return basePath + "?page=" + intToString(page) + "&limit=" + intToString(limit)
}

func intToString(n int) string {
	if n == 0 {
		return "0"
	}

	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
