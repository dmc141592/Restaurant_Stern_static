import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchEventBySlug } from '../api/public.js';

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', slug],
    queryFn: () => fetchEventBySlug(slug ?? ''),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return <p>Event wird geladen…</p>;
  }
  if (isError || !data) {
    return (
      <section>
        <h1>Event nicht gefunden</h1>
        <p>
          <Link to="/events">Zurück zur Übersicht</Link>
        </p>
      </section>
    );
  }

  const start = new Date(data.startsAt);
  const end = new Date(data.endsAt);

  return (
    <article aria-labelledby="event-heading">
      <h1 id="event-heading">{data.title}</h1>
      <p>{data.summary}</p>
      {data.description && <p>{data.description}</p>}
      <dl>
        <dt>Beginn</dt>
        <dd>{start.toLocaleString('de-CH')}</dd>
        <dt>Ende</dt>
        <dd>{end.toLocaleString('de-CH')}</dd>
        {data.areas.length > 0 && (
          <>
            <dt>Bereiche</dt>
            <dd>{data.areas.map((area) => area.name).join(', ')}</dd>
          </>
        )}
      </dl>
      <p>
        <Link to="/events">Zurück zur Übersicht</Link>
      </p>
    </article>
  );
}
