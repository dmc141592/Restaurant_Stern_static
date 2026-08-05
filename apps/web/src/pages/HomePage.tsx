import { Link } from 'react-router-dom';
import HeroSection from '../features/home/HeroSection.js';
import styles from './HomePage.module.css';

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* Bestehender Platzhalterinhalt bleibt erreichbar; das Redesign der
          übrigen Startseitenabschnitte folgt in einem späteren Schritt. */}
      <section aria-labelledby="home-heading" className={`${styles.placeholderSection} container`}>
        <h2 id="home-heading">Restaurant Sternen Albisrieden</h2>
        <p>
          Willkommen auf der neuen Website des Restaurant Sternen Albisrieden in Zürich. Diese Seite
          ist die technische Grundlage der neuen Website — das endgültige visuelle Design der
          restlichen Abschnitte folgt in einem separaten Schritt.
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
    </>
  );
}
