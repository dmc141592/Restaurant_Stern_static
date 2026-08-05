import { z } from 'zod';

export const uuidSchema = z.uuid({ message: 'Ungültige ID.' });

export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format JJJJ-MM-TT vorliegen.')
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), {
    message: 'Ungültiges Datum.',
  });

export const localTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Uhrzeit muss im Format HH:MM vorliegen.');

const PHONE_CHAR_PATTERN = /^[0-9+()\s-]{6,25}$/;

export const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Telefonnummer ist zu kurz.')
  .max(25, 'Telefonnummer ist zu lang.')
  .regex(PHONE_CHAR_PATTERN, 'Telefonnummer enthält ungültige Zeichen.')
  .transform((value) => normalizePhoneNumber(value))
  .refine((value) => /^\+?[0-9]{7,15}$/.test(value), {
    message: 'Telefonnummer ist ungültig.',
  });

export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Muss mindestens 2 Zeichen enthalten.')
  .max(80, 'Darf höchstens 80 Zeichen enthalten.');

export const emailSchema = z.email({ message: 'Ungültige E-Mail-Adresse.' }).max(254).trim();

export const guestNotesSchema = z
  .string()
  .trim()
  .max(1000, 'Bemerkung darf höchstens 1000 Zeichen enthalten.')
  .optional();

export const partySizeSchema = z
  .number()
  .int('Personenzahl muss eine ganze Zahl sein.')
  .positive('Personenzahl muss positiv sein.')
  .max(1000, 'Personenzahl ist unrealistisch hoch.');

export const cursorSchema = z.string().min(1).max(2048).optional();

export const limitSchema = z.coerce.number().int().min(1).max(100).default(25);
