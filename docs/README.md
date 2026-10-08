# Documentación

**Versión:** 1.4  
**Actualizado:** 07/10/2026

La carpeta está partida para no mezclar material de trabajo, sprints, carpeta de la materia y docs técnicos.

| Carpeta | Para qué | Quién lo usa |
|---|---|---|
| [`interno/`](interno/) | Material de la materia y notas del equipo | Nosotros |
| [`sprints/`](sprints/) | Fichas, incrementos y reparto de cada sprint | Equipo y review |
| [`entregables/`](entregables/) | Documentos de la carpeta (lo que pide la materia) | Entrega |
| [`tecnica/`](tecnica/) | Contratos con ejemplo de JSON y diagrama de trabajo | Desarrollo |

## interno/

Fuentes de la materia y docs que no se entregan como carpeta.

- `Enunciado.txt` — enunciado del TP
- `Cronograma.txt` — fechas de planning y review
- `Caracteristicas-de-la-materia.txt` — cómo se cursa y qué hay que presentar
- `01-Analisis-inicial-y-planning-Sprint-1.md` — análisis y planning del 20/08
- `prompts.txt` — prompts de trabajo con IA

## sprints/

Un archivo por sprint. El resumen de incrementos para la carpeta está en `entregables/`. Las fichas guardan el planning y el reparto.

- `Ficha-Sprint-1.md` / `.docx`
- `Ficha-Sprint-2.md` / `.docx`
- `Ficha-Sprint-3.md`
- `Ficha-Sprint-4.md` / `.docx`
- `Plan-reparto-Sprint-1.md`
- `Plan-reparto-Sprint-2.md`

## entregables/

La carpeta que pide la materia, al día del cierre del Sprint 3 (07/10/2026). **Lo que se entrega es el Word** (`.docx`). El Markdown es la fuente: si se edita, hay que volver a exportar.

```bash
python docs/interno/exportar-entregables-docx.py
```

| Pedido de la materia | Word | Fuente |
|---|---|---|
| Alcance funcional | `Alcance funcional.docx` | `Alcance-funcional.md` |
| Supuestos y decisiones de negocio | `Supuestos y decisiones de negocio.docx` | `Supuestos-y-decisiones.md` |
| Requerimientos funcionales | `Requerimientos funcionales.docx` | `Requerimientos-funcionales.md` |
| Historias de usuario | `Historias de usuario.docx` | `Historias-de-usuario.md` |
| Incrementos de los sprints | `Incrementos de los sprints.docx` | `Incrementos-de-los-sprints.md` |
| Modelo de datos | `Modelo de datos.docx` | `Modelo-de-datos.md` |
| Diseño de APIs | `Diseño de APIs.docx` | `Diseno-de-APIs.md` |
| Testing y automatización | `Testing y automatización.docx` | `Testing-y-automatizacion.md` |

Las fichas de cada sprint siguen en `sprints/` (el detalle del planning). Los contratos con ejemplo de JSON siguen en `tecnica/`.

## tecnica/

- `Diagrama-DER.md` — diagrama del Sprint 2. El modelo vigente está en `entregables/Modelo-de-datos.md`
- `API-pedidos-cliente.md` — ejemplos de historial, seguimiento, cancelar y repetir
- `API-sprint-3.md` — ejemplos de stock, parámetros, perfil, reset y sucursales disponibles

## Cómo versionar

Cada Markdown del equipo lleva **Versión** y **Actualizado** arriba, y un **Historial** al final.

- **Minor** (`1.0` → `1.1`): se agrega o corrige contenido (una sección, un RF, una HU, un cambio de modelo).
- **Major** (`1.0` → `2.0`): se reestructura el documento o cambian IDs / el esquema del doc.
- No se versionan las fuentes de la materia (`Enunciado.txt`, `Cronograma.txt`, `Caracteristicas-de-la-materia.txt`) ni los `.docx`.

Al editar un doc: subir la versión, poner la fecha de hoy y agregar una fila al historial. Cursor lo hace si el cambio pasa por el agente.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.4 | 07/10/2026 | La ficha del Sprint 4 también está en Word |
| 1.3 | 07/10/2026 | Los ocho entregables también están en Word (`.docx`) |
| 1.2 | 07/10/2026 | Entra la ficha del Sprint 4. `entregables/` cubre los ocho documentos de la materia, al cierre del Sprint 3 |
| 1.1 | 24/09/2026 | Índice: entra `Ficha-Sprint-3.md` |
| 1.0 | 07/09/2026 | Organización de `docs/` y convención de versionado |
