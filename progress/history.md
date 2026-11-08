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
