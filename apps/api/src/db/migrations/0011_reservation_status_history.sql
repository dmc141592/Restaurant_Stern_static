CREATE TABLE reservation_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL
    REFERENCES reservations(id) ON DELETE CASCADE,
  previous_status reservation_status,
  new_status reservation_status NOT NULL,
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('SYSTEM', 'EMAIL_ACTION', 'ADMIN', 'POS_API')),
  actor_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reservation_status_history_reservation_idx
  ON reservation_status_history (reservation_id, created_at DESC);
