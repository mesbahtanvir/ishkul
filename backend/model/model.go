package model

type User struct {
	FirstName        string `json:"first_name"`
	LastName         string `json:"last_name"`
	Email            string `json:"email"`
	EmailVerified    bool   `json:"email_vefified"`
	AllowExtraEmails bool   `json:"allow_extra_email"`
	PasswordHash     string `json:"password_hash"`
}
