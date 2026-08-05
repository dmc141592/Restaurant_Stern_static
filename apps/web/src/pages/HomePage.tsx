import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <section aria-labelledby="home-heading">
      <h1 id="home-heading">Restaurant Sternen Albisrieden</h1>
      <p>
        Willkommen auf der neuen Website des Restaurant Sternen Albisrieden in Zürich. Diese Seite ist
        die technische Grundlage der neuen Website — das endgültige visuelle Design wird separat
        umgesetzt.
      </p>
      <p>
        <Link to="/reservation">Jetzt einen Tisch reservieren</Link>
      </p>
      <p>
        Entdecken Sie unsere <Link to="/speisekarte">Speisekarte</Link>, unsere{' '}
        <Link to="/events">aktuellen Events</Link> und Informationen für{' '}
        <Link to="/anlaesse">private Anlässe</Link>.
      </p>
    </section>
  );
}
