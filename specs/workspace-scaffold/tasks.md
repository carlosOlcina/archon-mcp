# Tasks — workspace-scaffold

- [x] T1: Crear el paquete `@archon/tsconfig` en `packages/tsconfig` con las configuraciones compartidas `base.json` y `nest.json` [R1]
- [x] T2: Configurar el paquete `@archon/validators` en `packages/validators` con dependencia `zod`, scripts base (`build`, `lint`, `typecheck`, `test`), exportación inicial y test de sanidad [R2]
- [x] T3: Configurar el paquete `@archon/database` en `packages/database` con dependencias `pg`, `pgvector`, devDependencies `@types/pg`, scripts base (`build`, `lint`, `typecheck`, `test`), exportación inicial y test de sanidad [R3]
- [x] T4: Configurar el paquete `@archon/nest-utils` en `packages/nest-utils` con dependencias `@nestjs/common`, `@nestjs/core`, enlace `workspace:*` a `@archon/validators`, scripts base, exportación inicial y test de sanidad [R4]
- [x] T5: Configurar el paquete `@archon/catalog` en `packages/catalog` con enlace `workspace:*` a `@archon/validators`, scripts base, exportación inicial y test de sanidad [R5]
- [x] T6: Configurar la aplicación `@archon/api` en `apps/api` con dependencias NestJS (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`), enlaces a paquetes `@archon/*`, módulo bootstrap mínimo, scripts base y smoke test [R6]
- [x] T7: Crear el archivo `Cargo.toml` en la raíz del monorepo configurando el Cargo workspace con el miembro `apps/worker-rs` [R7]
- [x] T8: Crear el crate Rust `archon-worker` en `apps/worker-rs` (`Cargo.toml`, `src/main.rs`) con test unitario de sanidad [R8]
- [x] T9: Configurar en `apps/worker-rs/package.json` el wrapper npm con scripts delegados a `cargo build`, `cargo clippy`, `cargo check` y `cargo test` [R8]
- [x] T10: Ajustar `turbo.json` y dependencias del monorepo para unificar los pipelines de `build`, `lint`, `typecheck` y `test` en todos los proyectos [R9, R10]
- [x] T11: Ejecutar la verificación completa del pipeline (`pnpm turbo run lint typecheck test build`) y comprobar la correcta propagación de fallos ante errores de compilación o test [R9, R10]
