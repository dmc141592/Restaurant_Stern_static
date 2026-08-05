import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteEvent, createEvent, fetchAdminAreas, fetchAdminEvents, updateEvent } from '../../api/admin.js';

export default function AdminEventsPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({ queryKey: ['admin', 'events'], queryFn: fetchAdminEvents });
  const areasQuery = useQuery({ queryKey: ['admin', 'areas'], queryFn: fetchAdminAreas });

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:00');
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [blockAreas, setBlockAreas] = useState(true);

  const invalidate = (): void => void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });

  const createMutation = useMutation({
    mutationFn: () =>
      createEvent({
        slug,
        title,
        summary,
        startDate,
        startTime,
        endDate,
        endTime,
        areaIds: selectedAreaIds,
        blockAreas,
      }),
    onSuccess: () => {
      invalidate();
      setSlug('');
      setTitle('');
      setSummary('');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      updateEvent(id, { isPublished }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({ mutationFn: deleteEvent, onSuccess: invalidate });

  function toggleArea(areaId: string): void {
    setSelectedAreaIds((current) =>
      current.includes(areaId) ? current.filter((id) => id !== areaId) : [...current, areaId],
    );
  }

  return (
    <section aria-labelledby="events-heading">
      <h1 id="events-heading">Events</h1>

      <h2>Neues Event</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}
      >
        <div>
          <label htmlFor="event-title">Titel</label>
          <input id="event-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="event-slug">Slug</label>
          <input id="event-slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="event-summary">Kurzbeschreibung</label>
          <input
            id="event-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="event-start-date">Beginn Datum</label>
          <input
            id="event-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="event-start-time">Beginn Zeit</label>
          <input
            id="event-start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="event-end-date">Ende Datum</label>
          <input
            id="event-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="event-end-time">Ende Zeit</label>
          <input
            id="event-end-time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
          />
        </div>
        <fieldset>
          <legend>Betroffene Bereiche</legend>
          {areasQuery.data?.map((area) => (
            <label key={area.id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={selectedAreaIds.includes(area.id)}
                onChange={() => toggleArea(area.id)}
              />{' '}
              {area.name}
            </label>
          ))}
        </fieldset>
        <label>
          <input type="checkbox" checked={blockAreas} onChange={(event) => setBlockAreas(event.target.checked)} />{' '}
          Bereiche für Onlinereservationen sperren
        </label>
        <button type="submit" disabled={createMutation.isPending}>
          Event anlegen
        </button>
      </form>

      <h2>Bestehende Events</h2>
      {eventsQuery.data && eventsQuery.data.length === 0 && <p>Keine Events vorhanden.</p>}
      {eventsQuery.data && eventsQuery.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Titel</th>
              <th scope="col">Beginn</th>
              <th scope="col">Ende</th>
              <th scope="col">Veröffentlicht</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {eventsQuery.data.map((event) => (
              <tr key={event.id}>
                <td>{event.title}</td>
                <td>{new Date(event.startsAt).toLocaleString('de-CH')}</td>
                <td>{new Date(event.endsAt).toLocaleString('de-CH')}</td>
                <td>{event.isPublished ? 'Ja' : 'Nein'}</td>
                <td>
                  <button
                    type="button"
                    onClick={() =>
                      togglePublishMutation.mutate({ id: event.id, isPublished: !event.isPublished })
                    }
                  >
                    {event.isPublished ? 'Ausblenden' : 'Veröffentlichen'}
                  </button>{' '}
                  <button type="button" onClick={() => deleteMutation.mutate(event.id)}>
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
