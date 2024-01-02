package model

import "go.mongodb.org/mongo-driver/bson/primitive"

type Subject string

type User struct {
	ID               primitive.ObjectID `bson:"_id,omitempty"`
	FirstName        string             `bson:"first_name"`
	LastName         string             `bson:"last_name"`
	Email            string             `bson:"email"`
	EmailVerified    bool               `bson:"email_vefified"`
	AllowExtraEmails bool               `bson:"allow_extra_email"`
	PasswordHash     string             `bson:"password_hash"`
}

type Document struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	ResourceURL string             `bson:"resource_url"`
	Institute   string             `bson:"institute,omitempty"`
	Year        int                `bson:"year,omitempty"`
	Tags        []string           `bson:"tags,omitempty"`
}
