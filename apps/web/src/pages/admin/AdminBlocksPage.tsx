import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBlockInput } from '@sternen/shared';
import { createBlock, deleteBlock, fetchAdminAreas, fetchBlocks } from '../../api/admin.js';
import { ApiError } from '../../api/client.js';

interface ConflictSummary {
  reference: string;
  guestName: string;
  startsAt: string;
  endsAt: string;
  partySize: number;
  areaName: string;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  CLOSURE: 'Schliessung',
  PRIVATE_EVENT: 'Privater Anlass',
  CAPACITY_ADJUSTMENT: 'Kapazitätsanpassung',
  MAINTENANCE: 'Unterhalt',
  OTHER: 'Sonstiges',
};

export default function AdminBlocksPage() {
  const queryClient = useQueryClient();
  const areasQuery = useQuery({ queryKey: ['admin', 'areas'], queryFn: fetchAdminAreas });
  const blocksQuery = useQuery({ queryKey: ['admin', 'blocks'], queryFn: () => fetchBlocks({}) });

  const [areaId, setAreaId] = useState('');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');
  const [conflicts, setConflicts] = useState<ConflictSummary[] | null>(null);

  const invalidate = (): void => void queryClient.invalidateQueries({ queryKey: ['admin', 'blocks'] });

  const createMutation = useMutation({
    mutationFn: (input: CreateBlockInput) => createBlock(input),
    onSuccess: () => {
      invalidate();
      setConflicts(null);
      setTitle('');
      setReason('');
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'BLOCK_CONFLICT') {
        const list = error.details?.conflicts;
        setConflicts(Array.isArray(list) ? (list as ConflictSummary[]) : []);
      }
    },
  });

  const deleteMutation = useMutation({ mutationFn: deleteBlock, onSuccess: invalidate });

  function buildInput(acknowledgeConflicts: boolean): CreateBlockInput {
    return {
      areaId: areaId || null,
      blockType: 'CLOSURE',
      title,
      reason: reason || undefined,
      startDate,
      startTime,
      endDate,
      endTime,
      acknowledgeConflicts,
    };
  }

  return (
    <section aria-labelledby="blocks-heading">
      <h1 id="blocks-heading">Sperrungen</h1>

      <h2>Neue Sperrung</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setConflicts(null);
          createMutation.mutate(buildInput(false));
        }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}
      >
        <div>
          <label htmlFor="block-area">Bereich</label>
          <select id="block-area" value={areaId} onChange={(event) => setAreaId(event.target.value)}>
            <option value="">Alle Bereiche</option>
            {areasQuery.data?.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="block-title">Titel</label>
          <input id="block-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="block-reason">Grund (intern)</label>
          <input id="block-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <div>
          <label htmlFor="block-start-date">Von Datum</label>
          <input
            id="block-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="block-start-time">Von Zeit</label>
          <input
            id="block-start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="block-end-date">Bis Datum</label>
          <input
            id="block-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="block-end-time">Bis Zeit</label>
          <input
            id="block-end-time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={createMutation.isPending}>
          Sperrung anlegen
        </button>
      </form>

      {conflicts && conflicts.length > 0 && (
        <div role="alert" style={{ border: '1px solid red', padding: '1rem', marginTop: '1rem' }}>
          <p>
            Diese Sperrung überschneidet sich mit {conflicts.length} bestehenden Reservation(en). Bitte
            prüfen:
          </p>
          <ul>
            {conflicts.map((conflict) => (
              <li key={conflict.reference}>
                {conflict.reference} — {conflict.guestName}, {conflict.partySize} Personen,{' '}
                {conflict.areaName}, {new Date(conflict.startsAt).toLocaleString('de-CH')}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => createMutation.mutate(buildInput(true))}>
            Trotzdem sperren
          </button>
        </div>
      )}

      <h2>Bestehende Sperrungen</h2>
      {blocksQuery.data && blocksQuery.data.length === 0 && <p>Keine Sperrungen vorhanden.</p>}
      {blocksQuery.data && blocksQuery.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Titel</th>
              <th scope="col">Art</th>
              <th scope="col">Bereich</th>
              <th scope="col">Von</th>
              <th scope="col">Bis</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {blocksQuery.data.map((block) => (
              <tr key={block.id}>
                <td>{block.title}</td>
                <td>{BLOCK_TYPE_LABELS[block.blockType] ?? block.blockType}</td>
                <td>{block.areaName ?? 'Alle Bereiche'}</td>
                <td>{new Date(block.startsAt).toLocaleString('de-CH')}</td>
                <td>{new Date(block.endsAt).toLocaleString('de-CH')}</td>
                <td>
                  <button type="button" onClick={() => deleteMutation.mutate(block.id)}>
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
