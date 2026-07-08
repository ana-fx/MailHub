package domain

type User struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	IsActive     bool   `json:"is_active"`
	CreatedAt    string `json:"created_at"`
}

type EmailStatus string

const (
	EmailStatusPending EmailStatus = "pending"
	EmailStatusSent    EmailStatus = "sent"
	EmailStatusFailed  EmailStatus = "failed"
)

type Email struct {
	ID         string      `json:"id"`
	APIKeyID   string      `json:"api_key_id"`
	Recipient  string      `json:"recipient"`
	Subject    string      `json:"subject"`
	Body       string      `json:"body"`
	Status     EmailStatus `json:"status"`
	RetryCount int         `json:"retry_count"`
	Error      string      `json:"error,omitempty"`
	MessageID  string      `json:"message_id,omitempty"`
	CreatedAt  string      `json:"created_at"`
	UpdatedAt  string      `json:"updated_at"`
}

type APIKey struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	KeyHash   string `json:"-"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

type SendEmailRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

type SendEmailResponse struct {
	ID                string `json:"id"`
	Status            string `json:"status"`
	ProviderMessageID string `json:"provider_message_id"`
}

type Contact struct {
	ID        string `json:"id"`
	APIKeyID  string `json:"api_key_id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// ContactRequest is the create/update payload. Only Email is required.
type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
}

type CredentialsRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	APIKey string `json:"apiKey"`
}
