package service

import (
	"context"
	"errors"
	"time"

	"mailhub/internal/domain"
	"mailhub/internal/provider"
	"mailhub/internal/repository"
	"mailhub/internal/security"
)

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

// SendEmail logs the email, then attempts delivery with exponential backoff
// up to maxRetry additional attempts.
func (s *EmailService) SendEmail(ctx context.Context, apiKeyID string, req *domain.SendEmailRequest) (*domain.SendEmailResponse, error) {
	email := &domain.Email{
		ID:        security.NewID(),
		APIKeyID:  apiKeyID,
		Recipient: req.To,
		Subject:   req.Subject,
		Body:      req.Body,
		Status:    domain.EmailStatusPending,
	}

	if err := s.repo.Create(ctx, email); err != nil {
		return nil, err
	}

	var lastErr error
	for attempt := 0; attempt <= s.maxRetry; attempt++ {
		if attempt > 0 {
			if err := sleepCtx(ctx, s.baseDelay<<(attempt-1)); err != nil {
				lastErr = err
				break
			}
		}

		messageID, sendErr := s.provider.SendEmail(ctx, req.To, req.Subject, req.Body)
		if sendErr == nil {
			_ = s.repo.UpdateStatus(ctx, email.ID, domain.EmailStatusSent, messageID)
			return &domain.SendEmailResponse{
				ID:                email.ID,
				Status:            string(domain.EmailStatusSent),
				ProviderMessageID: messageID,
			}, nil
		}

		lastErr = sendErr
		_ = s.repo.IncrementRetry(ctx, email.ID, sendErr.Error())
	}

	_ = s.repo.UpdateStatus(ctx, email.ID, domain.EmailStatusFailed, "")
	return nil, errors.Join(errors.New("email sending failed after retries"), lastErr)
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
