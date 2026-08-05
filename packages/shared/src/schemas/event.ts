import { z } from 'zod';
import { localDateSchema, localTimeSchema, uuidSchema } from './common.js';

export const createEventSchema = z.strictObject({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'),
  title: z.string().trim().min(2).max(200),
  summary: z.string().trim().min(2).max(400),
  description: z.string().trim().max(5000).optional(),
  startDate: localDateSchema,
  startTime: localTimeSchema,
  endDate: localDateSchema,
  endTime: localTimeSchema,
  areaIds: z.array(uuidSchema).max(20).default([]),
  blockAreas: z.boolean().default(false),
  blockReason: z.string().trim().max(500).optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .strictObject({
    title: z.string().trim().min(2).max(200).optional(),
    summary: z.string().trim().min(2).max(400).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    startDate: localDateSchema.optional(),
    startTime: localTimeSchema.optional(),
    endDate: localDateSchema.optional(),
    endTime: localTimeSchema.optional(),
    areaIds: z.array(uuidSchema).max(20).optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden.',
  });
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
