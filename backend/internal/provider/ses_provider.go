package provider

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
)

type Provider interface {
	SendEmail(ctx context.Context, to, subject, body string) (string, error)
}

type SESProvider struct {
	client      *ses.Client
	senderEmail string
}

func NewSESProvider(region, senderEmail string) (*SESProvider, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion(region))
	if err != nil {
		return nil, err
	}

	return &SESProvider{
		client:      ses.NewFromConfig(cfg),
		senderEmail: senderEmail,
	}, nil
}

func (p *SESProvider) SendEmail(ctx context.Context, to, subject, body string) (string, error) {
	input := &ses.SendEmailInput{
		Source: aws.String(p.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{to},
		},
		Message: &types.Message{
			Subject: &types.Content{Data: aws.String(subject)},
			Body:    &types.Body{Text: &types.Content{Data: aws.String(body)}},
		},
	}

	result, err := p.client.SendEmail(ctx, input)
	if err != nil {
		return "", err
	}

	return aws.ToString(result.MessageId), nil
}
