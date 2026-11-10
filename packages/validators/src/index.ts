import { z } from 'zod';

export const ScaffoldStatusSchema = z.object({
  package: z.string(),
  initialized: z.boolean(),
  version: z.string(),
});

export type ScaffoldStatus = z.infer<typeof ScaffoldStatusSchema>;

export const SCAFFOLD_VERSION = '0.1.0';

export {
  WorkerModeSchema,
  type WorkerMode,
  EnvConfigSchema,
  type EnvConfig,
  ConfigurationError,
  type LoadEnvOptions,
  parseDotenv,
  loadEnvConfig,
} from './env.js';

export {
  TechnologyRowSchema,
  type TechnologyRow,
  TechnologySchema,
  type Technology,
  CreateTechnologySchema,
  type CreateTechnologyInput,
  type CreateTechnologyOutput,
  UpdateTechnologySchema,
  type UpdateTechnologyInput,
  type UpdateTechnologyOutput,
} from './technology.js';

