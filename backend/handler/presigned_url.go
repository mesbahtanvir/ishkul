package handler

import (
	"context"

	"go.uber.org/zap"
	"ishkul.org/backend/utils"
)

type PresignedURLRequest struct {
	Token string `json:"token" form:"token"`
}

func (a *PresignedURLRequest) Validate() error {
	if a.Token == "" {
		return ErrParamTokenIsRequired
	}
	return nil
}

type PresignedURLResponse struct {
	SignedURL string `json:"signed_url"`
}

type SignedURLGenerator interface {
	GetPresignedURL(ctx context.Context) (string, error)
}

func HandlePresignedURL(ctx context.Context, userDatabase UserDatabase, signer SignedURLGenerator, req PresignedURLRequest) (PresignedURLResponse, error) {
	if err := req.Validate(); err != nil {
		return PresignedURLResponse{}, err
	}
	if err := utils.IsAuthenticatedContributor(req.Token); err != nil {
		zap.L().Info("Reject as user not contributor", zap.Error(err))
		return PresignedURLResponse{}, err
	}
	signedURL, err := signer.GetPresignedURL(ctx)
	if err != nil {
		zap.L().Error("failed to sign url", zap.Error(err))
		return PresignedURLResponse{}, err
	}
	return PresignedURLResponse{SignedURL: signedURL}, nil
}
