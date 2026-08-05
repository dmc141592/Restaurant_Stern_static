import { z } from 'zod';
import { localDateSchema, localTimeSchema, uuidSchema } from './common.js';

export const blockTypeSchema = z.enum([
  'CLOSURE',
  'PRIVATE_EVENT',
  'CAPACITY_ADJUSTMENT',
  'MAINTENANCE',
  'OTHER',
]);

export const createBlockSchema = z.strictObject({
  areaId: uuidSchema.nullable().optional(),
  blockType: blockTypeSchema,
  title: z.string().trim().min(2).max(200),
  reason: z.string().trim().max(1000).optional(),
  startDate: localDateSchema,
  startTime: localTimeSchema,
  endDate: localDateSchema,
  endTime: localTimeSchema,
  blockedCapacity: z.number().int().positive().max(2000).optional(),
  acknowledgeConflicts: z.boolean().default(false),
});
export type CreateBlockInput = z.infer<typeof createBlockSchema>;

export const updateBlockSchema = z
  .strictObject({
    title: z.string().trim().min(2).max(200).optional(),
    reason: z.string().trim().max(1000).nullable().optional(),
    startDate: localDateSchema.optional(),
    startTime: localTimeSchema.optional(),
    endDate: localDateSchema.optional(),
    endTime: localTimeSchema.optional(),
    blockedCapacity: z.number().int().positive().max(2000).nullable().optional(),
    acknowledgeConflicts: z.boolean().default(false),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden.',
  });
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;

export const adminBlockListQuerySchema = z.object({
  areaId: uuidSchema.optional(),
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
});
export type AdminBlockListQuery = z.infer<typeof adminBlockListQuerySchema>;
