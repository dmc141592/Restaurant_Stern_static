import { z } from 'zod';

export const resourceModeSchema = z.enum(['CAPACITY', 'EXCLUSIVE']);

export const createAreaSchema = z.strictObject({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  resourceMode: resourceModeSchema,
  capacity: z.number().int().positive().max(2000),
  defaultDurationMinutes: z.number().int().min(30).max(720).default(120),
  slotIntervalMinutes: z.number().int().min(5).max(120).default(30),
  isActive: z.boolean().default(true),
  isOnlineBookable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreateAreaInput = z.infer<typeof createAreaSchema>;

export const updateAreaSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    capacity: z.number().int().positive().max(2000).optional(),
    defaultDurationMinutes: z.number().int().min(30).max(720).optional(),
    slotIntervalMinutes: z.number().int().min(5).max(120).optional(),
    isActive: z.boolean().optional(),
    isOnlineBookable: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden.',
  });
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
