CREATE TABLE sending_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, verified, failed
    dkim_tokens TEXT NOT NULL DEFAULT '',          -- comma-separated EasyDKIM tokens
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sending_domains_api_key_id ON sending_domains(api_key_id);
CREATE UNIQUE INDEX idx_sending_domains_api_key_domain ON sending_domains(api_key_id, domain);
