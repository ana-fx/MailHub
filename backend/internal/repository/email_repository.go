package repository

import (
	"context"

	"mailhub/internal/domain"
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
	Close() error
}
