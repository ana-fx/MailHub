package service

import (
	"context"
	"errors"
	"time"

	"mailhub/internal/domain"
	"mailhub/internal/provider"
	"mailhub/internal/repository"
	"mailhub/internal/validator"
)

// ErrDeliveryFailed is returned when the provider keeps failing after all
// retries; handlers map it to a 500 without leaking provider details.
var ErrDeliveryFailed = errors.New("email delivery failed after retries")

type EmailService struct {
	repo      repository.EmailRepository
	provider  provider.Provider
	maxRetry  int
	baseDelay time.Duration
}

func NewEmailService(repo repository.EmailRepository, provider provider.Provider, maxRetry int, baseDelay time.Duration) *EmailService {
	return &EmailService{
		repo:      repo,
		provider:  provider,
		maxRetry:  maxRetry,
		baseDelay: baseDelay,
	}
}

// SendEmail validates the request, records a pending log, then attempts
// delivery. On failure it increments retry_count, waits
// baseDelay * 2^retry_count, and tries again until maxRetry is reached,
// after which the log is marked failed.
func (s *EmailService) SendEmail(ctx context.Context, apiKeyID string, req *domain.SendEmailRequest) (*domain.SendEmailResponse, error) {
	if err := validator.ValidateSendEmailRequest(req); err != nil {
		return nil, err
	}

	email := &domain.Email{
		APIKeyID:  apiKeyID,
		Recipient: req.To,
		Subject:   req.Subject,
		Body:      req.Body,
		Status:    domain.EmailStatusPending,
	}
	if err := s.repo.Create(ctx, email); err != nil {
		return nil, err
	}

	for retryCount := 0; ; {
		messageID, sendErr := s.provider.SendEmail(ctx, req.To, req.Subject, req.Body)
		if sendErr == nil {
			_ = s.repo.UpdateStatus(ctx, email.ID, domain.EmailStatusSent, messageID)
			return &domain.SendEmailResponse{
				ID:                email.ID,
				Status:            string(domain.EmailStatusSent),
				ProviderMessageID: messageID,
			}, nil
		}

		retryCount++
		_ = s.repo.IncrementRetry(ctx, email.ID, sendErr.Error())

		if retryCount >= s.maxRetry {
			break
		}
		if err := sleepCtx(ctx, s.baseDelay*(1<<retryCount)); err != nil {
			break
		}
	}

	_ = s.repo.UpdateStatus(ctx, email.ID, domain.EmailStatusFailed, "")
	return nil, ErrDeliveryFailed
}

// ListEmails returns the most recent email logs for the API key.
func (s *EmailService) ListEmails(ctx context.Context, apiKeyID string) ([]domain.Email, error) {
	const recentLimit = 50
	return s.repo.ListEmails(ctx, apiKeyID, recentLimit)
}

// sleepCtx waits for d or until ctx is cancelled, whichever comes first.
func sleepCtx(ctx context.Context, d time.Duration) error {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
