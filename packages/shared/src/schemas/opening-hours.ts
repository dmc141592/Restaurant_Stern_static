import { z } from 'zod';
import { localDateSchema } from './common.js';

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM erwartet.');

export const openingHourEntrySchema = z
  .strictObject({
    weekday: z.number().int().min(0).max(6),
    opensAt: timeOfDaySchema,
    closesAt: timeOfDaySchema,
    isEnabled: z.boolean().default(true),
  })
  .refine((value) => value.closesAt > value.opensAt, {
    message: 'Schliesszeit muss nach der Öffnungszeit liegen.',
    path: ['closesAt'],
  });

export const replaceOpeningHoursSchema = z.strictObject({
  entries: z.array(openingHourEntrySchema).max(50),
});
export type ReplaceOpeningHoursInput = z.infer<typeof replaceOpeningHoursSchema>;

export const createSpecialHourSchema = z
  .strictObject({
    businessDate: localDateSchema,
    isClosed: z.boolean().default(false),
    opensAt: timeOfDaySchema.optional(),
    closesAt: timeOfDaySchema.optional(),
    label: z.string().trim().max(200).optional(),
  })
  .refine(
    (value) =>
      value.isClosed
        ? value.opensAt === undefined && value.closesAt === undefined
        : value.opensAt !== undefined && value.closesAt !== undefined,
    {
      message:
        'Bei einem geschlossenen Tag dürfen keine Zeiten gesetzt werden, andernfalls sind beide Zeiten erforderlich.',
    },
  );
export type CreateSpecialHourInput = z.infer<typeof createSpecialHourSchema>;

export const updateSpecialHourSchema = z
  .strictObject({
    isClosed: z.boolean().optional(),
    opensAt: timeOfDaySchema.nullable().optional(),
    closesAt: timeOfDaySchema.nullable().optional(),
    label: z.string().trim().max(200).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden.',
  });
export type UpdateSpecialHourInput = z.infer<typeof updateSpecialHourSchema>;
