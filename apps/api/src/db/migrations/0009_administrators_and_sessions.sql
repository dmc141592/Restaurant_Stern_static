CREATE TABLE administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER administrators_set_updated_at
  BEFORE UPDATE ON administrators
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- availability_blocks.created_by_admin_id was declared without a foreign key
-- in the earlier migration because administrators did not exist yet. Adding
-- it now keeps migration order valid while still constraining the column.
ALTER TABLE availability_blocks
  ADD CONSTRAINT availability_blocks_admin_fk
  FOREIGN KEY (created_by_admin_id)
  REFERENCES administrators(id);

CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id UUID NOT NULL
    REFERENCES administrators(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_sessions_administrator_idx
  ON admin_sessions (administrator_id);

CREATE INDEX admin_sessions_expires_at_idx
  ON admin_sessions (expires_at);
