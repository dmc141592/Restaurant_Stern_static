import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelReservation,
  confirmReservation,
  fetchAdminAreas,
  fetchReservations,
  rejectReservation,
} from '../../api/admin.js';
import { formatAge } from '../../features/admin/formatAge.js';

const STATUS_OPTIONS = [
  { value: '', label: 'Alle Status' },
  { value: 'PENDING', label: 'Eingegangen' },
  { value: 'CONFIRMED', label: 'Bestätigt' },
  { value: 'REJECTED', label: 'Abgelehnt' },
  { value: 'CANCELLED', label: 'Storniert' },
];

export default function AdminReservationsPage() {
  const [status, setStatus] = useState('');
  const [areaId, setAreaId] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const areasQuery = useQuery({ queryKey: ['admin', 'areas'], queryFn: fetchAdminAreas });

  const reservationsQuery = useQuery({
    queryKey: ['admin', 'reservations', { status, areaId, cursor }],
    queryFn: () =>
      fetchReservations({
        status: status || undefined,
        areaId: areaId || undefined,
        cursor,
        limit: 25,
      }),
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'reservations'] });
  };

  const confirmMutation = useMutation({ mutationFn: confirmReservation, onSuccess: invalidate });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectReservation(id),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({ mutationFn: cancelReservation, onSuccess: invalidate });

  const reservations = reservationsQuery.data?.data ?? [];

  return (
    <section aria-labelledby="reservations-heading">
      <h1 id="reservations-heading">Reservationen</h1>

      <form
        aria-label="Filter"
        onSubmit={(event) => event.preventDefault()}
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}
      >
        <div>
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setCursor(undefined);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="area-filter">Bereich</label>
          <select
            id="area-filter"
            value={areaId}
            onChange={(event) => {
              setAreaId(event.target.value);
              setCursor(undefined);
            }}
          >
            <option value="">Alle Bereiche</option>
            {areasQuery.data?.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      </form>

      {reservationsQuery.isLoading && <p>Wird geladen…</p>}
      {!reservationsQuery.isLoading && reservations.length === 0 && <p>Keine Reservationen gefunden.</p>}

      {reservations.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Referenz</th>
              <th scope="col">Gast</th>
              <th scope="col">Personen</th>
              <th scope="col">Zeitraum</th>
              <th scope="col">Bereich</th>
              <th scope="col">Status</th>
              <th scope="col">Alter</th>
              <th scope="col">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id}>
                <td>{reservation.reference}</td>
                <td>
                  {reservation.guest.firstName} {reservation.guest.lastName}
                  <br />
                  <small>
                    {reservation.guest.email} · {reservation.guest.phone}
                  </small>
                </td>
                <td>{reservation.partySize}</td>
                <td>
                  {new Date(reservation.startsAt).toLocaleString('de-CH')} –{' '}
                  {new Date(reservation.endsAt).toLocaleTimeString('de-CH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td>{reservation.area.name}</td>
                <td>{reservation.statusLabel}</td>
                <td>{formatAge(reservation.createdAt)}</td>
                <td>
                  {reservation.status === 'PENDING' && (
                    <>
                      <button type="button" onClick={() => confirmMutation.mutate(reservation.id)}>
                        Bestätigen
                      </button>{' '}
                      <button type="button" onClick={() => rejectMutation.mutate(reservation.id)}>
                        Ablehnen
                      </button>
                    </>
                  )}
                  {(reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') && (
                    <>
                      {' '}
                      <button type="button" onClick={() => cancelMutation.mutate(reservation.id)}>
                        Stornieren
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '1rem' }}>
        <button
          type="button"
          disabled={!reservationsQuery.data?.pagination.nextCursor}
          onClick={() => setCursor(reservationsQuery.data?.pagination.nextCursor ?? undefined)}
        >
          Weitere laden
        </button>
      </div>
    </section>
  );
}
