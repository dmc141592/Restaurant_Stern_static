import { describe, expect, it } from 'vitest';
import { createReservationSchema } from '@sternen/shared';

const validInput = {
  guestFirstName: 'Anna',
  guestLastName: 'Muster',
  guestEmail: 'anna@example.com',
  guestPhone: '+41 79 123 45 67',
  partySize: 4,
  localDate: '2026-08-15',
  localTime: '19:00',
  guestNotes: 'Fensterplatz falls möglich',
  privacyAccepted: true,
};

describe('createReservationSchema', () => {
  it('accepts a valid reservation request and normalises the phone number', () => {
    const result = createReservationSchema.parse(validInput);
    expect(result.guestPhone).toBe('+41791234567');
  });

  it('rejects when privacyAccepted is false', () => {
    const result = createReservationSchema.safeParse({ ...validInput, privacyAccepted: false });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email address', () => {
    const result = createReservationSchema.safeParse({ ...validInput, guestEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive party size', () => {
    const result = createReservationSchema.safeParse({ ...validInput, partySize: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed date', () => {
    const result = createReservationSchema.safeParse({ ...validInput, localDate: '15-08-2026' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed time', () => {
    const result = createReservationSchema.safeParse({ ...validInput, localTime: '7pm' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = createReservationSchema.safeParse({ ...validInput, extraField: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rejects a first name that is too short', () => {
    const result = createReservationSchema.safeParse({ ...validInput, guestFirstName: 'A' });
    expect(result.success).toBe(false);
  });

  it('allows an optional preferredAreaId as a UUID', () => {
    const result = createReservationSchema.safeParse({
      ...validInput,
      preferredAreaId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID preferredAreaId', () => {
    const result = createReservationSchema.safeParse({ ...validInput, preferredAreaId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
