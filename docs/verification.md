# Verificación — Demostración de Calidad y Funcionamiento

> Regla fundamental: **El agente no dice "funciona", lo demuestra con evidencia ejecutable.**
> Toda feature, refactor o fix termina con pruebas verificadas mediante Turborepo, nunca con afirmaciones verbales.

---

## 1. Niveles de Verificación

### Nivel 1 — Tests Unitarios y de Integración (Obligatorio)
- Cada función pública, módulo o servicio dispone de pruebas que cubren:
  1. El camino feliz (*happy path*).
  2. Los casos límite (*edge cases*) y manejo de errores.
- Comando:
  ```bash
  pnpm turbo run test
  ```
  O para un paquete específico:
  ```bash
  pnpm turbo run test --filter=<package-name>
  ```

### Nivel 2 — Typecheck (Obligatorio)
- Verificación de tipos estricta sin omisiones ni supresiones arbitrarias:
  ```bash
  pnpm turbo run typecheck
  ```

### Nivel 3 — Linting y Formateo (Obligatorio)
- Cumplimiento de estándares de estilo, reglas de importación y ausencia de variables no utilizadas:
  ```bash
  pnpm turbo run lint
  ```

### Nivel 4 — Trazabilidad de Requirements (Obligatorio para SDD)
- Cada `R<n>` definido en `specs/<name>/requirements.md` debe estar explícitamente vinculado a al menos una prueba ejecutable.
- El implementador registra la tabla en `progress/impl_<name>.md`:
  ```markdown
  ## Trazabilidad R<n> ↔ Tests
  - R1: Cubierto por `packages/utils/src/auth.test.ts > should sign token`
  - R2: Cubierto por `packages/utils/src/auth.test.ts > should reject expired token`
  ```

---

## 2. Comandos de Verificación Completa

Antes de solicitar revisión al agente `reviewer` o al usuario humano:

```bash
pnpm turbo run lint typecheck test
```

Todo el pipeline de Turborepo debe concluir en verde (`status: SUCCESS` en todas las tareas).

---

## 3. Anti-patrones Prohibidos

- ❌ "He agregado el código, ya debería compilar y funcionar": Falta ejecución y log de pruebas.
- ❌ Tests vacíos o que solo comprueban que no arroje excepción sin evaluar el resultado.
- ❌ Deshabilitar tests (`it.skip` / `test.skip`) o alterar aserciones para que pasen artificialmente.
- ❌ Marcar `done` en `feature_list.json` con tareas de Turborepo fallidas.
- ❌ Silenciar warnings del linter con directivas `eslint-disable` o `// @ts-ignore` sin justificación documentada.

---

## 4. Gestión de Fallos o Bloqueos

Si algún comando de verificación falla y no puede resolverse dentro del alcance de la tarea:
1. No inventes soluciones cosméticas ni modifiques specs sin aprobación.
2. Anota detalladamente el error en `progress/current.md`.
3. Establece el estado de la feature como `blocked` en `feature_list.json`.
4. Comunica el bloqueo al humano indicando comando ejecutado, salida del terminal y opciones de resolución.
