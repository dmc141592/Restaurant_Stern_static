export const RESOURCE_MODES = ['CAPACITY', 'EXCLUSIVE'] as const;
export type ResourceMode = (typeof RESOURCE_MODES)[number];

export const RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const BLOCKING_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
];

export const RESERVATION_SOURCES = ['ONLINE', 'ADMIN', 'POS_API'] as const;
export type ReservationSource = (typeof RESERVATION_SOURCES)[number];

export const BLOCK_TYPES = [
  'CLOSURE',
  'PRIVATE_EVENT',
  'CAPACITY_ADJUSTMENT',
  'MAINTENANCE',
  'OTHER',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const NOTIFICATION_TYPES = [
  'RESTAURANT_NEW_RESERVATION',
  'GUEST_REQUEST_RECEIVED',
  'GUEST_RESERVATION_CONFIRMED',
  'GUEST_RESERVATION_REJECTED',
  'GUEST_RESERVATION_CANCELLED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ['PENDING', 'PROCESSING', 'SENT', 'FAILED'] as const;
export type NotificationStatusValue = (typeof NOTIFICATION_STATUSES)[number];

export const RESERVATION_ACTION_TYPES = ['CONFIRM', 'REJECT'] as const;
export type ReservationActionType = (typeof RESERVATION_ACTION_TYPES)[number];

export const RESERVATION_STATUS_LABELS_DE: Record<ReservationStatus, string> = {
  PENDING: 'Eingegangen',
  CONFIRMED: 'Bestätigt',
  REJECTED: 'Abgelehnt',
  CANCELLED: 'Storniert',
};

export function isBlockingStatus(status: ReservationStatus): boolean {
  return BLOCKING_RESERVATION_STATUSES.includes(status);
}
