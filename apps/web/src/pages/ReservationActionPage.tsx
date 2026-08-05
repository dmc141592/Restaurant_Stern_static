import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  confirmReservationAction,
  fetchReservationActionPreview,
  rejectReservationAction,
} from '../api/public.js';
import { ApiError } from '../api/client.js';

export default function ReservationActionPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const previewQuery = useQuery({
    queryKey: ['reservation-action', token],
    queryFn: () => fetchReservationActionPreview(token ?? ''),
    enabled: Boolean(token),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmReservationAction(token ?? ''),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['reservation-action', token] }),
    onError: (error) => setActionError(error instanceof ApiError ? error.message : 'Fehler beim Bestätigen.'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectReservationAction(token ?? ''),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['reservation-action', token] }),
    onError: (error) => setActionError(error instanceof ApiError ? error.message : 'Fehler beim Ablehnen.'),
  });

  if (previewQuery.isLoading) {
    return <p>Reservation wird geladen…</p>;
  }
  if (previewQuery.isError || !previewQuery.data) {
    return (
      <section aria-labelledby="action-heading">
        <h1 id="action-heading">Link ungültig</h1>
        <p>Dieser Link ist ungültig oder abgelaufen.</p>
      </section>
    );
  }

  const { action, alreadyUsed, isRevoked, reservation } = previewQuery.data;
  const start = new Date(reservation.startsAt);
  const end = new Date(reservation.endsAt);
  const isBusy = confirmMutation.isPending || rejectMutation.isPending;

  return (
    <section aria-labelledby="action-heading">
      <h1 id="action-heading">Reservationsanfrage prüfen</h1>
      <dl>
        <dt>Referenz</dt>
        <dd>{reservation.reference}</dd>
        <dt>Status</dt>
        <dd>{reservation.statusLabel}</dd>
        <dt>Gast</dt>
        <dd>
          {reservation.guestFirstName} {reservation.guestLastName} · {reservation.guestEmail} ·{' '}
          {reservation.guestPhone}
        </dd>
        <dt>Datum und Zeit</dt>
        <dd>
          {start.toLocaleDateString('de-CH')}, {start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
          {' – '}
          {end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
        </dd>
        <dt>Personen</dt>
        <dd>{reservation.partySize}</dd>
        <dt>Bereich</dt>
        <dd>{reservation.areaName}</dd>
        {reservation.notes && (
          <>
            <dt>Bemerkung</dt>
            <dd>{reservation.notes}</dd>
          </>
        )}
      </dl>

      {alreadyUsed && <p>Dieser Link wurde bereits verwendet. Die Entscheidung ist bereits erfasst.</p>}
      {!alreadyUsed && isRevoked && <p>Dieser Link ist nicht mehr gültig, da bereits eine andere Entscheidung erfolgt ist.</p>}
      {!alreadyUsed && !isRevoked && (
        <div role="group" aria-label="Entscheidung">
          {action === 'CONFIRM' && (
            <button type="button" disabled={isBusy} onClick={() => confirmMutation.mutate()}>
              Reservation bestätigen
            </button>
          )}
          {action === 'REJECT' && (
            <button type="button" disabled={isBusy} onClick={() => rejectMutation.mutate()}>
              Reservation ablehnen
            </button>
          )}
        </div>
      )}

      {actionError && <p role="alert">{actionError}</p>}
      {(confirmMutation.isSuccess || rejectMutation.isSuccess) && (
        <p role="status">Die Entscheidung wurde erfasst und der Gast wird per E-Mail informiert.</p>
      )}
    </section>
  );
}
