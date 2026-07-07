CREATE TABLE IF NOT EXISTS api_keys (
    id text PRIMARY KEY,
    name text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_logs (
    id text PRIMARY KEY,
    api_key_id text NOT NULL REFERENCES api_keys(id),
    recipient text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text NOT NULL,
    retry_count integer NOT NULL DEFAULT 0,
    error_message text,
    provider_message_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
