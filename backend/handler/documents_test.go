//go:generate mockgen -source=documents.go -destination=mock/documents.go -package=mock

package handler

import (
	"context"
	"errors"
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
		{
			name: "When not authenticated user input then return error",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					return mockDocDB
				}(),
				req: AddDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							EmailVerified: false,
						})
						return token
					}(),
				},
			},
			want:    AddDocumentResponse{},
			wantErr: utils.ErrUserUnverified,
		},
		{
			name: "When not authenticated user input then return error",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					return mockDocDB
				}(),
				req: AddDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							EmailVerified: true,
						})
						return token
					}(),
				},
			},
			want:    AddDocumentResponse{},
			wantErr: utils.ErrUserNotAnAdmin,
		},
		{
			name: "When db return error then return error",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					mockDocDB.EXPECT().AddDocument(context.Background(), []model.Document{
						{
							ResourceURL: "a.com",
							Institute:   "a",
							Year:        2024,
							Tags:        []string{"tag1", "a", "2024"},
						},
						{
							ResourceURL: "a2.com",
							Institute:   "a2",
							Year:        2024,
							Tags:        []string{"tag2", "a2", "2024"},
						},
					}).Return(errors.New("error")).Times(1)
					return mockDocDB
				}(),
				req: AddDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							Email:         "mesbah.tanvir.cs@gmail.com",
							EmailVerified: true,
						})
						return token
					}(),
					Documents: []Document{
						{
							ResourceURL: "a.com",
							Institute:   "a",
							Year:        2024,
							Tags:        []string{"tag1"},
						},
						{
							ResourceURL: "a2.com",
							Institute:   "a2",
							Year:        2024,
							Tags:        []string{"tag2"},
						},
					},
				},
			},
			want:    AddDocumentResponse{},
			wantErr: ErrInternalFailedToRetriveFromDatabase,
		},
		{
			name: "When db return no error then return no error",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					mockDocDB.EXPECT().AddDocument(context.Background(), []model.Document{
						{
							ResourceURL: "a.com",
							Institute:   "a",
							Year:        2024,
							Tags:        []string{"tag1", "a", "2024"},
						},
						{
							ResourceURL: "a2.com",
							Institute:   "a2",
							Year:        2024,
							Tags:        []string{"tag2", "a2", "2024"},
						},
					}).Return(nil).Times(1)
					return mockDocDB
				}(),
				req: AddDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							Email:         "mesbah.tanvir.cs@gmail.com",
							EmailVerified: true,
						})
						return token
					}(),
					Documents: []Document{
						{
							ResourceURL: "a.com",
							Institute:   "a",
							Year:        2024,
							Tags:        []string{"tag1"},
						},
						{
							ResourceURL: "a2.com",
							Institute:   "a2",
							Year:        2024,
							Tags:        []string{"tag2"},
						},
					},
				},
			},
			want:    AddDocumentResponse{},
			wantErr: nil,
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
		{
			name: "When user not authenticated Then return error",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					return mockDocDB
				}(),
				req: SearchDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							EmailVerified: false,
						})
						return token
					}(),
				},
			},
			want:    SearchDocumentResponse{},
			wantErr: utils.ErrUserUnverified,
		},
		{
			name: "failed to load to  Then return error",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					mockDocDB.EXPECT().SearchDocument(context.Background(), "").Return(nil, errors.New("error"))
					return mockDocDB
				}(),
				req: SearchDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							EmailVerified: true,
						})
						return token
					}(),
				},
			},
			want:    SearchDocumentResponse{},
			wantErr: ErrInternalFailedToRetriveFromDatabase,
		},
		{
			name: "doc db return some results Then return doc",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					mockDocDB.EXPECT().SearchDocument(context.Background(), "").Return([]model.Document{
						{
							Institute: "test_in",
							Year:      2024,
							Tags:      []string{"a"},
						},
					}, nil)
					return mockDocDB
				}(),
				req: SearchDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							EmailVerified: true,
						})
						return token
					}(),
				},
			},
			want: SearchDocumentResponse{
				Documents: []DocumentNoUrl{
					{
						Institute: "test_in",
						Year:      int(2024),
						Tags:      []string{"a"},
					},
				},
			},
			wantErr: nil,
		},
		{
			name: "doc db return no results Then call GetDocuments",
			args: args{
				ctx: context.Background(),
				docDb: func() DocumentDatabase {
					mockDocDB := mock.NewMockDocumentDatabase(ctrl)
					mockDocDB.EXPECT().SearchDocument(context.Background(), "").Return([]model.Document{}, nil)
					mockDocDB.EXPECT().GetDocuments(context.Background()).Return([]model.Document{
						{
							Institute: "test_in",
							Year:      2024,
							Tags:      []string{"a"},
						},
					}, nil)
					return mockDocDB
				}(),
				req: SearchDocumentRequest{
					Token: func() string {
						token, _ := utils.EncodeJWTToken(model.User{
							EmailVerified: true,
						})
						return token
					}(),
				},
			},
			want: SearchDocumentResponse{
				Documents: []DocumentNoUrl{
					{
						Institute: "test_in",
						Year:      int(2024),
						Tags:      []string{"a"},
					},
				},
			},
			wantErr: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleSearchDocument(tt.args.ctx, tt.args.docDb, tt.args.req)
			assert.ErrorIs(t, err, tt.wantErr)
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(DocumentNoUrl{}, "ID")) {
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
			name: "When Invalid resource id Then error",
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
					Token: "asdfasdf",
				},
			},
			want:    GetDocumentResponse{},
			wantErr: ErrParamIdIsRequired,
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
