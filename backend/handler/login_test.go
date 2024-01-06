//go:generate mockgen -source=login.go -destination=mock/login.go -package=mock

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
		name   string
		fields fields
		err    error
	}{
		{
			name: "When email is empty Then return error",
			fields: fields{
				Email:    "",
				Password: "",
			},
			err: ErrParamEmailIsRequired,
		},
		{
			name: "When password empty Then return error",
			fields: fields{
				Email:    "a",
				Password: "",
			},
			err: ErrParamPasswordIsRequired,
		},
		{
			name: "When all parameter provided then return  no error",
			fields: fields{
				Email:    "a",
				Password: "b",
			},
			err: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := LoginRequest{
				Email:    tt.fields.Email,
				Password: tt.fields.Password,
			}
			assert.ErrorIs(t, r.Validate(), tt.err)
		})
	}
}

func TestHandleLogin(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

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
		wantErr error
	}{
		{
			name: "When invalid param Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					return mockedDB
				}(),
				req: LoginRequest{
					Email:    "",
					Password: password,
				},
			},
			want:    LoginResponse{},
			wantErr: ErrParamEmailIsRequired,
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
				req: LoginRequest{
					Email:    "mesbah@tanvir.com",
					Password: password,
				},
			},
			want:    LoginResponse{},
			wantErr: ErrUserEmailDoesNotExist,
		},
		{
			name: "When other error from database Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{}, errors.New("fail to request")).
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
			wantErr: ErrInternalFailedToRetriveFromDatabase,
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
			wantErr: ErrUserEmailAndPasswordMismatched,
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
				Token: "ignore-matching",
			},
			wantErr: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleLogin(tt.args.ctx, tt.args.db, tt.args.req)
			assert.ErrorIs(t, err, tt.wantErr)
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("FuncUnderTest() mismatch")
			}
		})
	}
}
