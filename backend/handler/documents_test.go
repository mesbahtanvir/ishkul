//go:generate mockgen -source=documents.go -destination=mock/documents.go -package=mock

package handler

import (
	"context"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"ishkul.org/backend/db"
	"ishkul.org/backend/handler/mock"
	"ishkul.org/backend/model"
	"ishkul.org/backend/utils"
)

func TestHandleAddDocument(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type args struct {
		ctx   context.Context
		docDb DocumentDatabase
		req   AddDocumentRequest
	}

	tests := []struct {
		name    string
		args    args
		want    AddDocumentResponse
		wantErr error
	}{
		{
			name: "When Invalid input return error",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					return mockDocDB
				}(),
				req: AddDocumentRequest{
					Token: "",
				},
			},
			want:    AddDocumentResponse{},
			wantErr: ErrParamTokenIsRequired,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleAddDocument(tt.args.ctx, tt.args.docDb, tt.args.req)
			assert.ErrorIs(t, err, tt.wantErr)
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("HandleValidateAccountRecover() mismatch")
			}
		})
	}

}

func TestHandleSearchDocument(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type args struct {
		ctx   context.Context
		docDb DocumentDatabase
		req   SearchDocumentRequest
	}

	tests := []struct {
		name    string
		args    args
		want    SearchDocumentResponse
		wantErr error
	}{
		{
			name: "When Invalid input return error",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					return mockDocDB
				}(),
				req: SearchDocumentRequest{
					Token: "",
				},
			},
			want:    SearchDocumentResponse{},
			wantErr: ErrParamTokenIsRequired,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleSearchDocument(tt.args.ctx, tt.args.docDb, tt.args.req)
			assert.ErrorIs(t, err, tt.wantErr)
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("HandleValidateAccountRecover() mismatch")
			}
		})
	}

}

func TestHandleGetDocument(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type args struct {
		ctx     context.Context
		storage DocumentLimitStorage
		docDb   DocumentDatabase
		req     GetDocumentRequest
	}

	tests := []struct {
		name    string
		args    args
		want    GetDocumentResponse
		wantErr error
	}{
		{
			name: "When Invalid input return error",
			args: args{
				ctx: context.Background(),
				storage: func() DocumentLimitStorage {
					mockDocDB := mock.NewMockDocumentLimitStorage(ctrl)
					return mockDocDB
				}(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					return mockDocDB
				}(),
				req: GetDocumentRequest{
					Token: "",
				},
			},
			want:    GetDocumentResponse{},
			wantErr: ErrParamTokenIsRequired,
		},
		{
			name: "When user not verified return error",
			args: args{
				ctx: context.Background(),
				storage: func() DocumentLimitStorage {
					mockDocDB := mock.NewMockDocumentLimitStorage(ctrl)
					return mockDocDB
				}(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					return mockDocDB
				}(),
				req: GetDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							FirstName:     "Mesbah",
							LastName:      "tanvir",
							Email:         "tanvir@mesbah.com",
							EmailVerified: false,
						})
						return token
					}(),
					ID: primitive.NewObjectID().Hex(),
				},
			},
			want:    GetDocumentResponse{},
			wantErr: utils.ErrUserUnverified,
		},
		{
			name: "When document view reached return error",
			args: args{
				ctx: context.Background(),
				storage: func() DocumentLimitStorage {
					mockStorage := mock.NewMockDocumentLimitStorage(ctrl)
					mockStorage.EXPECT().
						IncrUserResourceRequest(context.Background(), "get/document", "tanvir@mesbah.com", int64(100)).
						Return(db.ErrReachedDocViewLimit).
						Times(1)
					return mockStorage
				}(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					return mockDocDB
				}(),
				req: GetDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							FirstName:     "Mesbah",
							LastName:      "tanvir",
							Email:         "tanvir@mesbah.com",
							EmailVerified: true,
						})
						return token
					}(),
					ID: primitive.NewObjectID().Hex(),
				},
			},
			want:    GetDocumentResponse{},
			wantErr: db.ErrReachedDocViewLimit,
		},
		{
			name: "When resource does not exist return error",
			args: args{
				ctx: context.Background(),
				storage: func() DocumentLimitStorage {
					mockStorage := mock.NewMockDocumentLimitStorage(ctrl)
					mockStorage.EXPECT().
						IncrUserResourceRequest(context.Background(), "get/document", "tanvir@mesbah.com", int64(100)).
						Return(nil).
						Times(1)
					return mockStorage
				}(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					mockDocDB.EXPECT().
						FindDocumentByID(context.Background(), "1").
						Return(model.Document{}, ErrRequestedResourceDoesNotExist).
						Times(1)
					return mockDocDB
				}(),
				req: GetDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							FirstName:     "mesbah",
							LastName:      "tanvir",
							Email:         "tanvir@mesbah.com",
							EmailVerified: true,
						})
						return token
					}(),
					ID: "1",
				},
			},
			want:    GetDocumentResponse{},
			wantErr: ErrRequestedResourceDoesNotExist,
		},
		{
			name: "When resource is there Then return resource",
			args: args{
				ctx: context.Background(),
				storage: func() DocumentLimitStorage {
					mockStorage := mock.NewMockDocumentLimitStorage(ctrl)
					mockStorage.EXPECT().
						IncrUserResourceRequest(context.Background(), "get/document", "tanvir@mesbah.com", int64(100)).
						Return(nil).
						Times(1)
					return mockStorage
				}(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					mockDocDB.EXPECT().
						FindDocumentByID(context.Background(), "1").
						Return(model.Document{
							ResourceURL: "a.com",
						}, nil).
						Times(1)
					return mockDocDB
				}(),
				req: GetDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							FirstName:     "mesbah",
							LastName:      "tanvir",
							Email:         "tanvir@mesbah.com",
							EmailVerified: true,
						})
						return token
					}(),
					ID: "1",
				},
			},
			want:    GetDocumentResponse{ResourceURL: "a.com"},
			wantErr: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleGetDocument(tt.args.ctx, tt.args.storage, tt.args.docDb, tt.args.req)
			assert.ErrorIs(t, err, tt.wantErr)
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(GetDocumentResponse{}, "ID")) {
				t.Errorf("HandleValidateAccountRecover() mismatch")
			}
		})
	}

}
