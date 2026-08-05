CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference TEXT NOT NULL UNIQUE,
  area_id UUID NOT NULL REFERENCES areas(id),
  status reservation_status NOT NULL DEFAULT 'PENDING',
  source reservation_source NOT NULL DEFAULT 'ONLINE',

  guest_first_name TEXT NOT NULL,
  guest_last_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  guest_notes TEXT,

  requested_area_id UUID REFERENCES areas(id),
  area_was_auto_assigned BOOLEAN NOT NULL DEFAULT TRUE,

  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  time_range TSTZRANGE GENERATED ALWAYS AS (
    tstzrange(starts_at, ends_at, '[)')
  ) STORED,

  consent_privacy_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reservation_valid_time CHECK (ends_at > starts_at),
  CONSTRAINT reservation_party_size_reasonable CHECK (party_size <= 1000)
);

CREATE INDEX reservations_area_time_gist
  ON reservations USING GIST (area_id, time_range);

CREATE INDEX reservations_status_starts_at_idx
  ON reservations (status, starts_at);

CREATE INDEX reservations_created_at_idx
  ON reservations (created_at DESC);

-- Supports admin filtering/pagination by guest email without a full table scan.
CREATE INDEX reservations_guest_email_idx
  ON reservations (guest_email);

CREATE TRIGGER reservations_set_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
