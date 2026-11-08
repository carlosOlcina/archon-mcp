import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  WorkerModeSchema,
  EnvConfigSchema,
  ConfigurationError,
  parseDotenv,
  loadEnvConfig,
} from '../src/index.js';

describe('@archon/validators Environment and Configuration', () => {
  describe('WorkerModeSchema [R12]', () => {
    it('should accept valid worker modes "mock" and "real"', () => {
      expect(WorkerModeSchema.parse('mock')).toBe('mock');
      expect(WorkerModeSchema.parse('real')).toBe('real');
    });

    it('should reject invalid worker modes', () => {
      expect(() => WorkerModeSchema.parse('invalid')).toThrow();
      expect(() => WorkerModeSchema.parse('local')).toThrow();
      expect(() => WorkerModeSchema.parse('')).toThrow();
    });
  });

  describe('EnvConfigSchema [R12, R14, R15]', () => {
    it('should parse valid configuration with default values', () => {
      const parsed = EnvConfigSchema.parse({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
      });

      expect(parsed.NODE_ENV).toBe('development');
      expect(parsed.PORT).toBe(3000);
      expect(parsed.WORKER_MODE).toBe('mock');
      expect(parsed.EMBEDDING_DIMENSION).toBe(384);
      expect(parsed.DATABASE_URL).toBe('postgresql://postgres:postgres@localhost:5432/archon_dev');
    });

    it('should coerce string numbers to integers for PORT and EMBEDDING_DIMENSION', () => {
      const parsed = EnvConfigSchema.parse({
        PORT: '4000',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
        EMBEDDING_DIMENSION: '768',
      });

      expect(parsed.PORT).toBe(4000);
      expect(parsed.EMBEDDING_DIMENSION).toBe(768);
    });

    it('should reject invalid URLs for DATABASE_URL [R15]', () => {
      expect(() =>
        EnvConfigSchema.parse({
          DATABASE_URL: 'not-a-valid-url',
        })
      ).toThrow();
    });

    it('should accept WORKER_MODE="mock" without worker paths [R13]', () => {
      const parsed = EnvConfigSchema.parse({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
        WORKER_MODE: 'mock',
      });

      expect(parsed.WORKER_MODE).toBe('mock');
      expect(parsed.WORKER_BIN_PATH).toBeUndefined();
    });

    it('should require WORKER_BIN_PATH or WORKER_SOCKET_PATH when WORKER_MODE is "real" [R14, R15]', () => {
      expect(() =>
        EnvConfigSchema.parse({
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
          WORKER_MODE: 'real',
        })
      ).toThrow();

      const withBin = EnvConfigSchema.parse({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
        WORKER_MODE: 'real',
        WORKER_BIN_PATH: '/path/to/archon-worker',
      });
      expect(withBin.WORKER_BIN_PATH).toBe('/path/to/archon-worker');

      const withSocket = EnvConfigSchema.parse({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
        WORKER_MODE: 'real',
        WORKER_SOCKET_PATH: '/tmp/archon-worker.sock',
      });
      expect(withSocket.WORKER_SOCKET_PATH).toBe('/tmp/archon-worker.sock');
    });
  });

  describe('parseDotenv', () => {
    it('should correctly parse key-value lines and ignore comments and blank lines', () => {
      const sample = `
        # Comment line
        PORT=8080
        DATABASE_URL="postgresql://user:pass@localhost:5432/db"
        WORKER_MODE='real'

        EMPTY_LINE_BEFORE=true
      `;

      const parsed = parseDotenv(sample);
      expect(parsed['PORT']).toBe('8080');
      expect(parsed['DATABASE_URL']).toBe('postgresql://user:pass@localhost:5432/db');
      expect(parsed['WORKER_MODE']).toBe('real');
      expect(parsed['EMPTY_LINE_BEFORE']).toBe('true');
    });
  });

  describe('loadEnvConfig hierarchical resolution [R10, R11, R15]', () => {
    it('should load default configuration from monorepo root', () => {
      const config = loadEnvConfig({
        env: {
          DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/archon_dev',
        },
      });

      expect(config.DATABASE_URL).toBe('postgresql://postgres:postgres@localhost:5432/archon_dev');
      expect(config.WORKER_MODE).toBe('mock');
      expect(config.PORT).toBe(3000);
    });

    it('should throw ConfigurationError with structured issues on invalid env [R15]', () => {
      expect(() =>
        loadEnvConfig({
          cwd: os.tmpdir(),
          env: {
            DATABASE_URL: 'invalid-url',
          },
        })
      ).toThrowError(ConfigurationError);

      try {
        loadEnvConfig({
          cwd: os.tmpdir(),
          env: {
            DATABASE_URL: 'invalid-url',
          },
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        const configErr = err as ConfigurationError;
        expect(configErr.name).toBe('ConfigurationError');
        expect(configErr.issues.length).toBeGreaterThan(0);
      }
    });

    it('should prioritize .env.local over .env.dev [R10, R11]', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archon-env-test-'));

      try {
        fs.writeFileSync(
          path.join(tempDir, '.env.dev'),
          'DATABASE_URL=postgresql://localhost:5432/dev_db\nPORT=3000\nWORKER_MODE=mock\n'
        );
        fs.writeFileSync(
          path.join(tempDir, '.env.local'),
          'PORT=9999\nDATABASE_URL=postgresql://localhost:5432/local_db\n'
        );

        const config = loadEnvConfig({
          cwd: tempDir,
          env: {},
        });

        // .env.local should override .env.dev
        expect(config.PORT).toBe(9999);
        expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/local_db');
        expect(config.WORKER_MODE).toBe('mock');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should prioritize system process.env over .env.local and .env.dev [R11]', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archon-env-test-'));

      try {
        fs.writeFileSync(
          path.join(tempDir, '.env.dev'),
          'DATABASE_URL=postgresql://localhost:5432/dev_db\nPORT=3000\n'
        );
        fs.writeFileSync(
          path.join(tempDir, '.env.local'),
          'PORT=9999\nDATABASE_URL=postgresql://localhost:5432/local_db\n'
        );

        const config = loadEnvConfig({
          cwd: tempDir,
          env: {
            PORT: '7777',
          },
        });

        // process.env PORT should override .env.local
        expect(config.PORT).toBe(7777);
        // non-overridden value from .env.local persists
        expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/local_db');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should load .env.test when NODE_ENV is "test" [R9, R11]', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archon-env-test-'));

      try {
        fs.writeFileSync(
          path.join(tempDir, '.env.dev'),
          'DATABASE_URL=postgresql://localhost:5432/dev_db\nPORT=3000\n'
        );
        fs.writeFileSync(
          path.join(tempDir, '.env.test'),
          'DATABASE_URL=postgresql://localhost:5432/test_db\nPORT=3001\n'
        );

        const config = loadEnvConfig({
          cwd: tempDir,
          env: {
            NODE_ENV: 'test',
          },
        });

        expect(config.NODE_ENV).toBe('test');
        expect(config.PORT).toBe(3001);
        expect(config.DATABASE_URL).toBe('postgresql://localhost:5432/test_db');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
