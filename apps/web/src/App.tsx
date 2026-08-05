import { Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.js';
import AdminLayout from './layouts/AdminLayout.js';
import { AdminAuthProvider } from './features/admin/AdminAuthContext.js';
import HomePage from './pages/HomePage.js';
import SpeisekartePage from './pages/SpeisekartePage.js';
import AnlaessePage from './pages/AnlaessePage.js';
import EventsPage from './pages/EventsPage.js';
import EventDetailPage from './pages/EventDetailPage.js';
import UeberUnsPage from './pages/UeberUnsPage.js';
import KontaktPage from './pages/KontaktPage.js';
import ReservationPage from './pages/ReservationPage.js';
import ReservationSuccessPage from './pages/ReservationSuccessPage.js';
import ReservationActionPage from './pages/ReservationActionPage.js';
import NotFoundPage from './pages/NotFoundPage.js';
import AdminLoginPage from './pages/admin/AdminLoginPage.js';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.js';
import AdminReservationsPage from './pages/admin/AdminReservationsPage.js';
import AdminAreasPage from './pages/admin/AdminAreasPage.js';
import AdminBlocksPage from './pages/admin/AdminBlocksPage.js';
import AdminOpeningHoursPage from './pages/admin/AdminOpeningHoursPage.js';
import AdminEventsPage from './pages/admin/AdminEventsPage.js';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/speisekarte" element={<SpeisekartePage />} />
        <Route path="/anlaesse" element={<AnlaessePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />
        <Route path="/ueber-uns" element={<UeberUnsPage />} />
        <Route path="/kontakt" element={<KontaktPage />} />
        <Route path="/reservation" element={<ReservationPage />} />
        <Route path="/reservation/erfolgreich" element={<ReservationSuccessPage />} />
        <Route path="/reservationsaktion/:token" element={<ReservationActionPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/admin/*"
        element={
          <AdminAuthProvider>
            <Routes>
              <Route path="login" element={<AdminLoginPage />} />
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="reservationen" element={<AdminReservationsPage />} />
                <Route path="bereiche" element={<AdminAreasPage />} />
                <Route path="sperrungen" element={<AdminBlocksPage />} />
                <Route path="oeffnungszeiten" element={<AdminOpeningHoursPage />} />
                <Route path="events" element={<AdminEventsPage />} />
              </Route>
            </Routes>
          </AdminAuthProvider>
        }
      />
    </Routes>
  );
}
