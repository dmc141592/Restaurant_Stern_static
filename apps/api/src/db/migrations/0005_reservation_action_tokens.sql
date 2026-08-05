CREATE TABLE reservation_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('CONFIRM', 'REJECT')),
  token_hash TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reservation_action_tokens_reservation_idx
  ON reservation_action_tokens (reservation_id);
