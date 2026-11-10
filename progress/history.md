# Historial de Sesiones (Append-Only)

> Bitácora histórica de features implementadas y sesiones cerradas.
> Cada entrada representa una feature finalizada, aprobada por humano, con pruebas verdes y cerrada mediante PR.

---

## [2026-11-08] Feature: `workspace-scaffold`

- **Feature:** `workspace-scaffold`
- **Spec:** `specs/workspace-scaffold/`
- **Estado final:** done (aceptada formalmente por el usuario)
- **Implementación:** `progress/impl_workspace-scaffold.md`
- **Revisión:** `progress/review_workspace-scaffold.md` (APPROVED)

### Resumen de cambios
- Configuración de base TypeScript `@archon/tsconfig` en `packages/tsconfig`.
- Creación de librerías y utilidades compartidas: `@archon/validators`, `@archon/database`, `@archon/nest-utils`, `@archon/catalog`.
- Creación de app backend `@archon/api` en `apps/api` con NestJS, Swagger y DTOs de catálogo.
- Configuración de Cargo workspace y crate Rust `archon-worker` en `apps/worker-rs` con wrapper npm para integración completa en Turborepo.
- Pipeline unificado Turborepo con scripts `build`, `lint`, `typecheck`, `test` cruzando TypeScript y Rust.
- Trazabilidad R1-R10 completamente validada con tests unitarios y de integración.

### Resultados de verificación
- `pnpm turbo run lint`: Pasó (6/6 tareas exitosas, Clippy y ESLint)
- `pnpm turbo run typecheck`: Pasó (10/10 tareas exitosas, TypeScript strict)
- `pnpm turbo run test`: Pasó (10/10 tareas exitosas, 11 tests pasando)
- `pnpm turbo run build`: Pasó (6/6 tareas exitosas, artefactos compilados)

---

## [2026-11-08] Feature: `devcontainer-environment`

- **Feature:** `devcontainer-environment`
- **Spec:** `specs/devcontainer-environment/`
- **Estado final:** done (aceptada formalmente por el usuario)
- **Implementación:** `progress/impl_devcontainer-environment.md`
- **Revisión:** `progress/review_devcontainer-environment.md` (APPROVED)

### Resumen de cambios
- Configuración completa de entorno `.devcontainer/` (`docker-compose.yml`, `Dockerfile`, `init-db.sql`, `devcontainer.json`, `post-create.sh`) con PostgreSQL + pgvector, Node.js 22, pnpm y Rust toolchain.
- Configuración jerárquica de variables de entorno (`.env.example`, `.env.dev`, `.env.test`) y reglas de `.gitignore` para `.env.local`.
- Implementación en `@archon/validators` de esquemas Zod (`WorkerModeSchema`, `EnvConfigSchema`), resolución jerárquica (`loadEnvConfig`) y clase tipada `ConfigurationError`.
- Implementación en `@archon/catalog` de interfaces `EmbeddingProvider`, `MockEmbeddingProvider` determinista en memoria, cliente `RealWorkerClient`, `WorkerUnavailableError` y factoría `WorkerProviderFactory`.
- Tests automatizados de infraestructura (`infrastructure.test.ts`) y unitarios (`env.test.ts`, `embedding-provider.test.ts`).
- Trazabilidad R1-R10 completamente verificada con 46 pruebas en verde en todo el monorepo.

### Resultados de verificación
- `pnpm turbo run lint`: Exitoso (100% verde en los 7 paquetes/apps)
- `pnpm turbo run typecheck`: Exitoso (100% verde en los 7 paquetes/apps)
- `pnpm turbo run test`: Exitoso (10/10 tareas, 46 tests pasando)


---

## [2026-11-10] Feature: `dbmate-technologies-migration`

- **Feature:** `dbmate-technologies-migration`
- **Spec:** `specs/dbmate-technologies-migration/`
- **Estado final:** done (aceptada formalmente por el usuario en Puerta 2)
- **Implementación:** `progress/impl_dbmate-technologies-migration.md`
- **Revisión:** `progress/review_dbmate-technologies-migration.md` (APPROVED)

### Resumen de cambios
- Integración de `dbmate` (`^2.38.0`) en devDependencies y configuración de scripts de ciclo de vida (`db:migrate`, `db:rollback`, `db:status`, `db:new`) y variantes `:dev` (`--env-file .env.dev`) en la raíz del workspace.
- Configuración del sistema de migraciones directamente en `packages/database/migrations` (sin directorio `/db` intermedio) y volcado de esquema consolidado en `packages/database/schema.sql`.
- Primera migración SQL declarativa (`20261110000000_create_technologies_table.sql`):
  * Activación idempotente de extensiones `uuid-ossp` y `vector`.
  * Tabla `technologies` con `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
  * Columnas `name VARCHAR(100)`, `category VARCHAR(32)`, `father_technology_id UUID REFERENCES technologies(id) ON DELETE CASCADE`.
  * Columnas `description TEXT`, `slug VARCHAR(64) UNIQUE`, `is_activate BOOLEAN DEFAULT true`, `aliases TEXT[] DEFAULT '{}'`.
  * Marcas de auditoría `created_at` y `updated_at` de tipo `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`.
  * Índices B-Tree en `category` y `father_technology_id`.
  * Índice invertido generalizado GIN sobre array `aliases`.
  * Reversibilidad atómica en `migrate:down` con `DROP TABLE IF EXISTS technologies CASCADE;`.
- Esquemas de validación Zod en `@archon/validators` (`TechnologyRowSchema`, `TechnologySchema`, `CreateTechnologySchema`, `UpdateTechnologySchema`) con normalización transparente de alias de clave padre (`fatherTechnologyId`, `father_technology_id`, `fatherTecnology`) y formato kebab-case estricto para slugs.
- Tipos de entidad y fila en `@archon/database` con mappers bidireccionales puros (`mapTechnologyRowToEntity`, `mapEntityToTechnologyRow`).
- Suite de tests automatizados (17 de migración e infraestructura, 15 de validación Zod, 6 de mapeo de base de datos) alcanzando 84 tests en verde en todo el monorepo.
- Trazabilidad completa R1-R15 verificada.

### Resultados de verificación
- `pnpm turbo run lint`: Pasó (6/6 tareas exitosas, ESLint y Clippy)
- `pnpm turbo run typecheck`: Pasó (10/10 tareas exitosas, TypeScript strict sin 'any')
- `pnpm turbo run test`: Pasó (10/10 tareas exitosas, 84 tests pasando)

---

## [2026-11-10] Feature: `github-actions-ci`

- **Feature:** `github-actions-ci`
- **Spec:** `specs/github-actions-ci/`
- **Estado final:** done (aceptada formalmente por el usuario en Puerta 2)
- **Implementación:** `progress/impl_github-actions-ci.md`
- **Revisión:** `progress/review_github-actions-ci.md` (APPROVED)

### Resumen de cambios
- Creación de `.github/workflows/ci.yml` con triggers (`push` en `main`, `pull_request` a `main`), concurrencia (`concurrency` con cancelación automática de runs anteriores en PRs) y permisos mínimos (`contents: read`).
- Estrategia de checkout completo (`fetch-depth: 0`) para permitir detección precisa de commits cambiados y cálculo de afectación con Turborepo.
- Instalación determinista de `pnpm` versión `12.18.0` con caching nativo de store y setup de Node.js `22` LTS.
- Instalación de Rust toolchain estable con componentes `clippy` y `rustfmt`, integrado con acción de caching para Cargo registry, índice y artefactos de compilación (`apps/worker-rs/target`).
- Servicio de base de datos PostgreSQL en contenedor de workflow utilizando imagen oficial `pgvector/pgvector:pg16` con healthcheck activo y variables de entorno de pruebas (`archon_test`).
- Integración de herramienta de migración `dbmate` (`^2.38.0`) en el paso de CI para ejecutar `dbmate --migrations-dir packages/database/migrations up` garantizando esquema sincronizado antes de correr pruebas.
- Caching de Turborepo en `.turbo` y configuración para Turborepo Remote Cache mediante variables de entorno seguras (`TURBO_TOKEN`, `TURBO_TEAM`).
- Cálculo dinámico de filtro Turborepo (`TURBO_FILTER`) ejecutando únicamente tareas sobre workspaces modificados (`...[origin/main]` en PRs y `...[HEAD^]` en pushes a `main`) con fallback seguro a todo el monorepo.
- Ejecución secuencial y estricta de `turbo run lint`, `turbo run typecheck` y `turbo run test`, abortando ante cualquier fallo.
- Creación de suite exhaustiva de tests automatizados de infraestructura CI en `packages/database/tests/ci-workflow.test.ts` (20 tests verificando R1 a R20).
- Trazabilidad completa R1-R20 validada con 104 tests en verde en todo el monorepo.

### Resultados de verificación
- `pnpm turbo run lint`: Pasó (6/6 tareas exitosas, ESLint y Clippy)
- `pnpm turbo run typecheck`: Pasó (10/10 tareas exitosas, TypeScript strict sin 'any')
- `pnpm turbo run test`: Pasó (10/10 tareas exitosas, 104 tests pasando)

