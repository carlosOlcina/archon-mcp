import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const WorkerModeSchema = z.enum(['mock', 'real']);
export type WorkerMode = z.infer<typeof WorkerModeSchema>;

export const EnvConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    TEST_DATABASE_URL: z.string().url().optional(),
    WORKER_MODE: WorkerModeSchema.default('mock'),
    WORKER_BIN_PATH: z.string().optional(),
    WORKER_SOCKET_PATH: z.string().optional(),
    EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(384),
  })
  .refine(
    (data) => {
      if (data.WORKER_MODE === 'real') {
        return Boolean(data.WORKER_BIN_PATH || data.WORKER_SOCKET_PATH);
      }
      return true;
    },
    {
      message: "Cuando WORKER_MODE es 'real', se debe definir al menos WORKER_BIN_PATH o WORKER_SOCKET_PATH",
      path: ['WORKER_BIN_PATH'],
    }
  );

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export class ConfigurationError extends Error {
  public readonly issues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    const issueSummary = issues
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join(', ');
    super(`Configuración de entorno inválida: ${issueSummary}`);
    this.name = 'ConfigurationError';
    this.issues = issues;
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export interface LoadEnvOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
}

export function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function resolveBaseDir(cwd?: string): string {
  if (cwd) {
    return cwd;
  }
  let current = process.cwd();
  while (current) {
    if (
      fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(current, '.env.dev')) ||
      fs.existsSync(path.join(current, '.env.example'))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return process.cwd();
}

function readEnvFile(filePath: string): Record<string, string> {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return parseDotenv(content);
    }
  } catch {
    // If file cannot be read, return empty object
  }
  return {};
}

/**
 * Carga y valida la configuración resolviendo la precedencia:
 * 1. process.env (o options.env)
 * 2. .env.local (si existe)
 * 3. .env.test (si NODE_ENV === 'test') / .env.dev (por defecto)
 * 4. Defaults del schema Zod
 */
export function loadEnvConfig(options?: LoadEnvOptions): EnvConfig {
  const baseDir = resolveBaseDir(options?.cwd);
  const systemEnv = options?.env ?? process.env;

  const localEnv = readEnvFile(path.join(baseDir, '.env.local'));
  const effectiveNodeEnv = systemEnv.NODE_ENV || localEnv.NODE_ENV;

  const baseFileName = effectiveNodeEnv === 'test' ? '.env.test' : '.env.dev';
  const baseEnv = readEnvFile(path.join(baseDir, baseFileName));

  const merged: Record<string, string> = {
    ...baseEnv,
    ...localEnv,
  };

  for (const [key, val] of Object.entries(systemEnv)) {
    if (val !== undefined) {
      merged[key] = val;
    }
  }

  const result = EnvConfigSchema.safeParse(merged);
  if (!result.success) {
    throw new ConfigurationError(result.error.issues);
  }

  return result.data;
}
