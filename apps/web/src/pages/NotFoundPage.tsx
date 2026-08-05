import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Seite nicht gefunden</h1>
      <p>Die angeforderte Seite existiert nicht.</p>
      <p>
        <Link to="/">Zurück zur Startseite</Link>
      </p>
    </section>
  );
}
