# Convenciones de Código y Estilo

> La predictibilidad y homogeneidad del repositorio son esenciales para la colaboración
> ágil entre agentes y desarrolladores humanos.

---

## 1. Lenguaje e Idioma

- **Código e Historial:** Todo el código fuente (nombres de variables, funciones, clases, constantes, archivos), comentarios, documentación técnica interna y mensajes de commit deben escribirse en **inglés**.
- **Documentación de Gestión / Specs:** Los specs en `specs/` y bitácoras en `progress/` pueden redactarse en español si es el idioma de trabajo del equipo, manteniendo coherencia de términos.

---

## 2. Convenciones de TypeScript

- **Tipado Fuerte y Estricto:**
  - `strict: true`, `noImplicitAny: true`, `noImplicitReturns: true`.
  - Prohibido `any`. Usar `unknown` con type guards (`typeof`, `instanceof`, validadores de schema).
  - Tipado explícito en firmas de funciones públicas y métodos exportados.
  - Usar `import type { ... }` para tipos puros.
- **Nombres de Tipos:**
  - Interfaces y types en `PascalCase` (`UserProfile`, `DatabaseConfig`).
  - Schemas de validación con sufijo descriptivo (`CreateUserSchema`).
  - Types inferidos: `type CreateUserInput = z.infer<typeof CreateUserSchema>`.
- **Estructura de Archivos:**
  - Constantes globales en `SCREAMING_SNAKE_CASE`.
  - Funciones y variables en `camelCase`.
  - Nombres de archivos en `kebab-case` (`auth-token.service.ts`) o `PascalCase` para componentes (`UserProfile.tsx`).

---

## 3. Estructura de Paquetes en Turborepo

- **Nomenclatura:** Todos los paquetes internos usan el prefijo del workspace (ej. `@repo/<nombre>` o `@archon/<nombre>`).
- **Puntos de Entrada:** Definir campos `main`, `types` o export maps en `package.json`:
  ```json
  {
    "name": "@repo/utils",
    "exports": {
      ".": {
        "types": "./src/index.ts",
        "default": "./src/index.ts"
      }
    }
  }
  ```
- **Dependencias Internas:** Declaradas con `"workspace:*"` en `package.json` (ej. `"@repo/types": "workspace:*"`).

---

## 4. Convenciones de Testing

- **Ubicación:** Tests colocados junto al código que prueban o en carpeta `tests/` dentro del paquete:
  - `user.service.ts` → `user.service.test.ts`
- **Nomenclatura de Pruebas:**
  - Estilo descriptivo con comportamiento esperado:
    ```ts
    describe("UserService", () => {
      it("should create a new user when email is valid", async () => { ... });
      it("should throw DuplicateEmailError when email already exists", async () => { ... });
    });
    ```
- **Cobertura:** Cada requirement `R<n>` del spec debe reflejarse en al menos una prueba unitaria o de integración.

---

## 5. Manejo de Errores

- No usar excepciones genéricas (`throw new Error("fail")`).
- Crear clases de error de dominio derivadas de `Error`:
  ```ts
  export class EntityNotFoundError extends Error {
    constructor(entity: string, id: string) {
      super(`${entity} with id ${id} was not found`);
      this.name = "EntityNotFoundError";
    }
  }
  ```
- Manejar o transformar errores en los límites de transporte (APIs, CLI), devolviendo códigos de estado semánticos (400, 404, 500).
- Nunca silenciar errores en bloques `catch` vacíos.
