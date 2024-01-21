package db

import (
	"context"
	"fmt"
	"os"
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
		name    string
		ctx     context.Context
		user    model.User
		mocked  MongoCollectionInterface
		wantErr error
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
			wantErr: nil,
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
			wantErr: mongo.ErrNoDocuments,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			userDatabase := UserDatabase{collection: tc.mocked}
			err := userDatabase.AddUser(tc.ctx, tc.user)
			assert.Equal(t, tc.wantErr, err)

		})

	}

}

func TestFingUserByEmail(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	type TestCase struct {
		name     string
		ctx      context.Context
		email    string
		mocked   MongoCollectionInterface
		wantUser model.User
		wantErr  error
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
			wantUser: model.User{},
			wantErr:  nil,
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
			wantUser: model.User{},
			wantErr:  mongo.ErrNoDocuments,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			userDatabase := UserDatabase{collection: tc.mocked}
			user, err := userDatabase.FindUserByEmail(tc.ctx, tc.email)
			assert.Equal(t, tc.wantErr, err)
			assert.Equal(t, tc.wantUser, user)

		})

	}

}

func TestGetDocuments(t *testing.T) {
	t.SkipNow()
	os.Setenv("MONGODB_HOST", "localhost")
	db := MustNewMongoDocumentDatabase()
	res, err := db.GetDocuments(context.Background())
	assert.Nil(t, err)
	fmt.Print(res)
	assert.NotEmpty(t, res)
}

func TestSearchDocument(t *testing.T) {
	t.SkipNow()
	os.Setenv("MONGODB_HOST", "localhost")
	db := MustNewMongoDocumentDatabase()
	res, err := db.SearchDocument(context.Background(), "dhaka")
	assert.Nil(t, err)
	assert.NotEmpty(t, res)
}
