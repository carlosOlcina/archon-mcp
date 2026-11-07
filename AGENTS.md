<!-- turborepo configuration start -->
# General Guidelines for working with Turborepo

- **Navegación del workspace:** El proyecto está estructurado como un monorepo administrado con `pnpm` workspaces y Turborepo (`apps/*` para aplicaciones/servicios y `packages/*` para librerías y utilidades compartidas).
- **Ejecución de tareas:** Ejecuta siempre las tareas del ciclo de desarrollo a través de Turborepo utilizando el gestor de paquetes `pnpm`:
  - Compilación: `pnpm turbo run build`
  - Tests automatizados: `pnpm turbo run test`
  - Verificación de tipos: `pnpm turbo run typecheck`
  - Linter y formato: `pnpm turbo run lint`
- **Filtrado granular:** Para ejecutar tareas sobre un paquete o aplicación específico, utiliza el flag `--filter`:
  - `pnpm turbo run test --filter=<nombre-paquete>`
  - `pnpm turbo run build --filter=<nombre-app>...` (incluyendo dependencias upstream)
- **Gestión de dependencias:** Agrega dependencias entre paquetes internos mediante `"workspace:*"` y utiliza `pnpm --filter <destino> add <paquete>`.
<!-- turborepo configuration end -->

---

# Harness Engineering — Spec Driven Development (SDD)

> Este archivo es el **punto de entrada principal** para cualquier agente o desarrollador que trabaje en este monorepo.
> NO es una biblia de reglas estáticas: es un **mapa interactivo**. Lee progresivamente lo que necesites cuando lo requieras (*divulgación progresiva*).

---

## 1. Antes de empezar (Obligatorio)

1. Ejecuta la verificación base para comprobar el estado actual:
   ```bash
   pnpm turbo run lint typecheck
   ```
2. Lee `progress/current.md` para entender en qué estado concluyó la sesión anterior.
3. Lee `feature_list.json`. Toda nueva funcionalidad con `"sdd": true` está sujeta a **Spec Driven Development** (ver `docs/specs.md`).
4. Lee `docs/specs.md` antes de redactar, revisar o implementar cualquier spec o feature.

---

## 2. Mapa del Repositorio

| Archivo / Carpeta | Qué contiene | Cuándo consultarlo |
|---|---|---|
| `feature_list.json` | Lista canónica de features con estado (`pending`, `spec_ready`, `in_progress`, `done`, `blocked`) | Siempre, al comenzar la sesión |
| `progress/current.md` | Estado, notas de progreso y verificaciones de la sesión en curso | Siempre, al empezar y al actualizar avance |
| `progress/history.md` | Bitácora histórica append-only de sesiones completadas y cerradas | Para consultar contexto de decisiones pasadas |
| `specs/<feature>/` | Tríada SDD: `requirements.md` (EARS) + `design.md` + `tasks.md` | Antes y durante la implementación de la feature |
| `docs/specs.md` | Definición exhaustiva del ciclo SDD, sintaxis EARS y puertas humanas | Antes de redactar o validar un spec |
| `docs/architecture.md` | Arquitectura del monorepo, capas permitidas y dirección de dependencias | Antes de diseñar o estructurar código |
| `docs/conventions.md` | Reglas de estilo, TypeScript, testing, export maps y convenciones | Antes de escribir o refactorizar código |
| `docs/verification.md` | Protocolo de pruebas, comandos de Turborepo y matriz de trazabilidad | Antes de declarar una tarea o feature lista |
| `CHECKPOINTS.md` | Criterios objetivos de evaluación final (C1 a C6) | Para autoevaluación o revisión formal |
| `.agents/agents/` | Definiciones de agentes (`leader`, `spec_author`, `implementer`, `reviewer`, `commiter`) | Para entender roles u orquestar subagentes |
| `apps/` | Aplicaciones y servicios del monorepo | Para implementar transporte o entrada |
| `packages/` | Módulos, schemas, DTOs y lógica compartida reutilizable | Para implementar lógica central o librerías |
| `turbo.json` | Configuración del pipeline de tareas y cacheo | Para revisar o ajustar pipelines de tareas |

---

## 3. Reglas Duras (No Negociables)

- **Una sola feature a la vez:** Prohibido mezclar cambios de múltiples tareas en una sola sesión.
- **No declares una tarea `done` sin pruebas verdes:** `pnpm turbo run lint typecheck test` debe finalizar con éxito absoluto.
- **No saltes la fase de spec:** Toda feature `"sdd": true` debe ser redactada por `spec_author` y aprobada por un humano antes de tocar código.
- **Respeta las dos puertas de aprobación humana:**
  1. *Puerta 1:* Pausa obligatoria en `spec_ready` (el humano aprueba el spec).
  2. *Puerta 2:* Pausa obligatoria tras el veredicto `APPROVED` del `reviewer` (el humano acepta la entrega).
- **Cierre con commits atómicos y Pull Request:** El `commiter` crea la rama `feat/<name>`, estructura commits semánticos bajo Conventional Commits, realiza push y abre la PR con GitHub CLI.
- **Documentación continua:** Registra el avance en `progress/current.md` en tiempo real, no al concluir.
- **Repositorio limpio:** Sin archivos temporales, sin código comentado y sin `console.log()` de depuración.
- **Consulta la documentación:** Si algo no está claro, busca en `docs/` antes de asumir o inventar atajos.

---

## 4. Flujo de Trabajo Spec Driven Development (SDD)

```
pending → [spec_author] → spec_ready → ⏸ PUERTA 1: HUMANO APRUEBA → in_progress
       → [implementer → reviewer] → ⏸ PUERTA 2: HUMANO ACEPTA
       → [implementer: done] → [commiter: commits + PR]
```

1. El **`leader`** detecta la primera feature `pending` con `"sdd": true` en `feature_list.json`.
2. El leader invoca al subagente **`spec_author`**, quien crea `specs/<name>/{requirements.md, design.md, tasks.md}` y marca el estado como `spec_ready`.
3. **⏸ Puerta 1 (Pausa Humana):** El usuario revisa los documentos en `specs/<name>/` y emite su aprobación (o solicita cambios).
4. Tras la aprobación humana, el leader actualiza el estado a `in_progress` e invoca al **`implementer`**.
5. El implementer ejecuta secuencialmente las tareas de `tasks.md`, escribe las pruebas asociadas y marca cada tarea `[x]`.
6. El leader invoca al **`reviewer`**, quien valida la matriz de trazabilidad `R<n>` ↔ tests, el cumplimiento de `CHECKPOINTS.md` y ejecuta los comandos de Turborepo.
7. **⏸ Puerta 2 (Aceptación Humana):** Si el reviewer aprueba (`APPROVED`), el leader presenta el veredicto y consulta al humano mediante `ask_question` si todo está conforme.
   - Si el humano pide cambios: se reitera con implementer/reviewer (o spec_author si cambia el diseño).
8. Con el visto bueno humano, el implementer pasa el estado a `done` y traslada el informe a `progress/history.md`.
9. El leader invoca al subagente **`commiter`**, quien crea la rama `feat/<name>`, genera commits atómicos con Conventional Commits, realiza push y crea la PR contra la rama principal (`progress/pr_<name>.md`).

---

## 5. Protocolo de Cierre de Sesión

Antes de dar por concluida cualquier intervención:

1. Ejecuta:
   ```bash
   pnpm turbo run lint typecheck test
   ```
   Todo debe reportar éxito (verde).
2. Si la feature fue formalmente aceptada por el humano:
   - Estado `done` en `feature_list.json`.
   - Rama creada, commits atómicos generados y PR abierta mediante `commiter`.
   - Resumen de sesión trasladado de `progress/current.md` al final de `progress/history.md`.
   - `progress/current.md` restaurado con su plantilla en blanco.
3. El árbol de Git debe quedar en un estado limpio y predecible.

---

## 6. Procedimiento ante Bloqueos

- Si una herramienta, dependencia o comando produce un error inesperado, **no improvises un parche o workaround frágil**.
- Documenta con claridad el motivo exacto, el comando ejecutado y la traza en `progress/current.md`.
- Cambia el estado de la feature a `blocked` en `feature_list.json` y escala la situación al humano.

---

## 7. Estándares Universales de Código y Estilo

- **Idioma técnico:** Inglés en todo el código (variables, funciones, clases, tipos), comentarios y commits.
- **Simplicidad:** Priorizar la solución más simple y mantenible (KISS y YAGNI).
- **Tipado Fuerte:** TypeScript estricto, sin `any`. Usar `unknown` y validación de tipos segura.
- **Arquitectura Limpia:** Separación estricta entre capas de transporte/entrada y lógica de negocio.
- **Manejo de Errores:** Errores de dominio tipados y explícitos; nunca suprimir errores ni capturar excepciones sin tratamiento adecuado.
