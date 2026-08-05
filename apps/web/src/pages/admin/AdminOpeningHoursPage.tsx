import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OpeningHourDto } from '@sternen/shared';
import {
  createSpecialHour,
  deleteSpecialHour,
  fetchOpeningHours,
  fetchSpecialHours,
  replaceOpeningHours,
} from '../../api/admin.js';

const WEEKDAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

type EditableEntry = Pick<OpeningHourDto, 'weekday' | 'opensAt' | 'closesAt' | 'isEnabled'>;

export default function AdminOpeningHoursPage() {
  const queryClient = useQueryClient();
  const openingHoursQuery = useQuery({ queryKey: ['admin', 'opening-hours'], queryFn: fetchOpeningHours });
  const specialHoursQuery = useQuery({ queryKey: ['admin', 'special-hours'], queryFn: fetchSpecialHours });

  const [entries, setEntries] = useState<EditableEntry[]>([]);

  useEffect(() => {
    if (openingHoursQuery.data) {
      setEntries(
        openingHoursQuery.data.map((entry) => ({
          weekday: entry.weekday,
          opensAt: entry.opensAt,
          closesAt: entry.closesAt,
          isEnabled: entry.isEnabled,
        })),
      );
    }
  }, [openingHoursQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => replaceOpeningHours({ entries }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'opening-hours'] }),
  });

  const [specialDate, setSpecialDate] = useState('');
  const [specialClosed, setSpecialClosed] = useState(true);
  const [specialOpensAt, setSpecialOpensAt] = useState('11:00');
  const [specialClosesAt, setSpecialClosesAt] = useState('23:00');
  const [specialLabel, setSpecialLabel] = useState('');

  const createSpecialMutation = useMutation({
    mutationFn: () =>
      createSpecialHour({
        businessDate: specialDate,
        isClosed: specialClosed,
        opensAt: specialClosed ? undefined : specialOpensAt,
        closesAt: specialClosed ? undefined : specialClosesAt,
        label: specialLabel || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'special-hours'] });
      setSpecialDate('');
      setSpecialLabel('');
    },
  });

  const deleteSpecialMutation = useMutation({
    mutationFn: deleteSpecialHour,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'special-hours'] }),
  });

  function addEntry(weekday: number): void {
    setEntries((current) => [...current, { weekday, opensAt: '11:00', closesAt: '14:00', isEnabled: true }]);
  }

  function updateEntry(index: number, patch: Partial<EditableEntry>): void {
    setEntries((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function removeEntry(index: number): void {
    setEntries((current) => current.filter((_, i) => i !== index));
  }

  return (
    <section aria-labelledby="hours-heading">
      <h1 id="hours-heading">Öffnungszeiten</h1>
      <p>
        Hinweis: Die hier gezeigten Öffnungszeiten sind Platzhalter für die lokale Entwicklung und
        müssen vor dem Produktionsstart vom Restaurant bestätigt werden.
      </p>

      <h2>Reguläre Öffnungszeiten</h2>
      {WEEKDAY_LABELS.map((label, weekday) => (
        <fieldset key={weekday} style={{ marginBottom: '0.75rem' }}>
          <legend>{label}</legend>
          {entries
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) => entry.weekday === weekday)
            .map(({ entry, index }) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="time"
                  value={entry.opensAt}
                  onChange={(event) => updateEntry(index, { opensAt: event.target.value })}
                  aria-label={`${label} öffnet`}
                />
                <span>bis</span>
                <input
                  type="time"
                  value={entry.closesAt}
                  onChange={(event) => updateEntry(index, { closesAt: event.target.value })}
                  aria-label={`${label} schliesst`}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={entry.isEnabled}
                    onChange={(event) => updateEntry(index, { isEnabled: event.target.checked })}
                  />{' '}
                  aktiv
                </label>
                <button type="button" onClick={() => removeEntry(index)}>
                  Entfernen
                </button>
              </div>
            ))}
          <button type="button" onClick={() => addEntry(weekday)}>
            Zeitfenster hinzufügen
          </button>
        </fieldset>
      ))}
      <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        Öffnungszeiten speichern
      </button>

      <h2>Besondere Öffnungszeiten</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          createSpecialMutation.mutate();
        }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}
      >
        <div>
          <label htmlFor="special-date">Datum</label>
          <input
            id="special-date"
            type="date"
            value={specialDate}
            onChange={(event) => setSpecialDate(event.target.value)}
            required
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={specialClosed}
              onChange={(event) => setSpecialClosed(event.target.checked)}
            />{' '}
            ganztags geschlossen
          </label>
        </div>
        {!specialClosed && (
          <>
            <div>
              <label htmlFor="special-opens">Öffnet</label>
              <input
                id="special-opens"
                type="time"
                value={specialOpensAt}
                onChange={(event) => setSpecialOpensAt(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="special-closes">Schliesst</label>
              <input
                id="special-closes"
                type="time"
                value={specialClosesAt}
                onChange={(event) => setSpecialClosesAt(event.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <label htmlFor="special-label">Bezeichnung</label>
          <input
            id="special-label"
            value={specialLabel}
            onChange={(event) => setSpecialLabel(event.target.value)}
            placeholder="z.B. Weihnachten"
          />
        </div>
        <button type="submit" disabled={createSpecialMutation.isPending}>
          Hinzufügen
        </button>
      </form>

      {specialHoursQuery.data && specialHoursQuery.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Datum</th>
              <th scope="col">Geschlossen</th>
              <th scope="col">Öffnet</th>
              <th scope="col">Schliesst</th>
              <th scope="col">Bezeichnung</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {specialHoursQuery.data.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.businessDate}</td>
                <td>{entry.isClosed ? 'Ja' : 'Nein'}</td>
                <td>{entry.opensAt ?? '–'}</td>
                <td>{entry.closesAt ?? '–'}</td>
                <td>{entry.label ?? '–'}</td>
                <td>
                  <button type="button" onClick={() => deleteSpecialMutation.mutate(entry.id)}>
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
