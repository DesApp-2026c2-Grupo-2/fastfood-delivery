# Incrementos de los sprints

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Versión:** 1.0  
**Actualizado:** 07/10/2026  
**Estado:** Sprints 1, 2 y 3 entregados. Sprint 4 planificado (review 29/10). Sprint 5 todavía en visión.  
**Detalle de planning:** `docs/sprints/Ficha-Sprint-1.md`, `Ficha-Sprint-2.md`, `Ficha-Sprint-3.md`, `Ficha-Sprint-4.md`

Cada incremento es un hilo que se puede demostrar, no una lista de pantallas sueltas. Solo cuenta lo que está en `main` antes de las 23:59 del día anterior al review.

| Sprint | Planning | Corte | Review | Estado |
|---|---|---|---|---|
| 1 | 20/08/2026 | 09/09 23:59 | 10/09 | Entregado |
| 2 | 10/09/2026 | 23/09 23:59 | 24/09 | Entregado |
| 3 | 24/09/2026 | 07/10 23:59 | 08/10 | Entregado |
| 4 | 08/10/2026 | 28/10 23:59 | 29/10 | Planificado. Medio término 22/10 |
| 5 | 29/10/2026 | 18/11 23:59 | 19/11 | Visión. Carpeta 12/11, demo final 27/11 |

---

## Sprint 1 — el pedido se puede crear

**Review:** 10/09/2026. **16 RF, 40% de la base. 40 puntos** (HU-01 a HU-08).

Un administrador carga el menú y una sucursal. Un cliente (o un invitado) arma el carrito y confirma. El pedido queda con sucursal activa más cercana, dirección, detalle, importe y estado `pending`.

Entra: registro y login, admin inicial y app aparte, ABM de categorías, productos y sucursales, catálogo, direcciones con lat/lng, carrito y confirmación.

No entra todavía: estados, seguimiento, historial, stock, promociones, reportes.

## Sprint 2 — el pedido llega a entregarse

**Review:** 24/09/2026. **25 puntos** (HU-09 a HU-13).

El admin mueve el pedido por la máquina de estados y cada cambio queda con fecha y hora. El cliente ve sucursal, estado, timeline y ETA, cancela si todavía se puede, consulta el historial y repite un pedido. La hamburguesa acepta adicionales.

También cierra la devolución del Sprint 1: admin usable en el celular, geolocalización al cargar una dirección, carrito con aire, bottom bar, sesión con nombre y salida, token que expira, validaciones en JavaScript.

La asignación sigue siendo la activa más cercana, sin radio. La ETA de este sprint todavía se recalcula; el Sprint 3 la fija.

## Sprint 3 — el negocio opera con stock y cuenta

**Review:** 08/10/2026. **26 puntos** (HU-14 a HU-19), más la devolución del Sprint 2.

Se puede demostrar:

1. El admin carga stock por sucursal, ajusta el radio y las constantes de ETA, y crea otro administrador.
2. El cliente completa el perfil, recupera la contraseña con un token demo y ve las sucursales que lo cubren.
3. Al confirmar, si no hay cobertura o no hay stock, el pedido no se crea. Si hay stock, queda reservado.
4. Cancelar libera la reserva. Entregar la descuenta.
5. El seguimiento muestra la hora estimada fija y, si se pasó, la demora. El admin ve el código completo del pedido.
6. Repetir con el carrito ocupado suma los ítems, no los reemplaza.

Devolución incluida: color propio de Pendiente, código completo, hora y demora, “Agregar al carrito”, y los adicionales reales separados de las observaciones.

Con este sprint quedan cubiertos **35 de 40** RF obligatorios y el stock de la Extensión 1 (`RF-STK-01` a `RF-STK-04`).

## Sprint 4 — precio promocional y reportes de productos

**Review:** 29/10/2026. Medio término **22/10** (el hilo de promo tiene que estar en `main` el 21/10). **18 puntos** (HU-20 a HU-22). Todavía no está construido.

El admin da de alta una promoción automática y un cupón. Al confirmar, se aplica **una** promoción vigente y el pedido guarda subtotal, descuento y total. Los reportes de productos muestran más vendidos, menos vendidos, sin stock y mayor facturación.

Reglas ya cerradas en `Supuestos-y-decisiones.md` (D46 a D52) y en la ficha: porcentual, monto fijo o 2x1; cupón reutilizable; sin combos ni envío gratis.

## Sprint 5 — reportes extra y cierre

**Review:** 19/11/2026. Carpeta final 12/11. Demo 27/11.

Entra, cuando se planifique la ficha: reportes de pedidos, clientes, sucursales y promociones (`RF-RPT-10` a `RF-RPT-22`) y, si hay tiempo, la alerta de stock mínimo (`RF-STK-05`). También el pulido de testing y de esta carpeta.

No se recorta, una vez abierto, el flujo de pedido ni el stock en el checkout. Si hay que recortar: mapa, Extensión 2 y la alerta de stock.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 07/10/2026 | Incrementos 1 a 3 como entregados y 4 a 5 como lo que falta |
