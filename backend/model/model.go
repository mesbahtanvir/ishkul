package model

import "go.mongodb.org/mongo-driver/bson/primitive"

type Subject string

const (
	Bangla        Subject = "Bangla"
	English       Subject = "English"
	Math          Subject = "Mathematics"
	Science       Subject = "Science"
	SocialScience Subject = "Scocial Science"
	Biology       Subject = "Biology"
	Chemistry     Subject = "Chemistry"
	HigherMath    Subject = "Higher Mathematics"
	Religion      Subject = "Religion"
)

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
	Subject     Subject            `bson:"subject,omitempty"`
	Uplaoder    primitive.ObjectID `bson:"uploader_uid"`
	Tags        []string           `bson:"tags,omitempty"`
}
