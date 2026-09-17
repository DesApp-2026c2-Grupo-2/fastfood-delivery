# Plan de reparto — Sprint 2

**Proyecto:** Mordi (pedidos en casas de comidas rápidas)  
**Versión:** 1.0  
**Actualizado:** 17/09/2026  
**Equipo:** Carla, Nicolas, Lucas, Celeste, Rafael  
**Sprint:** 2 de 5  
**Review:** 24/09/2026  
**Corte:** 23/09/2026 23:59 (solo cuenta lo mergeado a `main`)

Foco del sprint: ciclo de vida del pedido (HU-09 a HU-13) + devolución del Sprint 1 (DEV-01 a DEV-11).  
Si el tiempo no alcanza: no se recorta el admin de pedidos ni el API. Lo último es DEV-10 (adicionales).

---

## 1. Qué ya está (no rehacer)

- Pedido se confirma y queda `pending`
- Sucursal activa más cercana
- Admin: categorías, productos, sucursales
- Cliente: catálogo, carrito, checkout, direcciones (lat/lng a mano)
- JWT cliente y admin

Arrancar desde `main` actualizado. No reabrir el catálogo ABM ni el checkout salvo para DEV-07 (validaciones).

---

## 2. Reparto

| Integrante | Frente | Historias / DEV | Rama |
|---|---|---|---|
| **Carla** | Admin pedidos | HU-13 (UI), DEV-01 | `feat/carla-admin-pedidos` |
| **Nicolas** | Backend | HU-13/10/11/12 (API), DEV-09, DEV-10 (API) | `feat/nicolas-orders-api` |
| **Lucas** | Frontend cliente (chrome + historial) | HU-09, HU-12, DEV-04, DEV-06, DEV-08, DEV-11 | `feat/lucas-orders-cliente` |
| **Celeste** | Frontend cliente (seguimiento) | HU-10 (UI), DEV-05, DEV-07, DEV-10 (UI) | `feat/celeste-seguimiento` |
| **Rafael** | Geo, direcciones, cancelar, docs | HU-11 (UI), DEV-02, DEV-03 + carpeta | `feat/rafael-geo-cancelar` |

---

## 3. Qué hace cada uno

### Carla — Admin pedidos

**Entrega**

- `/admin/orders` y `/admin/orders/:id`
- Listado con filtro por estado
- Botón de **siguiente estado válido** y cancelar (`pending` / `confirmed`)
- Timeline visible en el detalle
- **DEV-01:** admin usable en celular; el menú actual se cambia (no un hamburger ilegible)

**Toca**

- `backend/admin/` (pantallas, layout, nav)
- Endpoints admin de orders **solo si** hace falta un ajuste de UI; el CRUD lo hace Nicolas

**No toca:** `/frontend` (app cliente).

**Depende de:** Nicolas (`GET /api/admin/orders`, `POST .../status`).

---

### Nicolas — Backend

**Entrega**

- Tabla `OrderStatusHistory` (al crear el pedido, primer evento `pending`)
- Transiciones de la ficha (409 si el salto no es válido)
- `GET /api/orders`, `GET /api/orders/:id` (sucursal, estado, timeline, ETA)
- `POST /api/orders/:id/cancel`, `POST /api/orders/:id/repeat`
- `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `POST /api/admin/orders/:id/status`
- Tests: transición ok, transición inválida, cancel ok / no ok
- **DEV-09:** token (expiración, 401, header `Authorization`)
- **DEV-10 (API):** adicionales de hamburguesa (modelo + payload en carrito/pedido)

**Toca**

- `backend/prisma/`
- `backend/src/orders/`
- `backend/src/cart/` si el repeat y los extras lo piden
- `backend/src/auth/` para DEV-09
- `backend/test/`

**No toca:** pantallas React.

**Prioridad:** mergear el modelo y los GET **antes** que el resto integre. Sin esto se bloquean Carla, Lucas y Celeste.

---

### Lucas — Frontend cliente (chrome + historial)

**Entrega**

- `/orders` listado (HU-09)
- Repetir pedido → carrito (HU-12)
- **DEV-04:** carrito con más aire entre ítems
- **DEV-06:** al agregar, volver al catálogo (“Seguir comprando”); badge de cantidad en el carrito
- **DEV-08:** logueado muestra **Hola {nombre}**; Salir borra el token de verdad
- **DEV-11:** bottom bar en mobile (catálogo, carrito, pedidos/cuenta)

**Toca**

- `frontend/src/layouts/ClientLayout.tsx` (es dueño del chrome)
- `frontend/src/pages/client/` de listado de pedidos, carrito, detalle de producto solo para el CTA de agregar
- `frontend/src/auth/session.ts` si hace falta leer el nombre

**No toca:** admin, Prisma, `/orders/:id` (eso es Celeste).

**Depende de:** Nicolas (`GET /api/orders`, `POST .../repeat`).

---

### Celeste — Seguimiento cliente

**Entrega**

- `/orders/:id`: sucursal, estado en español, timeline, ETA (HU-10)
- **DEV-05:** botón volver al menú, separado del header
- **DEV-07:** validaciones en JS (login, registro, checkout) con mensajes visibles; no solo `required` HTML
- **DEV-10 (UI):** extras de hamburguesa en el detalle, usando el API de Nicolas

**Toca**

- `frontend/src/pages/client/` de detalle de pedido, producto, login, register, checkout
- No reescribe `ClientLayout` (Lucas)

**No toca:** admin, Prisma.

**Depende de:** Nicolas (`GET /api/orders/:id`). Dejar un lugar en el detalle para el botón cancelar de Rafael.

---

### Rafael — Geo, direcciones, cancelar, docs

**Entrega**

- **DEV-02:** al cargar dirección, pedir permiso de geolocalización; si niega, se puede seguir a mano
- **DEV-03:** rediseño de `/account/addresses`
- HU-11: cancelar desde `/orders/:id` si el estado es `pending` o `confirmed` (mensaje si el API da 409)
- Docs: ficha / RF si se cierra un supuesto

**Toca**

- `frontend/src/pages/client/AddressesPage.tsx`
- Botón cancelar en el detalle de pedido (coordinar con Celeste)
- `docs/`

**No toca:** admin, schema Prisma (salvo que Nicolas pida una mano).

**Depende de:** Nicolas (`POST /api/orders/:id/cancel`).

---

## 4. Cómo no pisarse

1. Cada uno en **su rama**. `main` solo por merge.
2. UI en **español**. Código, tablas, JSON y URLs en **inglés**.
3. **Nicolas mergea primero** el modelo + GET de orders.
4. **Lucas es dueño de `ClientLayout`.** Celeste y Rafael no lo reescriben.
5. **Celeste es dueña de `/orders/:id`.** Rafael solo agrega el botón cancelar.
6. **Carla no entra a `/frontend`.**
7. Pull de `main` al empezar el día.

```bash
git checkout main
git pull
git checkout -b feat/<nombre>-<frente>
```

---

## 5. Calendario

| Fecha | Qué |
|---|---|
| **17/09** | Nicolas: modelo + GET. El resto arranca UI contra el contrato |
| 18/09 – 21/09 | Cada frente en su rama; PRs chicos |
| **22/09** | Integración: demo de la ficha (sección 5) en `main` |
| **23/09 23:59** | Corte |
| **24/09** | Review |

---

## 6. Checklist de arranque

- [ ] `main` al día
- [ ] Cada uno: rama propia
- [ ] Docker + backend + frontend + admin corriendo
- [ ] Contrato JSON de `GET /orders/:id` escrito (Nicolas) y pegado en el grupo
