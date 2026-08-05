import { NavLink, Outlet } from 'react-router-dom';
import styles from './PublicLayout.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Startseite', end: true },
  { to: '/speisekarte', label: 'Speisekarte' },
  { to: '/anlaesse', label: 'Anlässe' },
  { to: '/events', label: 'Events' },
  { to: '/ueber-uns', label: 'Über uns' },
  { to: '/kontakt', label: 'Kontakt' },
];

export default function PublicLayout() {
  return (
    <>
      <a href="#main-content" className="skip-link visually-hidden">
        Zum Inhalt springen
      </a>
      <header className={styles.header}>
        <NavLink to="/" className={styles.logo}>
          Restaurant Sternen Albisrieden
        </NavLink>
        <nav aria-label="Hauptnavigation">
          <ul className={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? styles.activeLink : undefined)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <NavLink to="/reservation" className={styles.reserveButton}>
          Tisch reservieren
        </NavLink>
      </header>
      <main id="main-content" className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>
          Restaurant Sternen Albisrieden · Zürich · Diese Website befindet sich in Entwicklung — das
          endgültige Design folgt separat.
        </p>
      </footer>
    </>
  );
}
