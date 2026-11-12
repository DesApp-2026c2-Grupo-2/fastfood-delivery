# Documentación

**Versión:** 1.12  
**Actualizado:** 12/11/2026

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
- `Plan-reparto-Sprint-4.md`

## entregables/

**Lo que se entrega el 12/11 es un solo PDF:** `Mordi-Carpeta-Grupo2.pdf`. Tiene portada con los cinco integrantes e índice, y adentro los ocho documentos de la materia, cada uno desde una hoja nueva. Sale de `Carpeta.md`. Los ocho Markdown sueltos (`Alcance-funcional.md`, `Supuestos-y-decisiones.md`, `Requerimientos-funcionales.md`, `Historias-de-usuario.md`, `Incrementos-de-los-sprints.md`, `Modelo-de-datos.md`, `Diseno-de-APIs.md`, `Testing-y-automatizacion.md`) dicen lo mismo que esa carpeta, versión 2.5.

El Markdown es la fuente. La carpeta que se sube se genera así (hace falta Word para el PDF):

```bash
python docs/interno/exportar-entregables-docx.py --carpeta
```

Eso escribe `Mordi-Carpeta-Grupo2.docx` y `Mordi-Carpeta-Grupo2.pdf`, con portada e índice. Los ocho Word de esta entrega salen con `--documentos`, en `entregables/entrega-12-11/`. El comando sin argumentos regenera los ocho Word sueltos desde los Markdown de `entregables/`, que están alineados con `Carpeta.md`.

| Qué se sube | PDF | Fuente |
|---|---|---|
| Carpeta completa (alcance, decisiones, requerimientos, historias, incrementos, modelo, APIs y testing) | `Mordi-Carpeta-Grupo2.pdf` | `Carpeta.md` |

Esas ocho partes van como secciones de `Carpeta.md` y, con el mismo texto, en el Markdown de cada una.

Las fichas de cada sprint siguen en `sprints/` (el detalle del planning). Los contratos con ejemplo de JSON siguen en `tecnica/`.

## tecnica/

- `Diagrama-DER.md` — diagrama del Sprint 2. El modelo vigente está en `entregables/Modelo-de-datos.md` y en la sección homónima de `Carpeta.md`
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
| 1.12 | 12/11/2026 | La carpeta que se entrega es la 2.5 |
| 1.11 | 11/11/2026 | El PDF de la entrega se llama `Mordi-Carpeta-Grupo2.pdf` |
| 1.10 | 11/11/2026 | Los ocho Markdown de `entregables/` quedan alineados con `Carpeta.md` 2.2 |
| 1.9 | 11/11/2026 | Los ocho Word de la entrega 12/11 quedan en `entregables/entrega-12-11/`, aparte de `Carpeta.pdf` |
| 1.8 | 11/11/2026 | `Carpeta.pdf` reúne los ocho documentos, cada uno en su hoja, y la portada lista a los cinco integrantes |
| 1.7 | 11/11/2026 | La entrega del 12/11 es `Carpeta.pdf`, un solo documento con portada e índice |
| 1.6 | 11/11/2026 | La entrega del 12/11 es `Carpeta.docx`, un solo documento del producto |
| 1.5 | 12/10/2026 | Reparto del Sprint 4: dos días por persona (`Plan-reparto-Sprint-4.md`) |
| 1.4 | 07/10/2026 | La ficha del Sprint 4 también está en Word |
| 1.3 | 07/10/2026 | Los ocho entregables también están en Word (`.docx`) |
| 1.2 | 07/10/2026 | Entra la ficha del Sprint 4. `entregables/` cubre los ocho documentos de la materia, al cierre del Sprint 3 |
| 1.1 | 24/09/2026 | Índice: entra `Ficha-Sprint-3.md` |
| 1.0 | 07/09/2026 | Organización de `docs/` y convención de versionado |
