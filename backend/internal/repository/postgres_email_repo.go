package repository

import (
	"context"
	"database/sql"
	"fmt"

	"mailhub/internal/domain"
)

type EmailRepository interface {
	Create(ctx context.Context, email *domain.Email) error
	UpdateStatus(ctx context.Context, id string, status domain.EmailStatus, providerMessageID string) error
	IncrementRetry(ctx context.Context, id string, errMsg string) error
	FindAPIKeyByHash(ctx context.Context, hash string) (*domain.APIKey, error)
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
		return nil, err
	}

	return &PostgresEmailRepo{db: db}, nil
}

func (r *PostgresEmailRepo) Create(ctx context.Context, email *domain.Email) error {
	const q = `INSERT INTO email_logs (api_key_id, recipient, subject, body, status, retry_count) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
	return r.db.QueryRowContext(ctx, q, email.APIKeyID, email.Recipient, email.Subject, email.Body, email.Status, email.RetryCount).Scan(&email.ID)
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

func (r *PostgresEmailRepo) FindAPIKeyByHash(ctx context.Context, hash string) (*domain.APIKey, error) {
	const q = `SELECT id, name, key_hash, is_active, created_at FROM api_keys WHERE key_hash = $1 AND is_active = true`
	row := r.db.QueryRowContext(ctx, q, hash)

	key := &domain.APIKey{}
	err := row.Scan(&key.ID, &key.Name, &key.KeyHash, &key.IsActive, &key.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("api key not found")
	}
	if err != nil {
		return nil, err
	}
	return key, nil
}

func (r *PostgresEmailRepo) Close() error {
	return r.db.Close()
}
