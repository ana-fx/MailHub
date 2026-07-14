package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/lib/pq"

	"mailhub/internal/domain"
)

// Postgres error codes used to translate driver errors into sentinel errors.
const (
	pgUniqueViolation = "23505"
	pgInvalidText     = "22P02" // e.g. a malformed UUID in a query parameter
)

func isPgError(err error, code string) bool {
	var pgErr *pq.Error
	return errors.As(err, &pgErr) && string(pgErr.Code) == code
}

type PostgresEmailRepo struct {
	db *sql.DB
}

func NewPostgres(ctx context.Context, dsn string) (*PostgresEmailRepo, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}

	return &PostgresEmailRepo{db: db}, nil
}

// Create inserts a pending email log; the generated UUID is written back
// into email.ID.
func (r *PostgresEmailRepo) Create(ctx context.Context, email *domain.Email) error {
	const q = `INSERT INTO email_logs (api_key_id, recipient, subject, body, status)
	           VALUES ($1, $2, $3, $4, $5) RETURNING id`
	return r.db.QueryRowContext(ctx, q, email.APIKeyID, email.Recipient, email.Subject, email.Body, email.Status).Scan(&email.ID)
}

func (r *PostgresEmailRepo) UpdateStatus(ctx context.Context, id string, status domain.EmailStatus, providerMessageID string) error {
	const q = `UPDATE email_logs SET status = $1, provider_message_id = $2, updated_at = now() WHERE id = $3`
	_, err := r.db.ExecContext(ctx, q, status, providerMessageID, id)
	return err
}

func (r *PostgresEmailRepo) IncrementRetry(ctx context.Context, id string, errMsg string) error {
	const q = `UPDATE email_logs SET retry_count = retry_count + 1, error_message = $1, updated_at = now() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, q, errMsg, id)
	return err
}

// ListEmails returns the most recent email logs for the API key, newest
// first. Bodies are omitted to keep the payload small.
func (r *PostgresEmailRepo) ListEmails(ctx context.Context, apiKeyID string, limit int) ([]domain.Email, error) {
	const q = `SELECT id, api_key_id, recipient, subject, status, retry_count,
	                  COALESCE(error_message, ''), COALESCE(provider_message_id, ''), created_at, updated_at
	           FROM email_logs WHERE api_key_id = $1 ORDER BY created_at DESC LIMIT $2`

	rows, err := r.db.QueryContext(ctx, q, apiKeyID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	emails := []domain.Email{}
	for rows.Next() {
		var e domain.Email
		if err := rows.Scan(&e.ID, &e.APIKeyID, &e.Recipient, &e.Subject, &e.Status, &e.RetryCount,
			&e.Error, &e.MessageID, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		emails = append(emails, e)
	}
	return emails, rows.Err()
}

// FindAPIKeyByHash returns the active API key matching the hash, or nil if
// no such key exists.
func (r *PostgresEmailRepo) FindAPIKeyByHash(ctx context.Context, hash string) (*domain.APIKey, error) {
	const q = `SELECT id, name, key_hash, is_active, created_at FROM api_keys WHERE key_hash = $1 AND is_active = true`

	key := &domain.APIKey{}
	err := r.db.QueryRowContext(ctx, q, hash).Scan(&key.ID, &key.Name, &key.KeyHash, &key.IsActive, &key.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return key, nil
}

// UpsertAPIKey inserts the API key or, if the ID already exists, replaces
// its hash and reactivates it. Used to rotate a user's default key on login.
func (r *PostgresEmailRepo) UpsertAPIKey(ctx context.Context, apiKey *domain.APIKey) error {
	const q = `INSERT INTO api_keys (id, name, key_hash)
	           VALUES ($1, $2, $3)
	           ON CONFLICT (id) DO UPDATE SET key_hash = EXCLUDED.key_hash, name = EXCLUDED.name, is_active = true`
	_, err := r.db.ExecContext(ctx, q, apiKey.ID, apiKey.Name, apiKey.KeyHash)
	return err
}

// CreateUser inserts the user; the generated UUID is written back into
// user.ID.
func (r *PostgresEmailRepo) CreateUser(ctx context.Context, user *domain.User) error {
	const q = `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`
	return r.db.QueryRowContext(ctx, q, user.Email, user.PasswordHash).Scan(&user.ID)
}

// FindUserByEmail returns the user with the given email, or nil if none exists.
func (r *PostgresEmailRepo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	const q = `SELECT id, email, password_hash, is_active, created_at FROM users WHERE email = $1`

	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, q, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.IsActive, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

// CreateContact inserts the contact; the generated UUID is written back
// into contact.ID. Returns ErrDuplicateContact if the email already exists
// for this API key.
func (r *PostgresEmailRepo) CreateContact(ctx context.Context, contact *domain.Contact) error {
	const q = `INSERT INTO contacts (api_key_id, name, email, phone, address)
	           VALUES ($1, $2, $3, $4, $5) RETURNING id`
	err := r.db.QueryRowContext(ctx, q, contact.APIKeyID, contact.Name, contact.Email, contact.Phone, contact.Address).Scan(&contact.ID)
	if isPgError(err, pgUniqueViolation) {
		return ErrDuplicateContact
	}
	return err
}

// ListContacts returns the API key's contacts, newest first.
func (r *PostgresEmailRepo) ListContacts(ctx context.Context, apiKeyID string, limit int) ([]domain.Contact, error) {
	const q = `SELECT id, api_key_id, name, email, phone, address, created_at, updated_at
	           FROM contacts WHERE api_key_id = $1 ORDER BY created_at DESC LIMIT $2`

	rows, err := r.db.QueryContext(ctx, q, apiKeyID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	contacts := []domain.Contact{}
	for rows.Next() {
		var c domain.Contact
		if err := rows.Scan(&c.ID, &c.APIKeyID, &c.Name, &c.Email, &c.Phone, &c.Address, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return contacts, rows.Err()
}

// UpdateContact replaces the contact's fields. The WHERE clause is scoped
// to the API key so one tenant can never touch another tenant's contact.
func (r *PostgresEmailRepo) UpdateContact(ctx context.Context, contact *domain.Contact) error {
	const q = `UPDATE contacts SET name = $1, email = $2, phone = $3, address = $4, updated_at = now()
	           WHERE id = $5 AND api_key_id = $6`
	res, err := r.db.ExecContext(ctx, q, contact.Name, contact.Email, contact.Phone, contact.Address, contact.ID, contact.APIKeyID)
	switch {
	case isPgError(err, pgUniqueViolation):
		return ErrDuplicateContact
	case isPgError(err, pgInvalidText):
		return ErrContactNotFound
	case err != nil:
		return err
	}

	if n, err := res.RowsAffected(); err == nil && n == 0 {
		return ErrContactNotFound
	}
	return nil
}

// DeleteContact removes the contact, scoped to the API key.
func (r *PostgresEmailRepo) DeleteContact(ctx context.Context, apiKeyID, id string) error {
	const q = `DELETE FROM contacts WHERE id = $1 AND api_key_id = $2`
	res, err := r.db.ExecContext(ctx, q, id, apiKeyID)
	if isPgError(err, pgInvalidText) {
		return ErrContactNotFound
	}
	if err != nil {
		return err
	}

	if n, err := res.RowsAffected(); err == nil && n == 0 {
		return ErrContactNotFound
	}
	return nil
}

// CreateDomain inserts the sending domain; the generated UUID is written
// back into d.ID. DKIM tokens are stored comma-separated. Returns
// ErrDuplicateDomain if the domain already exists for this API key.
func (r *PostgresEmailRepo) CreateDomain(ctx context.Context, d *domain.SendingDomain) error {
	const q = `INSERT INTO sending_domains (api_key_id, domain, status, dkim_tokens)
	           VALUES ($1, $2, $3, $4) RETURNING id`
	err := r.db.QueryRowContext(ctx, q, d.APIKeyID, d.Domain, d.Status, strings.Join(d.DKIMTokens, ",")).Scan(&d.ID)
	if isPgError(err, pgUniqueViolation) {
		return ErrDuplicateDomain
	}
	return err
}

// ListDomains returns the API key's sending domains, newest first.
func (r *PostgresEmailRepo) ListDomains(ctx context.Context, apiKeyID string, limit int) ([]domain.SendingDomain, error) {
	const q = `SELECT id, api_key_id, domain, status, dkim_tokens, created_at, updated_at
	           FROM sending_domains WHERE api_key_id = $1 ORDER BY created_at DESC LIMIT $2`

	rows, err := r.db.QueryContext(ctx, q, apiKeyID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	domains := []domain.SendingDomain{}
	for rows.Next() {
		d, err := scanDomain(rows)
		if err != nil {
			return nil, err
		}
		domains = append(domains, *d)
	}
	return domains, rows.Err()
}

// GetDomain returns one sending domain scoped to the API key, or
// ErrDomainNotFound.
func (r *PostgresEmailRepo) GetDomain(ctx context.Context, apiKeyID, id string) (*domain.SendingDomain, error) {
	const q = `SELECT id, api_key_id, domain, status, dkim_tokens, created_at, updated_at
	           FROM sending_domains WHERE id = $1 AND api_key_id = $2`

	d, err := scanDomain(r.db.QueryRowContext(ctx, q, id, apiKeyID))
	switch {
	case errors.Is(err, sql.ErrNoRows) || isPgError(err, pgInvalidText):
		return nil, ErrDomainNotFound
	case err != nil:
		return nil, err
	}
	return d, nil
}

func (r *PostgresEmailRepo) UpdateDomainStatus(ctx context.Context, apiKeyID, id string, status domain.DomainStatus) error {
	const q = `UPDATE sending_domains SET status = $1, updated_at = now() WHERE id = $2 AND api_key_id = $3`
	res, err := r.db.ExecContext(ctx, q, status, id, apiKeyID)
	if isPgError(err, pgInvalidText) {
		return ErrDomainNotFound
	}
	if err != nil {
		return err
	}
	if n, err := res.RowsAffected(); err == nil && n == 0 {
		return ErrDomainNotFound
	}
	return nil
}

func (r *PostgresEmailRepo) DeleteDomain(ctx context.Context, apiKeyID, id string) error {
	const q = `DELETE FROM sending_domains WHERE id = $1 AND api_key_id = $2`
	res, err := r.db.ExecContext(ctx, q, id, apiKeyID)
	if isPgError(err, pgInvalidText) {
		return ErrDomainNotFound
	}
	if err != nil {
		return err
	}
	if n, err := res.RowsAffected(); err == nil && n == 0 {
		return ErrDomainNotFound
	}
	return nil
}

// rowScanner is satisfied by both *sql.Row and *sql.Rows.
type rowScanner interface {
	Scan(dest ...any) error
}

func scanDomain(s rowScanner) (*domain.SendingDomain, error) {
	var (
		d      domain.SendingDomain
		tokens string
	)
	if err := s.Scan(&d.ID, &d.APIKeyID, &d.Domain, &d.Status, &tokens, &d.CreatedAt, &d.UpdatedAt); err != nil {
		return nil, err
	}
	if tokens != "" {
		d.DKIMTokens = strings.Split(tokens, ",")
	}
	d.DKIMRecords = domain.BuildDKIMRecords(d.Domain, d.DKIMTokens)
	return &d, nil
}

func (r *PostgresEmailRepo) Close() error {
	return r.db.Close()
}
