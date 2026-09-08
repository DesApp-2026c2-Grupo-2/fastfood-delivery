# Documentación

**Versión:** 1.0  
**Actualizado:** 07/09/2026

La carpeta está partida para no mezclar material de trabajo, sprints, carpeta de la materia y docs técnicos.

| Carpeta | Para qué | Quién lo usa |
|---|---|---|
| [`interno/`](interno/) | Material de la materia y notas del equipo | Nosotros |
| [`sprints/`](sprints/) | Fichas, incrementos y reparto de cada sprint | Equipo y review |
| [`entregables/`](entregables/) | Documentos de la carpeta (lo que pide la materia) | Entrega |
| [`tecnica/`](tecnica/) | Modelo de datos, APIs, testing | Desarrollo y carpeta técnica |

## interno/

Fuentes de la materia y docs que no se entregan como carpeta.

- `Enunciado.txt` — enunciado del TP
- `Cronograma.txt` — fechas de planning y review
- `Caracteristicas-de-la-materia.txt` — cómo se cursa y qué hay que presentar
- `01-Analisis-inicial-y-planning-Sprint-1.md` — análisis y planning del 20/08
- `prompts.txt` — prompts de trabajo con IA

## sprints/

Un archivo por sprint. Las fichas cubren el entregable **Incrementos de los sprints**.

- `Ficha-Sprint-1.md` / `.docx`
- `Ficha-Sprint-2.md` / `.docx`
- `Plan-reparto-Sprint-1.md`

## entregables/

Lo que la materia pide en la carpeta, salvo incrementos (en `sprints/`) y el bloque técnico (en `tecnica/`).

| Pedido de la materia | Archivo | Estado |
|---|---|---|
| Alcance funcional | `Alcance-funcional.md` | Listo |
| Requerimientos funcionales | `Requerimientos-funcionales.md` | Listo |
| Historias de usuario | `Historias-de-usuario.md` | Listo |
| Supuestos y decisiones de negocio | `02-Supuestos-y-decisiones.md` | Pendiente |
| Incrementos de los sprints | ver `sprints/` | En curso |
| Modelo de datos | `tecnica/Diagrama-DER.md` | Listo |
| Diseño de APIs | — | Pendiente |
| Testing y automatización | — | Pendiente |

## tecnica/

- `Diagrama-DER.md` — modelo lógico (Crow’s Foot), alineado a `backend/prisma/schema.prisma`

## Cómo versionar

Cada Markdown del equipo lleva **Versión** y **Actualizado** arriba, y un **Historial** al final.

- **Minor** (`1.0` → `1.1`): se agrega o corrige contenido (una sección, un RF, una HU, un cambio de modelo).
- **Major** (`1.0` → `2.0`): se reestructura el documento o cambian IDs / el esquema del doc.
- No se versionan las fuentes de la materia (`Enunciado.txt`, `Cronograma.txt`, `Caracteristicas-de-la-materia.txt`) ni los `.docx`.

Al editar un doc: subir la versión, poner la fecha de hoy y agregar una fila al historial. Cursor lo hace si el cambio pasa por el agente.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 07/09/2026 | Organización de `docs/` y convención de versionado |
