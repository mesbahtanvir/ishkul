package model

type User struct {
	FirstName        string `json:"first_name"` // The JSON key for this field will be "first_name"
	LastName         string `json:"last_name"`  // The JSON key for this field will be "last_name"
	Email            string `json:"email"`
	PasswordHash     string `json:"password_hash"`
	AllowExtraEmails bool   `json:"allow_extra_email"`
}
