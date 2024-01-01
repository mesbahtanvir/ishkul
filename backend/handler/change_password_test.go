//go:generate mockgen -source=change_password.go -destination=mock/change_password.go -package=mock

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
	"ishkul.org/backend/utils"
)

func TestChangePassword_Validate(t *testing.T) {
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

func TestHandleChangePassword(t *testing.T) {
	ctrl := gomock.NewController(t)

	type args struct {
		ctx context.Context
		db  UserDatabase
		req ChangePasswordRequest
	}

	var (
		ctx                       = context.Background()
		password                  = "password"
		valid_unverified_token, _ = utils.EncodeJWTToken("mesbah@tanvir.com", false)
		valid_verified_token, _   = utils.EncodeJWTToken("mesbah@tanvir.com", true)

		invalid_token = "2342345"
		new_passowrd  = "123"
	)

	tests := []struct {
		name    string
		args    args
		want    ChangePasswordResponse
		wantErr bool
	}{
		{
			name: "When invalid input Then return Error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					return mockedDB
				}(),
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					Token:       "",
					NewPassword: new_passowrd,
				},
			},
			want:    ChangePasswordResponse{},
			wantErr: true,
		},
		{
			name: "When Invalid token Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					return mockedDB
				}(),
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					Token:       invalid_token,
					NewPassword: new_passowrd,
				},
			},
			want:    ChangePasswordResponse{},
			wantErr: true,
		},
		{
			name: "When user unverified Then return Error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					return mockedDB
				}(),
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					Token:       valid_unverified_token,
					NewPassword: new_passowrd,
				},
			},
			want:    ChangePasswordResponse{},
			wantErr: true,
		},
		{
			name: "When error from database Then return Error",
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
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					Token:       valid_verified_token,
					NewPassword: new_passowrd,
				},
			},
			want:    ChangePasswordResponse{},
			wantErr: true,
		},

		{
			name: "When update user failed Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{FirstName: "mesbah", LastName: "tanvir", Email: "mesbah@tanvir.com", PasswordHash: "passwordhash"}, nil).
							Times(1),
						mockedDB.EXPECT().
							UpdateUser(ctx, gomock.Any()).
							Return(&db.ErrKeyNotFound{}).
							Times(1),
					)
					return mockedDB
				}(),
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					Token:       valid_verified_token,
					NewPassword: password,
				},
			},
			want:    ChangePasswordResponse{},
			wantErr: true,
		},
		{
			name: "When token matched and things arer stored Then return token",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{FirstName: "mesbah", LastName: "tanvir", Email: "mesbah@tanvir.com", PasswordHash: "passwordhash"}, nil).
							Times(1),
						mockedDB.EXPECT().
							UpdateUser(ctx, gomock.Any()).
							Return(nil).
							Times(1),
					)
					return mockedDB
				}(),
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					Token:       valid_verified_token,
					NewPassword: password,
				},
			},
			want: ChangePasswordResponse{
				LoginResponse: LoginResponse{
					FirstName: "mesbah",
					LastName:  "tanvir",
					Email:     "mesbah@tanvir.com",
					Token:     "pass",
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleChangePassword(tt.args.ctx, tt.args.db, tt.args.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("HandleChangePassword() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("FuncUnderTest() mismatch")
			}
		})
	}
}
