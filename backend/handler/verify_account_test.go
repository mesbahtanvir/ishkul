//go:generate mockgen -source=verify_account.go -destination=mock/verify_account.go -package=mock

package handler

import (
	"context"
	"errors"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/db"
	"ishkul.org/backend/handler/mock"
	"ishkul.org/backend/model"
)

func TestValidateAccountRecover_Validate(t *testing.T) {
	type fields struct {
		Email       string
		Token       string
		NewPassword string
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name: "When email is empty Then return error",
			fields: fields{
				Email:       "",
				Token:       "",
				NewPassword: "",
			},
			wantErr: true,
		},
		{
			name: "When email is not empty Then return no error",
			fields: fields{
				Email:       "a",
				Token:       "b",
				NewPassword: "c",
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := ChangePasswordRequest{
				Email:       tt.fields.Email,
				Token:       tt.fields.Token,
				NewPassword: tt.fields.NewPassword,
			}
			if err := r.Validate(); (err != nil) != tt.wantErr {
				t.Errorf("LoginRequest.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestHandleValidateAccountRecover(t *testing.T) {
	ctrl := gomock.NewController(t)

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
		wantErr bool
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
			wantErr: true,
		},
		{
			name: "When error from database Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().FindUserByEmail(ctx, "mesbah@tanvir.com").Return(model.User{}, mongo.ErrNoDocuments).Times(1),
					)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    VerifyAccountResponse{},
			wantErr: true,
		},
		{
			name: "When error from storage Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					mockedStorage.EXPECT().RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").Return("", &db.ErrKeyNotFound{})
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
			wantErr: true,
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
			wantErr: true,
		},
		{
			name: "When failed to remove token Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					mockedStorage.EXPECT().RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").Return("12", nil).Times(1)
					mockedStorage.EXPECT().RemoveAccountRecoveryKey(ctx, "mesbah@tanvir.com").Return(errors.New("failed")).Times(1)
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
			wantErr: true,
		},
		{
			name: "When update user failed Then return error",
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
						mockedDB.EXPECT().UpdateUser(ctx, model.User{Email: "mesbah@tanvir.com", EmailVerified: true}).Return(errors.New("error")).Times(1),
					)
					return mockedDB
				}(),
				req: VerifyAccountRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    VerifyAccountResponse{},
			wantErr: true,
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
				LoginResponse: LoginResponse{Email: "mesbah@tanvir.com", EmailVerified: true},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleVerifyAccount(tt.args.ctx, tt.args.storage, tt.args.db, tt.args.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("HandleValidateAccountRecover() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("HandleValidateAccountRecover() mismatch")
			}
		})
	}
}
