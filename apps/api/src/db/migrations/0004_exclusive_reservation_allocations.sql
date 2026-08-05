-- Exclusive rooms (Saeli, Jaegerstuebli, ...) cannot rely on a CHECK constraint
-- referencing areas.resource_mode, since Postgres exclusion constraints cannot
-- consult another table. Instead we maintain a dedicated allocation table that
-- only ever holds one row per blocking reservation on an exclusive area, and
-- enforce non-overlap with a partial GiST exclusion constraint. The service
-- layer is responsible for inserting/updating/deleting rows here whenever a
-- reservation on an EXCLUSIVE area changes status.
CREATE TABLE exclusive_reservation_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id),
  time_range TSTZRANGE NOT NULL,
  is_blocking BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT exclusive_allocation_reservation_unique UNIQUE (reservation_id)
);

CREATE INDEX exclusive_allocations_area_idx
  ON exclusive_reservation_allocations (area_id);

-- Only rows still marked as blocking participate in the overlap check, so
-- rejecting/cancelling a reservation (which flips is_blocking to FALSE, or
-- removes the row) immediately frees the room for a new booking.
ALTER TABLE exclusive_reservation_allocations
  ADD CONSTRAINT exclusive_allocations_no_overlap
  EXCLUDE USING GIST (area_id WITH =, time_range WITH &&)
  WHERE (is_blocking);

CREATE TRIGGER exclusive_allocations_set_updated_at
  BEFORE UPDATE ON exclusive_reservation_allocations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
