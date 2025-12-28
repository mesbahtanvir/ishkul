package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSuccess(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"name": "test"}

	Success(w, data)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Meta == nil {
		t.Error("expected meta to be present")
	}

	if resp.Meta.RequestID == "" {
		t.Error("expected requestId to be set")
	}
}

func TestCreated(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"id": "123"}

	Created(w, data)

	if w.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d", w.Code)
	}
}

func TestError(t *testing.T) {
	w := httptest.NewRecorder()

	Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input")

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var resp ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Error.Code != "VALIDATION_ERROR" {
		t.Errorf("expected code VALIDATION_ERROR, got %s", resp.Error.Code)
	}

	if resp.Error.Message != "Invalid input" {
		t.Errorf("expected message 'Invalid input', got %s", resp.Error.Message)
	}

	if resp.Error.RequestID == "" {
		t.Error("expected requestId to be set in error")
	}
}

func TestNotFound(t *testing.T) {
	w := httptest.NewRecorder()

	NotFound(w, "User")

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}

	var resp ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Error.Code != ErrCodeNotFound {
		t.Errorf("expected code NOT_FOUND, got %s", resp.Error.Code)
	}

	if resp.Error.Message != "User not found" {
		t.Errorf("expected message 'User not found', got %s", resp.Error.Message)
	}
}

func TestUnauthorized(t *testing.T) {
	w := httptest.NewRecorder()

	Unauthorized(w, "Invalid token")

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestForbidden(t *testing.T) {
	w := httptest.NewRecorder()

	Forbidden(w, "Access denied")

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

func TestNoContent(t *testing.T) {
	w := httptest.NewRecorder()

	NoContent(w)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d", w.Code)
	}

	if w.Body.Len() != 0 {
		t.Error("expected empty body for NoContent")
	}
}

func TestParsePagination(t *testing.T) {
	tests := []struct {
		name          string
		query         string
		expectedPage  int
		expectedLimit int
	}{
		{"defaults", "", 1, DefaultPageSize},
		{"custom page", "?page=3", 3, DefaultPageSize},
		{"custom limit", "?limit=50", 1, 50},
		{"both", "?page=2&limit=25", 2, 25},
		{"over max", "?limit=200", 1, MaxPageSize},
		{"invalid page", "?page=abc", 1, DefaultPageSize},
		{"zero page", "?page=0", 1, DefaultPageSize},
		{"negative limit", "?limit=-5", 1, DefaultPageSize},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test"+tt.query, nil)
			params := ParsePagination(req)

			if params.Page != tt.expectedPage {
				t.Errorf("expected page %d, got %d", tt.expectedPage, params.Page)
			}
			if params.Limit != tt.expectedLimit {
				t.Errorf("expected limit %d, got %d", tt.expectedLimit, params.Limit)
			}
		})
	}
}

func TestPaginationOffset(t *testing.T) {
	tests := []struct {
		page     int
		limit    int
		expected int
	}{
		{1, 20, 0},
		{2, 20, 20},
		{3, 10, 20},
		{5, 25, 100},
	}

	for _, tt := range tests {
		params := PaginationParams{Page: tt.page, Limit: tt.limit}
		if offset := params.Offset(); offset != tt.expected {
			t.Errorf("page=%d, limit=%d: expected offset %d, got %d",
				tt.page, tt.limit, tt.expected, offset)
		}
	}
}

func TestNewPagination(t *testing.T) {
	params := PaginationParams{Page: 2, Limit: 10}
	pagination := NewPagination(params, 45)

	if pagination.Page != 2 {
		t.Errorf("expected page 2, got %d", pagination.Page)
	}
	if pagination.Limit != 10 {
		t.Errorf("expected limit 10, got %d", pagination.Limit)
	}
	if pagination.Total != 45 {
		t.Errorf("expected total 45, got %d", pagination.Total)
	}
	if pagination.TotalPages != 5 {
		t.Errorf("expected 5 total pages, got %d", pagination.TotalPages)
	}
}

func TestNewLinks(t *testing.T) {
	params := PaginationParams{Page: 2, Limit: 10}
	links := NewLinks("/api/items", params, 5)

	if links.Self != "/api/items?page=2&limit=10" {
		t.Errorf("unexpected self link: %s", links.Self)
	}

	if links.First == nil || *links.First != "/api/items?page=1&limit=10" {
		t.Error("unexpected first link")
	}

	if links.Prev == nil || *links.Prev != "/api/items?page=1&limit=10" {
		t.Error("unexpected prev link")
	}

	if links.Next == nil || *links.Next != "/api/items?page=3&limit=10" {
		t.Error("unexpected next link")
	}

	if links.Last == nil || *links.Last != "/api/items?page=5&limit=10" {
		t.Error("unexpected last link")
	}
}

func TestNewLinksFirstPage(t *testing.T) {
	params := PaginationParams{Page: 1, Limit: 10}
	links := NewLinks("/api/items", params, 3)

	if links.Prev != nil {
		t.Error("first page should not have prev link")
	}

	if links.Next == nil {
		t.Error("first page should have next link")
	}
}

func TestNewLinksLastPage(t *testing.T) {
	params := PaginationParams{Page: 3, Limit: 10}
	links := NewLinks("/api/items", params, 3)

	if links.Prev == nil {
		t.Error("last page should have prev link")
	}

	if links.Next != nil {
		t.Error("last page should not have next link")
	}
}

func TestList(t *testing.T) {
	w := httptest.NewRecorder()
	data := []string{"item1", "item2"}
	pagination := &Pagination{Page: 1, Limit: 20, Total: 2, TotalPages: 1}

	List(w, data, pagination, nil)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp ListResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Pagination == nil {
		t.Error("expected pagination to be present")
	}

	if resp.Meta == nil {
		t.Error("expected meta to be present")
	}
}

func TestErrorWithDetails(t *testing.T) {
	w := httptest.NewRecorder()
	details := map[string]string{
		"field":      "email",
		"constraint": "must be valid email",
	}

	ErrorWithDetails(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input", details)

	var resp ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Error.Details == nil {
		t.Error("expected details to be present")
	}

	if resp.Error.Details["field"] != "email" {
		t.Error("expected field detail to be 'email'")
	}
}
