# Plan de reparto — Sprint 2

**Proyecto:** Mordi (pedidos en casas de comidas rápidas)  
**Versión:** 1.1  
**Actualizado:** 17/09/2026  
**Equipo:** Carla, Nicolas, Lucas, Celeste, Rafael  
**Sprint:** 2 de 5  
**Review:** 24/09/2026  
**Corte:** 23/09/2026 23:59 (solo cuenta lo mergeado a `main`)

Foco del sprint: ciclo de vida del pedido (HU-09 a HU-13) **y** cerrar lo pendiente del review del Sprint 1 (DEV-01 a DEV-11).  
Si el tiempo no alcanza: no se recorta el admin de pedidos ni el API. De la devolución, lo último es DEV-10 (adicionales).

---

## 1. Qué ya está (no rehacer)

- Pedido se confirma y queda `pending`
- Sucursal activa más cercana
- Admin: categorías, productos, sucursales
- Cliente: catálogo, carrito, checkout, direcciones (lat/lng a mano)
- JWT cliente y admin

Arrancar desde `main` actualizado. No reabrir el catálogo ABM ni el checkout salvo para DEV-07 (validaciones).

---

## 2. Pendiente del Sprint 1 — quién lo resuelve

Esto es la devolución del review. Cada ítem tiene dueño.

| ID | Qué quedó mal / faltó | Dueño | Cómo se resuelve |
|---|---|---|---|
| DEV-01 | Admin no es usable en celular; hay que cambiar el menú | **Carla** | Rediseñar nav/layout en `backend/admin` |
| DEV-02 | Lat/lng se cargan a mano | **Rafael** | Pedir permiso de geolocalización; si niega, seguir a mano |
| DEV-03 | Diseño de direcciones | **Rafael** | Rearmar `/account/addresses` |
| DEV-04 | Carrito: elementos muy pegados | **Lucas** | Más aire entre ítems, total y acciones |
| DEV-05 | Botón volver al menú, pegado al header | **Celeste** | Separarlo del topbar en el detalle de producto |
| DEV-06 | Al agregar no volvés al menú; el carrito no muestra cantidad | **Lucas** | “Seguir comprando” → `/products`; badge en el header |
| DEV-07 | Validaciones solo con `required` HTML | **Celeste** | Validar login, registro y checkout en JS, con mensajes |
| DEV-08 | Salir no cierra la sesión; no se ve el nombre | **Lucas** | “Hola {nombre}”; Salir borra el token |
| DEV-09 | Asunto del token | **Nicolas** | JWT en `Authorization`, persistencia, 401 → login |
| DEV-10 | Adicionales de la hamburguesa | **Nicolas** (API) + **Celeste** (UI) | Extras al agregar al carrito |
| DEV-11 | Menú mobile tiene que ser bottom bar | **Lucas** | Barra inferior: catálogo, carrito, pedidos/cuenta |

Por persona, el pendiente S1 es:

| Integrante | Ítems DEV que cierra |
|---|---|
| **Carla** | DEV-01 |
| **Nicolas** | DEV-09, DEV-10 (API) |
| **Lucas** | DEV-04, DEV-06, DEV-08, DEV-11 |
| **Celeste** | DEV-05, DEV-07, DEV-10 (UI) |
| **Rafael** | DEV-02, DEV-03 |

---

## 3. Frente nuevo (ciclo de vida)

| Integrante | Frente | Historias | Rama |
|---|---|---|---|
| **Carla** | Admin pedidos | HU-13 (UI) | `feat/carla-admin-pedidos` |
| **Nicolas** | Backend | HU-13/10/11/12 (API) | `feat/nicolas-orders-api` |
| **Lucas** | Frontend cliente (chrome + historial) | HU-09, HU-12 | `feat/lucas-orders-cliente` |
| **Celeste** | Frontend cliente (seguimiento) | HU-10 (UI) | `feat/celeste-seguimiento` |
| **Rafael** | Cancelar + docs | HU-11 (UI) | `feat/rafael-geo-cancelar` |

---

## 4. Qué hace cada uno

### Carla — Admin pedidos

**Pendiente Sprint 1**

- [ ] **DEV-01** — Admin usable en celular; cambiar el menú (no el nav actual)

**Frente nuevo**

- `/admin/orders` y `/admin/orders/:id`
- Listado con filtro por estado
- Botón de **siguiente estado válido** y cancelar (`pending` / `confirmed`)
- Timeline visible en el detalle

**Toca**

- `backend/admin/` (pantallas, layout, nav)
- Endpoints admin de orders **solo si** hace falta un ajuste de UI; el CRUD lo hace Nicolas

**No toca:** `/frontend` (app cliente).

**Depende de:** Nicolas (`GET /api/admin/orders`, `POST .../status`).

---

### Nicolas — Backend

**Pendiente Sprint 1**

- [ ] **DEV-09** — JWT en `Authorization`, persistencia, 401 → login
- [ ] **DEV-10 (API)** — adicionales de hamburguesa (modelo + payload en carrito/pedido)

**Frente nuevo**

- Tabla `OrderStatusHistory` (al crear el pedido, primer evento `pending`)
- Transiciones de la ficha (409 si el salto no es válido)
- `GET /api/orders`, `GET /api/orders/:id` (sucursal, estado, timeline, ETA)
- `POST /api/orders/:id/cancel`, `POST /api/orders/:id/repeat`
- `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `POST /api/admin/orders/:id/status`
- Tests: transición ok, transición inválida, cancel ok / no ok

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

**Pendiente Sprint 1**

- [ ] **DEV-04** — carrito con más aire entre ítems
- [ ] **DEV-06** — al agregar, volver al catálogo (“Seguir comprando”); badge de cantidad en el carrito
- [ ] **DEV-08** — logueado muestra **Hola {nombre}**; Salir borra el token de verdad
- [ ] **DEV-11** — bottom bar en mobile (catálogo, carrito, pedidos/cuenta)

**Frente nuevo**

- `/orders` listado (HU-09)
- Repetir pedido → carrito (HU-12)

**Toca**

- `frontend/src/layouts/ClientLayout.tsx` (es dueño del chrome)
- `frontend/src/pages/client/` de listado de pedidos, carrito, detalle de producto solo para el CTA de agregar
- `frontend/src/auth/session.ts` si hace falta leer el nombre

**No toca:** admin, Prisma, `/orders/:id` (eso es Celeste).

**Depende de:** Nicolas (`GET /api/orders`, `POST .../repeat`).

---

### Celeste — Seguimiento cliente

**Pendiente Sprint 1**

- [ ] **DEV-05** — botón volver al menú, separado del header
- [ ] **DEV-07** — validaciones en JS (login, registro, checkout) con mensajes visibles
- [ ] **DEV-10 (UI)** — extras de hamburguesa en el detalle, usando el API de Nicolas

**Frente nuevo**

- `/orders/:id`: sucursal, estado en español, timeline, ETA (HU-10)

**Toca**

- `frontend/src/pages/client/` de detalle de pedido, producto, login, register, checkout
- No reescribe `ClientLayout` (Lucas)

**No toca:** admin, Prisma.

**Depende de:** Nicolas (`GET /api/orders/:id`). Dejar un lugar en el detalle para el botón cancelar de Rafael.

---

### Rafael — Geo, direcciones, cancelar, docs

**Pendiente Sprint 1**

- [ ] **DEV-02** — al cargar dirección, pedir permiso de geolocalización; si niega, se puede seguir a mano
- [ ] **DEV-03** — rediseño de `/account/addresses`

**Frente nuevo**

- HU-11: cancelar desde `/orders/:id` si el estado es `pending` o `confirmed` (mensaje si el API da 409)
- Docs: ficha / RF si se cierra un supuesto

**Toca**

- `frontend/src/pages/client/AddressesPage.tsx`
- Botón cancelar en el detalle de pedido (coordinar con Celeste)
- `docs/`

**No toca:** admin, schema Prisma (salvo que Nicolas pida una mano).

**Depende de:** Nicolas (`POST /api/orders/:id/cancel`).

---

## 5. Cómo no pisarse

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

## 6. Calendario

| Fecha | Qué |
|---|---|
| **17/09** | Nicolas: modelo + GET. El resto arranca UI contra el contrato |
| 18/09 – 21/09 | Cada frente en su rama; PRs chicos |
| **22/09** | Integración: demo de la ficha (sección 5) en `main` |
| **23/09 23:59** | Corte |
| **24/09** | Review |

---

## 7. Checklist de arranque

- [ ] `main` al día
- [ ] Cada uno: rama propia
- [ ] Docker + backend + frontend + admin corriendo
- [ ] Contrato JSON de `GET /orders/:id` escrito (Nicolas) y pegado en el grupo
