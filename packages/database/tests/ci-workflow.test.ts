import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import YAML from 'yaml';

interface WorkflowStep {
  name?: string;
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
  id?: string;
  shell?: string;
  'continue-on-error'?: boolean;
}

interface WorkflowService {
  image: string;
  env?: Record<string, string>;
  ports?: string[];
  options?: string;
}

interface WorkflowJob {
  name?: string;
  'runs-on': string;
  services?: Record<string, WorkflowService>;
  env?: Record<string, string>;
  steps: WorkflowStep[];
}

interface WorkflowSchema {
  name: string;
  on: {
    push?: { branches?: string[] };
    pull_request?: { branches?: string[] };
  };
  concurrency?: {
    group: string;
    'cancel-in-progress': string | boolean;
  };
  permissions?: Record<string, string>;
  jobs: Record<string, WorkflowJob>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const workflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');

describe('CI Workflow Infrastructure (.github/workflows/ci.yml)', () => {
  it('should exist and parse as valid YAML syntax [R19]', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
    const rawContent = fs.readFileSync(workflowPath, 'utf8');
    expect(rawContent.length).toBeGreaterThan(0);

    expect(() => YAML.parse(rawContent)).not.toThrow();
  });

  const parsedWorkflow: WorkflowSchema = YAML.parse(fs.readFileSync(workflowPath, 'utf8'));
  const verifyJob = parsedWorkflow.jobs?.verify;
  const steps = verifyJob?.steps ?? [];

  describe('R1 & R2: Event Triggers', () => {
    it('should trigger on pull_request to main branch [R1]', () => {
      expect(parsedWorkflow.on?.pull_request).toBeDefined();
      expect(parsedWorkflow.on.pull_request?.branches).toContain('main');
    });

    it('should trigger on push to main branch [R2]', () => {
      expect(parsedWorkflow.on?.push).toBeDefined();
      expect(parsedWorkflow.on.push?.branches).toContain('main');
    });
  });

  describe('R3: Concurrency Control', () => {
    it('should define concurrency group and cancel in-progress runs for PR branches [R3]', () => {
      expect(parsedWorkflow.concurrency).toBeDefined();
      expect(parsedWorkflow.concurrency?.group).toBe('${{ github.workflow }}-${{ github.ref }}');
      expect(parsedWorkflow.concurrency?.['cancel-in-progress']).toBe("${{ github.ref != 'refs/heads/main' }}");
    });
  });

  describe('R4: Repository Checkout with Full History', () => {
    it('should use actions/checkout@v4 with fetch-depth: 0 for complete git history diffs [R4]', () => {
      const checkoutStep = steps.find((step) => step.uses?.startsWith('actions/checkout'));
      expect(checkoutStep).toBeDefined();
      expect(checkoutStep?.uses).toMatch(/^actions\/checkout@v4/);
      expect(checkoutStep?.with?.['fetch-depth']).toBe(0);
    });
  });

  describe('R5 & R6: Node.js and pnpm Environment Setup', () => {
    it('should provision pnpm@12.18.0 and Node 22 LTS with pnpm store cache [R5]', () => {
      const pnpmSetupStep = steps.find((step) => step.uses?.startsWith('pnpm/action-setup'));
      expect(pnpmSetupStep).toBeDefined();
      expect(pnpmSetupStep?.uses).toMatch(/^pnpm\/action-setup@v4/);
      expect(String(pnpmSetupStep?.with?.version)).toBe('12.18.0');
      expect(pnpmSetupStep?.with?.run_install).toBe(false);

      const nodeSetupStep = steps.find((step) => step.uses?.startsWith('actions/setup-node'));
      expect(nodeSetupStep).toBeDefined();
      expect(nodeSetupStep?.uses).toMatch(/^actions\/setup-node@v4/);
      expect(String(nodeSetupStep?.with?.['node-version'])).toBe('22');
      expect(nodeSetupStep?.with?.cache).toBe('pnpm');
    });

    it('should perform deterministic dependency installation with --frozen-lockfile [R6]', () => {
      const installStep = steps.find((step) => step.run?.includes('pnpm install'));
      expect(installStep).toBeDefined();
      expect(installStep?.run).toBe('pnpm install --frozen-lockfile');
    });
  });

  describe('R7 & R8: Rust Toolchain and Cargo Cache', () => {
    it('should provision stable Rust toolchain with clippy and rustfmt components [R7]', () => {
      const rustStep = steps.find((step) => step.uses?.startsWith('dtolnay/rust-toolchain'));
      expect(rustStep).toBeDefined();
      expect(rustStep?.uses).toMatch(/^dtolnay\/rust-toolchain@stable/);
      const components = String(rustStep?.with?.components);
      expect(components).toContain('clippy');
      expect(components).toContain('rustfmt');
    });

    it('should cache Cargo dependencies and target artifacts with Swatinem/rust-cache [R8]', () => {
      const rustCacheStep = steps.find((step) => step.uses?.startsWith('Swatinem/rust-cache'));
      expect(rustCacheStep).toBeDefined();
      expect(rustCacheStep?.uses).toMatch(/^Swatinem\/rust-cache@v2/);
    });
  });

  describe('R9, R10 & R11: PostgreSQL Container, Database Init and dbmate Migrations', () => {
    it('should configure postgres service container with pgvector/pgvector:pg16 and healthcheck [R9]', () => {
      const postgresService = verifyJob?.services?.postgres;
      expect(postgresService).toBeDefined();
      expect(postgresService?.image).toBe('pgvector/pgvector:pg16');
      expect(postgresService?.ports).toContain('5432:5432');
      expect(postgresService?.options).toContain('pg_isready');
    });

    it('should idempotently initialize archon_test database [R10]', () => {
      const initDbStep = steps.find((step) => step.name === 'Initialize test database');
      expect(initDbStep).toBeDefined();
      expect(initDbStep?.run).toContain('CREATE DATABASE archon_test');
      expect(initDbStep?.run).toContain('WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = \'archon_test\')');
    });

    it('should run dbmate migrations on archon_test with DATABASE_URL [R11]', () => {
      const migrateStep = steps.find((step) => step.name === 'Run dbmate migrations on archon_test');
      expect(migrateStep).toBeDefined();
      expect(migrateStep?.run).toBe('pnpm db:migrate');

      expect(verifyJob?.env?.DATABASE_URL).toContain('archon_test');
      expect(verifyJob?.env?.TEST_DATABASE_URL).toContain('archon_test');
    });
  });

  describe('R12 & R13: Turborepo Local and Remote Cache', () => {
    it('should cache local .turbo directory using actions/cache@v4 [R12]', () => {
      const turboCacheStep = steps.find((step) => step.uses?.startsWith('actions/cache'));
      expect(turboCacheStep).toBeDefined();
      expect(turboCacheStep?.uses).toMatch(/^actions\/cache@v4/);
      expect(turboCacheStep?.with?.path).toBe('.turbo');
      expect(String(turboCacheStep?.with?.key)).toContain('turbo-${{ runner.os }}');
    });

    it('should pass TURBO_TOKEN and TURBO_TEAM secrets for remote caching [R13]', () => {
      expect(verifyJob?.env?.TURBO_TOKEN).toBe('${{ secrets.TURBO_TOKEN }}');
      expect(verifyJob?.env?.TURBO_TEAM).toBe('${{ secrets.TURBO_TEAM }}');
    });
  });

  describe('R14 & R15: Dynamic Affected Projects Filtering (TURBO_FILTER)', () => {
    it('should determine filter using ...[origin/main] for PRs and ...[HEAD^1] for pushes [R14, R15]', () => {
      const filterStep = steps.find((step) => step.id === 'turbo-filter');
      expect(filterStep).toBeDefined();
      expect(filterStep?.run).toContain('if [ "${{ github.event_name }}" = "pull_request" ]; then');
      expect(filterStep?.run).toContain('TURBO_FILTER=--filter=...[origin/main]');
      expect(filterStep?.run).toContain('elif [ "${{ github.event_name }}" = "push" ] && git rev-parse --verify HEAD^1 >/dev/null 2>&1; then');
      expect(filterStep?.run).toContain('TURBO_FILTER=--filter=...[HEAD^1]');
      expect(filterStep?.run).toContain('echo "TURBO_FILTER=" >> $GITHUB_ENV');
    });
  });

  describe('R16, R17, R18 & R20: Turborepo Verification Pipeline and Fail-Fast', () => {
    it('should execute Turborepo lint step with TURBO_FILTER [R16]', () => {
      const lintStep = steps.find((step) => step.name === 'Turborepo lint');
      expect(lintStep).toBeDefined();
      expect(lintStep?.run).toBe('pnpm turbo run lint $TURBO_FILTER');
    });

    it('should execute Turborepo typecheck step with TURBO_FILTER [R17]', () => {
      const typecheckStep = steps.find((step) => step.name === 'Turborepo typecheck');
      expect(typecheckStep).toBeDefined();
      expect(typecheckStep?.run).toBe('pnpm turbo run typecheck $TURBO_FILTER');
    });

    it('should execute Turborepo test step with TURBO_FILTER and NODE_ENV=test [R18]', () => {
      const testStep = steps.find((step) => step.name === 'Turborepo test');
      expect(testStep).toBeDefined();
      expect(testStep?.run).toBe('pnpm turbo run test $TURBO_FILTER');
      expect(verifyJob?.env?.NODE_ENV).toBe('test');
    });

    it('should preserve fail-fast error propagation with no continue-on-error bypasses [R20]', () => {
      for (const step of steps) {
        expect(step['continue-on-error']).toBeFalsy();
      }
    });

    it('should configure workflow permissions and runner environment [R19]', () => {
      expect(parsedWorkflow.permissions?.contents).toBe('read');
      expect(verifyJob?.['runs-on']).toBe('ubuntu-latest');
      expect(verifyJob?.name).toBe('Lint, Typecheck & Test');
    });
  });
});
