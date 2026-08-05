import type { BlockType, ReservationSource, ReservationStatus, ResourceMode } from './enums.js';

export interface AreaDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  resourceMode: ResourceMode;
  capacity: number;
  defaultDurationMinutes: number;
  slotIntervalMinutes: number;
  isActive: boolean;
  isOnlineBookable: boolean;
  sortOrder: number;
}

export interface AreaAdminDto extends AreaDto {
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityAreaOption {
  areaId: string;
  areaName: string;
  availableCapacity: number;
}

export interface AvailabilityResponseDto {
  requestedStart: string;
  durationMinutes: number;
  recommendation: AvailabilityAreaOption | null;
  alternatives: AvailabilityAreaOption[];
}

export interface ReservationAreaSummary {
  id: string;
  name: string;
}

export interface PublicReservationDto {
  reference: string;
  status: ReservationStatus;
  statusLabel: string;
  area: ReservationAreaSummary;
  startsAt: string;
  endsAt: string;
  partySize: number;
}

export interface AdminReservationGuestDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface AdminReservationDto {
  id: string;
  reference: string;
  status: ReservationStatus;
  statusLabel: string;
  source: ReservationSource;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
  partySize: number;
  area: ReservationAreaSummary;
  requestedArea: ReservationAreaSummary | null;
  areaWasAutoAssigned: boolean;
  guest: AdminReservationGuestDto;
  notes: string | null;
}

export interface PosReservationDto {
  id: string;
  reference: string;
  status: ReservationStatus;
  startsAt: string;
  endsAt: string;
  partySize: number;
  area: ReservationAreaSummary;
  guest: AdminReservationGuestDto;
  notes: string | null;
  updatedAt: string;
}

export interface CursorPage<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
  };
}

export interface EventDto {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  areas: ReservationAreaSummary[];
}

export interface EventAdminDto extends EventDto {
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityBlockDto {
  id: string;
  areaId: string | null;
  areaName: string | null;
  blockType: BlockType;
  title: string;
  reason: string | null;
  startsAt: string;
  endsAt: string;
  blockedCapacity: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningHourDto {
  id: string;
  weekday: number;
  opensAt: string;
  closesAt: string;
  isEnabled: boolean;
}

export interface SpecialHourDto {
  id: string;
  businessDate: string;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
  label: string | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}
