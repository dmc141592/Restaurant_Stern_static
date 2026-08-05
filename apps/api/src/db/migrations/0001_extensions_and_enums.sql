-- Extensions required for UUID generation and GiST exclusion constraints on ranges.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE resource_mode AS ENUM (
  'CAPACITY',
  'EXCLUSIVE'
);

CREATE TYPE reservation_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE reservation_source AS ENUM (
  'ONLINE',
  'ADMIN',
  'POS_API'
);

CREATE TYPE block_type AS ENUM (
  'CLOSURE',
  'PRIVATE_EVENT',
  'CAPACITY_ADJUSTMENT',
  'MAINTENANCE',
  'OTHER'
);

CREATE TYPE notification_type AS ENUM (
  'RESTAURANT_NEW_RESERVATION',
  'GUEST_REQUEST_RECEIVED',
  'GUEST_RESERVATION_CONFIRMED',
  'GUEST_RESERVATION_REJECTED',
  'GUEST_RESERVATION_CANCELLED'
);

CREATE TYPE notification_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED'
);

-- Generic trigger function to keep updated_at columns accurate on every UPDATE.
-- Addition beyond the brief's literal schema: avoids relying on application code
-- to remember to bump timestamps, which would otherwise be a silent-failure risk.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
