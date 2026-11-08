# Requirements — workspace-scaffold

## 1. Introducción y Alcance

Este documento especifica los requisitos para la inicialización y scaffolding base del monorepo Turborepo para el proyecto Archon. El alcance comprende la creación y configuración estructural de los paquetes compartidos (`packages/*`), las aplicaciones (`apps/*`), la configuración compartida de TypeScript, el workspace de Cargo para Rust y la integración de todos los componentes en el pipeline unificado de Turborepo (`build`, `lint`, `typecheck`, `test`), sin incluir lógica de negocio productiva.

---

## 2. Requisitos del Sistema (EARS Estricto)

### R1 — Configuración Compartida de TypeScript (Ubicuo)
El sistema DEBE proveer en `packages/tsconfig` un paquete `@archon/tsconfig` que exponga configuraciones base reutilizables de TypeScript (`base.json` y `nest.json`) con la opción `strict: true` activada.

### R2 — Scaffolding de `@archon/validators` (Ubicuo)
El sistema DEBE exponer el paquete `@archon/validators` en `packages/validators` con dependencia en `zod` y scripts `build`, `lint`, `typecheck` y `test` definidos en su `package.json`.

### R3 — Scaffolding de `@archon/database` (Ubicuo)
El sistema DEBE exponer el paquete `@archon/database` en `packages/database` con dependencias en `pg` y `pgvector` y scripts `build`, `lint`, `typecheck` y `test` definidos en su `package.json`.

### R4 — Scaffolding de `@archon/nest-utils` (Ubicuo)
El sistema DEBE exponer el paquete `@archon/nest-utils` en `packages/nest-utils` con dependencias en `@nestjs/common`, `@nestjs/core` y `@archon/validators` mediante `workspace:*`, y scripts `build`, `lint`, `typecheck` y `test` definidos en su `package.json`.

### R5 — Scaffolding de `@archon/catalog` (Ubicuo)
El sistema DEBE exponer el paquete `@archon/catalog` en `packages/catalog` con dependencia en `@archon/validators` mediante `workspace:*` y scripts `build`, `lint`, `typecheck` y `test` definidos en su `package.json`.

### R6 — Scaffolding de `@archon/api` (Ubicuo)
El sistema DEBE configurar la aplicación `@archon/api` en `apps/api` con dependencias en `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@archon/validators`, `@archon/database`, `@archon/nest-utils` y `@archon/catalog`, proveyendo scripts `build`, `lint`, `typecheck` y `test` en su `package.json`.

### R7 — Workspace de Cargo para Rust (Ubicuo)
El sistema DEBE definir en el archivo `Cargo.toml` raíz la configuración de un Cargo workspace que incluya como miembro la ruta `apps/worker-rs`.

### R8 — Crate Rust y Wrapper npm en `apps/worker-rs` (Ubicuo)
El sistema DEBE estructurar en `apps/worker-rs` el crate ejecutable `archon-worker` junto con un `package.json` cuyos scripts `build`, `lint`, `typecheck` y `test` deleguen respectivamente la ejecución a los comandos de `cargo`.

### R9 — Ejecución Integral del Pipeline Turborepo (Evento)
CUANDO se ejecute `pnpm turbo run lint typecheck test build`, el sistema DEBE completar exitosamente las cuatro fases en todos los paquetes y aplicaciones configurados en el monorepo.

### R10 — Propagación de Errores en Tareas de Verificación (No deseado)
SI cualquier paquete o aplicación falla durante la ejecución de una tarea en Turborepo, ENTONCES el sistema DEBE interrumpir el pipeline y retornar un código de salida distinto de cero que señale el fallo.
