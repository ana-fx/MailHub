package service

import (
	"context"

	"mailhub/internal/domain"
	"mailhub/internal/repository"
	"mailhub/internal/validator"
)

type ContactService struct {
	repo repository.EmailRepository
}

func NewContactService(repo repository.EmailRepository) *ContactService {
	return &ContactService{repo: repo}
}

func (s *ContactService) Create(ctx context.Context, apiKeyID string, req *domain.ContactRequest) (*domain.Contact, error) {
	if err := validator.ValidateContactRequest(req); err != nil {
		return nil, err
	}

	contact := &domain.Contact{
		APIKeyID: apiKeyID,
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Address:  req.Address,
	}
	if err := s.repo.CreateContact(ctx, contact); err != nil {
		return nil, err
	}
	return contact, nil
}

func (s *ContactService) List(ctx context.Context, apiKeyID string) ([]domain.Contact, error) {
	const listLimit = 200
	return s.repo.ListContacts(ctx, apiKeyID, listLimit)
}

func (s *ContactService) Update(ctx context.Context, apiKeyID, id string, req *domain.ContactRequest) (*domain.Contact, error) {
	if err := validator.ValidateContactRequest(req); err != nil {
		return nil, err
	}

	contact := &domain.Contact{
		ID:       id,
		APIKeyID: apiKeyID,
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Address:  req.Address,
	}
	if err := s.repo.UpdateContact(ctx, contact); err != nil {
		return nil, err
	}
	return contact, nil
}

func (s *ContactService) Delete(ctx context.Context, apiKeyID, id string) error {
	return s.repo.DeleteContact(ctx, apiKeyID, id)
}
