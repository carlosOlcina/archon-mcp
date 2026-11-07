# Spec Driven Development (SDD)

> Este repositorio adopta un flujo riguroso Kiro-style: **requirements → design → tasks → code**.
> Ningún agente o desarrollador escribe código productivo hasta que el spec ha sido formalmente aprobado por un humano.

## Estructura de un Spec

Cada feature (`"sdd": true` en `feature_list.json`) dispone de un directorio exclusivo en `specs/<feature-name>/`:

```
specs/<feature-name>/
├── requirements.md   # QUÉ se necesita (sintaxis estricta EARS)
├── design.md         # CÓMO se implementará (arquitectura y decisiones técnicas)
└── tasks.md          # PASOS secuenciales y ejecutables con trazabilidad
```

El `<feature-name>` debe coincidir de forma unívoca con el campo `name` en `feature_list.json`.

---

## Ciclo de Estados de una Feature

| Estado | Significado | Siguiente acción |
|---|---|---|
| `pending` | Sin spec redactado. | `spec_author` redacta la especificación. |
| `spec_ready` | Spec redactado en `specs/<name>/`. | ⏸ **Puerta 1:** Aprobación humana obligatoria. |
| `in_progress` | Spec aprobado. | `implementer` ejecuta tareas y `reviewer` audita. |
| `done` | Tests verdes, reviewer aprobó, humano aceptó y commiter abrió PR. | Feature completada y archivada. |
| `blocked` | Bloqueado por impedimento técnico o falta de claridad. | Detalle documentado en `progress/current.md`. |

---

## Las Dos Puertas de Aprobación Humana

El flujo autónomo se detiene de forma obligatoria en dos puntos clave:

```
pending → [spec_author] → spec_ready → ⏸ PUERTA 1: HUMANO APRUEBA SPEC → in_progress
       → [implementer → reviewer] → ⏸ PUERTA 2: HUMANO ACEPTA FEATURE
       → [implementer: done] → [commiter: commits atómicos + PR]
```

1. **Puerta 1 — Aprobación del Spec (`spec_ready`):**
   - El agente `spec_author` redacta `requirements.md`, `design.md` y `tasks.md`.
   - Marca `spec_ready` en `feature_list.json` y se detiene.
   - El humano revisa los 3 archivos y da el visto bueno ("aprobado") o solicita modificaciones.

2. **Puerta 2 — Aceptación de la Feature (tras veredicto `APPROVED` del `reviewer`):**
   - El agente `implementer` codifica las tareas y tests asociados.
   - El agente `reviewer` audita la trazabilidad `R<n>` ↔ tests y checkpoints.
   - Si el reviewer aprueba (`APPROVED`), el `leader` presenta el resumen y solicita validación humana mediante `ask_question`.
   - Si el humano pide ajustes, se corrigen. Si el humano aprueba, la feature pasa a `done` y el `commiter` crea la rama `feat/<name>`, realiza commits atómicos y abre la Pull Request en GitHub.

---

## Redacción de `requirements.md` — Sintaxis EARS Estricta

Los requisitos se formulan exclusivamente mediante la sintaxis **EARS** (*Easy Approach to Requirements Syntax*). Cada requisito debe tener un identificador estable (`R1`, `R2`, ...):

| Patrón | Plantilla | Propósito |
|---|---|---|
| **Ubicuo** | `El sistema DEBE <acción>.` | Comportamiento siempre activo sin condiciones previas. |
| **Evento** | `CUANDO <disparador>, el sistema DEBE <acción>.` | Respuesta a un estímulo o acción externa. |
| **Estado** | `MIENTRAS <estado>, el sistema DEBE <acción>.` | Comportamiento condicionado a que persista un estado. |
| **Opcional** | `DONDE <feature opcional>, el sistema DEBE <acción>.` | Funcionalidad sujeta a configuración o presencia de módulo. |
| **No deseado** | `SI <evento de error/no deseado> ENTONCES el sistema DEBE <acción>.` | Manejo de excepciones, fallos y validaciones. |

### Reglas para Requirements:
- Cada `R<n>` DEBE ser verificable mediante al menos un test automatizado.
- Prohibido el uso de términos ambiguos ("debería", "podría", "adecuado", "rápido").
- Un solo `DEBE` por requirement. Si hay múltiples responsabilidades, divídelo en `R<n>` separados.

---

## Redacción de `design.md` — Decisiones Técnicas

Define con precisión la estrategia de implementación antes de tocar código:
1. **Componentes y paquetes involucrados:** Rutas exactas en `apps/*` o `packages/*`.
2. **Firmas de APIs, funciones o interfaces:** Tipado TypeScript explícito.
3. **Manejo de errores:** Tipos de error lanzados y códigos de respuesta.
4. **Alternativa descartada:** Mínimo una solución técnica evaluada y descartada con justificación objetiva.

---

## Redacción de `tasks.md` — Checklist Ejecutable

Lista ordenada de tareas técnicas discretas. Cada tarea debe vincularse directamente a los requisitos que cubre:

```markdown
# Tasks — <feature-name>

- [ ] T1: Crear paquete compartido de tipos en `packages/shared` [R1]
- [ ] T2: Implementar endpoint o servicio en `apps/api` [R1, R2]
- [ ] T3: Añadir tests unitarios y de integración [R1, R2, R3]
```

---

## Matriz de Trazabilidad (Obligatoria)

- Cada test del workspace debe mapear a uno o más `R<n>`.
- Ningún `R<n>` puede quedar sin prueba unitaria o de integración.
- El agente `reviewer` comprueba esta matriz de forma explícita antes de emitir su veredicto.
