import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import CloseIcon from '../components/icons/CloseIcon.js';
import StarIcon from '../components/icons/StarIcon.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import styles from './MobileNav.module.css';

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface MobileNavProps {
  navItems: NavItem[];
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

/**
 * Bildschirmfüllendes Menü-Overlay. Wird nur gerendert, solange es offen ist —
 * dadurch ist die Bedienbarkeit beim Schliessen automatisch korrekt (keine
 * unsichtbaren, aber fokussierbaren Elemente im Hintergrund).
 */
export default function MobileNav({ navItems, onClose }: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      id="mobile-navigation"
      ref={panelRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Hauptnavigation"
    >
      <div className={`${styles.topRow} container`}>
        <span className={styles.brand}>
          <StarIcon className={styles.brandStar} aria-hidden="true" />
          Restaurant Sternen
        </span>
        <button
          type="button"
          ref={closeButtonRef}
          className={`${styles.closeButton} focus-ring-on-dark`}
          onClick={onClose}
          aria-label="Menü schliessen"
        >
          <CloseIcon />
        </button>
      </div>

      <nav aria-label="Hauptnavigation" className={styles.navWrapper}>
        <ul className={styles.list}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  isActive
                    ? `${styles.link} ${styles.linkActive} focus-ring-on-dark`
                    : `${styles.link} focus-ring-on-dark`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <NavLink
          to="/reservation"
          onClick={onClose}
          className={`btn btn-primary ${styles.reserveButton} focus-ring-on-dark`}
        >
          Tisch reservieren
        </NavLink>
      </nav>
    </div>
  );
}
