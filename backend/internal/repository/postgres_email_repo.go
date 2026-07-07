package repository

import (
	"context"
	"database/sql"
	"errors"

	_ "github.com/lib/pq"

	"mailhub/internal/domain"
)

type EmailRepository interface {
	Create(ctx context.Context, email *domain.Email) error
	UpdateStatus(ctx context.Context, id string, status domain.EmailStatus, providerMessageID string) error
	IncrementRetry(ctx context.Context, id string, errMsg string) error
	FindAPIKeyByHash(ctx context.Context, hash string) (*domain.APIKey, error)
	CreateUser(ctx context.Context, user *domain.User) error
	FindUserByEmail(ctx context.Context, email string) (*domain.User, error)
	UpsertAPIKey(ctx context.Context, apiKey *domain.APIKey) error
	Close() error
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

func (r *PostgresEmailRepo) Create(ctx context.Context, email *domain.Email) error {
	const q = `INSERT INTO email_logs (id, api_key_id, recipient, subject, body, status, retry_count)
	           VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := r.db.ExecContext(ctx, q, email.ID, email.APIKeyID, email.Recipient, email.Subject, email.Body, email.Status, email.RetryCount)
	return err
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

func (r *PostgresEmailRepo) CreateUser(ctx context.Context, user *domain.User) error {
	const q = `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`
	_, err := r.db.ExecContext(ctx, q, user.ID, user.Email, user.PasswordHash)
	return err
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

// UpsertAPIKey inserts the API key or, if the ID already exists, replaces
// its hash and reactivates it. Used to rotate a user's default key on login.
func (r *PostgresEmailRepo) UpsertAPIKey(ctx context.Context, apiKey *domain.APIKey) error {
	const q = `INSERT INTO api_keys (id, name, key_hash)
	           VALUES ($1, $2, $3)
	           ON CONFLICT (id) DO UPDATE SET key_hash = EXCLUDED.key_hash, name = EXCLUDED.name, is_active = true`
	_, err := r.db.ExecContext(ctx, q, apiKey.ID, apiKey.Name, apiKey.KeyHash)
	return err
}

func (r *PostgresEmailRepo) Close() error {
	return r.db.Close()
}
