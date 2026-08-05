import { z } from 'zod';
import { emailSchema } from './common.js';

export const adminLoginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
