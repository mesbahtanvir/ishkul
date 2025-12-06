package handlers

import (
	"net/http"
	"strings"
)

// LearningPathsHandler is a legacy handler that redirects to CoursesHandler
// Kept for backward compatibility with existing API clients
// Deprecated: Use CoursesHandler and /api/courses routes instead
func LearningPathsHandler(w http.ResponseWriter, r *http.Request) {
	// Rewrite the URL path from /api/learning-paths to /api/courses
	r.URL.Path = strings.Replace(r.URL.Path, "/api/learning-paths", "/api/courses", 1)
	CoursesHandler(w, r)
}
