import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchEvents } from '../api/public.js';

export default function EventsPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['events'], queryFn: fetchEvents });

  return (
    <section aria-labelledby="events-heading">
      <h1 id="events-heading">Events</h1>
      {isLoading && <p>Events werden geladen…</p>}
      {isError && <p role="alert">Events konnten nicht geladen werden.</p>}
      {data && data.length === 0 && <p>Aktuell sind keine Events geplant.</p>}
      {data && data.length > 0 && (
        <ul>
          {data.map((event) => (
            <li key={event.id}>
              <Link to={`/events/${event.slug}`}>{event.title}</Link>
              <p>{event.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
