import { z } from 'zod';
import {
  emailSchema,
  guestNotesSchema,
  localDateSchema,
  localTimeSchema,
  nameSchema,
  partySizeSchema,
  phoneSchema,
  uuidSchema,
} from './common.js';

export const availabilityQuerySchema = z.object({
  date: localDateSchema,
  time: localTimeSchema,
  partySize: z.coerce.number().int().positive().max(1000),
  preferredAreaId: uuidSchema.optional(),
});
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;

export const createReservationSchema = z.strictObject({
  guestFirstName: nameSchema,
  guestLastName: nameSchema,
  guestEmail: emailSchema,
  guestPhone: phoneSchema,
  partySize: partySizeSchema,
  localDate: localDateSchema,
  localTime: localTimeSchema,
  preferredAreaId: uuidSchema.optional(),
  guestNotes: guestNotesSchema,
  privacyAccepted: z.literal(true, {
    message: 'Die Datenschutzbestimmungen müssen akzeptiert werden.',
  }),
  turnstileToken: z.string().max(4096).optional(),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const reservationStatusActionSchema = z.strictObject({
  reason: z.string().trim().max(500).optional(),
});
export type ReservationStatusActionInput = z.infer<typeof reservationStatusActionSchema>;

export const adminReservationListQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED']).optional(),
  areaId: uuidSchema.optional(),
  dateFrom: localDateSchema.optional(),
  dateTo: localDateSchema.optional(),
  cursor: z.string().min(1).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AdminReservationListQuery = z.infer<typeof adminReservationListQuerySchema>;

export const posReservationListQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED']).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  areaId: uuidSchema.optional(),
  createdAfter: z.iso.datetime({ offset: true }).optional(),
  cursor: z.string().min(1).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type PosReservationListQuery = z.infer<typeof posReservationListQuerySchema>;
