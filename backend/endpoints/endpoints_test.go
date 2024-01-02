package endpoints

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/golang/mock/gomock"
	"ishkul.org/backend/handler/mock"
	"ishkul.org/backend/utils"
)

func TestGinHandleGetDocuments(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	// Mock the dependencies
	userDbMock := mock.NewMockUserDatabase(ctrl)
	docDbMock := mock.NewMockDocumentDatabase(ctrl)
	docDbMock.EXPECT().SearchDocument(gomock.Any(), gomock.Any()).Return(nil, nil).AnyTimes()
	docDbMock.EXPECT().GetDocuments(gomock.Any()).Return(nil, nil).AnyTimes()
	// Setup the Gin router and handler
	gin.SetMode(gin.TestMode)
	router := gin.Default()
	router.GET("/documents", GinHandleGetDocuments(userDbMock, docDbMock))
	email := "mesbah.tanvir.cs@gmail.com"
	token, _ := utils.EncodeJWTToken(email, true)
	encodedEmail := url.QueryEscape(email)
	encodedToken := url.QueryEscape(token)
	query := fmt.Sprintf("email=%s&token=%s", encodedEmail, encodedToken)

	// Define your test cases
	tests := []struct {
		name         string
		requestQuery string
		expectedCode int
	}{
		{
			name:         "ValidRequest",
			requestQuery: query,
			expectedCode: http.StatusOK,
		},
		{
			name:         "InvalidRequest",
			requestQuery: "",
			expectedCode: http.StatusBadRequest, // ok beacause we are returning empty data in the case of invalid query
		},
		// Add more test cases as needed
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Create a request to our handler
			req, _ := http.NewRequest("GET", "/documents?"+tc.requestQuery, nil)
			resp := httptest.NewRecorder()

			// Perform the request
			router.ServeHTTP(resp, req)

			// Check the status code
			if resp.Code != tc.expectedCode {
				t.Errorf("Expected status code %d, got %d", tc.expectedCode, resp.Code)
			}

			// Add more assertions as needed
		})
	}
}

func TestGinHandlePostDocuments(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	userDbMock := mock.NewMockUserDatabase(ctrl)
	docDbMock := mock.NewMockDocumentDatabase(ctrl)
	docDbMock.EXPECT().AddDocument(gomock.Any(), gomock.Any()).Return(nil).AnyTimes()

	// Setup the Gin router and handler
	gin.SetMode(gin.TestMode)
	router := gin.Default()
	router.POST("/documents", GinHandlePostDocuments(userDbMock, docDbMock))
	token, _ := utils.EncodeJWTToken("mesbah.tanvir.cs@gmail.com", true)

	tests := []struct {
		name         string
		requestJSON  string
		expectedCode int
	}{
		{
			name:         "ValidRequest",
			requestJSON:  fmt.Sprintf(`{"email":"mesbah.tanvir.cs@gmail.com", "token":"%s"}`, token),
			expectedCode: http.StatusOK,
		},
		{
			name:         "ValidRequest from browser",
			requestJSON:  fmt.Sprintf(`{"email":"mesbah.tanvir.cs@gmail.com","token":"%s","documents":[{"resource_url":"a","institute":"b","year":2024,"subject":"Bangla","uploader_uid":"asdf"}]}`, token), // Replace with actual JSON fields
			expectedCode: http.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/documents", bytes.NewBufferString(tc.requestJSON))
			req.Header.Set("Content-Type", "application/json")
			resp := httptest.NewRecorder()
			router.ServeHTTP(resp, req)
			if resp.Code != tc.expectedCode {
				t.Errorf("Expected status code %d, got %d", tc.expectedCode, resp.Code)
			}
		})
	}
}
