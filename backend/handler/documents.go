package handler

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"ishkul.org/backend/model"
)

type DocumentWithoutResourceURL struct {
	ID        primitive.ObjectID `json:"id"`
	Institute string             `json:"institute"`
	Year      int                `json:"year"`
	Subject   model.Subject      `json:"subject"`
	Uplaoder  primitive.ObjectID `json:"uploader_uid"`
	Tags      []string           `json:"tags"`
}

type Document struct {
	ID          primitive.ObjectID `json:"id,omitempty"`
	ResourceURL string             `json:"resource_url"`
	Institute   string             `json:"institute"`
	Year        int                `json:"year"`
	Subject     model.Subject      `json:"subject"`
	Uplaoder    primitive.ObjectID `json:"uploader_uid"`
	Tags        []string           `json:"tags"`
}

type AddDocumentRequest struct {
	RequestorEmail string     `json:"email"`
	Documents      []Document `json:"documents"`
}

type AddDocumentResponse struct{}

type SearchDocumentRequest struct {
	RequestorEmail string             `json:"email"`
	Institute      string             `json:"institute"`
	Year           int                `json:"year"`
	Subject        model.Subject      `json:"subject"`
	Uplaoder       primitive.ObjectID `json:"uploader_uid"`
	Tags           []string           `json:"tags"`
}

type SearchDocumentResponse struct {
	Documents []DocumentWithoutResourceURL `json:"documents"`
}

type GetDocumentRequest struct {
	ID primitive.ObjectID `json:"id"`
}
type GetDocumentResponse struct {
	ID          primitive.ObjectID `json:"id"`
	ResourceURL string             `json:"resource_url"`
	Institute   string             `json:"institute"`
	Year        int                `json:"year"`
	Subject     model.Subject      `json:"subject"`
	Uplaoder    primitive.ObjectID `json:"uploader_uid"`
	Tags        []string           `json:"tags"`
}

type DocumentDatabase interface {
	AddDocument(ctx context.Context, documents []model.Document) error
	FindDocumentByID(ctx context.Context, id primitive.ObjectID) (model.Document, error)
	SearchDocument(ctx context.Context, document model.Document) ([]model.Document, error)
}

func HandleAddDocument(ctx context.Context, userdb UserDatabase, docdb DocumentDatabase, req AddDocumentRequest) (AddDocumentResponse, error) {
	user, err := userdb.FindUserByEmail(ctx, req.RequestorEmail)
	if err != nil {
		return AddDocumentResponse{}, err
	}
	docs := make([]model.Document, len(req.Documents))
	for i := 0; i < len(req.Documents); i++ {
		docs[i] = model.Document{
			ResourceURL: req.Documents[i].ResourceURL,
			Institute:   req.Documents[i].Institute,
			Year:        req.Documents[i].Year,
			Subject:     req.Documents[i].Subject,
			Uplaoder:    user.ID,
			Tags:        req.Documents[i].Tags,
		}
	}
	if err := docdb.AddDocument(ctx, docs); err != nil {
		return AddDocumentResponse{}, err
	}
	return AddDocumentResponse{}, nil
}

func HandleSearchDocument(ctx context.Context, docdb DocumentDatabase, req SearchDocumentRequest) (SearchDocumentResponse, error) {
	searchFilter := model.Document{
		Institute: req.Institute,
		Year:      req.Year,
		Subject:   req.Subject,
		Uplaoder:  req.Uplaoder,
		Tags:      req.Tags,
	}
	docs, err := docdb.SearchDocument(ctx, searchFilter)
	if err != nil {
		return SearchDocumentResponse{}, err
	}

	respDocs := make([]DocumentWithoutResourceURL, len(docs))
	for i := 0; i < len(docs); i++ {
		respDocs[i] = DocumentWithoutResourceURL{
			ID:        docs[i].ID,
			Institute: docs[i].Institute,
			Year:      docs[i].Year,
			Subject:   docs[i].Subject,
			Uplaoder:  docs[i].Uplaoder,
			Tags:      docs[i].Tags,
		}
	}
	return SearchDocumentResponse{Documents: respDocs}, nil
}

func HandleGetDocument(ctx context.Context, docdb DocumentDatabase, req GetDocumentRequest) (GetDocumentResponse, error) {
	doc, err := docdb.FindDocumentByID(ctx, req.ID)
	if err != nil {
		return GetDocumentResponse{}, err
	}
	return GetDocumentResponse{
		ID:          doc.ID,
		ResourceURL: doc.ResourceURL,
		Institute:   doc.Institute,
		Year:        doc.Year,
		Subject:     doc.Subject,
		Uplaoder:    doc.Uplaoder,
		Tags:        doc.Tags,
	}, nil
}
