# Requirements — dbmate-technologies-migration

## 1. Introducción y Alcance

Este documento establece la especificación formal de requisitos para la adopción e implementación del sistema de migraciones de base de datos relacional con **dbmate** y la generación de la primera migración de esquema para la entidad **technologies** en el monorepo Archon.

El alcance comprende la integración de la herramienta `dbmate` y sus scripts de automatización en la raíz del workspace (incluyendo variantes `:dev` con `--env-file .env.dev`), la configuración del directorio de migraciones directamente en `packages/database/migrations` y `packages/database/schema.sql` sin subdirectorio `/db` intermedio, la creación del script DDL SQL de la primera migración asegurando extensiones necesarias (`uuid-ossp`, `vector`), la tabla `technologies` con su jerarquía autorreferencial (`father_technology_id`), índices especializados (B-Tree en categorización y relaciones, GIN en array de alias de texto), y la provisión de contratos tipados TypeScript y esquemas de validación Zod en `@archon/database` y `@archon/validators`, acompañados de pruebas automatizadas.

Los campos de documentación (versión y enlaces externos) quedan expresamente fuera de este alcance y serán implementados en una tabla relacional separada en una sesión posterior.

---

## 2. Requisitos del Sistema (EARS Estricto)

### R1 — Integración y Scripts de dbmate en el Workspace (Ubicuo)
El sistema DEBE incluir la dependencia `dbmate` en el archivo `package.json` de la raíz del monorepo y exponer los scripts ejecutables `db:migrate`, `db:rollback`, `db:status`, `db:new`, así como sus variantes de entorno de desarrollo `db:migrate:dev`, `db:rollback:dev` y `db:status:dev` cargando `.env.dev`, apuntando directamente a `packages/database/migrations` y `packages/database/schema.sql`.

### R2 — Estructura y Ubicación de Migraciones en packages/database (Ubicuo)
El sistema DEBE ubicar los archivos de migración SQL directamente en el directorio `packages/database/migrations` y el archivo de esquema consolidado generado por dbmate en `packages/database/schema.sql` dentro del paquete `@archon/database`, sin directorio `/db` intermedio.

### R3 — Habilitación de Extensiones de Base de Datos en Migraciones (Ubicuo)
El sistema DEBE incluir en la migración inicial de base de datos las sentencias idempotentes `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` y `CREATE EXTENSION IF NOT EXISTS vector;` para habilitar el soporte de identificadores UUID y vectores de embeddings en PostgreSQL.

### R4 — Clave Primaria UUID en la Tabla Technologies (Ubicuo)
El sistema DEBE definir en la tabla `technologies` una columna `id` de tipo `UUID` como clave primaria no nula con valor predeterminado generado automáticamente mediante `gen_random_uuid()`.

### R5 — Atributos Obligatorios de Identidad y Categorización (Ubicuo)
El sistema DEBE definir en la tabla `technologies` las columnas `name` de tipo `VARCHAR(100)` no nulo, `category` de tipo `VARCHAR(32)` no nulo, e `is_activate` de tipo `BOOLEAN` no nulo.

### R6 — Identificador Único de Recurso (Slug) (Ubicuo)
El sistema DEBE definir en la tabla `technologies` la columna `slug` de tipo `VARCHAR(64)` no nulo con una restricción de unicidad (`UNIQUE`) para indexación y resolución unívoca.

### R7 — Relación Jerárquica Autorreferencial con Eliminación en Cascada (Opcional)
DONDE una tecnología pertenezca o descienda de otra tecnología padre, el sistema DEBE almacenar en la columna `father_technology_id` un identificador `UUID` opcional con restricción de clave foránea referenciando a `technologies(id)` con regla de eliminación `ON DELETE CASCADE`.

### R8 — Descripción y Marcas Temporales de Auditoría (Ubicuo)
El sistema DEBE definir en la tabla `technologies` la columna `description` de tipo `TEXT` opcional y las columnas de auditoría `created_at` y `updated_at` de tipo `TIMESTAMPTZ` no nulas con valor predeterminado `CURRENT_TIMESTAMP`.

### R9 — Registro de Denominaciones Alternativas (Aliases) (Ubicuo)
El sistema DEBE definir en la tabla `technologies` la columna `aliases` de tipo `TEXT[]` no nulo con valor predeterminado de array vacío para almacenar variantes léxicas y nombres alternativos de la tecnología.

### R10 — Índices B-Tree para Búsqueda y Navegación Jerárquica (Ubicuo)
El sistema DEBE crear índices relacionales de tipo B-Tree sobre las columnas `category` y `father_technology_id` de la tabla `technologies`.

### R11 — Índice GIN para Búsqueda Acelerada de Aliases (Ubicuo)
El sistema DEBE crear un índice invertido generalizado de tipo GIN sobre la columna `aliases` de la tabla `technologies`.

### R12 — Reversibilidad Completa de la Migración DDL (Evento)
CUANDO se ejecute la instrucción de reversión de migración (`migrate:down`), el sistema DEBE eliminar la tabla `technologies` y todos sus índices y restricciones asociadas mediante la sentencia `DROP TABLE IF EXISTS technologies CASCADE;`.

### R13 — Esquemas Zod de Validación de Datos (Ubicuo)
El sistema DEBE proveer en el paquete `@archon/validators` los esquemas Zod `TechnologySchema`, `CreateTechnologySchema` y `UpdateTechnologySchema` para validar la estructura, tipos de datos, límites de caracteres y restricciones de formato de las tecnologías.

### R14 — Tipos TypeScript y Mapeo de Entidad Relacional (Ubicuo)
El sistema DEBE exportar en el paquete `@archon/database` la interfaz de fila de base de datos `TechnologyRow`, la interfaz de dominio `Technology` y las funciones puras de transformación entre filas SQL y modelos de la aplicación.

### R15 — Manejo de Datos Inválidos en Validación (No deseado)
SI los datos suministrados para una tecnología violan los límites de longitud, contienen tipos incompatibles o identificadores UUID inválidos, ENTONCES el sistema DEBE abortar la operación emitiendo un error de validación `ZodError` con la lista detallada de infracciones.
