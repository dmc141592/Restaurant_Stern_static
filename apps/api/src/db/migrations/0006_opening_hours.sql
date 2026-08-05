-- weekday uses the ISO-style Swiss week order but zero-indexed:
-- 0 = Montag, 1 = Dienstag, 2 = Mittwoch, 3 = Donnerstag, 4 = Freitag,
-- 5 = Samstag, 6 = Sonntag.
CREATE TABLE opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (weekday, opens_at, closes_at),
  CONSTRAINT opening_hours_valid_range CHECK (closes_at > opens_at)
);

CREATE TABLE special_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date DATE NOT NULL,
  opens_at TIME,
  closes_at TIME,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT special_hours_valid CHECK (
    (is_closed = TRUE AND opens_at IS NULL AND closes_at IS NULL)
    OR
    (is_closed = FALSE AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at > opens_at)
  ),
  -- A given calendar date should only have one special-hours override.
  CONSTRAINT special_hours_business_date_unique UNIQUE (business_date)
);

CREATE INDEX special_hours_date_idx
  ON special_hours (business_date);
