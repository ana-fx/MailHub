# Transactional Email Service

Standalone Go service that accepts email-sending requests over a REST API,
delivers them through AWS SES, and logs delivery status in PostgreSQL.
Consumed by other projects via HTTP + API key.

## Requirements

- Go (latest stable)
- PostgreSQL
- AWS account with SES set up (verified domain + IAM user with `ses:SendEmail`)
- [golang-migrate](https://github.com/golang-migrate/migrate) CLI for migrations

## Setup

```bash
# 1. Create the database
createdb transactional_email_service

# 2. Run migrations (from the repository root)
migrate -path ../migrations \
  -database "postgres://postgres:PASSWORD@localhost:5432/transactional_email_service?sslmode=disable" up

# 3. Configure environment
cp .env.example .env   # then fill in DB + AWS credentials

# 4. Run
go run ./cmd/api
```

## API

All responses use the envelope `{"success": true, "data": ...}` or
`{"success": false, "error": "..."}`.

### `POST /api/v1/auth/register` / `POST /api/v1/auth/login`

Body: `{"email": "...", "password": "..."}` (password min. 8 characters).
Returns `{"success": true, "data": {"apiKey": "mh_sk_..."}}`. The key is
shown once and rotates on every login; only its SHA-256 hash is stored.

### `POST /api/v1/emails`

Headers: `X-API-Key: <api_key>`, `Content-Type: application/json`

```json
{ "to": "recipient@example.com", "subject": "Invoice #1234", "body": "<p>Your invoice is ready.</p>" }
```

Returns `202 Accepted`:

```json
{ "success": true, "data": { "id": "uuid-log-id", "status": "sent", "provider_message_id": "ses-message-id" } }
```

Errors: `400` (validation), `401` (missing/invalid API key), `500`
(delivery failed after retries — see below).

## Retry behavior

On provider failure the service increments `retry_count`, waits
`RETRY_BASE_DELAY_MS * 2^retry_count` ms, and retries within the same
request until `MAX_RETRY_COUNT` is reached, then marks the log `failed`.
