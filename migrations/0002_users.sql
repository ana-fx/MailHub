CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
