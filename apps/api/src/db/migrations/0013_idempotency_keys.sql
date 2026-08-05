-- Backs the Idempotency-Key header on POST /api/v1/public/reservations so an
-- accidental double-click (or client retry) cannot create two reservations.
-- Entries are short-lived; a caller-supplied key only needs to survive long
-- enough to deduplicate retries of the same click.
CREATE TABLE idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  request_fingerprint TEXT NOT NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idempotency_keys_expires_at_idx
  ON idempotency_keys (expires_at);
