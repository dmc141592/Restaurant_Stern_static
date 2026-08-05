import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchReservations } from '../../api/admin.js';
import { formatAge } from '../../features/admin/formatAge.js';

export default function AdminDashboardPage() {
  const pendingQuery = useQuery({
    queryKey: ['admin', 'reservations', 'pending-overview'],
    queryFn: () => fetchReservations({ status: 'PENDING', limit: 20 }),
  });

  const pending = pendingQuery.data?.data ?? [];

  return (
    <section aria-labelledby="dashboard-heading">
      <h1 id="dashboard-heading">Übersicht</h1>
      <h2>Offene Reservationsanfragen ({pending.length})</h2>
      {pendingQuery.isLoading && <p>Wird geladen…</p>}
      {!pendingQuery.isLoading && pending.length === 0 && <p>Aktuell keine offenen Anfragen.</p>}
      {pending.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Referenz</th>
              <th scope="col">Gast</th>
              <th scope="col">Zeit</th>
              <th scope="col">Personen</th>
              <th scope="col">Bereich</th>
              <th scope="col">Alter der Anfrage</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((reservation) => (
              <tr key={reservation.id}>
                <td>
                  <Link to="/admin/reservationen">{reservation.reference}</Link>
                </td>
                <td>
                  {reservation.guest.firstName} {reservation.guest.lastName}
                </td>
                <td>{new Date(reservation.startsAt).toLocaleString('de-CH')}</td>
                <td>{reservation.partySize}</td>
                <td>{reservation.area.name}</td>
                <td>{formatAge(reservation.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
