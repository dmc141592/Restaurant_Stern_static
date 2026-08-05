import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.js';
import styles from './PublicLayout.module.css';

export default function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <>
      <a href="#main-content" className="skip-link visually-hidden">
        Zum Inhalt springen
      </a>
      <Header />
      <main id="main-content" className={isHome ? styles.mainFullBleed : styles.main}>
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
