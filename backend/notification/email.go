package notification

import (

	//go get -u github.com/aws/aws-sdk-go

	"context"
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
	"go.uber.org/zap"
)

const (
	// Replace sender@example.com with your "From" address.
	// This address must be verified with Amazon SES.
	Sender = "no-reply@ishkul.org"

	// Replace recipient@example.com with a "To" address. If your account
	// is still in the sandbox, this address must be verified.
	Recipient = "mesbah.tanvir.cs@gmail.com"

	// Specify a configuration set. To use a configuration
	// set, comment the next line and line 92.
	//ConfigurationSet = "ConfigSet"

	// The subject line for the email.
	Subject = "app.ishkul.org Verification code"
	// The HTML body for the email.
	HtmlBody = "<h1>app.ishkul.org Verification code</h1>"
	//The email body for recipients with non-HTML email clients.
	TextBody = "This email was sent with Amazon SES using the AWS SDK for Go."
	// The character encoding for the email.
	CharSet = "UTF-8"
)

type EmailNotificationSender struct {
	svc *ses.SES
}

func MustNewEmailNotificationSender() *EmailNotificationSender {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String("ap-southeast-1")},
	)
	if err != nil {
		zap.L().Fatal("failed to initiate email sender", zap.Error(err))
	}
	svc := ses.New(sess)
	return &EmailNotificationSender{svc: svc}
}

type EmailContent struct {
	sender    string
	recipient string
	subject   string
	htmlBody  string
	textBody  string
}

func SimpleEmailFormatter(content EmailContent) *ses.SendEmailInput {
	return &ses.SendEmailInput{
		Destination: &ses.Destination{
			CcAddresses: []*string{},
			ToAddresses: []*string{
				aws.String(content.recipient),
			},
		},
		Message: &ses.Message{
			Body: &ses.Body{
				Html: &ses.Content{
					Charset: aws.String("UTF-8"),
					Data:    aws.String(content.htmlBody),
				},
				Text: &ses.Content{
					Charset: aws.String("UTF-8"),
					Data:    aws.String(content.textBody),
				},
			},
			Subject: &ses.Content{
				Charset: aws.String("UTF-8"),
				Data:    aws.String(content.subject),
			},
		},
		Source: aws.String(content.sender),
	}
}

func (es *EmailNotificationSender) SendVerificationCode(ctx context.Context, email string, code string) error {
	input := SimpleEmailFormatter(EmailContent{
		sender:    "no-reply@ishkul.org",
		recipient: email,
		subject:   "app.ishkul.org Verification Code",
		htmlBody: fmt.Sprintf(`
		<p1> The verification code is: %s, code is valid for 15 minutes.</p1>			
		`, code),
		textBody: fmt.Sprintf("The verification code is: %s, code is valid for 15 minutes.", code),
	})

	// do not wait, do not return error even if fails
	go func() {
		_, err := es.svc.SendEmail(input)
		if err != nil {
			zap.L().Error("failed to send notification", zap.Any("input", input), zap.Error(err))
		}
	}()

	return nil
}
