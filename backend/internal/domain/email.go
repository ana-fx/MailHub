package domain

type UserStatus string

const (
	UserStatusActive   UserStatus = "active"
	UserStatusInactive UserStatus = "inactive"
)

type User struct {
	ID        string
	Email     string
	Password  string
	IsActive  bool
	CreatedAt string
}

type EmailStatus string

const (
	EmailStatusPending EmailStatus = "pending"
	EmailStatusSent    EmailStatus = "sent"
	EmailStatusFailed  EmailStatus = "failed"
)

type Email struct {
	ID         string
	APIKeyID   string
	Recipient  string
	Subject    string
	Body       string
	Status     EmailStatus
	RetryCount int
	Error      string
	MessageID  string
	CreatedAt  string
	UpdatedAt  string
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
	ID                string
	Status            string
	ProviderMessageID string
}

type LoginRequest struct {
	Email    string
	Password string
}
