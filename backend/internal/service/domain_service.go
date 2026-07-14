package service

import (
	"context"

	"mailhub/internal/domain"
	"mailhub/internal/provider"
	"mailhub/internal/repository"
	"mailhub/internal/validator"
)

type DomainService struct {
	repo     repository.EmailRepository
	verifier provider.DomainVerifier
}

func NewDomainService(repo repository.EmailRepository, verifier provider.DomainVerifier) *DomainService {
	return &DomainService{repo: repo, verifier: verifier}
}

// Create registers the domain with SES, stores its DKIM tokens, and returns
// the record (including the CNAME records the user must publish).
func (s *DomainService) Create(ctx context.Context, apiKeyID string, req *domain.CreateDomainRequest) (*domain.SendingDomain, error) {
	if err := validator.ValidateCreateDomainRequest(req); err != nil {
		return nil, err
	}

	tokens, err := s.verifier.CreateDomainIdentity(ctx, req.Domain)
	if err != nil {
		return nil, err
	}

	d := &domain.SendingDomain{
		APIKeyID:   apiKeyID,
		Domain:     req.Domain,
		Status:     domain.DomainStatusPending,
		DKIMTokens: tokens,
	}
	if err := s.repo.CreateDomain(ctx, d); err != nil {
		return nil, err
	}
	d.DKIMRecords = domain.BuildDKIMRecords(d.Domain, d.DKIMTokens)
	return d, nil
}

func (s *DomainService) List(ctx context.Context, apiKeyID string) ([]domain.SendingDomain, error) {
	const listLimit = 100
	return s.repo.ListDomains(ctx, apiKeyID, listLimit)
}

// Verify re-checks the domain's DKIM status with SES and persists the
// mapped status (verified/failed/pending).
func (s *DomainService) Verify(ctx context.Context, apiKeyID, id string) (*domain.SendingDomain, error) {
	d, err := s.repo.GetDomain(ctx, apiKeyID, id)
	if err != nil {
		return nil, err
	}

	verified, dkimStatus, err := s.verifier.DomainStatus(ctx, d.Domain)
	if err != nil {
		return nil, err
	}

	status := mapDKIMStatus(verified, dkimStatus)
	if status != d.Status {
		if err := s.repo.UpdateDomainStatus(ctx, apiKeyID, id, status); err != nil {
			return nil, err
		}
		d.Status = status
	}
	return d, nil
}

func (s *DomainService) Delete(ctx context.Context, apiKeyID, id string) error {
	d, err := s.repo.GetDomain(ctx, apiKeyID, id)
	if err != nil {
		return err
	}
	// Best-effort remove from SES; ignore provider errors so a dangling
	// identity never blocks removing the local record.
	_ = s.verifier.DeleteDomainIdentity(ctx, d.Domain)
	return s.repo.DeleteDomain(ctx, apiKeyID, id)
}

// mapDKIMStatus collapses SES's flags into our three-state status.
func mapDKIMStatus(verified bool, dkimStatus string) domain.DomainStatus {
	switch {
	case verified || dkimStatus == "SUCCESS":
		return domain.DomainStatusVerified
	case dkimStatus == "FAILED":
		return domain.DomainStatusFailed
	default:
		return domain.DomainStatusPending
	}
}
