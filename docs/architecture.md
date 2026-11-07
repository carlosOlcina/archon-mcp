# Arquitectura del Workspace — Estándares y Principios

> Este documento define el estándar de ingeniería y arquitectura del monorepo Turborepo.
> Todos los agentes y desarrolladores evalúan y construyen código conforme a estas directrices.

---

## 1. Principios del Monorepo Turborepo

1. **Gestión con `pnpm` Workspaces y Turborepo:**
   - La raíz orquesta la ejecución y el pipeline de tareas con `turbo`.
   - Todas las tareas compartidas se ejecutan con `pnpm turbo run <task>` (`build`, `test`, `lint`, `typecheck`).
   - Los comandos específicos se filtran usando `--filter=<nombre-paquete>` (ej. `pnpm turbo run test --filter=@repo/core`).

2. **Organización de Espacios:**
   ```
   archon-mcp/
   ├── apps/               # Puntos de entrada de aplicaciones ejecutables
   │   └── ...             # (APIs, servicios backend, clientes web, CLIs)
   ├── packages/           # Librerías y paquetes compartidos reutilizables
   │   └── ...             # (UI, configuración, utils, DTOs/schemas, clientes)
   ├── specs/              # Especificaciones SDD (requirements, design, tasks)
   ├── progress/           # Bitácora de sesión actual e historial histórico
   ├── docs/               # Documentación y estándares del arnés
   ├── turbo.json          # Configuración del pipeline de tareas y caching
   └── package.json        # Configuración raíz de scripts y dependencias de build
   ```

3. **Flujo y Fronteras de Dependencias:**
   - **`apps/*` pueden importar `packages/*`**.
   - **`packages/*` pueden importar otros `packages/*`** (en orden acíclico).
   - **Prohibido:** Una `app` NUNCA puede ser importada por otra `app` o por un `package`.
   - **Prohibido:** Dependencias circulares entre paquetes.

---

## 2. Capas y Responsabilidades

### En Aplicaciones (`apps/*`):
- **Transporte / Entrada:** Controladores HTTP, routers, resolvers GraphQL, comandos CLI.
- **Configuración:** Inyección de dependencias, variables de entorno, arranque del servidor.
- **Consumo:** Consumen la lógica de negocio y tipos definidos en `packages/*`.

### En Paquetes Compartidos (`packages/*`):
- **Contratos y Modelos:** Schemas de validación (Zod/TypeBox), interfaces, DTOs y tipos compartidos.
- **Lógica de Dominio:** Servicios puros, utilidades algorítmicas, transformadores de datos.
- **Infraestructura Reutilizable:** Clientes de base de datos, clientes HTTP tipados, wrappers de logging.
- **Configuraciones Compartidas:** `tsconfig`, reglas de ESLint, configuración de testing.

---

## 3. TypeScript y Calidad de Código

- **Modo Estricto:** `strict: true` activado en todo el monorepo.
- **Sin `any`:** El uso de `any` está prohibido. Utilizar `unknown` con type narrowing o genéricos tipados.
- **Imports Limpios:** Usar la nomenclatura de paquetes definida en sus respectivos `package.json` (ejemplo `@repo/types`, `@repo/utils`), evitando rutas relativas inter-paquete.
- **Manejo de Errores Tipado:** Errores de dominio o excepciones específicas, nunca strings genéricos arrojados ni omisión silenciosa de fallos.

---

## 4. Qué NO Hacer

- ❌ NUNCA crear imports cruzados entre aplicaciones en `apps/`.
- ❌ NUNCA mezclar lógica de negocio directamente en capas de transporte/rutas.
- ❌ NUNCA utilizar `console.log()` para depuración o reporte de errores en código productivo.
- ❌ NUNCA commitear código sin tests asociados que garanticen la funcionalidad.
- ❌ NUNCA omitir la configuración de inputs/outputs en `turbo.json` si una tarea produce artefactos cacheados.
