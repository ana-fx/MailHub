package domain

type EmailStatus string

const (
	EmailStatusPending EmailStatus = "pending"
	EmailStatusSent    EmailStatus = "sent"
	EmailStatusFailed  EmailStatus = "failed"
)

type Email struct {
	ID            string
	APIKeyID      string
	Recipient     string
	Subject       string
	Body          string
	Status        EmailStatus
	RetryCount    int
	ErrorMessage  *string
	ProviderMessageID *string
}

type APIKey struct {
	ID        string
	Name      string
	KeyHash   string
	IsActive  bool
	CreatedAt string
}

type SendEmailRequest struct {
	To      string
	Subject string
	Body    string
}

type SendEmailResponse struct {
	ID               string
	Status           string
	ProviderMessageID string
}
