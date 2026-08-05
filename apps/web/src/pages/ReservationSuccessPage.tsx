import { Link, useLocation } from 'react-router-dom';
import type { CreateReservationResponse } from '../api/public.js';

interface LocationState {
  result?: CreateReservationResponse;
}

export default function ReservationSuccessPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const result = state?.result;

  if (!result) {
    return (
      <section aria-labelledby="success-heading">
        <h1 id="success-heading">Reservationsanfrage</h1>
        <p>
          Es liegen keine Informationen zu einer soeben abgeschlossenen Reservation vor.{' '}
          <Link to="/reservation">Zurück zum Reservationsformular</Link>.
        </p>
      </section>
    );
  }

  const { reservation, message } = result;
  const start = new Date(reservation.startsAt);
  const end = new Date(reservation.endsAt);

  return (
    <section aria-labelledby="success-heading">
      <h1 id="success-heading">Vielen Dank für Ihre Reservationsanfrage</h1>
      <p>{message}</p>
      <dl>
        <dt>Referenz</dt>
        <dd>{reservation.reference}</dd>
        <dt>Status</dt>
        <dd>{reservation.statusLabel}</dd>
        <dt>Datum und Zeit</dt>
        <dd>
          {start.toLocaleDateString('de-CH')}, {start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
          {' – '}
          {end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
        </dd>
        <dt>Personen</dt>
        <dd>{reservation.partySize}</dd>
        <dt>Bereich</dt>
        <dd>{reservation.area.name}</dd>
      </dl>
      <p>
        <Link to="/">Zurück zur Startseite</Link>
      </p>
    </section>
  );
}
