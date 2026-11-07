# CHECKPOINTS — Evaluación del estado final

> En sistemas multi-agente no se evalúa el camino, se evalúa el destino.
> Estos son los checkpoints objetivos que un revisor (humano o agente) utiliza
> para certificar la salud, robustez y completitud del proyecto en Turborepo.

## C1 — El arnés está completo

- [ ] Existen los archivos base: `AGENTS.md`, `feature_list.json`, `progress/current.md`.
- [ ] Existen los 4 docs: `docs/specs.md`, `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md`.
- [ ] `pnpm turbo run lint` y `pnpm turbo run typecheck` terminan sin errores.

## C2 — El estado es coherente

- [ ] Como máximo una sola feature en estado `in_progress` en `feature_list.json`.
- [ ] Toda feature marcada como `done` tiene tests asociados que pasan.
- [ ] `progress/current.md` está limpio o describe con precisión la sesión activa.

## C3 — El código respeta la arquitectura

- [ ] Las aplicaciones residen en `apps/*` y los módulos reutilizables en `packages/*`.
- [ ] Se respeta el sentido de dependencias: las `apps` consumen `packages`, nunca al revés. No existen dependencias circulares.
- [ ] No hay `console.log()` huérfanos de debug, ni código muerto, ni `TODO`s sin contexto ni tracking.

## C4 — La verificación es real

- [ ] Los packages y apps cuentan con tests unitarios y de integración adecuados.
- [ ] `pnpm turbo run test` ejecuta la suite de pruebas y termina 100% en verde.
- [ ] La verificación no es cosmética: comprueba resultados reales y casos límite.

## C5 — La sesión se cerró bien

- [ ] No hay archivos temporales ni artefactos sin trackear (`*.tmp`, logs no ignorados, etc.).
- [ ] `progress/history.md` registra el resumen completo de la sesión cerrada.
- [ ] El árbol de trabajo de Git queda limpio tras la intervención del `commiter`.

## C6 — Spec Driven Development (SDD)

- [ ] Toda feature con `"sdd": true` en estado `spec_ready`, `in_progress` o `done` tiene su directorio `specs/<name>/` con los 3 archivos:
      `requirements.md` (EARS estricto), `design.md` y `tasks.md`.
- [ ] Cada requirement `R<n>` está cubierto por al menos un test ejecutable concreto en el workspace.
- [ ] Toda feature `done` tiene todas sus tareas `T<n>` marcadas como `[x]` en `tasks.md`.

---

**Uso de este archivo:** El agente revisor (`.agents/agents/reviewer.md`) evalúa metódicamente cada checkbox y rechaza cualquier feature que no cumpla todos los criterios aplicables.
