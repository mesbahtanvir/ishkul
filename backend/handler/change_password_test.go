//go:generate mockgen -source=change_password.go -destination=mock/change_password.go -package=mock

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

func TestChangePassword_Validate(t *testing.T) {
	type fields struct {
		Email       string
		OldPassword string
		NewPassword string
		Token       string
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr error
	}{
		{
			name: "When email is empty Then return error",
			fields: fields{
				Email:       "",
				NewPassword: "",
				Token:       "",
			},
			wantErr: ErrParamEmailIsRequired,
		},
		{
			name: "When old passwrod is not empty Then return  error",
			fields: fields{
				Email:       "a",
				OldPassword: "",
				NewPassword: "c",
				Token:       "b",
			},
			wantErr: ErrParamOldPasswordIsRequired,
		},
		{
			name: "When passwrod is empty Then return ",
			fields: fields{
				Email:       "a",
				OldPassword: "c",
				NewPassword: "",
				Token:       "",
			},
			wantErr: ErrParamPasswordIsRequired,
		},
		{
			name: "When token is empty Then return ",
			fields: fields{
				Email:       "a",
				OldPassword: "c",
				NewPassword: "d",
				Token:       "",
			},
			wantErr: ErrParamTokenIsRequired,
		},
		{
			name: "When  everything is passed Then return no error",
			fields: fields{
				Email:       "a",
				OldPassword: "c",
				NewPassword: "d",
				Token:       "t",
			},
			wantErr: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := ChangePasswordRequest{
				Email:       tt.fields.Email,
				OldPassword: tt.fields.OldPassword,
				NewPassword: tt.fields.NewPassword,
				Token:       tt.fields.Token,
			}
			err := r.Validate()
			assert.ErrorIs(t, err, tt.wantErr)
		})
	}
}

func TestHandleChangePassword(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type args struct {
		ctx context.Context
		db  UserDatabase
		req ChangePasswordRequest
	}

	var (
		ctx                       = context.Background()
		old_password              = "old_password"
		new_password              = "new_password"
		old_password_hash, _      = utils.HashPassword(old_password)
		valid_unverified_token, _ = utils.EncodeJWTToken(model.User{Email: "mesbah@tanvir.com", EmailVerified: false})
		valid_verified_token, _   = utils.EncodeJWTToken(model.User{Email: "mesbah@tanvir.com", EmailVerified: true})
		invalid_token             = "2342345"
		new_passowrd              = "123"
	)

	tests := []struct {
		name string
		args args
		want ChangePasswordResponse
		err  error
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
					OldPassword: "pass",
					NewPassword: new_passowrd,
					Token:       "",
				},
			},
			want: ChangePasswordResponse{},
			err:  ErrParamTokenIsRequired,
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
					OldPassword: old_password,
					NewPassword: new_passowrd,
					Token:       invalid_token,
				},
			},
			want: ChangePasswordResponse{},
			err:  utils.ErrUserTokenIsInvalid,
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
					OldPassword: old_password,
					NewPassword: new_password,
					Token:       valid_unverified_token,
				},
			},
			want: ChangePasswordResponse{},
			err:  utils.ErrUserUnverified,
		},
		{
			name: "When no document error from database Then return Error",
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
					OldPassword: old_password,
					NewPassword: new_password,
					Token:       valid_verified_token,
				},
			},
			want: ChangePasswordResponse{},
			err:  ErrUserEmailDoesNotExist,
		},
		{
			name: "When unknown error from database Then return Error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{}, errors.New("error")).
							Times(1),
					)
					return mockedDB
				}(),
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					OldPassword: old_password,
					NewPassword: new_password,
					Token:       valid_verified_token,
				},
			},
			want: ChangePasswordResponse{},
			err:  ErrInternalFailedToRetriveFromDatabase,
		},

		{
			name: "When old password fail to match Then return Error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{FirstName: "mesbah", LastName: "tanvir", Email: "mesbah@tanvir.com", PasswordHash: "wrong_hash"}, nil).
							Times(1),
					)
					return mockedDB
				}(),
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					OldPassword: old_password,
					NewPassword: new_password,
					Token:       valid_verified_token,
				},
			},
			want: ChangePasswordResponse{},
			err:  ErrUserProvidedPasswordDidntMatchTheRecord,
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
							Return(model.User{FirstName: "mesbah", LastName: "tanvir", Email: "mesbah@tanvir.com", PasswordHash: old_password_hash}, nil).
							Times(1),
						mockedDB.EXPECT().
							UpdateUser(ctx, gomock.Any()).
							Return(errors.New("not found")).
							Times(1),
					)
					return mockedDB
				}(),
				req: ChangePasswordRequest{
					Email:       "mesbah@tanvir.com",
					OldPassword: old_password,
					NewPassword: new_password,
					Token:       valid_verified_token,
				},
			},
			want: ChangePasswordResponse{},
			err:  ErrInternalFailedToUpdateDatabase,
		},
		{
			name: "When token matched and things are stored Then return token",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{FirstName: "mesbah", LastName: "tanvir", Email: "mesbah@tanvir.com", PasswordHash: old_password_hash}, nil).
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
					OldPassword: old_password,
					NewPassword: new_password,
					Token:       valid_verified_token,
				},
			},
			want: ChangePasswordResponse{
				LoginResponse: LoginResponse{
					Token: "pass",
				},
			},
			err: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleChangePassword(tt.args.ctx, tt.args.db, tt.args.req)
			assert.ErrorIs(t, err, tt.err)
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("FuncUnderTest() mismatch")
			}
		})
	}
}
