CREATE TABLE integration_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX integration_api_keys_prefix_idx
  ON integration_api_keys (key_prefix);

CREATE TABLE pos_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  api_key_id UUID REFERENCES integration_api_keys(id),
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, api_key_id)
);
