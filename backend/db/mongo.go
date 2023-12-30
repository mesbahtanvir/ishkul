//go:generate mockgen -source=mongo.go -destination=mock/mongo.go -package=mock
package db

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"ishkul.org/backend/model"
	"ishkul.org/backend/utils"
)

type MongoCollectionInterface interface {
	InsertOne(ctx context.Context, document interface{}, opts ...*options.InsertOneOptions) (*mongo.InsertOneResult, error)
	FindOne(ctx context.Context, filter interface{}, opts ...*options.FindOneOptions) *mongo.SingleResult
}

type UserDatabase struct {
	collection MongoCollectionInterface
}

func MustNewMongoUserDatabase() *UserDatabase {
	uri := fmt.Sprintf("%s://%s:%s/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.1.1",
		utils.GetEnvOrDefault("MONGODB_SCHEME", "mongodb"),
		utils.GetEnvOrDefault("MONGODB_HOST", "mongodb"),
		utils.GetEnvOrDefault("MONGODB_PORT", "27017"),
	)
	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}
	users_coll := client.Database("prod").Collection("users")

	return &UserDatabase{collection: users_coll}
}

func (db *UserDatabase) AddUser(ctx context.Context, user model.User) error {
	_, err := db.collection.InsertOne(ctx, user)
	return err
}

func (db *UserDatabase) FindUserByEmail(ctx context.Context, email string) (model.User, error) {
	filter := bson.D{{Key: "email", Value: email}}
	var user model.User
	err := db.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return user, err
	}
	return user, nil
}
