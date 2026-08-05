import { renderLayout, type RenderedEmail } from './layout.js';
import type { GuestReservationCancelledData } from './types.js';

export function renderGuestReservationCancelled(data: GuestReservationCancelledData): RenderedEmail {
  const { html, text } = renderLayout({
    title: 'Ihre Reservation beim Restaurant Sternen wurde storniert',
    intro: 'Ihre Reservation wurde storniert. Falls dies unerwartet kommt, kontaktieren Sie uns gerne.',
    rows: [
      { label: 'Referenz', value: data.publicReference },
      { label: 'Datum', value: data.localDateLabel },
      { label: 'Zeit', value: `${data.startTimeLabel} bis ${data.endTimeLabel}` },
      { label: 'Personen', value: String(data.partySize) },
    ],
    footerNote: 'Bei Fragen antworten Sie einfach auf diese E-Mail.',
  });

  return { subject: 'Ihre Reservation beim Restaurant Sternen wurde storniert', html, text };
}
