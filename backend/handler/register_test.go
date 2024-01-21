package handler

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/handler/mock"
	"ishkul.org/backend/model"
)

func TestRegisterRequest_Validate(t *testing.T) {
	type fields struct {
		FirstName        string
		LastName         string
		Email            string
		Password         string
		AllowExtraEmails bool
	}
	type TestCase struct {
		name    string
		fields  fields
		wantErr error
	}
	tests := []TestCase{
		{
			name: "When first name is not provided Then return error",
			fields: fields{
				FirstName:        "",
				LastName:         "tanvir",
				Email:            "invalid email",
				Password:         "test",
				AllowExtraEmails: false,
			},
			wantErr: ErrParamFirstNameIsRequired,
		},
		{
			name: "When no last name Then return error",
			fields: fields{
				FirstName:        "mesbah",
				LastName:         "",
				Email:            "vaild@email",
				Password:         "test",
				AllowExtraEmails: false,
			},
			wantErr: ErrParamLastNameIsRequired,
		},
		{
			name: "When no email Then return error",
			fields: fields{
				FirstName:        "mesbah",
				LastName:         "tanvir",
				Email:            "",
				Password:         "test",
				AllowExtraEmails: false,
			},
			wantErr: ErrUserInvalidEmailAddressProvided,
		},
		{
			name: "When no password Then return error",
			fields: fields{
				FirstName:        "mesbah",
				LastName:         "tanvir",
				Email:            "test@test.com",
				Password:         "",
				AllowExtraEmails: false,
			},
			wantErr: ErrParamPasswordIsRequired,
		},
		{
			name: "When everything is provided Then return error",
			fields: fields{
				FirstName:        "mesbah",
				LastName:         "tanvir",
				Email:            "test@test.com",
				Password:         "awer62345",
				AllowExtraEmails: false,
			},
			wantErr: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := RegisterRequest{
				FirstName:        tt.fields.FirstName,
				LastName:         tt.fields.LastName,
				Email:            tt.fields.Email,
				Password:         tt.fields.Password,
				AllowExtraEmails: tt.fields.AllowExtraEmails,
			}
			assert.ErrorIs(t, r.Validate(), tt.wantErr)
		})
	}
}

func TestHandleRegister(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type args struct {
		ctx context.Context
		db  UserDatabase
		req RegisterRequest
	}

	var (
		ctx      = context.Background()
		password = "password"
		//hashPassword, _ = utils.HashPassword(password)
	)

	tests := []struct {
		name     string
		args     args
		wantResp RegisterResponse
		wantErr  error
	}{
		{
			name: "When invalid param Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					return mockedDB
				}(),
				req: RegisterRequest{
					FirstName:        "",
					LastName:         "tanvir",
					Email:            "mesbah@tanvir.com",
					Password:         password,
					AllowExtraEmails: true,
				},
			},
			wantResp: RegisterResponse{},
			wantErr:  ErrParamFirstNameIsRequired,
		},
		{
			name: "When user exists Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{}, nil).
							Times(1),
					)
					return mockedDB
				}(),
				req: RegisterRequest{
					FirstName:        "mesbah",
					LastName:         "tanvir",
					Email:            "mesbah@tanvir.com",
					Password:         password,
					AllowExtraEmails: true,
				},
			},
			wantResp: RegisterResponse{},
			wantErr:  ErrUserEmailAlreadyExists,
		},
		{
			name: "When db error Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{}, errors.New("random error occured")).
							Times(1),
					)
					return mockedDB
				}(),
				req: RegisterRequest{
					FirstName:        "mesbah",
					LastName:         "tanvir",
					Email:            "mesbah@tanvir.com",
					Password:         password,
					AllowExtraEmails: true,
				},
			},
			wantResp: RegisterResponse{},
			wantErr:  ErrInternalFailedToRetriveFromDatabase,
		},
		{
			name: "When failed to add user to database Then return error",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{}, mongo.ErrNoDocuments).
							Times(1),
						mockedDB.EXPECT().
							AddUser(ctx,
								// TODO make the commeted code work
								// gomock.Eq(
								// 	model.User{
								// 		FirstName: "mesbah",
								// 		LastName:  "tanvir",
								// 		Email:     "mesbah@tanvir.com",
								// 		//PasswordHash:     hashPassword,
								// 		AllowExtraEmails: true,
								// 	},
								// ),
								gomock.Any(),
							).
							Return(mongo.ErrNilDocument).
							Times(1),
					)
					return mockedDB
				}(),
				req: RegisterRequest{
					FirstName:        "mesbah",
					LastName:         "tanvir",
					Email:            "mesbah@tanvir.com",
					Password:         password,
					AllowExtraEmails: true,
				},
			},
			wantResp: RegisterResponse{},
			wantErr:  ErrInternalFailedToUpdateDatabase,
		},
		{
			name: "When no error from database Then return success",
			args: args{
				ctx: ctx,
				db: func() UserDatabase {
					mockedDB := mock.NewMockUserDatabase(ctrl)
					gomock.InOrder(
						mockedDB.EXPECT().
							FindUserByEmail(ctx, "mesbah@tanvir.com").
							Return(model.User{}, mongo.ErrNoDocuments).
							Times(1),
						mockedDB.EXPECT().
							AddUser(ctx,
								// TODO make the commeted code work
								// gomock.Eq(
								// 	model.User{
								// 		FirstName: "mesbah",
								// 		LastName:  "tanvir",
								// 		Email:     "mesbah@tanvir.com",
								// 		//PasswordHash:     hashPassword,
								// 		AllowExtraEmails: true,
								// 	},
								// ),
								gomock.Any(),
							).
							Return(nil).
							Times(1),
					)
					return mockedDB
				}(),
				req: RegisterRequest{
					FirstName:        "mesbah",
					LastName:         "tanvir",
					Email:            "mesbah@tanvir.com",
					Password:         password,
					AllowExtraEmails: true,
				},
			},
			wantResp: RegisterResponse{},
			wantErr:  nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotResp, err := HandleRegister(tt.args.ctx, tt.args.db, tt.args.req)
			assert.ErrorIs(t, err, tt.wantErr)
			if !reflect.DeepEqual(gotResp, tt.wantResp) {
				t.Errorf("HandleRegister() = %v, want %v", gotResp, tt.wantResp)
			}
		})
	}
}
