import { describe, expect, it } from 'vitest';
import { renderRestaurantNewReservation } from '../../src/providers/email/templates/restaurant-new-reservation.js';
import { renderGuestRequestReceived } from '../../src/providers/email/templates/guest-request-received.js';
import { renderGuestReservationConfirmed } from '../../src/providers/email/templates/guest-reservation-confirmed.js';
import { renderGuestReservationRejected } from '../../src/providers/email/templates/guest-reservation-rejected.js';

const baseFields = {
  publicReference: 'STERNEN-2026-ABC123',
  statusLabel: 'Eingegangen',
  guestFirstName: 'Anna',
  guestLastName: 'Muster',
  guestEmail: 'anna@example.com',
  guestPhone: '+41791234567',
  localDateLabel: '15.08.2026',
  startTimeLabel: '19:00',
  endTimeLabel: '21:00',
  partySize: 4,
  areaName: 'Restaurant',
  requestedAreaName: null,
  guestNotes: null,
};

describe('renderRestaurantNewReservation', () => {
  it('includes the subject line with date, time, party size and area', () => {
    const email = renderRestaurantNewReservation({
      ...baseFields,
      receivedAtLabel: '01.08.2026 um 10:00 Uhr',
      confirmUrl: 'https://example.com/confirm/token-a',
      rejectUrl: 'https://example.com/reject/token-b',
    });
    expect(email.subject).toContain('15.08.2026');
    expect(email.subject).toContain('19:00');
    expect(email.subject).toContain('4 Personen');
    expect(email.subject).toContain('Restaurant');
  });

  it('renders both action links in the HTML version', () => {
    const email = renderRestaurantNewReservation({
      ...baseFields,
      receivedAtLabel: '01.08.2026 um 10:00 Uhr',
      confirmUrl: 'https://example.com/confirm/token-a',
      rejectUrl: 'https://example.com/reject/token-b',
    });
    expect(email.html).toContain('https://example.com/confirm/token-a');
    expect(email.html).toContain('https://example.com/reject/token-b');
    expect(email.html).toContain('Reservation bestätigen');
    expect(email.html).toContain('Reservation ablehnen');
  });

  it('includes both action links in the plain-text version too', () => {
    const email = renderRestaurantNewReservation({
      ...baseFields,
      receivedAtLabel: '01.08.2026 um 10:00 Uhr',
      confirmUrl: 'https://example.com/confirm/token-a',
      rejectUrl: 'https://example.com/reject/token-b',
    });
    expect(email.text).toContain('https://example.com/confirm/token-a');
    expect(email.text).toContain('https://example.com/reject/token-b');
  });

  it('HTML-escapes guest-provided free text to prevent HTML injection', () => {
    const email = renderRestaurantNewReservation({
      ...baseFields,
      guestNotes: '<script>alert(1)</script>',
      receivedAtLabel: '01.08.2026 um 10:00 Uhr',
      confirmUrl: 'https://example.com/confirm/token-a',
      rejectUrl: 'https://example.com/reject/token-b',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('renderGuestRequestReceived', () => {
  it('states clearly that the reservation is not yet definitive', () => {
    const email = renderGuestRequestReceived(baseFields);
    expect(email.text).toContain('erst nach Erhalt der Bestätigung definitiv');
    expect(email.subject).toBe('Ihre Reservationsanfrage beim Restaurant Sternen');
  });
});

describe('renderGuestReservationConfirmed', () => {
  it('includes restaurant contact details for the confirmed guest', () => {
    const email = renderGuestReservationConfirmed({
      ...baseFields,
      restaurantAddress: 'Musterstrasse 1, Zürich',
      restaurantPhone: '+41 44 000 00 00',
    });
    expect(email.html).toContain('Musterstrasse 1, Zürich');
    expect(email.html).toContain('+41 44 000 00 00');
  });
});

describe('renderGuestReservationRejected', () => {
  it('does not invent a rejection reason when none was recorded', () => {
    const email = renderGuestReservationRejected({ ...baseFields, rejectionReason: null });
    expect(email.text).not.toContain('Hinweis:');
  });

  it('includes the rejection reason when one was recorded', () => {
    const email = renderGuestReservationRejected({
      ...baseFields,
      rejectionReason: 'Ausgebucht an diesem Abend',
    });
    expect(email.text).toContain('Ausgebucht an diesem Abend');
  });
});
