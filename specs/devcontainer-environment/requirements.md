# Requirements — devcontainer-environment

## 1. Introducción y Alcance

Este documento establece la especificación formal de requisitos para la configuración del entorno de desarrollo contenedorizado (`.devcontainer`) y la arquitectura de soporte para el proyecto Archon. El alcance comprende la definición de la infraestructura como código en Docker Compose (PostgreSQL con soporte para la extensión vectorial `pgvector` y el contenedor de desarrollo polyglot con Node.js 22 LTS, `pnpm` y el toolchain de Rust), la parametrización de entornos (`.env.dev`, `.env.test`, `.env.example`, `.env.local`), la inicialización de bases de datos delegando las extensiones y esquemas a las migraciones del sistema, y la arquitectura de abstracción que permite utilizar un mock determinista de generación de embeddings en desarrollo y tests unitarios, asegurando el contrato tipado para la integración con el worker real en Rust (`archon-worker`).

---

## 2. Requisitos del Sistema (EARS Estricto)

### R1 — Definición de Servicios en Docker Compose (Ubicuo)
El sistema DEBE definir en `.devcontainer/docker-compose.yml` los servicios `app` y `db` para orquestar de forma desacoplada el espacio de trabajo y el servidor de base de datos.

### R2 — Configuración de PostgreSQL con Soporte pgvector (Ubicuo)
El sistema DEBE configurar en el servicio `db` una imagen de PostgreSQL con la librería y binarios de la extensión `pgvector` preinstalados y exponer el puerto 5432 hacia la red del host.

### R3 — Script de Inicialización de Bases de Datos (Ubicuo)
El sistema DEBE proveer en `.devcontainer/init-db.sql` las sentencias SQL idempotentes de inicialización para crear y asegurar la existencia de las bases de datos `archon_dev` y `archon_test`, delegando la habilitación de la extensión `vector` y estructuras de datos a las migraciones de base de datos del sistema.

### R4 — Contenedor de Desarrollo Polyglot (Ubicuo)
El sistema DEBE definir en `.devcontainer/Dockerfile` una imagen de desarrollo basada en Node.js 22 LTS que incluya el gestor de paquetes `pnpm` y el toolchain completo de Rust (`rustc`, `cargo`, `clippy` y `rustfmt`).

### R5 — Configuración Principal de Dev Container (Ubicuo)
El sistema DEBE configurar en `.devcontainer/devcontainer.json` el servicio `app` como entorno principal de ejecución con los puertos 3000 y 5432 declarados en su lista de reenvío.

### R6 — Script de Ciclo de Vida Post-Creación (Evento)
CUANDO finalice la creación del contenedor de desarrollo, el sistema DEBE ejecutar el script `.devcontainer/post-create.sh` para instalar las dependencias de Node.js mediante `pnpm` y comprobar la disponibilidad operativa del toolchain de Rust.

### R7 — Plantilla Canónica de Variables de Entorno (Ubicuo)
El sistema DEBE proveer en `.env.example` la plantilla canónica de variables de entorno documentando todas las variables admitidas (`DATABASE_URL`, `TEST_DATABASE_URL`, `PORT`, `WORKER_MODE`, `WORKER_BIN_PATH`, `WORKER_SOCKET_PATH`, `EMBEDDING_DIMENSION`) junto con sus descripciones y valores de referencia.

### R8 — Configuración Predeterminada de Desarrollo (Ubicuo)
El sistema DEBE proveer en `.env.dev` configuraciones predeterminadas no sensibles y funcionales para el entorno de desarrollo local y de contenedor (`archon_dev`, puerto 3000, `WORKER_MODE=mock`) permitiendo la ejecución inmediata sin requerir configuración manual previa.

### R9 — Configuración Predeterminada de Pruebas (Ubicuo)
El sistema DEBE proveer en `.env.test` configuraciones predeterminadas no sensibles y funcionales para la ejecución de pruebas automatizadas (`archon_test`, puerto de pruebas, `WORKER_MODE=mock`).

### R10 — Sobreescritura Prioritaria Local y Exclusión en Control de Versiones (Opcional)
DONDE exista el archivo `.env.local` en la raíz del espacio de trabajo, el sistema DEBE sobreescribir con máxima prioridad las variables definidas en `.env.dev` o `.env.test`, y el archivo `.env.local` DEBE estar explícitamente excluido del control de versiones en `.gitignore`.

### R11 — Resolución Jerárquica de Variables de Entorno (Evento)
CUANDO se inicialice la configuración de la aplicación, el sistema DEBE resolver las variables de entorno aplicando el orden de precedencia estricto: variables de proceso del sistema (`process.env`) > `.env.local` > `.env.test` (si `NODE_ENV=test`) / `.env.dev` (desarrollo por defecto) > valores predeterminados del esquema.

### R12 — Esquema de Validación de Variables de Entorno (Ubicuo)
El sistema DEBE proveer en `@archon/validators` un esquema Zod de configuración de entorno que valide los tipos, puertos y URLs, restringiendo el valor de `WORKER_MODE` exclusivamente a los literales `'mock'` y `'real'`.

### R13 — Generación Determinista en Modo Mock (Estado)
MIENTRAS `WORKER_MODE` mantenga el valor `'mock'`, el sistema DEBE generar representaciones vectoriales deterministas en memoria sin invocar modelos pesados ni dependencias externas de red o GPU.

### R14 — Contrato de Parámetros para Modo Worker Real (Opcional)
DONDE `WORKER_MODE` esté establecido en el valor `'real'`, el sistema DEBE exigir la presencia y validez de los parámetros de comunicación con el ejecutable o proceso de `archon-worker` (`WORKER_BIN_PATH` o `WORKER_SOCKET_PATH`).

### R15 — Manejo de Configuración de Entorno Inválida (No deseado)
SI las variables de entorno no satisfacen las reglas del esquema de validación, ENTONCES el sistema DEBE abortar la inicialización emitiendo un error tipado de configuración `ConfigurationError`.
