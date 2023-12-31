package handler

import (
	"context"
	"reflect"
	"testing"

	"github.com/golang/mock/gomock"
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
		wantErr bool
	}
	tests := []TestCase{
		{
			name: "When invalid email Then return error",
			fields: fields{
				FirstName:        "mesbah",
				LastName:         "tanvir",
				Email:            "invalid email",
				Password:         "test",
				AllowExtraEmails: false,
			},
			wantErr: true,
		},
		{
			name: "When vaild email Then no error",
			fields: fields{
				FirstName:        "mesbah",
				LastName:         "tanvir",
				Email:            "vaild@email",
				Password:         "test",
				AllowExtraEmails: false,
			},
			wantErr: false,
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
			if err := r.Validate(); (err != nil) != tt.wantErr {
				t.Errorf("RegisterRequest.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestHandleRegister(t *testing.T) {
	ctrl := gomock.NewController(t)

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
		wantErr  bool
	}{
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
			wantErr:  false,
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
			wantErr:  true,
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
			wantErr:  true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotResp, err := HandleRegister(tt.args.ctx, tt.args.db, tt.args.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("HandleRegister() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(gotResp, tt.wantResp) {
				t.Errorf("HandleRegister() = %v, want %v", gotResp, tt.wantResp)
			}
		})
	}
}
