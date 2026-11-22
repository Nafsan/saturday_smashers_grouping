-- Run on the target PostgreSQL database before the OAuth cutover.
-- Existing accounts are never reactivated or rebound by this migration.
CREATE TABLE IF NOT EXISTS admin_accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    google_sub VARCHAR(255) UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_admin_sessions_admin_id ON admin_sessions (admin_id);
CREATE INDEX IF NOT EXISTS ix_admin_sessions_expires_at ON admin_sessions (expires_at);
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    state_hash VARCHAR(64) PRIMARY KEY,
    nonce VARCHAR(128) NOT NULL,
    verifier VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_admin_login_attempts_expires_at ON admin_login_attempts (expires_at);
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
INSERT INTO admin_accounts (email, active) VALUES
    ('iamnafsan@gmail.com', TRUE),
    ('sameenwasifhussain@gmail.com', TRUE),
    ('shwmkzz@gmail.com', TRUE),
    ('sameenwasifcse21@gmail.com', TRUE),
    ('mdreaj38@gmail.com', TRUE)
ON CONFLICT (email) DO NOTHING;
