import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('Database Migration Infrastructure & Technologies DDL', () => {
  const rootPkgPath = path.join(rootDir, 'package.json');
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const migrationFilePath = path.join(
    migrationsDir,
    '20261110000000_create_technologies_table.sql'
  );

  describe('R1: dbmate integration and lifecycle scripts', () => {
    it('should include dbmate in devDependencies of workspace root package.json [R1]', () => {
      expect(fs.existsSync(rootPkgPath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

      expect(pkg.devDependencies).toBeDefined();
      expect(pkg.devDependencies.dbmate).toBeDefined();
    });

    it('should expose db:migrate, db:rollback, db:status and db:new scripts in root package.json pointing directly to packages/database/migrations [R1, R2]', () => {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

      expect(pkg.scripts['db:migrate']).toBe(
        'dbmate --migrations-dir packages/database/migrations --schema-file packages/database/schema.sql up'
      );
      expect(pkg.scripts['db:rollback']).toBe(
        'dbmate --migrations-dir packages/database/migrations --schema-file packages/database/schema.sql down'
      );
      expect(pkg.scripts['db:status']).toBe(
        'dbmate --migrations-dir packages/database/migrations --schema-file packages/database/schema.sql status'
      );
      expect(pkg.scripts['db:new']).toBe(
        'dbmate --migrations-dir packages/database/migrations new'
      );
    });

    it('should expose :dev script variants loading .env.dev for database-connecting commands pointing to packages/database/migrations [R1, R2]', () => {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

      expect(pkg.scripts['db:migrate:dev']).toBe(
        'dbmate --env-file .env.dev --migrations-dir packages/database/migrations --schema-file packages/database/schema.sql up'
      );
      expect(pkg.scripts['db:rollback:dev']).toBe(
        'dbmate --env-file .env.dev --migrations-dir packages/database/migrations --schema-file packages/database/schema.sql down'
      );
      expect(pkg.scripts['db:status:dev']).toBe(
        'dbmate --env-file .env.dev --migrations-dir packages/database/migrations --schema-file packages/database/schema.sql status'
      );
    });
  });

  describe('R2: Migrations directory directly inside packages/database without /db wrapper', () => {
    it('should have migrations directory present directly inside packages/database [R2]', () => {
      expect(fs.existsSync(migrationsDir)).toBe(true);
      const stat = fs.statSync(migrationsDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should not leave legacy db directory at workspace root or inside packages/database [R2]', () => {
      expect(fs.existsSync(path.join(rootDir, 'db'))).toBe(false);
      expect(fs.existsSync(path.join(__dirname, '..', 'db'))).toBe(false);
    });

    it('should contain the initial technologies migration SQL file in packages/database/migrations [R2]', () => {
      expect(fs.existsSync(migrationFilePath)).toBe(true);
    });
  });

  describe('R3: Database extensions enablement in DDL', () => {
    it('should include idempotent CREATE EXTENSION statements for uuid-ossp and vector [R3]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+"uuid-ossp";/i);
      expect(content).toMatch(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+vector;/i);
    });
  });

  describe('R4: UUID primary key definition', () => {
    it('should define id column as UUID PRIMARY KEY with gen_random_uuid() default [R4]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(/id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i);
    });
  });

  describe('R5: Mandatory identity and categorization attributes', () => {
    it('should define name VARCHAR(100) NOT NULL, category VARCHAR(32) NOT NULL and is_activate BOOLEAN NOT NULL DEFAULT true [R5]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(/name\s+VARCHAR\(100\)\s+NOT\s+NULL/i);
      expect(content).toMatch(/category\s+VARCHAR\(32\)\s+NOT\s+NULL/i);
      expect(content).toMatch(/is_activate\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+true/i);
    });
  });

  describe('R6: Slug unique constraint', () => {
    it('should define slug VARCHAR(64) NOT NULL UNIQUE [R6]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(/slug\s+VARCHAR\(64\)\s+NOT\s+NULL\s+UNIQUE/i);
    });
  });

  describe('R7: Self-referential hierarchy with ON DELETE CASCADE', () => {
    it('should define father_technology_id as UUID foreign key to technologies(id) with ON DELETE CASCADE [R7]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(
        /father_technology_id\s+UUID\s+REFERENCES\s+technologies\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      );
    });
  });

  describe('R8: Description and audit timestamps', () => {
    it('should define description TEXT and audit timestamps created_at and updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP [R8]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(/description\s+TEXT/i);
      expect(content).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP/i
      );
      expect(content).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+CURRENT_TIMESTAMP/i
      );
    });
  });

  describe('R9: Aliases text array with empty default', () => {
    it('should define aliases TEXT[] NOT NULL DEFAULT \'{}\' [R9]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(/aliases\s+TEXT\[\]\s+NOT\s+NULL\s+DEFAULT\s+'\{\}'/i);
    });
  });

  describe('R10: B-Tree indexes on category and father_technology_id', () => {
    it('should create relational B-Tree index on category column [R10]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(
        /CREATE\s+INDEX\s+idx_technologies_category\s+ON\s+technologies\s*\(\s*category\s*\);/i
      );
    });

    it('should create relational B-Tree index on father_technology_id column [R10]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(
        /CREATE\s+INDEX\s+idx_technologies_father_technology_id\s+ON\s+technologies\s*\(\s*father_technology_id\s*\);/i
      );
    });
  });

  describe('R11: GIN index on aliases text array', () => {
    it('should create generalized inverted GIN index on aliases column [R11]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toMatch(
        /CREATE\s+INDEX\s+idx_technologies_aliases_gin\s+ON\s+technologies\s+USING\s+gin\s*\(\s*aliases\s*\);/i
      );
    });
  });

  describe('R12: Full reversibility in migrate:down', () => {
    it('should define migrate:down with DROP TABLE IF EXISTS technologies CASCADE [R12]', () => {
      const content = fs.readFileSync(migrationFilePath, 'utf8');

      expect(content).toContain('-- migrate:down');
      expect(content).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+technologies\s+CASCADE;/i);
    });
  });
});
