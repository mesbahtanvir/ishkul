//go:generate mockgen -source=login.go -destination=mock/login.go -package=mock

package handler

import (
	"context"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/handler/mock"
	"ishkul.org/backend/model"
	"ishkul.org/backend/utils"
)

func TestLoginRequest_Validate(t *testing.T) {
	type fields struct {
		Email    string
		Password string
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name: "When email is empty Then return error",
			fields: fields{
				Email:    "",
				Password: "",
			},
			wantErr: true,
		},
		{
			name: "When email is not empty Then return no error",
			fields: fields{
				Email:    "a",
				Password: "b",
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := LoginRequest{
				Email:    tt.fields.Email,
				Password: tt.fields.Password,
			}
			if err := r.Validate(); (err != nil) != tt.wantErr {
				t.Errorf("LoginRequest.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestHandleLogin(t *testing.T) {
	ctrl := gomock.NewController(t)

	type args struct {
		ctx context.Context
		db  UserDatabase
		req LoginRequest
	}

	var (
		ctx             = context.Background()
		password        = "password"
		hashPassword, _ = utils.HashPassword(password)
	)

	tests := []struct {
		name    string
		args    args
		want    LoginResponse
		wantErr bool
	}{
		{
			name: "When error from database Then return success",
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
				req: LoginRequest{
					Email:    "mesbah@tanvir.com",
					Password: password,
				},
			},
			want:    LoginResponse{},
			wantErr: true,
		},
		{
			name: "When no error but hash mismatch from database Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{PasswordHash: "mock"}, nil).
							Times(1),
					)
					return mockedDB
				}(),
				req: LoginRequest{
					Email:    "mesbah@tanvir.com",
					Password: password,
				},
			},
			want:    LoginResponse{},
			wantErr: true,
		},
		{
			name: "When password matched Then return user with token",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{FirstName: "mesbah", LastName: "tanvir", Email: "mesbah@tanvir.com", PasswordHash: hashPassword}, nil).
							Times(1),
					)
					return mockedDB
				}(),
				req: LoginRequest{
					Email:    "mesbah@tanvir.com",
					Password: password,
				},
			},
			want: LoginResponse{
				FirstName: "mesbah", LastName: "tanvir", Email: "mesbah@tanvir.com", Token: "ignore-matching",
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleLogin(tt.args.ctx, tt.args.db, tt.args.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("HandleLogin() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("FuncUnderTest() mismatch")
			}
		})
	}
}
