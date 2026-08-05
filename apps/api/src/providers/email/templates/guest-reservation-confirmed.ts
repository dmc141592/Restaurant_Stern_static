import { renderLayout, type RenderedEmail } from './layout.js';
import type { GuestReservationConfirmedData } from './types.js';

export function renderGuestReservationConfirmed(data: GuestReservationConfirmedData): RenderedEmail {
  const { html, text } = renderLayout({
    title: 'Ihre Reservation beim Restaurant Sternen ist bestätigt',
    intro: 'Wir freuen uns, Ihnen mitzuteilen, dass Ihre Reservation bestätigt wurde.',
    rows: [
      { label: 'Referenz', value: data.publicReference },
      { label: 'Status', value: data.statusLabel },
      { label: 'Datum', value: data.localDateLabel },
      { label: 'Zeit', value: `${data.startTimeLabel} bis ${data.endTimeLabel}` },
      { label: 'Personen', value: String(data.partySize) },
      { label: 'Bereich', value: data.areaName },
      { label: 'Adresse', value: data.restaurantAddress },
      { label: 'Telefon', value: data.restaurantPhone },
    ],
    footerNote: 'Wir freuen uns auf Ihren Besuch.',
  });

  return { subject: 'Ihre Reservation beim Restaurant Sternen ist bestätigt', html, text };
}
