import { renderLayout, type RenderedEmail } from './layout.js';
import type { GuestReservationRejectedData } from './types.js';

export function renderGuestReservationRejected(data: GuestReservationRejectedData): RenderedEmail {
  const { html, text } = renderLayout({
    title: 'Ihre Reservationsanfrage konnte nicht bestätigt werden',
    intro:
      'Leider können wir Ihre Reservationsanfrage nicht bestätigen. Wir bitten dies zu entschuldigen ' +
      'und stehen für eine alternative Reservation gerne zur Verfügung.',
    rows: [
      { label: 'Referenz', value: data.publicReference },
      { label: 'Datum', value: data.localDateLabel },
      { label: 'Zeit', value: `${data.startTimeLabel} bis ${data.endTimeLabel}` },
      { label: 'Personen', value: String(data.partySize) },
    ],
    ...(data.rejectionReason ? { noteLabel: 'Hinweis', noteValue: data.rejectionReason } : {}),
    footerNote: 'Bei Fragen antworten Sie einfach auf diese E-Mail.',
  });

  return { subject: 'Ihre Reservationsanfrage konnte nicht bestätigt werden', html, text };
}
