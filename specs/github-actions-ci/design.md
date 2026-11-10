# Design — github-actions-ci

## 1. Arquitectura General y Topología de CI en GitHub Actions

La arquitectura de Integración Continua (CI) de Archon se basa en un pipeline automatizado orquestado por **GitHub Actions** y acelerado mediante **Turborepo** y estrategias de caché multi-nivel. El pipeline garantiza que cualquier cambio introducido mediante Pull Request o push directo a la rama `main` sea verificado con rigor en un entorno idéntico y reproducible antes de su integración.

El diseño aprovecha la naturaleza políglota del monorepo (Node.js/TypeScript y Rust) y su integración con PostgreSQL + `pgvector`, ejecutando exclusivamente las tareas sobre los paquetes modificados y sus dependientes necesarios (*impact-aware execution*).

```mermaid
flowchart TD
    subgraph Triggers ["Disparadores de Eventos"]
        pr["Pull Request a main"]
        push["Push a main"]
    end

    subgraph GitHubRunner ["GitHub Actions Runner (ubuntu-latest)"]
        subgraph ConcurrencyControl ["Control de Concurrencia"]
            cancel["cancel-in-progress (Solo en PRs)"]
        end

        subgraph ServiceContainer ["Servicio Contenedor (Docker)"]
            pg["PostgreSQL 16 + pgvector (pgvector/pgvector:pg16)"]
            health["Healthcheck: pg_isready -U postgres"]
        end

        subgraph EnvironmentSetup ["Aprovisionamiento de Herramientas"]
            checkout["actions/checkout@v4 (fetch-depth: 0)"]
            pnpm_setup["pnpm/action-setup@v4 (pnpm@12.18.0)"]
            node_setup["actions/setup-node@v4 (Node 22 LTS, cache: pnpm)"]
            pnpm_install["pnpm install --frozen-lockfile"]
            rust_setup["dtolnay/rust-toolchain@stable (clippy, rustfmt)"]
            rust_cache["Swatinem/rust-cache@v2 (Cargo cache)"]
            turbo_cache["actions/cache@v4 (.turbo local cache)"]
        end

        subgraph DatabasePreparation ["Preparación de Base de Datos"]
            init_db["Inicialización: CREATE DATABASE archon_test"]
            db_migrate["Migraciones: pnpm db:migrate (dbmate sobre archon_test)"]
        end

        subgraph TurborepoFilter ["Cálculo de Proyectos Afectados"]
            calc_pr["PR: --filter=...[origin/main]"]
            calc_push["Push: --filter=...[HEAD^1]"]
        end

        subgraph VerificationPipeline ["Pipeline de Verificación"]
            step_lint["pnpm turbo run lint $TURBO_FILTER"]
            step_typecheck["pnpm turbo run typecheck $TURBO_FILTER"]
            step_test["pnpm turbo run test $TURBO_FILTER (NODE_ENV=test)"]
        end
    end

    pr --> cancel
    push --> cancel
    cancel --> checkout
    checkout --> pnpm_setup --> node_setup --> pnpm_install
    checkout --> rust_setup --> rust_cache
    checkout --> turbo_cache
    pg --> health
    health --> init_db --> db_migrate

    pnpm_install --> TurborepoFilter
    rust_cache --> TurborepoFilter
    db_migrate --> TurborepoFilter

    TurborepoFilter --> step_lint
    step_lint --> step_typecheck
    step_typecheck --> step_test
```

---

## 2. Componentes y Archivos Afectados

### 2.1 Archivo de Workflow de GitHub Actions (`.github/workflows/ci.yml`)
- Ubicado en la raíz del repositorio dentro de `.github/workflows/`.
- Declara la infraestructura de CI, triggers, contenedores de servicio, variables de entorno, pasos de aprovisionamiento de herramientas, capas de caché y comandos de ejecución de Turborepo.

### 2.2 Suite de Pruebas Automatizadas de Infraestructura CI (`packages/database/tests/ci-workflow.test.ts`)
- Ubicada en el paquete de infraestructura `@archon/database` junto con los tests de entorno y migraciones ya existentes (`infrastructure.test.ts` y `migrations.test.ts`).
- Valida programáticamente que el archivo `.github/workflows/ci.yml` existe, tiene una sintaxis YAML válida, incluye todos los disparadores requeridos, configura adecuadamente el servicio PostgreSQL con `pgvector`, declara los comandos de inicialización y migración dbmate, y aplica los filtros de Turborepo requeridos.

---

## 3. Especificación Detallada del Workflow `.github/workflows/ci.yml`

### 3.1 Estructura Completa del Workflow

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

permissions:
  contents: read

jobs:
  verify:
    name: Lint, Typecheck & Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      NODE_ENV: test
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/archon_test?sslmode=disable
      TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/archon_test?sslmode=disable
      WORKER_MODE: mock
      EMBEDDING_DIMENSION: 384
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 12.18.0
          run_install: false

      - name: Setup Node.js 22 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install Node.js dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt

      - name: Cache Cargo dependencies and target
        uses: Swatinem/rust-cache@v2

      - name: Initialize test database
        run: |
          PGPASSWORD=postgres psql -h localhost -U postgres -d postgres -c "SELECT 'CREATE DATABASE archon_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'archon_test')\gexec"

      - name: Run dbmate migrations on archon_test
        run: pnpm db:migrate

      - name: Setup Turborepo local cache
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ runner.os }}-

      - name: Determine Turborepo filter
        id: turbo-filter
        shell: bash
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            echo "TURBO_FILTER=--filter=...[origin/main]" >> $GITHUB_ENV
          elif [ "${{ github.event_name }}" = "push" ] && git rev-parse --verify HEAD^1 >/dev/null 2>&1; then
            echo "TURBO_FILTER=--filter=...[HEAD^1]" >> $GITHUB_ENV
          else
            echo "TURBO_FILTER=" >> $GITHUB_ENV
          fi

      - name: Turborepo lint
        run: pnpm turbo run lint $TURBO_FILTER

      - name: Turborepo typecheck
        run: pnpm turbo run typecheck $TURBO_FILTER

      - name: Turborepo test
        run: pnpm turbo run test $TURBO_FILTER
```

---

## 4. Decisiones de Diseño y Mecanismos Clave

### 4.1 Clonación Completa de Git (`fetch-depth: 0`)
- **Problema:** De forma predeterminada, `actions/checkout` realiza un clon superficial (*shallow clone*) de profundidad 1 (`fetch-depth: 1`). En este modo, el runner carece del historial previo de commits y de la rama base (`origin/main`). Al intentar ejecutar filtros de Turborepo como `--filter=...[origin/main]`, Git falla con el error `fatal: ambiguous argument 'origin/main': unknown revision`.
- **Solución:** Establecer `fetch-depth: 0`. Esto descarga todo el historial y ramas remotas, permitiendo a Turborepo calcular con total exactitud el grafo de archivos modificados y paquetes afectados.

### 4.2 Fijación y Caché de Herramientas (pnpm y Node.js)
- **Gestión de Versiones:** La versión de `pnpm` se fija estrictamente en `12.18.0` coincidiendo con la declaración canónica en `package.json` (`packageManager: "pnpm@12.18.0"` y `devEngines`).
- **Caché:** Se utiliza `actions/setup-node@v4` con `cache: 'pnpm'`, lo que cachea automáticamente el directorio global de almacenamiento de pnpm (`~/.local/share/pnpm/store`), reduciendo significativamente los tiempos de instalación en ejecuciones sucesivas.
- **Instalación Segura:** `pnpm install --frozen-lockfile` garantiza que las dependencias instaladas coincidan exactamente con `pnpm-lock.yaml`, impidiendo discrepancias y modificaciones inadvertidas del lockfile en CI.

### 4.3 Soporte de Rust Toolchain y Caché de Cargo
- **Monorepo Políglota:** El monorepo cuenta con `@archon/worker-rs` en `apps/worker-rs`, orquestado por Cargo dentro del workspace de Turborepo. Turborepo ejecuta `cargo build`, `cargo clippy -- -D warnings`, `cargo check` y `cargo test`.
- **Instalación:** `dtolnay/rust-toolchain@stable` con componentes `clippy` y `rustfmt` asegura la disponibilidad de las herramientas requeridas por los scripts de `apps/worker-rs/package.json`.
- **Caché de Cargo:** `Swatinem/rust-cache@v2` gestiona de manera óptima la caché de dependencias en `~/.cargo/registry`, `~/.cargo/git` y los artefactos intermedios en `target/`, indexada automáticamente por el contenido de `Cargo.lock`.

### 4.4 Servicio PostgreSQL con pgvector y Ciclo de Migraciones
- **Contenedor de Servicio:** Se emplea la imagen `pgvector/pgvector:pg16` expuesta en el puerto local `5432:5432`. El healthcheck nativo con `pg_isready` asegura que PostgreSQL acepte conexiones antes de que inicien los pasos del trabajo.
- **Aislamiento de la Base de Datos:** Para preservar la coherencia con el entorno de desarrollo y pruebas locales (`.env.test`), se inicializa la base de datos `archon_test` mediante una sentencia SQL idempotente (`SELECT 'CREATE DATABASE archon_test' WHERE NOT EXISTS...`).
- **Migraciones con dbmate:** Se ejecuta `pnpm db:migrate` con `DATABASE_URL` apuntando a `archon_test`. Esto ejecuta la migración inicial `20261110000000_create_technologies_table.sql`, habilitando las extensiones `uuid-ossp` y `vector`, y creando la tabla `technologies` con sus índices. Las pruebas de integración en el monorepo pueden interactuar directamente con el esquema relacional real.

### 4.5 Caché de Turborepo y Remote Caching
- **Caché Local en CI:** Se utiliza `actions/cache@v4` apuntando al directorio `.turbo/`. Cuando un paso produce un hash de tarea previamente registrado sin cambios en inputs, Turborepo reproduce los logs y omite la re-ejecución (*FULL TURBO*).
- **Caché Remota:** Si los secretos de repositorio `TURBO_TOKEN` y `TURBO_TEAM` están presentes, se inyectan como variables de entorno, permitiendo compartir caché distribuida entre máquinas locales de desarrolladores y runners de CI.

### 4.6 Filtrado Inteligente de Proyectos Afectados (`TURBO_FILTER`)
El workflow determina dinámicamente el alcance de la ejecución según el evento desencadenante:
1. **En Pull Requests hacia `main` (`github.event_name == 'pull_request'`):**
   - Se calcula el filtro `--filter=...[origin/main]`. Turborepo identifica todos los paquetes que contienen cambios respecto a `origin/main` e incluye además todos los paquetes que dependen de ellos (dependencias downstream). Las dependencias upstream requeridas para compilar se resuelven automáticamente gracias a `dependsOn: ["^build"]` en `turbo.json`.
2. **En Pushes a la rama `main` (`github.event_name == 'push'`):**
   - Se evalúa la existencia de `HEAD^1`. Si existe un commit antecesor, se aplica `--filter=...[HEAD^1]`.
   - Si no existe `HEAD^1` (por ejemplo, en el commit raíz o ref inicial), la variable `TURBO_FILTER` se deja vacía, lo que instruye a Turborepo a evaluar la totalidad del monorepo.

---

## 5. Especificación de Pruebas Automatizadas de Infraestructura CI

Para garantizar el cumplimiento de los checkpoints de verificación (C1, C4, C6), se definen pruebas en `packages/database/tests/ci-workflow.test.ts` que validan formalmente la configuración del workflow.

### 5.1 Matriz de Validaciones del Test

| Requisito | Propiedad Comprobada en `.github/workflows/ci.yml` |
|---|---|
| **R1, R2, R3** | Eventos `pull_request` y `push` dirigidos a `main`, grupo de concurrencia y `cancel-in-progress` |
| **R4** | Presencia de `actions/checkout@v4` con `fetch-depth: 0` |
| **R5, R6** | Uso de `pnpm/action-setup@v4` con `version: 12.18.0`, `actions/setup-node@v4` con `cache: 'pnpm'` y comando `pnpm install --frozen-lockfile` |
| **R7, R8** | Uso de `dtolnay/rust-toolchain@stable` con componentes `clippy` y `rustfmt`, y acción de caché `Swatinem/rust-cache@v2` |
| **R9, R10, R11** | Contenedor de servicio `pgvector/pgvector:pg16` con healthcheck `pg_isready`, paso de inicialización de base de datos `archon_test` y paso de migración `pnpm db:migrate` |
| **R12, R13** | Acción `actions/cache@v4` sobre directorio `.turbo` y configuración de variables `TURBO_TOKEN` y `TURBO_TEAM` |
| **R14, R15** | Lógica de cálculo condicional de `TURBO_FILTER` diferenciando PRs (`origin/main`) y pushes (`HEAD^1`) |
| **R16, R17, R18, R20** | Ejecución secuencial de `pnpm turbo run lint $TURBO_FILTER`, `pnpm turbo run typecheck $TURBO_FILTER` y `pnpm turbo run test $TURBO_FILTER` con `NODE_ENV=test` |

---

## 6. Manejo de Errores y Excepciones

1. **Fallo de Salud del Contenedor de Servicio PostgreSQL:**
   - Si la imagen `pgvector/pgvector:pg16` no logra alcanzar el estado `healthy` en 50 segundos (5 reintentos x 10s), GitHub Actions cancela inmediatamente el job antes de ejecutar los pasos, evitando errores en cascada de conexión no disponibles.
2. **Fallo en Migraciones de dbmate:**
   - Si las credenciales de `DATABASE_URL` son inválidas o la base de datos `archon_test` no fue creada, `pnpm db:migrate` falla con código de salida distinto de cero, interrumpiendo el job antes de que los tests puedan ejecutarse sobre un esquema incompleto.
3. **Ausencia de Referencias Git en el Runner:**
   - Al utilizar `fetch-depth: 0`, se mitigan los errores de referencias no resueltas. El script shell de cálculo de filtro incluye una salvaguarda (`git rev-parse --verify HEAD^1 >/dev/null 2>&1`) para evitar errores en repositorios o ramas sin commit antecesor.
4. **Fallo en Tests, Linter o Tipos:**
   - Cada comando (`lint`, `typecheck`, `test`) se ejecuta con `set -e` por defecto en GitHub Actions. Si cualquier workspace falla en sus aserciones o reporta errores de tipado/linting, el pipeline se detiene inmediatamente marcando el PR como no apto para merge (*status check failed*).

---

## 7. Alternativas Descartadas

### Alternativa 1 (Descartada): Usar `fetch-depth: 1` con Invocaciones Manuales a `git fetch`
- **Descripción:** Mantener la clonación superficial por defecto (`fetch-depth: 1`) y agregar un paso manual `git fetch origin main --depth=1` previo a Turborepo.
- **Justificación de Descarte:**
  - Los clones superficiales combinados con fetches parciales generan estados de commit huérfanos e inconsistencias al calcular grafos de diferencias complejas en Pull Requests de múltiples commits.
  - La diferencia de tiempo de descarga en repositorios de código fuente (sin artefactos binarios pesados en tracking) entre `fetch-depth: 0` y `fetch-depth: 1` es despreciable (generalmente inferior a 2 segundos), mientras que la robustez que otorga `fetch-depth: 0` elimina por completo falsos positivos y errores fatales de Git en CI.

### Alternativa 2 (Descartada): Ejecutar Todas las Tareas Incondicionalmente sin Filtrado (`turbo run test`)
- **Descripción:** Omitir el cálculo de `--filter` y ejecutar siempre `pnpm turbo run lint typecheck test` sobre el monorepo entero.
- **Justificación de Descarte:**
  - A medida que el monorepo incorpore nuevas aplicaciones (`apps/`) y paquetes (`packages/`), los tiempos de ejecución de CI crecerían de forma lineal y acumulativa, incrementando el costo en minutos de cómputo de GitHub Actions.
  - El valor central de Turborepo reside precisamente en su capacidad de analizar el grafo de dependencias y ejecutar de forma quirúrgica solo los paquetes afectados y sus consumidores downstream directos, ahorrando tiempo y energía en cada Pull Request.

### Alternativa 3 (Descartada): Instalar PostgreSQL y pgvector Directamente en el Sistema Operativo del Runner
- **Descripción:** Instalar PostgreSQL mediante `sudo apt-get install postgresql` en el script del runner y compilar manualmente la extensión `pgvector` con `git clone` y `make install`.
- **Justificación de Descarte:**
  - Requiere scripts de instalación extensos y frágiles en el workflow, sumando entre 1 y 2 minutos adicionales a cada ejecución de CI.
  - GitHub Actions ofrece soporte nativo de primera clase para contenedores de servicio (`services:`), lo que permite descargar e instanciar en segundos la imagen oficial `pgvector/pgvector:pg16` precompilada y lista para producción, garantizando paridad exacta con el entorno `.devcontainer`.

