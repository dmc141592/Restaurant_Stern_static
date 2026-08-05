CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  resource_mode resource_mode NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  default_duration_minutes INTEGER NOT NULL DEFAULT 120
    CHECK (default_duration_minutes BETWEEN 30 AND 720),
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (slot_interval_minutes BETWEEN 5 AND 120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_online_bookable BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX areas_active_bookable_idx ON areas (is_active, is_online_bookable);

CREATE TRIGGER areas_set_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
