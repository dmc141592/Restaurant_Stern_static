CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  block_type block_type NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  blocked_capacity INTEGER,
  created_by_admin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT block_valid_time CHECK (ends_at > starts_at),
  CONSTRAINT block_capacity_positive CHECK (
    blocked_capacity IS NULL OR blocked_capacity > 0
  )
);

CREATE INDEX availability_blocks_area_time_idx
  ON availability_blocks (area_id, starts_at, ends_at);

CREATE TRIGGER availability_blocks_set_updated_at
  BEFORE UPDATE ON availability_blocks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
