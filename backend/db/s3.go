//go:generate mockgen -source=mongo.go -destination=mock/mongo.go -package=mock
package db

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"ishkul.org/backend/utils"
)

type S3Storage struct {
	bucket string
	svc    *s3.S3
}

func MustNewS3Storage() *S3Storage {
	region := utils.GetEnvOrDefault("REGION", "ap-southeast-1")
	sess, err := session.NewSession(
		&aws.Config{
			Region: &region,
		},
	)
	if err != nil {
		zap.L().Fatal("failed to ", zap.Error(err))
	}
	svc := s3.New(sess)
	bucket := utils.GetEnvOrDefault("S3_BUCKET", "ishkul-storage")

	zap.L().Info("s3 storage connected with", zap.String("region", region), zap.String("bucket", bucket))
	return &S3Storage{bucket: bucket, svc: svc}
}

func (s3Storage *S3Storage) GetPresignedURL(ctx context.Context) (string, error) {
	uuidStr := uuid.New().String()
	req, _ := s3Storage.svc.GetObjectRequest(&s3.GetObjectInput{
		Bucket: &s3Storage.bucket,
		Key:    &uuidStr,
	})
	urlStr, err := req.Presign(15 * time.Minute)
	if err != nil {
		zap.L().Error("failed to presign url", zap.Error(err))
		return "", err
	}
	return urlStr, nil
}
