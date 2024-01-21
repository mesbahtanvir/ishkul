//go:generate mockgen -source=verify_account.go -destination=mock/verify_account.go -package=mock

package handler

import (
	"context"
	"errors"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/db"
	"ishkul.org/backend/handler/mock"
	"ishkul.org/backend/model"
)

func TestValidateAccountRecover_Validate(t *testing.T) {
	type fields struct {
		Email string
		Code  string
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr error
	}{
		{
			name: "When email is empty Then return error",
			fields: fields{
				Email: "",
				Code:  "",
			},
			wantErr: ErrParamEmailIsRequired,
		},
		{
			name: "When email is not empty Then return no error",
			fields: fields{
				Email: "a",
				Code:  "",
			},
			wantErr: ErrParamCodeIsRequired,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := VerifyAccountRequest{
				Email: tt.fields.Email,
				Code:  tt.fields.Code,
			}
			assert.ErrorIs(t, r.Validate(), tt.wantErr)
		})
	}
}

func TestHandleValidateAccountRecover(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type args struct {
		ctx     context.Context
		storage AccountStorage
		db      UserDatabase
		req     VerifyAccountRequest
	}

	var (
		ctx = context.Background()
	)

	tests := []struct {
		name    string
		args    args
		want    VerifyAccountResponse
		wantErr error
	}{
		{
			name: "When Invalid input then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "",
				},
			},
			want:    VerifyAccountResponse{},
			wantErr: ErrParamCodeIsRequired,
		},
		{
			name: "When error from database Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{}, mongo.ErrNoDocuments).
							Times(1),
					)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    VerifyAccountResponse{},
			wantErr: ErrUserEmailDoesNotExist,
		},
		{
			name: "When error from storage Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					mockedStorage.EXPECT().RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").Return("", db.ErrRedisKeyNotFound)
					return mockedStorage
				}(),
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().FindUserByEmail(ctx, "mesbah@tanvir.com").Return(model.User{Email: "mesbah@tanvir.com"}, nil).Times(1),
					)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    VerifyAccountResponse{},
			wantErr: db.ErrRedisKeyNotFound,
		},
		{
			name: "When key mismatched Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					mockedStorage.EXPECT().RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").Return("1", nil)
					return mockedStorage
				}(),
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{Email: "mesbah@tanvir.com"}, nil).
							Times(1),
					)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    VerifyAccountResponse{},
			wantErr: ErrUserInvalidCodeProvided,
		},
		{
			name: "When failed to remove token Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					gomock.InOrder(
						mockedStorage.EXPECT().
							RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").
							Return("12", nil).
							Times(1),
						mockedStorage.EXPECT().
							RemoveAccountRecoveryKey(ctx, "mesbah@tanvir.com").
							Return(db.ErrInternalRedisOperation).
							Times(1),
					)
					return mockedStorage
				}(),
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{Email: "mesbah@tanvir.com"}, nil).
							Times(1),
					)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    VerifyAccountResponse{},
			wantErr: db.ErrInternalRedisOperation,
		},
		{
			name: "When update user failed Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					gomock.InOrder(
						mockedStorage.EXPECT().
							RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").
							Return("12", nil).
							Times(1),
						mockedStorage.EXPECT().
							RemoveAccountRecoveryKey(ctx, "mesbah@tanvir.com").
							Return(nil).
							Times(1),
					)
					return mockedStorage
				}(),
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{Email: "mesbah@tanvir.com"}, nil).
							Times(1),
						mockedDB.EXPECT().
							UpdateUser(ctx, model.User{Email: "mesbah@tanvir.com", EmailVerified: true}).
							Return(errors.New("error")).
							Times(1),
					)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    VerifyAccountResponse{},
			wantErr: ErrInternalFailedToUpdateDatabase,
		},
		{
			name: "When all smooth Then return resp",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					gomock.InOrder(
						mockedStorage.EXPECT().RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").Return("12", nil).Times(1),
						mockedStorage.EXPECT().RemoveAccountRecoveryKey(ctx, "mesbah@tanvir.com").Return(nil),
					)
					return mockedStorage
				}(),
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().FindUserByEmail(ctx, "mesbah@tanvir.com").Return(model.User{Email: "mesbah@tanvir.com"}, nil).Times(1),
						mockedDB.EXPECT().UpdateUser(ctx, model.User{Email: "mesbah@tanvir.com", EmailVerified: true}).Return(nil).Times(1),
					)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want: VerifyAccountResponse{
				LoginResponse: LoginResponse{},
			},
			wantErr: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleVerifyAccount(tt.args.ctx, tt.args.storage, tt.args.db, tt.args.req)
			assert.ErrorIs(t, err, tt.wantErr)
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("HandleValidateAccountRecover() mismatch")
			}
			if tt.wantErr == nil {
				assert.NotEmpty(t, got.LoginResponse.Token)
			}
		})
	}
}
