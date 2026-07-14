package repository

import (
	"context"
	"errors"

	"mailhub/internal/domain"
)

// Sentinel errors returned by contact operations so handlers can map them
// to 409 and 404 without knowing about Postgres error codes.
var (
	ErrDuplicateContact = errors.New("contact with this email already exists")
	ErrContactNotFound  = errors.New("contact not found")
	ErrDuplicateDomain  = errors.New("domain already added")
	ErrDomainNotFound   = errors.New("domain not found")
)

// EmailRepository is the persistence boundary for email logs, API keys,
// and users.
type EmailRepository interface {
	Create(ctx context.Context, email *domain.Email) error
	UpdateStatus(ctx context.Context, id string, status domain.EmailStatus, providerMessageID string) error
	IncrementRetry(ctx context.Context, id string, errMsg string) error
	ListEmails(ctx context.Context, apiKeyID string, limit int) ([]domain.Email, error)
	FindAPIKeyByHash(ctx context.Context, hash string) (*domain.APIKey, error)
	UpsertAPIKey(ctx context.Context, apiKey *domain.APIKey) error
	CreateUser(ctx context.Context, user *domain.User) error
	FindUserByEmail(ctx context.Context, email string) (*domain.User, error)
	CreateContact(ctx context.Context, contact *domain.Contact) error
	ListContacts(ctx context.Context, apiKeyID string, limit int) ([]domain.Contact, error)
	UpdateContact(ctx context.Context, contact *domain.Contact) error
	DeleteContact(ctx context.Context, apiKeyID, id string) error
	CreateDomain(ctx context.Context, d *domain.SendingDomain) error
	ListDomains(ctx context.Context, apiKeyID string, limit int) ([]domain.SendingDomain, error)
	GetDomain(ctx context.Context, apiKeyID, id string) (*domain.SendingDomain, error)
	UpdateDomainStatus(ctx context.Context, apiKeyID, id string, status domain.DomainStatus) error
	DeleteDomain(ctx context.Context, apiKeyID, id string) error
	Close() error
}
