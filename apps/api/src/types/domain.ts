import type {
  BlockType,
  NotificationStatusValue,
  NotificationType,
  ReservationActionType,
  ReservationSource,
  ReservationStatus,
  ResourceMode,
} from '@sternen/shared';

export interface Area {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  publicReference: string;
  areaId: string;
  status: ReservationStatus;
  source: ReservationSource;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  guestNotes: string | null;
  requestedAreaId: string | null;
  areaWasAutoAssigned: boolean;
  startsAt: Date;
  endsAt: Date;
  consentPrivacyAt: Date;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationWithArea extends Reservation {
  areaName: string;
  requestedAreaName: string | null;
}

export interface ReservationActionToken {
  id: string;
  reservationId: string;
  action: ReservationActionType;
  tokenHash: string;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface OpeningHour {
  id: string;
  weekday: number;
  opensAt: string;
  closesAt: string;
  isEnabled: boolean;
}

export interface SpecialHour {
  id: string;
  businessDate: string;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
  label: string | null;
}

export interface AvailabilityBlock {
  id: string;
  areaId: string | null;
  areaName: string | null;
  blockType: BlockType;
  title: string;
  reason: string | null;
  startsAt: Date;
  endsAt: Date;
  blockedCapacity: number | null;
  createdByAdminId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventArea {
  eventId: string;
  areaId: string;
  areaName: string;
  availabilityBlockId: string | null;
}

export interface Administrator {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSession {
  id: string;
  administratorId: string;
  sessionTokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface NotificationOutboxItem {
  id: string;
  reservationId: string | null;
  notificationType: NotificationType;
  recipientEmail: string;
  templateData: Record<string, unknown>;
  status: NotificationStatusValue;
  attempts: number;
  nextAttemptAt: Date;
  lockedAt: Date | null;
  sentAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

export interface IntegrationApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface ReservationStatusHistoryEntry {
  id: string;
  reservationId: string;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  actorType: 'SYSTEM' | 'EMAIL_ACTION' | 'ADMIN' | 'POS_API';
  actorReference: string | null;
  createdAt: Date;
}

export interface CapacitySnapshot {
  areaId: string;
  totalCapacity: number;
  blockedCapacity: number;
  reservedPartySize: number;
  availableCapacity: number;
}
