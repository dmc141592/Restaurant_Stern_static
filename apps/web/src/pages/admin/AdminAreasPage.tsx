import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AreaAdminDto } from '@sternen/shared';
import { createArea, fetchAdminAreas, updateArea } from '../../api/admin.js';

function AreaRow({ area }: { area: AreaAdminDto }) {
  const queryClient = useQueryClient();
  const [capacity, setCapacity] = useState(area.capacity);
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(area.defaultDurationMinutes);
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(area.slotIntervalMinutes);
  const [isActive, setIsActive] = useState(area.isActive);
  const [isOnlineBookable, setIsOnlineBookable] = useState(area.isOnlineBookable);
  const [sortOrder, setSortOrder] = useState(area.sortOrder);

  const mutation = useMutation({
    mutationFn: () =>
      updateArea(area.id, { capacity, defaultDurationMinutes, slotIntervalMinutes, isActive, isOnlineBookable, sortOrder }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'areas'] }),
  });

  return (
    <tr>
      <td>{area.name}</td>
      <td>{area.resourceMode === 'CAPACITY' ? 'Kapazität' : 'Exklusiv'}</td>
      <td>
        <label className="visually-hidden" htmlFor={`capacity-${area.id}`}>
          Kapazität {area.name}
        </label>
        <input
          id={`capacity-${area.id}`}
          type="number"
          min={1}
          value={capacity}
          onChange={(event) => setCapacity(Number(event.target.value))}
          style={{ width: '5rem' }}
        />
      </td>
      <td>
        <input
          type="number"
          min={30}
          max={720}
          value={defaultDurationMinutes}
          onChange={(event) => setDefaultDurationMinutes(Number(event.target.value))}
          style={{ width: '5rem' }}
          aria-label={`Standarddauer ${area.name}`}
        />
      </td>
      <td>
        <input
          type="number"
          min={5}
          max={120}
          value={slotIntervalMinutes}
          onChange={(event) => setSlotIntervalMinutes(Number(event.target.value))}
          style={{ width: '5rem' }}
          aria-label={`Slotintervall ${area.name}`}
        />
      </td>
      <td>
        <input
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(Number(event.target.value))}
          style={{ width: '4rem' }}
          aria-label={`Reihenfolge ${area.name}`}
        />
      </td>
      <td>
        <label>
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />{' '}
          aktiv
        </label>
      </td>
      <td>
        <label>
          <input
            type="checkbox"
            checked={isOnlineBookable}
            onChange={(event) => setIsOnlineBookable(event.target.checked)}
          />{' '}
          online buchbar
        </label>
      </td>
      <td>
        <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Speichern
        </button>
      </td>
    </tr>
  );
}

export default function AdminAreasPage() {
  const queryClient = useQueryClient();
  const areasQuery = useQuery({ queryKey: ['admin', 'areas'], queryFn: fetchAdminAreas });

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newCapacity, setNewCapacity] = useState(20);
  const [newResourceMode, setNewResourceMode] = useState<'CAPACITY' | 'EXCLUSIVE'>('CAPACITY');

  const createMutation = useMutation({
    mutationFn: () =>
      createArea({
        slug: newSlug,
        name: newName,
        resourceMode: newResourceMode,
        capacity: newCapacity,
        defaultDurationMinutes: 120,
        slotIntervalMinutes: 30,
        isActive: true,
        isOnlineBookable: true,
        sortOrder: (areasQuery.data?.length ?? 0) + 1,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'areas'] });
      setNewName('');
      setNewSlug('');
    },
  });

  return (
    <section aria-labelledby="areas-heading">
      <h1 id="areas-heading">Bereiche</h1>
      <p>
        Hinweis: Kapazitäten, Ressourcenarten und Buchbarkeit der Bereiche sind Ausgangswerte und
        müssen vor dem Produktionsstart vom Restaurant bestätigt werden.
      </p>

      {areasQuery.isLoading && <p>Wird geladen…</p>}
      {areasQuery.data && (
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Art</th>
              <th scope="col">Kapazität</th>
              <th scope="col">Standarddauer (Min.)</th>
              <th scope="col">Slotintervall (Min.)</th>
              <th scope="col">Reihenfolge</th>
              <th scope="col">Aktiv</th>
              <th scope="col">Online buchbar</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {areasQuery.data.map((area) => (
              <AreaRow key={area.id} area={area} />
            ))}
          </tbody>
        </table>
      )}

      <h2>Neuen Bereich anlegen</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}
      >
        <div>
          <label htmlFor="new-area-name">Name</label>
          <input id="new-area-name" value={newName} onChange={(event) => setNewName(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="new-area-slug">Slug</label>
          <input id="new-area-slug" value={newSlug} onChange={(event) => setNewSlug(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="new-area-capacity">Kapazität</label>
          <input
            id="new-area-capacity"
            type="number"
            min={1}
            value={newCapacity}
            onChange={(event) => setNewCapacity(Number(event.target.value))}
          />
        </div>
        <div>
          <label htmlFor="new-area-mode">Ressourcenart</label>
          <select
            id="new-area-mode"
            value={newResourceMode}
            onChange={(event) => setNewResourceMode(event.target.value as 'CAPACITY' | 'EXCLUSIVE')}
          >
            <option value="CAPACITY">Kapazitätsbasiert</option>
            <option value="EXCLUSIVE">Exklusiv</option>
          </select>
        </div>
        <button type="submit" disabled={createMutation.isPending}>
          Bereich anlegen
        </button>
      </form>
    </section>
  );
}
