package provider

import (
	"context"
	"errors"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	sesv2types "github.com/aws/aws-sdk-go-v2/service/sesv2/types"
)

// DomainVerifier manages domain sending identities and their DKIM status
// with the email provider (SES).
type DomainVerifier interface {
	// CreateDomainIdentity registers the domain and returns the EasyDKIM
	// tokens the user must publish as CNAME records. Safe to call again for
	// an existing identity — it returns the current tokens.
	CreateDomainIdentity(ctx context.Context, domain string) (tokens []string, err error)
	// DomainStatus reports whether the domain is verified for sending and the
	// raw DKIM status ("PENDING", "SUCCESS", "FAILED", ...).
	DomainStatus(ctx context.Context, domain string) (verified bool, dkimStatus string, err error)
	// DeleteDomainIdentity removes the domain identity.
	DeleteDomainIdentity(ctx context.Context, domain string) error
}

type SESDomainVerifier struct {
	client *sesv2.Client
}

func NewSESDomainVerifier(region string) (*SESDomainVerifier, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion(region))
	if err != nil {
		return nil, err
	}
	return &SESDomainVerifier{client: sesv2.NewFromConfig(cfg)}, nil
}

func (v *SESDomainVerifier) CreateDomainIdentity(ctx context.Context, domain string) ([]string, error) {
	out, err := v.client.CreateEmailIdentity(ctx, &sesv2.CreateEmailIdentityInput{
		EmailIdentity: aws.String(domain),
	})
	if err != nil {
		// If the identity already exists, fall back to reading its tokens.
		var alreadyExists *sesv2types.AlreadyExistsException
		if errors.As(err, &alreadyExists) {
			tokens, _, statusErr := v.dkimTokensAndStatus(ctx, domain)
			return tokens, statusErr
		}
		return nil, err
	}
	if out.DkimAttributes == nil {
		return nil, errors.New("ses: no dkim attributes returned")
	}
	return out.DkimAttributes.Tokens, nil
}

func (v *SESDomainVerifier) DomainStatus(ctx context.Context, domain string) (bool, string, error) {
	out, err := v.client.GetEmailIdentity(ctx, &sesv2.GetEmailIdentityInput{
		EmailIdentity: aws.String(domain),
	})
	if err != nil {
		return false, "", err
	}
	dkimStatus := ""
	if out.DkimAttributes != nil {
		dkimStatus = string(out.DkimAttributes.Status)
	}
	return out.VerifiedForSendingStatus, dkimStatus, nil
}

func (v *SESDomainVerifier) DeleteDomainIdentity(ctx context.Context, domain string) error {
	_, err := v.client.DeleteEmailIdentity(ctx, &sesv2.DeleteEmailIdentityInput{
		EmailIdentity: aws.String(domain),
	})
	return err
}

func (v *SESDomainVerifier) dkimTokensAndStatus(ctx context.Context, domain string) ([]string, string, error) {
	out, err := v.client.GetEmailIdentity(ctx, &sesv2.GetEmailIdentityInput{
		EmailIdentity: aws.String(domain),
	})
	if err != nil {
		return nil, "", err
	}
	if out.DkimAttributes == nil {
		return nil, "", nil
	}
	return out.DkimAttributes.Tokens, string(out.DkimAttributes.Status), nil
}
