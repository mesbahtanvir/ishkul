//go:generate mockgen -source=mongo.go -destination=mock/mongo.go -package=mock
package db

import (
	"context"
	"fmt"
	"log"
	"strconv"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
	"ishkul.org/backend/model"
	"ishkul.org/backend/utils"
)

func NewMustMongoClient() *mongo.Client {
	uri := fmt.Sprintf("%s://%s:%s/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.1.1",
		utils.GetEnvOrDefault("MONGODB_SCHEME", "mongodb"),
		utils.GetEnvOrDefault("MONGODB_HOST", "mongodb"),
		utils.GetEnvOrDefault("MONGODB_PORT", "27017"),
	)
	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	return client
}

type MongoCollectionInterface interface {
	InsertOne(ctx context.Context, document interface{}, opts ...*options.InsertOneOptions) (*mongo.InsertOneResult, error)
	InsertMany(ctx context.Context, documents []interface{}, opts ...*options.InsertManyOptions) (*mongo.InsertManyResult, error)
	FindOne(ctx context.Context, filter interface{}, opts ...*options.FindOneOptions) *mongo.SingleResult
	Find(ctx context.Context, filter interface{}, opts ...*options.FindOptions) (*mongo.Cursor, error)
	UpdateOne(ctx context.Context, filter interface{}, update interface{}, opts ...*options.UpdateOptions) (*mongo.UpdateResult, error)
}

type UserDatabase struct {
	collection MongoCollectionInterface
}

func MustNewMongoUserDatabase() *UserDatabase {
	client := NewMustMongoClient()
	user_collection := client.Database("prod").Collection("users")
	model := mongo.IndexModel{
		Keys: bson.M{
			"email": 1, // specify 1 for ascending order
		},
		Options: options.Index().SetUnique(true),
	}

	// Create one index
	_, err := user_collection.Indexes().CreateOne(context.Background(), model)
	if err != nil {
		log.Fatal(err)
	}
	return &UserDatabase{collection: user_collection}
}

func (db *UserDatabase) AddUser(ctx context.Context, user model.User) error {
	_, err := db.collection.InsertOne(ctx, user)
	return err
}

func (db *UserDatabase) UpdateUser(ctx context.Context, user model.User) error {
	filter := bson.D{{Key: "email", Value: user.Email}}
	update := bson.D{{Key: "$set", Value: user}}
	_, err := db.collection.UpdateOne(ctx, filter, update)
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

type DocumentDatabase struct {
	collection MongoCollectionInterface
}

func MustNewMongoDocumentDatabase() *DocumentDatabase {
	client := NewMustMongoClient()
	doc_collection := client.Database("prod").Collection("documents")
	indexModel := mongo.IndexModel{
		Keys: bson.M{"tags": "text"},
	}
	name, err := doc_collection.Indexes().CreateOne(context.TODO(), indexModel)
	if err != nil {
		panic(err)
	}
	zap.L().Info("mongo document index created:", zap.String("index_name", name))
	if err != nil {
		log.Fatal(err)
	}
	return &DocumentDatabase{collection: doc_collection}
}

func (db *DocumentDatabase) AddDocument(ctx context.Context, documents []model.Document) error {

	for _, doc := range documents {
		doc.Tags = []string{doc.Institute, strconv.Itoa(doc.Year), doc.Subject}
	}
	docs := make([]interface{}, len(documents))
	// Copy elements from the original array to the new slice
	for i, v := range documents {
		docs[i] = v
	}
	_, err := db.collection.InsertMany(ctx, docs)
	return err
}

func (db *DocumentDatabase) SearchDocument(ctx context.Context, query string) ([]model.Document, error) {
	filter := bson.D{{Key: "$text", Value: bson.D{{Key: "$search", Value: query}}}}
	limit := int64(100) // for example, to limit the results to 10 documents
	findOptions := options.Find()
	findOptions.SetLimit(limit)
	cursor, err := db.collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, err
	}
	var documents []model.Document
	if err := cursor.All(ctx, &documents); err != nil {
		return nil, err
	}
	return documents, nil
}

func (db *DocumentDatabase) GetDocuments(ctx context.Context) ([]model.Document, error) {
	filter := bson.D{}
	limit := int64(100) // for example, to limit the results to 10 documents
	findOptions := options.Find()
	findOptions.SetLimit(limit)
	cursor, err := db.collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, err
	}
	var documents []model.Document
	if err := cursor.All(ctx, &documents); err != nil {
		return nil, err
	}
	return documents, nil
}

func (db *DocumentDatabase) FindDocumentByID(ctx context.Context, id primitive.ObjectID) (model.Document, error) {
	filter := bson.D{{Key: "_id", Value: id}}
	var result model.Document
	err := db.collection.FindOne(ctx, filter).Decode(&result)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return model.Document{}, err
	}
	return result, nil
}
