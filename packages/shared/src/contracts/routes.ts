export const API_V1_PREFIX = '/api/v1';

export const publicRoutes = {
  areas: `${API_V1_PREFIX}/public/areas`,
  availability: `${API_V1_PREFIX}/public/availability`,
  reservations: `${API_V1_PREFIX}/public/reservations`,
  events: `${API_V1_PREFIX}/public/events`,
  eventBySlug: (slug: string) => `${API_V1_PREFIX}/public/events/${slug}`,
};

export const reservationActionRoutes = {
  preview: (token: string) => `${API_V1_PREFIX}/reservation-actions/${token}`,
  confirm: (token: string) => `${API_V1_PREFIX}/reservation-actions/${token}/confirm`,
  reject: (token: string) => `${API_V1_PREFIX}/reservation-actions/${token}/reject`,
};

export const adminRoutes = {
  login: `${API_V1_PREFIX}/admin/auth/login`,
  logout: `${API_V1_PREFIX}/admin/auth/logout`,
  session: `${API_V1_PREFIX}/admin/auth/session`,
  reservations: `${API_V1_PREFIX}/admin/reservations`,
  reservationById: (id: string) => `${API_V1_PREFIX}/admin/reservations/${id}`,
  confirmReservation: (id: string) => `${API_V1_PREFIX}/admin/reservations/${id}/confirm`,
  rejectReservation: (id: string) => `${API_V1_PREFIX}/admin/reservations/${id}/reject`,
  cancelReservation: (id: string) => `${API_V1_PREFIX}/admin/reservations/${id}/cancel`,
  areas: `${API_V1_PREFIX}/admin/areas`,
  areaById: (id: string) => `${API_V1_PREFIX}/admin/areas/${id}`,
  blocks: `${API_V1_PREFIX}/admin/blocks`,
  blockById: (id: string) => `${API_V1_PREFIX}/admin/blocks/${id}`,
  openingHours: `${API_V1_PREFIX}/admin/opening-hours`,
  specialHours: `${API_V1_PREFIX}/admin/special-hours`,
  specialHourById: (id: string) => `${API_V1_PREFIX}/admin/special-hours/${id}`,
  events: `${API_V1_PREFIX}/admin/events`,
  eventById: (id: string) => `${API_V1_PREFIX}/admin/events/${id}`,
};

export const posRoutes = {
  reservations: `${API_V1_PREFIX}/admin/reservations`,
};

export const healthRoutes = {
  live: '/health/live',
  ready: '/health/ready',
};
