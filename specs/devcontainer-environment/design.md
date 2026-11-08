# Design — devcontainer-environment

## 1. Arquitectura General y Topología del Entorno

La configuración de desarrollo se basa en la especificación estándar **Development Containers** orquestada con **Docker Compose**, desacoplando el entorno de herramientas de desarrollo (Node.js + Rust) del servicio de persistencia (PostgreSQL con soporte para `pgvector`).

```mermaid
flowchart TD
    subgraph Host ["Máquina Anfitriona (Host)"]
        vscode["VSCode / DevContainer CLI"]
        host_browser["Navegador / Cliente MCP (localhost:3000)"]
        host_psql["Cliente SQL / DBeaver (localhost:5432)"]
    end

    subgraph DevContainer ["Docker Compose Network (archon-network)"]
        subgraph AppService ["Servicio: app (Dockerfile)"]
            node["Node.js 22 LTS"]
            pnpm["pnpm 12.x"]
            rust["Rust Toolchain (rustc, cargo, clippy, rustfmt)"]
            workspace["/workspaces/archon-mcp"]
            api_proc["@archon/api (Port 3000)"]
            worker_proc["@archon/worker-rs (Binario archon-worker)"]
            env_loader["loadEnvConfig (.env.local > .env.dev/.test)"]
        end

        subgraph DBService ["Servicio: db (pgvector/pgvector:pg17)"]
            pg["PostgreSQL 17 Engine"]
            lib_vector["Librería pgvector instalada (/usr/lib/postgresql/...)"]
            dev_db["Base: archon_dev"]
            test_db["Base: archon_test"]
            init_script["/docker-entrypoint-initdb.d/init-db.sql"]
        end
    end

    subgraph Migrations ["Sistema de Migraciones de Base de Datos"]
        mig_runner["Migraciones de la Aplicación"]
        ext_vector["CREATE EXTENSION IF NOT EXISTS vector;"]
        tables["Tablas y Esquemas"]
    end

    vscode --> AppService
    host_browser -. "Port Forward 3000" .-> api_proc
    host_psql -. "Port Forward 5432" .-> pg
    AppService -->|"postgresql://postgres:postgres@db:5432/archon_dev"| DBService
    init_script -. "Crea archon_dev y archon_test al montar" .-> DBService
    mig_runner -->|"Ejecuta en DB inicializada"| ext_vector
    ext_vector --> tables
    tables --> DBService
```

---

## 2. Componentes y Archivos Afectados

### 2.1 Configuración de Infraestructura en `.devcontainer/`

1. **`.devcontainer/docker-compose.yml`**
   - **Servicio `app`:**
     - `build`: contexto `.devcontainer`, apuntando a `Dockerfile`.
     - `volumes`: monta la raíz del monorepo en `/workspaces/archon-mcp` (con consistencia `cached` para optimización de I/O en Windows/macOS), más volúmenes con nombre dedicados para el cache de cargo (`cargo-cache:/usr/local/cargo/registry`) y el store de pnpm (`pnpm-store:/root/.local/share/pnpm/store`).
     - `network_mode`: red compartida con `db` (`archon-network`).
     - `depends_on`: servicio `db` con condición `condition: service_healthy`.
     - `command`: `sleep infinity` para mantener el contenedor activo.
   - **Servicio `db`:**
     - `image`: `pgvector/pgvector:pg17`. Esta imagen contiene precompilados los binarios y archivos de control de la extensión `pgvector` en PostgreSQL 17 (pgvector 0.8.7).
     - `restart`: `unless-stopped`.
     - `environment`:
       - `POSTGRES_USER`: `postgres`
       - `POSTGRES_PASSWORD`: `postgres`
       - `POSTGRES_DB`: `archon_dev`
     - `ports`: `["5432:5432"]` para acceso directo desde herramientas de base de datos en el host.
     - `volumes`:
       - `archon-postgres-data:/var/lib/postgresql/data` (persistencia local dedicada al proyecto).
       - `./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro` (inicialización de bases de datos).
     - `healthcheck`:
       - `test`: `["CMD-SHELL", "pg_isready -U postgres -d archon_dev"]`
       - `interval`: `5s`
       - `timeout`: `5s`
       - `retries`: `5`

2. **`.devcontainer/Dockerfile`**
   - **Base:** `mcr.microsoft.com/devcontainers/base:debian-12` o `node:22-bookworm`.
   - **Herramientas de Sistema:** `build-essential`, `pkg-config`, `libssl-dev`, `git`, `curl`.
   - **Node.js & pnpm:** Node.js 22 LTS, `corepack enable` y activación de `pnpm@12.18.0`.
   - **Rust Toolchain:** Instalación oficial vía `rustup` en modo no interactivo (`minimal` con componentes adicionales `clippy`, `rustfmt`, y target nativo). Variables de entorno `CARGO_HOME=/usr/local/cargo` y `RUSTUP_HOME=/usr/local/rustup` añadidas a `PATH`.

3. **`.devcontainer/devcontainer.json`**
   - `name`: `Archon Development Environment`.
   - `dockerComposeFile`: `docker-compose.yml`.
   - `service`: `app`.
   - `workspaceFolder`: `/workspaces/archon-mcp`.
   - `forwardPorts`: `[3000, 5432]`.
   - `postCreateCommand`: `bash .devcontainer/post-create.sh`.
   - `customizations.vscode.extensions`:
     - `rust-lang.rust-analyzer`
     - `dbaeumer.vscode-eslint`
     - `vitest.explorer`
     - `ckolkman.vscode-postgres`

4. **`.devcontainer/init-db.sql` — Separación Estricta de Responsabilidades**
   - **Responsabilidad:** Exclusivamente la creación idempotente y aseguramiento de la existencia de las bases de datos de desarrollo (`archon_dev`) y pruebas (`archon_test`).
   - **No responsabilidad:** La ejecución de `CREATE EXTENSION IF NOT EXISTS vector;` ni la creación de tablas o índices DDL **no** forman parte de `init-db.sql`. Dicha activación pertenece formalmente al sistema de migraciones de base de datos de la aplicación (ej. migraciones ejecutadas al arrancar o mediante scripts de migración). La imagen `pgvector/pgvector:pg17` provee los binarios necesarios para que cualquier migración posterior active la extensión sin fallos.
   - **Contenido del script:**
     ```sql
     -- init-db.sql: Inicialización de bases de datos para desarrollo y pruebas
     -- La creación de la base por defecto archon_dev es gestionada por POSTGRES_DB.
     -- Aquí se asegura la creación idempotente de la base de pruebas archon_test.

     SELECT 'CREATE DATABASE archon_test'
     WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'archon_test')\gexec
     ```

5. **`.devcontainer/post-create.sh`**
   - Permisos de ejecución (`chmod +x`).
   - Tareas automatizadas:
     1. Instalación determinista de paquetes: `pnpm install --frozen-lockfile` (o sincronización de lockfile).
     2. Verificación de compilador Rust y precompilación de metadatos de crates: `cargo check` en el workspace de Cargo.
     3. Mensaje de bienvenida y confirmación de sanidad de herramientas.

---

### 2.2 Estrategia de Entornos y Precedencia de Archivos `.env`

Para agilizar al máximo el desarrollo sin fricción y asegurar un entorno determinista para pruebas automatizadas, se implementa una jerarquía estructurada de archivos de configuración:

```mermaid
flowchart TD
    subgraph Priority ["Orden de Precedencia (Mayor a Menor)"]
        P1["1. Variables del Sistema / Contenedor (process.env)"]
        P2["2. .env.local (Sobreescrituras locales privadas - Git Ignored)"]
        P3["3. .env.test (si NODE_ENV=test) / .env.dev (por defecto/desarrollo)"]
        P4["4. Valores por defecto del Schema Zod (@archon/validators)"]
    end

    P1 --> P2
    P2 --> P3
    P3 --> P4
```

#### Archivos de Entorno en el Repositorio:

1. **`.env.example` (Plantilla Canónica Versionada en Git):**
   - Contiene la totalidad de variables soportadas con comentarios detallados y valores de ejemplo:
     ```env
     # Archon MCP - Canonical Environment Template
     NODE_ENV=development
     PORT=3000

     # Conexión a Base de Datos PostgreSQL
     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/archon_dev
     TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/archon_test

     # Modo del Worker de Embeddings ('mock' | 'real')
     WORKER_MODE=mock

     # Parámetros opcionales para WORKER_MODE=real
     # WORKER_BIN_PATH=/workspaces/archon-mcp/apps/worker-rs/target/debug/archon-worker
     # WORKER_SOCKET_PATH=/tmp/archon-worker.sock

     # Dimensión del modelo de embeddings (por defecto 384 para modelo standard ligero)
     EMBEDDING_DIMENSION=384
     ```

2. **`.env.dev` (Configuración de Desarrollo Versionada en Git):**
   - Contiene valores predeterminados no sensibles listos para trabajar de inmediato sin configuración manual:
     ```env
     NODE_ENV=development
     PORT=3000
     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/archon_dev
     TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/archon_test
     WORKER_MODE=mock
     EMBEDDING_DIMENSION=384
     ```

3. **`.env.test` (Configuración de Pruebas Automatizadas Versionada en Git):**
   - Diseñado para aislar las ejecuciones de vitest / supertest en una base de datos de test (`archon_test`):
     ```env
     NODE_ENV=test
     PORT=3001
     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/archon_test
     TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/archon_test
     WORKER_MODE=mock
     EMBEDDING_DIMENSION=384
     ```

4. **`.env.local` (Sobreescrituras Locales — Ignorado por Git):**
   - Excluido explícitamente en `.gitignore`.
   - Permite a un desarrollador cambiar puertos, credenciales o habilitar `WORKER_MODE=real` sin ensuciar el control de versiones.

---

## 3. Arquitectura de Mocks vs Worker Real para IA y Embeddings

### 3.1 Principio de Inversión de Dependencias (DIP)

Para permitir que el desarrollo diario y los tests unitarios se ejecuten a máxima velocidad sin requerir GPU ni descargas de modelos pesados, se establece una abstracción mediante una interfaz desacoplada.

```mermaid
classDiagram
    class EmbeddingProvider {
        <<interface>>
        +generateEmbedding(text: string) Promise~number[]~
        +generateEmbeddings(texts: string[]) Promise~number[][]~
        +getDimensions() number
        +isHealthy() Promise~boolean~
    }

    class MockEmbeddingProvider {
        -dimensions: number
        +generateEmbedding(text: string) Promise~number[]~
        +generateEmbeddings(texts: string[]) Promise~number[][]~
        +getDimensions() number
        +isHealthy() Promise~boolean~
    }

    class RealWorkerClient {
        -binaryPath: string
        -socketPath: string
        +generateEmbedding(text: string) Promise~number[]~
        +generateEmbeddings(texts: string[]) Promise~number[][]~
        +getDimensions() number
        +isHealthy() Promise~boolean~
        -executeWorkerCommand(command: unknown) Promise~unknown~
    }

    class WorkerProviderFactory {
        +createProvider(config: EnvConfig) EmbeddingProvider
    }

    EmbeddingProvider <|.. MockEmbeddingProvider
    EmbeddingProvider <|.. RealWorkerClient
    WorkerProviderFactory --> EmbeddingProvider
```

### 3.2 Estrategia de Runtime y Coexistencia

| Característica | Modo `mock` (`WORKER_MODE=mock`) | Modo `real` (`WORKER_MODE=real`) |
|---|---|---|
| **Ámbito principal** | Desarrollo diario (`pnpm dev`), tests unitarios, pipelines rápidos de CI. | Tests de integración, tests E2E y runtime de producción/staging. |
| **Inicialización** | Inmediata (0 ms de overhead, en memoria). | Requiere binario compilado de `archon-worker` o servicio daemon activo. |
| **Salida vectorial** | Vectores deterministas normalizados basados en hash del texto de entrada. | Vectores semánticos reales generados por el modelo alojado en el worker Rust. |
| **Requisitos de infraestructura** | Ninguno adicional (funciona en cualquier máquina). | CPU/GPU para inferencia y toolchain de Rust compilado. |
| **Validación de entorno** | `WORKER_BIN_PATH` y `WORKER_SOCKET_PATH` son opcionales. | Exige `WORKER_BIN_PATH` o `WORKER_SOCKET_PATH` válidos. |

---

## 4. Firmas, Schemas y Contratos Tipados

### 4.1 Schema de Variables de Entorno en `@archon/validators`

```typescript
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
```

### 4.2 Utilidad de Carga y Resolución Jerárquica de Entorno

```typescript
export interface LoadEnvOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
}

/**
 * Carga y valida la configuración resolviendo la precedencia:
 * 1. process.env
 * 2. .env.local (si existe)
 * 3. .env.test (si NODE_ENV === 'test') / .env.dev (por defecto)
 * 4. Defaults del schema Zod
 */
export function loadEnvConfig(options?: LoadEnvOptions): EnvConfig;
```

### 4.3 Contrato del Proveedor de Embeddings (`EmbeddingProvider`)

```typescript
export interface EmbeddingProvider {
  /**
   * Genera el embedding vectorial correspondiente a un texto individual.
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Genera en lote los embeddings para una lista de textos.
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Retorna la dimensionalidad de los vectores producidos (e.g., 384 o 1536).
   */
  getDimensions(): number;

  /**
   * Comprueba la operatividad y salud del proveedor.
   */
  isHealthy(): Promise<boolean>;
}
```

### 4.4 Implementación Determinista de Mock (`MockEmbeddingProvider`)

```typescript
export class MockEmbeddingProvider implements EmbeddingProvider {
  private readonly dimensions: number;

  constructor(dimensions = 384) {
    this.dimensions = dimensions;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    // Generación determinista pseudo-aleatoria basada en hash djb2 del texto
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    const vector: number[] = new Array(this.dimensions);
    let norm = 0;
    for (let j = 0; j < this.dimensions; j++) {
      // Valor flotante determinista en rango [-1.0, 1.0]
      const val = Math.sin(hash + j);
      vector[j] = val;
      norm += val * val;
    }

    norm = Math.sqrt(norm);
    return vector.map((v) => (norm === 0 ? 0 : Number((v / norm).toFixed(6))));
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }

  public getDimensions(): number {
    return this.dimensions;
  }

  public async isHealthy(): Promise<boolean> {
    return true;
  }
}
```

### 4.5 Factoría de Proveedores (`WorkerProviderFactory`)

```typescript
export class WorkerProviderFactory {
  public static createProvider(config: EnvConfig): EmbeddingProvider {
    if (config.WORKER_MODE === 'mock') {
      return new MockEmbeddingProvider(config.EMBEDDING_DIMENSION);
    }

    // Configuración para Worker Real (a integrarse en tickets subsiguientes)
    return new RealWorkerClient({
      binaryPath: config.WORKER_BIN_PATH,
      socketPath: config.WORKER_SOCKET_PATH,
      dimensions: config.EMBEDDING_DIMENSION,
    });
  }
}
```

---

## 5. Manejo de Errores y Excepciones de Dominio

1. **`ConfigurationError`:**
   - Lanzado cuando la configuración del entorno no es conforme al esquema (`EnvConfigSchema`). Provee detalles estructurados de los campos faltantes o inválidos.
   ```typescript
   export class ConfigurationError extends Error {
     public readonly issues: z.ZodIssue[];
     constructor(issues: z.ZodIssue[]) {
       super(`Configuración de entorno inválida: ${issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
       this.name = 'ConfigurationError';
       this.issues = issues;
     }
   }
   ```

2. **`WorkerUnavailableError`:**
   - Lanzado cuando `WORKER_MODE=real` pero el ejecutable `archon-worker` no existe en la ruta configurada, falla su ejecución o no responde al handshake inicial.
   ```typescript
   export class WorkerUnavailableError extends Error {
     constructor(message: string, public readonly cause?: unknown) {
       super(`Worker real no disponible: ${message}`);
       this.name = 'WorkerUnavailableError';
     }
   }
   ```

3. **Manejo de Errores en Docker e Inicialización de Base de Datos:**
   - Si `init-db.sql` falla al crear `archon_test` (por sintaxis SQL o problemas de permisos), el healthcheck de PostgreSQL en `docker-compose.yml` (`pg_isready -U postgres -d archon_dev`) o la inicialización del contenedor aborta con log de error, previniendo el arranque inconsistente del entorno.

---

## 6. Alternativas Descartadas

### Alternativa 1 (Descartada): Contenedor Monolítico All-in-One
- **Descripción:** Ejecutar Node.js, el toolchain de Rust y el demonio de PostgreSQL con `pgvector` dentro de una única imagen y contenedor Docker administrado por `systemd` o `supervisord`.
- **Justificación de Descarte:**
  - Viola el principio de contenedor de proceso único y separación estricta de responsabilidades.
  - Impide reiniciar o reemplazar el motor de base de datos sin destruir la sesión de depuración del IDE en el contenedor.
  - La persistencia de datos y la administración de volúmenes se vuelve más propensa a corrupción o pérdida accidental ante reconstrucciones del entorno de desarrollo.
  - Dificulta la aproximación a los entornos reales de despliegue donde la base de datos es un servicio gestionado o externo.

### Alternativa 2 (Descartada): Forzar la Descarga y Ejecución de Modelos Locales en Desarrollo Inicial
- **Descripción:** Incluir en el devcontainer la descarga obligatoria de un modelo de embeddings en formato ONNX o GGUF e instanciarlo mediante un runtime local de inferencia para todas las tareas de desarrollo y pruebas.
- **Justificación de Descarte:**
  - Requiere descargas de cientos de megabytes o gigabytes en cada creación de contenedor, consumiendo ancho de banda excesivo y provocando timeouts en redes lentas.
  - Introduce una carga de cómputo desproporcionada de CPU/RAM, reduciendo drásticamente la duración de la batería y el rendimiento en laptops o entornos de desarrollo remotos modestos.
  - Hace inviable la ejecución instantánea de pruebas unitarias (`vitest run`), degradando la agilidad del ciclo de Spec-Driven Development Kiro-style.

### Alternativa 3 (Descartada): Activar la Extensión `vector` y Tablas Directamente en `init-db.sql`
- **Descripción:** Ejecutar `CREATE EXTENSION IF NOT EXISTS vector;` y definiciones DDL en el script de arranque de Docker `init-db.sql`.
- **Justificación de Descarte:**
  - Acopla el ciclo de vida de la infraestructura de Docker con las migraciones evolutivas de la aplicación.
  - Los scripts en `/docker-entrypoint-initdb.d/` solo se ejecutan una única vez cuando el volumen de PostgreSQL está vacío; cualquier cambio futuro requeriría destruir volúmenes o aplicar parches manuales.
  - Impide que las migraciones del sistema (que deben ejecutarse en staging, producción, CI y desarrollo de manera uniforme) sean la única fuente de verdad (*single source of truth*) para extensiones y esquemas relacionales.
