import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../features/admin/AdminAuthContext.js';
import styles from './AdminLayout.module.css';

const NAV_ITEMS = [
  { to: '/admin', label: 'Übersicht', end: true },
  { to: '/admin/reservationen', label: 'Reservationen' },
  { to: '/admin/bereiche', label: 'Bereiche' },
  { to: '/admin/sperrungen', label: 'Sperrungen' },
  { to: '/admin/oeffnungszeiten', label: 'Öffnungszeiten' },
  { to: '/admin/events', label: 'Events' },
];

export default function AdminLayout() {
  const { isLoading, isAuthenticated, administratorEmail, logout } = useAdminAuth();

  if (isLoading) {
    return <p>Sitzung wird geprüft…</p>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.sidebarTitle}>Adminbereich</p>
        <nav aria-label="Admin-Navigation">
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
        <p>{administratorEmail}</p>
        <button type="button" className={styles.logoutButton} onClick={() => void logout()}>
          Abmelden
        </button>
      </aside>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
