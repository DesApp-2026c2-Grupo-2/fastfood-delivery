# Presentaciones

**Versión:** 1.3
**Actualizado:** 22/11/2026

## Pitch comercial (7 minutos)

Hay dos HTML con el mismo contenido y controles:

| Archivo | Cuándo usarlo |
|---|---|
| [presentacion-logo.html](presentacion-logo.html) | **Principal.** Usa el logo real de la app (`logo-mordi.png` desde mordi-web). Hace falta conexión. |
| [presentacion.html](presentacion.html) | **Respaldo offline.** Logo en SVG inline; se abre con doble clic sin internet. |

- **Duración:** 8 diapositivas, unos 50 segundos cada una.
- **Público:** profesores como evaluadores y como posibles clientes. El texto habla de negocio, no de tecnología.
- **Sala a oscuras:** fondo oscuro con la paleta naranja de Mordi.

| Nº | Diapositiva | Qué se dice |
|---|---|---|
| 1 | Mordi | Marca y propuesta en una frase |
| 2 | El problema | Pedidos dispersos, clientes que no vuelven, decisiones a ciegas |
| 3 | La solución | Un solo sistema, del pedido a la recompra |
| 4 | Reclamos con cupón | El reclamo resuelto deja un cupón para volver |
| 5 | Beneficio Mordi | Sellos, Premio Fidelidad y Top 3 |
| 6 | Reportes estratégicos | Tablero del día y reportes para decidir |
| 7 | Impacto comercial | Retención, frecuencia, margen y cierre de valor |
| 8 | Probalo ahora | Las dos demos: mordi-web y mordi-admin |

Controles:

| Acción | Cómo |
|---|---|
| Avanzar | `→`, `Espacio`, `AvPág` o el botón de la esquina |
| Retroceder | `←`, `Mayús + Espacio` o `RePág` |
| Saltar a una diapositiva | Clic en su número en la barra inferior, o las teclas `1` a `8` |
| Primera y última | `Inicio` y `Fin` |
| Pantalla completa | `F` o el botón de la esquina. `Esc` para salir |

La dirección guarda el número de diapositiva (`presentacion.html#5`), así que recargar no vuelve al inicio.

**Antes de presentar:** abrí primero `presentacion-logo.html` con conexión. Si el logo no carga, pasá a `presentacion.html`. Los enlaces de la última diapositiva también necesitan red.

«Beneficio Mordi» es el nombre comercial que usa el pitch para la fidelización por sellos. En la aplicación y en la carpeta figura como sellos, Premio Fidelidad y Top 3.

## Medio término 22/10/2026

- **Archivo:** [Mordi-Medio-Termino-22-10.pptx](Mordi-Medio-Termino-22-10.pptx) — subir a Drive para editar en equipo.
- **Capturas:** `assets/medio-termino-22-10/` (desde deploy: mordi-web / mordi-admin).
- **Regenerar PPTX:** `python docs/presentaciones/build_pptx.py`
- **Notas del orador:** incluidas en cada diapositiva (Vista → Notas).

Duración objetivo de slides: ~15 min. Al final, pasar a la demo en vivo.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.3 | 22/11/2026 | Alta de `presentacion-logo.html` con logo de la app desplegada; SVG queda de respaldo |
| 1.2 | 22/11/2026 | Diapositiva 7: reemplaza inversión sin precio por cierre de valor |
| 1.1 | 22/11/2026 | Alta del pitch comercial de 7 minutos en `presentacion.html`, con sus controles |
| 1.0 | 20/10/2026 | Versión inicial: presentación de medio término |
