//go:generate mockgen -source=account_verify_ownership.go -destination=mock/account_verify_ownership.go -package=mock

package handler

import (
	"context"
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
		storage AccountRecoverStorage
		db      UserDatabase
		req     ValidateAccountRecoverRequest
	}

	var (
		ctx = context.Background()
	)

	tests := []struct {
		name    string
		args    args
		want    ValidateAccountRecoverResponse
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
				req: ValidateAccountRecoverRequest{
					Email: "mesbah@tanvir.com",
					Code:  "",
				},
			},
			want:    ValidateAccountRecoverResponse{},
			wantErr: true,
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
				req: ValidateAccountRecoverRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    ValidateAccountRecoverResponse{},
			wantErr: true,
		},
		{
			name: "When error from storage Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountRecoverStorage {
					mockedStorage := mock.NewMockAccountRecoverStorage(ctrl)
					mockedStorage.EXPECT().RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").Return("", &db.ErrKeyNotFound{})
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
				req: ValidateAccountRecoverRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    ValidateAccountRecoverResponse{},
			wantErr: true,
		},
		{
			name: "When key mismatched Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountRecoverStorage {
					mockedStorage := mock.NewMockAccountRecoverStorage(ctrl)
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
				req: ValidateAccountRecoverRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want:    ValidateAccountRecoverResponse{},
			wantErr: true,
		},
		{
			name: "When key matched Then return token",
			args: args{
				ctx: ctx,
				storage: func() AccountRecoverStorage {
					mockedStorage := mock.NewMockAccountRecoverStorage(ctrl)
					gomock.InOrder(
						mockedStorage.EXPECT().
							RetriveAccountRecoveryKey(ctx, "mesbah@tanvir.com").
							Return("12", nil).
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
				req: ValidateAccountRecoverRequest{
					Email: "mesbah@tanvir.com",
					Code:  "12",
				},
			},
			want: ValidateAccountRecoverResponse{
				LoginResponse: LoginResponse{Email: "mesbah@tanvir.com"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleValidateAccountRecover(tt.args.ctx, tt.args.storage, tt.args.db, tt.args.req)
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
