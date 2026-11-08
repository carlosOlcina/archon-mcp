import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('Infrastructure & DevContainer Environment Configuration', () => {
  describe('R1 & R2: Docker Compose configuration', () => {
    const composePath = path.join(rootDir, '.devcontainer', 'docker-compose.yml');

    it('should define app and db services in .devcontainer/docker-compose.yml [R1]', () => {
      expect(fs.existsSync(composePath)).toBe(true);
      const content = fs.readFileSync(composePath, 'utf8');

      expect(content).toContain('services:');
      expect(content).toContain('app:');
      expect(content).toContain('db:');
      expect(content).toContain('archon-network');
    });

    it('should configure pgvector/pgvector:pg16 and port 5432 in db service [R2]', () => {
      const content = fs.readFileSync(composePath, 'utf8');

      expect(content).toContain('image: pgvector/pgvector:pg16');
      expect(content).toContain('5432:5432');
      expect(content).toContain('POSTGRES_DB: archon_dev');
      expect(content).toContain('pg_isready -U postgres -d archon_dev');
      expect(content).toContain('/docker-entrypoint-initdb.d/init-db.sql:ro');
    });
  });

  describe('R3: Database initialization script', () => {
    const initDbPath = path.join(rootDir, '.devcontainer', 'init-db.sql');

    it('should provide idempotent DDL for archon_dev and archon_test [R3]', () => {
      expect(fs.existsSync(initDbPath)).toBe(true);
      const content = fs.readFileSync(initDbPath, 'utf8');

      expect(content).toContain('CREATE DATABASE archon_dev');
      expect(content).toContain('CREATE DATABASE archon_test');
      expect(content).toContain('WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname =');
    });

    it('should strictly delegate extension vector and table schemas away from init-db.sql [R3]', () => {
      const content = fs.readFileSync(initDbPath, 'utf8');

      // init-db.sql must NOT contain CREATE EXTENSION or schema DDL
      expect(content).not.toContain('CREATE EXTENSION');
      expect(content).not.toContain('CREATE TABLE');
    });
  });

  describe('R4: Polyglot DevContainer Dockerfile', () => {
    const dockerfilePath = path.join(rootDir, '.devcontainer', 'Dockerfile');

    it('should base image on Node 22 LTS, include pnpm and full Rust toolchain [R4]', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
      const content = fs.readFileSync(dockerfilePath, 'utf8');

      expect(content).toMatch(/FROM\s+node:22/);
      expect(content).toContain('corepack enable');
      expect(content).toContain('pnpm@12.18.0');
      expect(content).toContain('sh.rustup.rs');
      expect(content).toContain('--component clippy');
      expect(content).toContain('--component rustfmt');
      expect(content).not.toContain('--component clippy rustfmt');
      expect(content).toContain('CARGO_HOME');
    });
  });

  describe('R5 & R6: DevContainer configuration and post-create lifecycle', () => {
    const devcontainerJsonPath = path.join(rootDir, '.devcontainer', 'devcontainer.json');
    const postCreatePath = path.join(rootDir, '.devcontainer', 'post-create.sh');

    it('should configure devcontainer.json with service app and forwarded ports 3000 and 5432 [R5]', () => {
      expect(fs.existsSync(devcontainerJsonPath)).toBe(true);
      const json = JSON.parse(fs.readFileSync(devcontainerJsonPath, 'utf8'));

      expect(json.service).toBe('app');
      expect(json.forwardPorts).toContain(3000);
      expect(json.forwardPorts).toContain(5432);
      expect(json.postCreateCommand).toContain('post-create.sh');
      expect(json.customizations?.vscode?.extensions).toEqual(
        expect.arrayContaining([
          'rust-lang.rust-analyzer',
          'dbaeumer.vscode-eslint',
          'vitest.explorer',
          'ckolkman.vscode-postgres',
        ])
      );
    });

    it('should provide post-create.sh that executes pnpm install and validates Rust tools [R6]', () => {
      expect(fs.existsSync(postCreatePath)).toBe(true);
      const content = fs.readFileSync(postCreatePath, 'utf8');

      expect(content).toContain('pnpm install');
      expect(content).toContain('rustc --version');
      expect(content).toContain('cargo --version');
      expect(content).toContain('cargo clippy --version');
      expect(content).toContain('rustfmt --version');
      expect(content).toContain('cargo check');
    });
  });

  describe('R7, R8, R9, R10: Environment files and .gitignore rules', () => {
    const examplePath = path.join(rootDir, '.env.example');
    const devPath = path.join(rootDir, '.env.dev');
    const testPath = path.join(rootDir, '.env.test');
    const gitignorePath = path.join(rootDir, '.gitignore');

    it('should provide canonical template in .env.example documenting all variables [R7]', () => {
      expect(fs.existsSync(examplePath)).toBe(true);
      const content = fs.readFileSync(examplePath, 'utf8');

      expect(content).toContain('DATABASE_URL=');
      expect(content).toContain('TEST_DATABASE_URL=');
      expect(content).toContain('PORT=');
      expect(content).toContain('WORKER_MODE=');
      expect(content).toContain('WORKER_BIN_PATH=');
      expect(content).toContain('WORKER_SOCKET_PATH=');
      expect(content).toContain('EMBEDDING_DIMENSION=');
    });

    it('should provide frictionless default development config in .env.dev [R8]', () => {
      expect(fs.existsSync(devPath)).toBe(true);
      const content = fs.readFileSync(devPath, 'utf8');

      expect(content).toContain('archon_dev');
      expect(content).toContain('PORT=3000');
      expect(content).toContain('WORKER_MODE=mock');
    });

    it('should provide automated test config in .env.test [R9]', () => {
      expect(fs.existsSync(testPath)).toBe(true);
      const content = fs.readFileSync(testPath, 'utf8');

      expect(content).toContain('archon_test');
      expect(content).toContain('PORT=3001');
      expect(content).toContain('WORKER_MODE=mock');
    });

    it('should strictly exclude .env.local in .gitignore while permitting .env.dev, .env.test, and .env.example [R10]', () => {
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, 'utf8');

      expect(content).toContain('.env.local');
      expect(content).toContain('!.env.example');
      expect(content).toContain('!.env.dev');
      expect(content).toContain('!.env.test');
    });
  });
});
