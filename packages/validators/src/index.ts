import { z } from 'zod';

export const ScaffoldStatusSchema = z.object({
  package: z.string(),
  initialized: z.boolean(),
  version: z.string(),
});

export type ScaffoldStatus = z.infer<typeof ScaffoldStatusSchema>;

export const SCAFFOLD_VERSION = '0.1.0';
