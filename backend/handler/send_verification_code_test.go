//go:generate mockgen -source=send_verification_code.go -destination=mock/send_verification_code.go -package=mock

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

func TestSendVerificationCodeRequest_Validate(t *testing.T) {
	type fields struct {
		Email string
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name: "When email is empty Then return error",
			fields: fields{
				Email: "",
			},
			wantErr: true,
		},
		{
			name: "When email is not empty Then return no error",
			fields: fields{
				Email: "a",
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := SendVerificationCodeRequest{
				Email: tt.fields.Email,
			}
			if err := r.Validate(); (err != nil) != tt.wantErr {
				t.Errorf("LoginRequest.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestHandleSendVerificationCode(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type args struct {
		ctx         context.Context
		storage     AccountStorage
		db          UserDatabase
		emailSender EmailSender
		req         SendVerificationCodeRequest
	}

	var (
		ctx = context.Background()
	)

	tests := []struct {
		name    string
		args    args
		want    SendVerificationCodeResponse
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
				req: SendVerificationCodeRequest{
					Email: "",
				},
			},
			want:    SendVerificationCodeResponse{},
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
				req: SendVerificationCodeRequest{
					Email: "mesbah@tanvir.com",
				},
			},
			want:    SendVerificationCodeResponse{},
			wantErr: true,
		},
		{
			name: "When failed to send notification Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					return mockedStorage
				}(),
				emailSender: func() EmailSender {
					mockSender := mock.NewMockEmailSender(ctrl)
					gomock.InOrder(
						mockSender.EXPECT().
							SendVerificationCode(ctx, "mesbah@tanvir.com", gomock.Any()).
							Return(ErrFailedToSendVerificationCode).
							Times(1),
					)
					return mockSender
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
				req: SendVerificationCodeRequest{
					Email: "mesbah@tanvir.com",
				},
			},
			want:    SendVerificationCodeResponse{},
			wantErr: true,
		},
		{
			name: "When error from storage Then return error",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					mockedStorage.EXPECT().StoreAccountRecoveryKey(ctx, "mesbah@tanvir.com", gomock.Any()).Return(db.ErrRedisKeyNotFound)
					return mockedStorage
				}(),
				emailSender: func() EmailSender {
					mockSender := mock.NewMockEmailSender(ctrl)
					gomock.InOrder(
						mockSender.EXPECT().
							SendVerificationCode(ctx, "mesbah@tanvir.com", gomock.Any()).
							Return(nil).
							Times(1),
					)
					return mockSender
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
				req: SendVerificationCodeRequest{
					Email: "mesbah@tanvir.com",
				},
			},
			want:    SendVerificationCodeResponse{},
			wantErr: true,
		},
		{
			name: "When no error then return ok",
			args: args{
				ctx: ctx,
				storage: func() AccountStorage {
					mockedStorage := mock.NewMockAccountStorage(ctrl)
					gomock.InOrder(
						mockedStorage.EXPECT().
							StoreAccountRecoveryKey(ctx, "mesbah@tanvir.com", gomock.Any()).
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
					)
					return mockedDB
				}(),

				emailSender: func() EmailSender {
					mockSender := mock.NewMockEmailSender(ctrl)
					gomock.InOrder(
						mockSender.EXPECT().
							SendVerificationCode(ctx, "mesbah@tanvir.com", gomock.Any()).
							Return(nil).
							Times(1),
					)
					return mockSender
				}(),

				req: SendVerificationCodeRequest{
					Email: "mesbah@tanvir.com",
				},
			},
			want:    SendVerificationCodeResponse{},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := HandleSendVerificationCode(tt.args.ctx, tt.args.storage, tt.args.db, tt.args.emailSender, tt.args.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("HandleAccountRecover() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !cmp.Equal(tt.want, got, cmpopts.IgnoreFields(LoginResponse{}, "Token")) {
				t.Errorf("HandleAccountRecover() mismatch")
			}
		})
	}
}
