import { publicRoutes, reservationActionRoutes } from '@sternen/shared';
import type { AreaDto, EventDto } from '@sternen/shared';
import { apiRequest, buildQueryString } from './client.js';

export interface AvailabilityResponse {
  requestedStart: string;
  durationMinutes: number;
  recommendation: { areaId: string; areaName: string; availableCapacity: number } | null;
  alternatives: Array<{ areaId: string; areaName: string; availableCapacity: number }>;
}

export function fetchAreas(): Promise<AreaDto[]> {
  return apiRequest<AreaDto[]>(publicRoutes.areas);
}

export function fetchAvailability(params: {
  date: string;
  time: string;
  partySize: number;
  preferredAreaId?: string;
}): Promise<AvailabilityResponse> {
  const query = buildQueryString({
    date: params.date,
    time: params.time,
    partySize: params.partySize,
    preferredAreaId: params.preferredAreaId,
  });
  return apiRequest<AvailabilityResponse>(`${publicRoutes.availability}${query}`);
}

export interface CreateReservationPayload {
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  localDate: string;
  localTime: string;
  preferredAreaId?: string;
  guestNotes?: string;
  privacyAccepted: true;
}

export interface CreateReservationResponse {
  reservation: {
    reference: string;
    status: string;
    statusLabel: string;
    area: { id: string; name: string };
    startsAt: string;
    endsAt: string;
    partySize: number;
  };
  message: string;
}

export function createReservation(
  payload: CreateReservationPayload,
  idempotencyKey: string,
): Promise<CreateReservationResponse> {
  return apiRequest<CreateReservationResponse>(publicRoutes.reservations, {
    method: 'POST',
    body: payload,
    idempotencyKey,
  });
}

export function fetchEvents(): Promise<EventDto[]> {
  return apiRequest<EventDto[]>(publicRoutes.events);
}

export function fetchEventBySlug(slug: string): Promise<EventDto> {
  return apiRequest<EventDto>(publicRoutes.eventBySlug(slug));
}

export interface ReservationActionPreview {
  action: 'CONFIRM' | 'REJECT';
  alreadyUsed: boolean;
  isRevoked: boolean;
  reservation: {
    reference: string;
    status: string;
    statusLabel: string;
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
    guestPhone: string;
    partySize: number;
    areaName: string;
    startsAt: string;
    endsAt: string;
    notes: string | null;
  };
}

export function fetchReservationActionPreview(token: string): Promise<ReservationActionPreview> {
  return apiRequest<ReservationActionPreview>(reservationActionRoutes.preview(token));
}

export interface ReservationActionResult {
  alreadyProcessed: boolean;
  reservation: ReservationActionPreview['reservation'];
}

export function confirmReservationAction(token: string): Promise<ReservationActionResult> {
  return apiRequest<ReservationActionResult>(reservationActionRoutes.confirm(token), { method: 'POST' });
}

export function rejectReservationAction(token: string): Promise<ReservationActionResult> {
  return apiRequest<ReservationActionResult>(reservationActionRoutes.reject(token), { method: 'POST' });
}
