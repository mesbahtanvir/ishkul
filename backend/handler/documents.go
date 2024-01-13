package handler

import (
	"context"

	"go.uber.org/zap"
	"ishkul.org/backend/model"
	"ishkul.org/backend/utils"
)

type Document struct {
	ID          string   `json:"id,omitempty" form:"id"`
	ResourceURL string   `json:"resource_url" form:"resource_url"`
	Institute   string   `json:"institute" form:"institute"`
	Year        int      `json:"year" form:"year"`
	Tags        []string `json:"tags" form:"tags"`
}

type AddDocumentRequest struct {
	Token     string     `json:"token" form:"token"`
	Documents []Document `json:"documents" form:"documents"`
}

func (a *AddDocumentRequest) Validate() error {
	if a.Token == "" {
		return ErrParamTokenIsRequired
	}
	return nil
}

type AddDocumentResponse struct{}

type DocumentDatabase interface {
	AddDocument(ctx context.Context, documents []model.Document) error
	FindDocumentByID(ctx context.Context, id string) (model.Document, error)
	SearchDocument(ctx context.Context, query string) ([]model.Document, error)
	GetDocuments(ctx context.Context) ([]model.Document, error)
}

type DocumentLimitStorage interface {
	IncrUserResourceRequest(ctx context.Context, endpoint string, userID string, limit int64) error
}

func HandleAddDocument(ctx context.Context, docdb DocumentDatabase, req AddDocumentRequest) (AddDocumentResponse, error) {
	if err := req.Validate(); err != nil {
		return AddDocumentResponse{}, err
	}

	if err := utils.IsAuthenticatedAdmin(req.Token); err != nil {
		zap.L().Info("Reject as user not admin", zap.Error(err))
		return AddDocumentResponse{}, err
	}

	docs := make([]model.Document, len(req.Documents))
	for i := 0; i < len(req.Documents); i++ {
		docs[i] = model.Document{
			ResourceURL: req.Documents[i].ResourceURL,
			Institute:   req.Documents[i].Institute,
			Year:        req.Documents[i].Year,
			Tags:        req.Documents[i].Tags,
		}
	}
	if err := docdb.AddDocument(ctx, docs); err != nil {
		return AddDocumentResponse{}, ErrInternalFailedToRetriveFromDatabase
	}
	return AddDocumentResponse{}, nil
}

type SearchDocumentRequest struct {
	Token string `json:"token" form:"token"`
	Query string `json:"query" form:"query"`
}

func (a *SearchDocumentRequest) Validate() error {
	if a.Token == "" {
		return ErrParamTokenIsRequired
	}
	return nil
}

type DocumentNoUrl struct {
	ID        string   `json:"id" form:"id"`
	Institute string   `json:"institute" form:"institute"`
	Year      int      `json:"year" form:"year"`
	Tags      []string `json:"tags" form:"tags"`
}

type SearchDocumentResponse struct {
	Documents []DocumentNoUrl `json:"documents"`
}

func HandleSearchDocument(ctx context.Context, docdb DocumentDatabase, req SearchDocumentRequest) (SearchDocumentResponse, error) {
	if err := req.Validate(); err != nil {
		return SearchDocumentResponse{}, err
	}
	if _, err := utils.IsAuthenticatedUser(req.Token); err != nil {
		zap.L().Info("User not authenticated", zap.Error(err))
		return SearchDocumentResponse{}, err
	}
	docs, err := docdb.SearchDocument(ctx, req.Query)
	if err != nil {
		zap.L().Error("failed to load docs from storage", zap.Error(err))
		return SearchDocumentResponse{}, ErrInternalFailedToRetriveFromDatabase
	}
	if len(docs) == 0 {
		// Best effort if no document match the query
		docs, err = docdb.GetDocuments(ctx)
		zap.L().Info("failed to load docs from storage", zap.Error(err))
	}
	resp := SearchDocumentResponse{}
	for i := 0; i < len(docs); i++ {
		resp.Documents = append(resp.Documents, DocumentNoUrl{
			ID:        docs[i].ID.Hex(), // Convert ObjectID to string
			Institute: docs[i].Institute,
			Year:      docs[i].Year,
			Tags:      docs[i].Tags,
		})
	}
	return resp, nil
}

type GetDocumentRequest struct {
	Token string `json:"token" form:"token"`
	ID    string `json:"id" form:"id"`
}

func (a *GetDocumentRequest) Validate() error {
	if a.Token == "" {
		return ErrParamTokenIsRequired
	}
	if a.ID == "" {
		return ErrParamIdIsRequired
	}
	return nil
}

type GetDocumentResponse struct {
	ID          string   `json:"id" form:"id"`
	ResourceURL string   `json:"resource_url" form:"resource_url"`
	Institute   string   `json:"institute" form:"institute"`
	Year        int      `json:"year" form:"year"`
	Tags        []string `json:"tags" form:"tags"`
}

func HandleGetDocument(ctx context.Context, storage DocumentLimitStorage, docdb DocumentDatabase, req GetDocumentRequest) (GetDocumentResponse, error) {
	if err := req.Validate(); err != nil {
		return GetDocumentResponse{}, err
	}
	claims, err := utils.IsAuthenticatedUser(req.Token)
	if err != nil {
		zap.L().Info("User not authenticated", zap.Error(err))
		return GetDocumentResponse{}, err
	}

	if err := utils.IsAuthenticatedAdmin(req.Token); err != nil {
		zap.L().Info("User not admit checking resource limit", zap.Any("req", req))
		if err := storage.IncrUserResourceRequest(ctx, "get/document", claims.Email, 100); err != nil {
			zap.L().Warn("user has been rejected from viewing the resource")
			return GetDocumentResponse{}, err
		}
	}
	doc, err := docdb.FindDocumentByID(ctx, req.ID)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return GetDocumentResponse{}, err
	}
	return GetDocumentResponse{
		ID:          doc.ID.Hex(),
		ResourceURL: doc.ResourceURL,
		Institute:   doc.Institute,
		Year:        doc.Year,
		Tags:        doc.Tags,
	}, nil
}
