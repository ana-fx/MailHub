package service

import (
	"context"
	"errors"
	"math"
	"time"

	"mailhub/internal/domain"
	"mailhub/internal/provider"
	"mailhub/internal/repository"
)

type EmailService struct {
	repo       repository.EmailRepository
	provider   provider.Provider
	maxRetry   int
	baseDelay  time.Duration
}

func NewEmailService(repo repository.EmailRepository, provider provider.Provider, maxRetry int, baseDelay time.Duration) *EmailService {
	return &EmailService{
		repo:       repo,
		provider:   provider,
		maxRetry:   maxRetry,
		baseDelay:  baseDelay,
	}
}

func (s *EmailService) SendEmail(ctx context.Context, apiKeyID string, req *domain.SendEmailRequest) (*domain.SendEmailResponse, error) {
	email := &domain.Email{
		APIKeyID:   apiKeyID,
		Recipient:  req.To,
		Subject:    req.Subject,
		Body:       req.Body,
		Status:     domain.EmailStatusPending,
		RetryCount: 0,
	}

	if err := s.repo.Create(ctx, email); err != nil {
		return nil, err
	}

	var lastErr error
	for attempt := 0; attempt <= s.maxRetry; attempt++ {
		if attempt > 0 {
			wait := s.baseDelay * time.Duration(math.Pow(2, float64(attempt-1)))
			time.Sleep(wait)
		}

		messageID, sendErr := s.provider.SendEmail(ctx, req.To, req.Subject, req.Body)
		if sendErr == nil {
			_ = s.repo.UpdateStatus(ctx, email.ID, domain.EmailStatusSent, messageID)
			return &domain.SendEmailResponse{ID: email.ID, Status: string(domain.EmailStatusSent), ProviderMessageID: messageID}, nil
		}

		lastErr = sendErr
		_ = s.repo.IncrementRetry(ctx, email.ID, sendErr.Error())
	}

	_ = s.repo.UpdateStatus(ctx, email.ID, domain.EmailStatusFailed, "")
	return nil, errors.Join(lastErr, errors.New("email sending failed after retries"))
}
