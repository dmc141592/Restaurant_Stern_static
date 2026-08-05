import { useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import MenuIcon from '../components/icons/MenuIcon.js';
import StarIcon from '../components/icons/StarIcon.js';
import { useIsOverHero } from '../hooks/useIsOverHero.js';
import { cx } from '../utils/cx.js';
import styles from './Header.module.css';
import MobileNav, { type NavItem } from './MobileNav.js';

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Startseite', end: true },
  { to: '/speisekarte', label: 'Speisekarte' },
  { to: '/anlaesse', label: 'Anlässe' },
  { to: '/events', label: 'Events' },
  { to: '/ueber-uns', label: 'Über uns' },
  { to: '/kontakt', label: 'Kontakt' },
];

export default function Header() {
  const location = useLocation();
  const isOverHero = useIsOverHero(location.pathname);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isTransparent = isOverHero && !isMobileNavOpen;

  function closeMobileNav(): void {
    setIsMobileNavOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <>
      <header
        className={cx(styles.header, isTransparent ? styles.headerTransparent : styles.headerSolid)}
      >
        <div className={`${styles.inner} container`}>
          <NavLink
            to="/"
            className={cx(styles.logo, 'focus-ring-on-dark')}
            aria-label="Restaurant Sternen Albisrieden — zur Startseite"
          >
            <StarIcon className={styles.logoStar} />
            <span className={styles.logoWordFull}>Restaurant Sternen Albisrieden</span>
            <span className={styles.logoWordShort}>Sternen</span>
          </NavLink>

          <nav aria-label="Hauptnavigation" className={styles.nav}>
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cx(styles.navLink, isActive && styles.navLinkActive, 'focus-ring-on-dark')
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <NavLink
              to="/reservation"
              className={cx('btn', 'btn-primary', styles.reserveButton, 'focus-ring-on-dark')}
            >
              <span className={styles.reserveButtonTextFull}>Tisch reservieren</span>
              <span className={styles.reserveButtonTextShort}>Reservieren</span>
            </NavLink>
            <button
              type="button"
              ref={menuButtonRef}
              className={cx(styles.menuButton, 'focus-ring-on-dark')}
              aria-label="Menü öffnen"
              aria-haspopup="dialog"
              aria-controls="mobile-navigation"
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen(true)}
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {isMobileNavOpen && <MobileNav navItems={NAV_ITEMS} onClose={closeMobileNav} />}
    </>
  );
}
