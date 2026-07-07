CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,       -- project/client name, e.g. "lv-shutters"
    key_hash VARCHAR(255) NOT NULL,   -- store the hash, never plaintext
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
