package db

import (
	"context"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"ishkul.org/backend/db/mock"
	"ishkul.org/backend/model"
)

func TestAddUser(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type TestCase struct {
		name       string
		ctx        context.Context
		user       model.User
		mocked     MongoCollectionInterface
		expect_err error
	}

	testCases := []TestCase{
		{
			name: "When no error from db Then return no error",
			ctx:  context.Background(),
			user: model.User{},
			mocked: func() MongoCollectionInterface {
				mockCollection := mock.NewMockMongoCollectionInterface(ctrl)
				mockCollection.EXPECT().InsertOne(context.Background(), model.User{}).Return(nil, nil).Times(1)
				return mockCollection
			}(),
			expect_err: nil,
		},
		{
			name: "When error from db Then return error",
			ctx:  context.Background(),
			user: model.User{},
			mocked: func() MongoCollectionInterface {
				mockCollection := mock.NewMockMongoCollectionInterface(ctrl)
				mockCollection.EXPECT().InsertOne(context.Background(), model.User{}).Return(nil, mongo.ErrNoDocuments).Times(1)
				return mockCollection
			}(),
			expect_err: mongo.ErrNoDocuments,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			userDatabase := UserDatabase{collection: tc.mocked}
			err := userDatabase.AddUser(tc.ctx, tc.user)
			assert.Equal(t, tc.expect_err, err)

		})

	}

}

func TestFingUserByEmail(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type TestCase struct {
		name        string
		ctx         context.Context
		email       string
		mocked      MongoCollectionInterface
		expect_user model.User
		expect_err  error
	}

	testCases := []TestCase{
		{
			name:  "When no error from db Then return no error",
			ctx:   context.Background(),
			email: "abc@gmail.com",
			mocked: func() MongoCollectionInterface {
				mockCollection := mock.NewMockMongoCollectionInterface(ctrl)
				mockCollection.EXPECT().FindOne(
					context.Background(), bson.D{{Key: "email", Value: "abc@gmail.com"}},
				).Return(mongo.NewSingleResultFromDocument(model.User{}, nil, nil)).Times(1)
				return mockCollection
			}(),
			expect_user: model.User{},
			expect_err:  nil,
		},
		{
			name:  "When error from db Then return error",
			ctx:   context.Background(),
			email: "abc@gmail.com",
			mocked: func() MongoCollectionInterface {
				mockCollection := mock.NewMockMongoCollectionInterface(ctrl)
				mockCollection.EXPECT().FindOne(context.Background(), bson.D{{Key: "email", Value: "abc@gmail.com"}}).Return(
					mongo.NewSingleResultFromDocument(model.User{}, mongo.ErrNoDocuments, nil),
				).Times(1)
				return mockCollection
			}(),
			expect_user: model.User{},
			expect_err:  mongo.ErrNoDocuments,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			userDatabase := UserDatabase{collection: tc.mocked}
			user, err := userDatabase.FindUserByEmail(tc.ctx, tc.email)
			assert.Equal(t, tc.expect_err, err)
			assert.Equal(t, tc.expect_user, user)

		})

	}

}
