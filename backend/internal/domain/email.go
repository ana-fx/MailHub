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

type DomainStatus string

const (
	DomainStatusPending  DomainStatus = "pending"
	DomainStatusVerified DomainStatus = "verified"
	DomainStatusFailed   DomainStatus = "failed"
)

type SendingDomain struct {
	ID          string       `json:"id"`
	APIKeyID    string       `json:"api_key_id"`
	Domain      string       `json:"domain"`
	Status      DomainStatus `json:"status"`
	DKIMTokens  []string     `json:"-"`
	DKIMRecords []DKIMRecord `json:"dkim_records"`
	CreatedAt   string       `json:"created_at"`
	UpdatedAt   string       `json:"updated_at"`
}

// DKIMRecord is one CNAME the user must add to their DNS to authenticate
// the domain. Derived from the EasyDKIM tokens SES returns.
type DKIMRecord struct {
	Name  string `json:"name"`
	Type  string `json:"type"`
	Value string `json:"value"`
}

// BuildDKIMRecords turns EasyDKIM tokens into the CNAME records the user
// adds at their DNS provider: <token>._domainkey.<domain> ->
// <token>.dkim.amazonses.com.
func BuildDKIMRecords(dkimDomain string, tokens []string) []DKIMRecord {
	records := make([]DKIMRecord, 0, len(tokens))
	for _, t := range tokens {
		records = append(records, DKIMRecord{
			Name:  t + "._domainkey." + dkimDomain,
			Type:  "CNAME",
			Value: t + ".dkim.amazonses.com",
		})
	}
	return records
}

type CreateDomainRequest struct {
	Domain string `json:"domain"`
}

type CredentialsRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	APIKey string `json:"apiKey"`
}
