# Requirements — github-actions-ci

## 1. Introducción y Alcance

Este documento establece la especificación formal de requisitos para el diseño e implementación del sistema de Integración Continua (CI) mediante **GitHub Actions** en el monorepo Archon.

El alcance comprende la definición completa del workflow de verificación automatizada (`.github/workflows/ci.yml`) activado ante la apertura o actualización de Pull Requests hacia la rama `main` y ante pushes directos a `main`. La configuración incluye la clonación del repositorio con el historial Git íntegro (`fetch-depth: 0`) para habilitar el motor de análisis de cambios de Turborepo, el aprovisionamiento de Node.js 22 LTS y del gestor de paquetes `pnpm` en la versión canónica fijada en `package.json` (`12.18.0`) con caché persistente de su almacén de dependencias, la configuración del toolchain estable de Rust con los componentes `clippy` y `rustfmt` junto con el cacheo de Cargo para la compilación y verificación de `@archon/worker-rs`, la orquestación de un contenedor de servicio de PostgreSQL con soporte nativo para la extensión vectorial `pgvector` (`pgvector/pgvector:pg16`) con comprobación de salud (*healthcheck*), la inicialización de la base de datos de pruebas `archon_test` y la aplicación determinista de migraciones de esquema mediante `dbmate`, la optimización del pipeline a través de la caché local y remota de Turborepo, y la ejecución inteligente y restringida a los paquetes afectados y sus dependientes necesarios (`lint`, `typecheck`, `test`), acompañada de una suite de pruebas automatizadas que certifique la infraestructura como código del workflow de CI.

Quedan fuera del alcance de esta especificación el despliegue a producción (CD), despliegues en entornos de staging efímeros y la publicación de releases etiquetadas, los cuales serán abordados en features dedicadas posteriores.

---

## 2. Requisitos del Sistema (EARS Estricto)

### R1 — Disparador de Workflow en Pull Requests hacia main (Evento)
CUANDO se abra, sincronice o reabra un Pull Request con rama destino 'main', el sistema DEBE activar la ejecución del workflow de integración continua '.github/workflows/ci.yml'.

### R2 — Disparador de Workflow en Pushes a la rama main (Evento)
CUANDO se realice un push de commits directamente a la rama 'main', el sistema DEBE activar la ejecución del workflow de integración continua '.github/workflows/ci.yml'.

### R3 — Cancelación de Ejecuciones Concurrentes en Pull Requests (Opcional)
DONDE se reciban nuevos commits en una misma rama de Pull Request mientras existan ejecuciones previas activas, el sistema DEBE cancelar automáticamente las ejecuciones en vuelo mediante un grupo de concurrencia con 'cancel-in-progress: true'.

### R4 — Clonación del Repositorio con Historial Completo para Diff (Ubicuo)
El sistema DEBE clonar el repositorio en el runner de CI utilizando 'actions/checkout' con el parámetro 'fetch-depth: 0' para proveer el árbol de commits necesario para el cálculo de diferencias de Turborepo.

### R5 — Configuración de Node.js y pnpm con Caché de Dependencias (Ubicuo)
El sistema DEBE configurar en el entorno de CI Node.js versión 22 y el gestor de paquetes 'pnpm' en la versión '12.18.0' declarada en 'package.json', habilitando la caché persistente del almacén de dependencias.

### R6 — Instalación Determinista de Dependencias (Ubicuo)
El sistema DEBE instalar las dependencias de Node.js del monorepo ejecutando 'pnpm install --frozen-lockfile'.

### R7 — Configuración del Toolchain de Rust y Componentes (Ubicuo)
El sistema DEBE configurar en el runner el toolchain de Rust estable con los componentes 'clippy' y 'rustfmt' para compilar y verificar el paquete '@archon/worker-rs'.

### R8 — Caché de Dependencias y Compilación de Rust (Ubicuo)
El sistema DEBE habilitar una estrategia de caché para las dependencias de Cargo y los artefactos de compilación de Rust generados en el directorio 'target'.

### R9 — Contenedor de Servicio PostgreSQL con Soporte pgvector (Ubicuo)
El sistema DEBE instanciar un contenedor de servicio en CI utilizando la imagen 'pgvector/pgvector:pg16', exponiendo el puerto '5432:5432' y verificando su disponibilidad mediante la prueba de salud 'pg_isready'.

### R10 — Inicialización de la Base de Datos de Pruebas archon_test (Evento)
CUANDO el servicio PostgreSQL complete su verificación de salud exitosamente, el sistema DEBE asegurar la existencia de la base de datos de pruebas 'archon_test'.

### R11 — Ejecución de Migraciones de Base de Datos con dbmate (Evento)
CUANDO la base de datos 'archon_test' se encuentre inicializada, el sistema DEBE ejecutar las migraciones de esquema invocando el script 'pnpm db:migrate' con la variable 'DATABASE_URL' apuntando a 'archon_test'.

### R12 — Caché Local de Turborepo en GitHub Actions (Ubicuo)
El sistema DEBE almacenar y restaurar la caché de tareas de Turborepo del directorio '.turbo' mediante la acción 'actions/cache'.

### R13 — Integración con Caché Remota de Turborepo (Opcional)
DONDE los secretos 'TURBO_TOKEN' y 'TURBO_TEAM' estén provistos en el entorno del runner, el sistema DEBE inyectar dichas credenciales para sincronizar artefactos con el servicio de Remote Cache de Turborepo.

### R14 — Filtrado de Proyectos Afectados en Pull Requests (Evento)
CUANDO el workflow de CI se ejecute en el contexto de un Pull Request hacia 'main', el sistema DEBE delimitar la ejecución de tareas de Turborepo a los proyectos afectados y sus dependientes respecto a 'origin/main' utilizando el filtro '--filter=...[origin/main]'.

### R15 — Filtrado de Proyectos Afectados en Pushes a main (Evento)
CUANDO el workflow de CI se ejecute por un push a la rama 'main', el sistema DEBE delimitar la ejecución de tareas de Turborepo a los proyectos afectados y sus dependientes respecto a 'HEAD^1' utilizando '--filter=...[HEAD^1]', o sobre la totalidad del monorepo si 'HEAD^1' no existe.

### R16 — Ejecución del Pipeline de Linting (Ubicuo)
El sistema DEBE ejecutar la verificación de estilo y reglas estáticas invocando 'pnpm turbo run lint' sobre los proyectos resultantes del filtro de afectación.

### R17 — Ejecución del Pipeline de Typechecking (Ubicuo)
El sistema DEBE ejecutar la validación estricta de tipos de TypeScript y comprobación de Rust invocando 'pnpm turbo run typecheck' sobre los proyectos resultantes del filtro de afectación.

### R18 — Ejecución del Pipeline de Pruebas Automatizadas (Ubicuo)
El sistema DEBE ejecutar la suite de pruebas unitarias, de integración y e2e invocando 'pnpm turbo run test' sobre los proyectos resultantes del filtro de afectación con 'NODE_ENV=test'.

### R19 — Pruebas Automatizadas de Infraestructura del Workflow CI (Ubicuo)
El sistema DEBE incluir en la suite de pruebas del monorepo tests automatizados que verifiquen la existencia, estructura sintáctica YAML, triggers, servicios, pasos de cacheo y comandos de filtrado del archivo '.github/workflows/ci.yml'.

### R20 — Aborto Inmediato ante Fallos de Verificación (No deseado)
SI cualquiera de los pasos de inicialización de base de datos, migración dbmate, lint, typecheck o pruebas automatizadas retorna un código de salida distinto de cero, ENTONCES el sistema DEBE detener la ejecución del pipeline y reportar el estado de verificación como fallido.

