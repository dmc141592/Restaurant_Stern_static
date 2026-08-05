import { renderLayout, type RenderedEmail } from './layout.js';
import type { GuestRequestReceivedData } from './types.js';

export function renderGuestRequestReceived(data: GuestRequestReceivedData): RenderedEmail {
  const { html, text } = renderLayout({
    title: 'Ihre Reservationsanfrage beim Restaurant Sternen',
    intro:
      'Vielen Dank für Ihre Reservationsanfrage. Ihre Anfrage ist bei uns eingegangen und wird ' +
      'vom Restaurant geprüft. Die Reservation ist erst nach Erhalt der Bestätigung definitiv.',
    rows: [
      { label: 'Referenz', value: data.publicReference },
      { label: 'Datum', value: data.localDateLabel },
      { label: 'Zeit', value: `${data.startTimeLabel} bis ${data.endTimeLabel}` },
      { label: 'Personen', value: String(data.partySize) },
      { label: 'Bereich', value: data.areaName },
    ],
    footerNote: 'Bei Fragen antworten Sie einfach auf diese E-Mail.',
  });

  return { subject: 'Ihre Reservationsanfrage beim Restaurant Sternen', html, text };
}
