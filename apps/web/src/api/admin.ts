import { adminRoutes } from '@sternen/shared';
import type {
  AdminReservationDto,
  AreaAdminDto,
  AvailabilityBlockDto,
  CreateAreaInput,
  CreateBlockInput,
  CreateEventInput,
  CreateSpecialHourInput,
  CursorPage,
  EventAdminDto,
  OpeningHourDto,
  ReplaceOpeningHoursInput,
  SpecialHourDto,
  UpdateAreaInput,
  UpdateBlockInput,
  UpdateEventInput,
  UpdateSpecialHourInput,
} from '@sternen/shared';
import { apiRequest, buildQueryString } from './client.js';

export function login(email: string, password: string): Promise<{ administrator: { email: string } }> {
  return apiRequest(adminRoutes.login, { method: 'POST', body: { email, password } });
}

export function logout(): Promise<{ success: boolean }> {
  return apiRequest(adminRoutes.logout, { method: 'POST', withAdminAuth: true });
}

export function fetchSession(): Promise<{ authenticated: boolean; administrator?: { email: string } }> {
  return apiRequest(adminRoutes.session, { withAdminAuth: true });
}

export interface AdminReservationFilters {
  status?: string;
  areaId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export function fetchReservations(
  filters: AdminReservationFilters,
): Promise<CursorPage<AdminReservationDto>> {
  const query = buildQueryString({ ...filters });
  return apiRequest(`${adminRoutes.reservations}${query}`, { withAdminAuth: true });
}

export function fetchReservation(id: string): Promise<AdminReservationDto> {
  return apiRequest(adminRoutes.reservationById(id), { withAdminAuth: true });
}

export function confirmReservation(id: string): Promise<AdminReservationDto> {
  return apiRequest(adminRoutes.confirmReservation(id), { method: 'POST', withAdminAuth: true });
}

export function rejectReservation(id: string, reason?: string): Promise<AdminReservationDto> {
  return apiRequest(adminRoutes.rejectReservation(id), {
    method: 'POST',
    withAdminAuth: true,
    body: { reason },
  });
}

export function cancelReservation(id: string): Promise<AdminReservationDto> {
  return apiRequest(adminRoutes.cancelReservation(id), { method: 'POST', withAdminAuth: true });
}

export function fetchAdminAreas(): Promise<AreaAdminDto[]> {
  return apiRequest(adminRoutes.areas, { withAdminAuth: true });
}

export function createArea(input: CreateAreaInput): Promise<AreaAdminDto> {
  return apiRequest(adminRoutes.areas, { method: 'POST', withAdminAuth: true, body: input });
}

export function updateArea(id: string, input: UpdateAreaInput): Promise<AreaAdminDto> {
  return apiRequest(adminRoutes.areaById(id), { method: 'PATCH', withAdminAuth: true, body: input });
}

export function fetchBlocks(filters: { areaId?: string; from?: string; to?: string }): Promise<
  AvailabilityBlockDto[]
> {
  const query = buildQueryString({ ...filters });
  return apiRequest(`${adminRoutes.blocks}${query}`, { withAdminAuth: true });
}

export function createBlock(input: CreateBlockInput): Promise<AvailabilityBlockDto> {
  return apiRequest(adminRoutes.blocks, { method: 'POST', withAdminAuth: true, body: input });
}

export function updateBlock(id: string, input: UpdateBlockInput): Promise<AvailabilityBlockDto> {
  return apiRequest(adminRoutes.blockById(id), { method: 'PATCH', withAdminAuth: true, body: input });
}

export function deleteBlock(id: string): Promise<void> {
  return apiRequest(adminRoutes.blockById(id), { method: 'DELETE', withAdminAuth: true });
}

export function fetchOpeningHours(): Promise<OpeningHourDto[]> {
  return apiRequest(adminRoutes.openingHours, { withAdminAuth: true });
}

export function replaceOpeningHours(input: ReplaceOpeningHoursInput): Promise<OpeningHourDto[]> {
  return apiRequest(adminRoutes.openingHours, { method: 'PUT', withAdminAuth: true, body: input });
}

export function fetchSpecialHours(): Promise<SpecialHourDto[]> {
  return apiRequest(adminRoutes.specialHours, { withAdminAuth: true });
}

export function createSpecialHour(input: CreateSpecialHourInput): Promise<SpecialHourDto> {
  return apiRequest(adminRoutes.specialHours, { method: 'POST', withAdminAuth: true, body: input });
}

export function updateSpecialHour(id: string, input: UpdateSpecialHourInput): Promise<SpecialHourDto> {
  return apiRequest(adminRoutes.specialHourById(id), {
    method: 'PATCH',
    withAdminAuth: true,
    body: input,
  });
}

export function deleteSpecialHour(id: string): Promise<void> {
  return apiRequest(adminRoutes.specialHourById(id), { method: 'DELETE', withAdminAuth: true });
}

export type AdminEventDto = EventAdminDto & { areaIds: string[] };

export function fetchAdminEvents(): Promise<AdminEventDto[]> {
  return apiRequest(adminRoutes.events, { withAdminAuth: true });
}

export function fetchAdminEvent(id: string): Promise<AdminEventDto> {
  return apiRequest(adminRoutes.eventById(id), { withAdminAuth: true });
}

export function createEvent(input: CreateEventInput): Promise<AdminEventDto> {
  return apiRequest(adminRoutes.events, { method: 'POST', withAdminAuth: true, body: input });
}

export function updateEvent(id: string, input: UpdateEventInput): Promise<AdminEventDto> {
  return apiRequest(adminRoutes.eventById(id), { method: 'PATCH', withAdminAuth: true, body: input });
}

export function deleteEvent(id: string): Promise<void> {
  return apiRequest(adminRoutes.eventById(id), { method: 'DELETE', withAdminAuth: true });
}
