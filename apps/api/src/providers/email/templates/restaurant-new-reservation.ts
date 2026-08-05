import { renderLayout, type RenderedEmail } from './layout.js';
import type { RestaurantNewReservationData } from './types.js';

export function renderRestaurantNewReservation(data: RestaurantNewReservationData): RenderedEmail {
  const subject = `Neue Online Reservation | ${data.localDateLabel} ${data.startTimeLabel} | ${data.partySize} Personen | ${data.areaName}`;

  const { html, text } = renderLayout({
    title: 'Neue Reservationsanfrage',
    intro: 'Eine neue Online-Reservationsanfrage ist eingegangen und wartet auf Prüfung.',
    rows: [
      { label: 'Referenz', value: data.publicReference },
      { label: 'Status', value: data.statusLabel },
      { label: 'Gast', value: `${data.guestFirstName} ${data.guestLastName}` },
      { label: 'E-Mail', value: data.guestEmail },
      { label: 'Telefon', value: data.guestPhone },
      { label: 'Datum', value: data.localDateLabel },
      { label: 'Zeit', value: `${data.startTimeLabel} bis ${data.endTimeLabel}` },
      { label: 'Personen', value: String(data.partySize) },
      { label: 'Bereich', value: data.areaName },
      { label: 'Bereichswunsch', value: data.requestedAreaName ?? 'Kein besonderer Wunsch' },
    ],
    noteLabel: 'Bemerkung',
    noteValue: data.guestNotes ?? 'Keine Bemerkung',
    actions: [
      { label: 'Reservation bestätigen', url: data.confirmUrl, variant: 'primary' },
      { label: 'Reservation ablehnen', url: data.rejectUrl, variant: 'secondary' },
    ],
    footerNote:
      'Diese Links öffnen zunächst eine Vorschauseite. Die Entscheidung muss dort per Knopfdruck ' +
      'bestätigt werden — ein blosses Öffnen des Links löst keine Statusänderung aus.',
  });

  return { subject, html, text };
}
