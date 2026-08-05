-- Addition beyond the brief's literal schema: section 6 requires configurable
-- "früheste mögliche Reservation" (minimum lead time) and "maximale
-- Vorausbuchungsfrist" (booking horizon), but no table was specified for
-- them. A singleton settings row (enforced by the boolean PK trick) keeps
-- these editable from the admin area without a schema change.
CREATE TABLE booking_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id IS TRUE),
  min_advance_minutes INTEGER NOT NULL DEFAULT 60 CHECK (min_advance_minutes >= 0),
  max_advance_days INTEGER NOT NULL DEFAULT 90 CHECK (max_advance_days BETWEEN 1 AND 730),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO booking_settings (id) VALUES (TRUE);

CREATE TRIGGER booking_settings_set_updated_at
  BEFORE UPDATE ON booking_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
