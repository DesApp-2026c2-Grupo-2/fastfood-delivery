# Historias de usuario

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Versión:** 1.0 (07/09/2026)  
**Estado:** núcleo del Sprint 1 especificado; el resto es backlog de producto.  
**Relacionados:** `Alcance-funcional.md`, `Requerimientos-funcionales.md`, `Ficha-Sprint-1.md`

---

## 1. Cómo leer este documento

Formato: *Como [actor], quiero [acción], para [beneficio].*

| Campo | Significado |
|---|---|
| ID | Identificador estable (`HU-xx`). No se reutiliza. |
| Épica | Agrupa historias del mismo bloque de negocio. |
| RF | Requerimientos que cubre. Un RF puede exigir más de una HU. |
| Sprint | Cuándo se planea. El Sprint 1 es compromiso de review 10/09. |
| Puntos | Solo en Sprint 1 (total 40 pts = 40% del backlog base). |

**Definición de terminada (DoD) de cada HU del Sprint 1:** funciona en frontend y backend, usable en viewport mobile, mergeada a `main` antes del **09/09/2026 23:59**.

Convención: UI en español; rutas y API en inglés.

---

## 2. Actores

| Actor | Quién es |
|---|---|
| Visitante | Persona sin cuenta. Puede registrarse, ver el catálogo y, como extra del grupo, confirmar un pedido invitado. |
| Cliente | Usuario autenticado con rol `customer`. |
| Administrador | Usuario autenticado con rol `admin`. |
| Sistema | Comportamiento automático (seed, total del carrito, asignación de sucursal). |

---

## 3. Épicas

| Épica | Nombre | Qué cubre |
|---|---|---|
| E1 | Identidad | Registro, sesión, perfil, recuperar contraseña, admin inicial |
| E2 | Catálogo | ABM categorías/productos y consulta del menú |
| E3 | Sucursales y geo | ABM sucursales, direcciones, asignación |
| E4 | Carrito y pedido | Carrito, confirmación, estados, cancelación |
| E5 | Seguimiento e historial | Timeline, ETA, repetir pedido |
| E6 | Administración extendida | Pedidos en backoffice, stock, promos, parámetros, más admins |
| E7 | Reportes | Reportes base y extras de Extensión 1 |
| E8 | Extensión 1 | Stock en checkout y aplicación de promociones |

La Extensión 2 no tiene épica: está fuera de compromiso (`docs/Alcance-funcional.md` §3).

---

## 4. Sprint 1 — núcleo (40 pts)

Ocho historias. Si el flujo de pedido no cierra, el sprint no está cumplido aunque otras pantallas estén a medias.

### HU-01 — Registro e inicio de sesión (cliente) — 5 pts

*Como visitante, quiero registrarme e iniciar sesión, para usar la app como cliente.*

**Épica:** E1 · **RF:** RF-CLI-01, RF-CLI-02  
**Rutas:** `/register`, `/login`  
**API:** `POST /api/auth/register`, `POST /api/auth/login`

**Criterios de aceptación**

1. Puedo crear una cuenta con nombre, email y contraseña y quedo autenticado como `customer`.
2. Puedo iniciar sesión con esas credenciales y se mantiene la sesión (JWT).
3. Credenciales inválidas muestran un error y no entra.
4. Un cliente no entra a la app administrativa.
5. El catálogo y el carrito se pueden usar sin cuenta (decisión de grupo). Las direcciones guardadas sí piden sesión.

### HU-02 — Admin inicial y backoffice — 5 pts

*Como administrador, quiero un usuario seed e iniciar sesión en la app de administración, para cargar el menú.*

**Épica:** E1 · **RF:** RF-ADM-01, RF-ADM-02, RF-ADM-04  
**Rutas:** `/admin/login`, `/admin`  
**API:** `POST /api/auth/login` (rol `admin`)

**Criterios de aceptación**

1. El sistema nace con un administrador precargado (seed documentado).
2. Ese usuario inicia sesión en `/admin/login` y ve el home del backoffice.
3. Un cliente no accede a las rutas ni a los endpoints `/api/admin/*`.
4. La app de administración es independiente de la de clientes (otro SPA, misma API y misma BD).

### HU-03 — ABM de categorías y productos — 8 pts

*Como administrador, quiero crear y editar categorías y productos, para armar el catálogo.*

**Épica:** E2 · **RF:** RF-CAT-01, RF-CAT-02  
**Rutas:** `/admin/categories`, `/admin/products`  
**API:** CRUD `/api/admin/categories`, `/api/admin/products`

**Criterios de aceptación**

1. Alta, listado y edición de categoría.
2. No se puede borrar una categoría que tenga productos (409).
3. Producto con nombre, descripción, categoría, precio, imagen (URL) y disponible sí/no.
4. Un producto con `available=false` no se ofrece en el catálogo del cliente.

### HU-04 — Consultar catálogo — 3 pts

*Como cliente, quiero ver productos por categoría, para armar un pedido.*

**Épica:** E2 · **RF:** RF-CAT-03  
**Rutas:** `/products`, `/products/:id`  
**API:** `GET /api/categories`, `GET /api/products`, `GET /api/products/:id`

**Criterios de aceptación**

1. El listado se puede filtrar por categoría.
2. El detalle muestra nombre, precio, descripción e imagen.
3. Solo aparecen productos disponibles.
4. El layout es usable en celular.

### HU-05 — ABM de sucursales — 5 pts

*Como administrador, quiero cargar sucursales con ubicación y horario, para que un pedido tenga un local de origen.*

**Épica:** E3 · **RF:** RF-BRN-01  
**Rutas:** `/admin/branches`  
**API:** CRUD `/api/admin/branches`

**Criterios de aceptación**

1. Se registran nombre, dirección, latitud, longitud, horarios, teléfono y estado activa/inactiva.
2. Una sucursal inactiva no se asigna a pedidos nuevos.
3. Existe al menos una sucursal activa de seed para poder demostrar el checkout.

### HU-06 — Direcciones del cliente — 3 pts

*Como cliente, quiero cargar mis direcciones con ubicación geográfica, para indicar dónde entregar.*

**Épica:** E3 · **RF:** RF-CLI-05, RF-GEO-01 (lat/lng)  
**Rutas:** `/account/addresses`  
**API:** `GET/POST /api/me/addresses`, `PATCH/DELETE /api/me/addresses/:id`

**Criterios de aceptación**

1. Solo un cliente autenticado da de alta y lista sus direcciones.
2. Cada dirección tiene texto + latitud + longitud (carga manual; sin mapa).
3. En el checkout autenticado puedo elegir una dirección guardada como destino.
4. No veo ni edito direcciones de otro cliente.

### HU-07 — Carrito — 5 pts

*Como cliente, quiero agregar, cambiar y quitar productos y ver el total, para controlar lo que voy a pagar.*

**Épica:** E4 · **RF:** RF-CRT-01, RF-CRT-02, RF-CRT-03, RF-CRT-04  
**Rutas:** `/cart`, `/products/:id`  
**API:** `GET /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/:id`  
Carrito de visitante: `localStorage` (`guest_cart`), sin configs especiales.

**Criterios de aceptación**

1. Puedo agregar desde el detalle (cantidad + observaciones).
2. El total es `suma(precio × cantidad)`.
3. Puedo cambiar cantidad, observaciones y quitar ítems antes de confirmar.
4. El carrito de un cliente autenticado sobrevive recargar la página.
5. No hay configuraciones especiales de producto en este sprint.

### HU-08 — Confirmar pedido — 6 pts

*Como cliente, quiero confirmar el pedido, para que quede registrado en el sistema.*

**Épica:** E4 · **RF:** RF-CLI-07, RF-ORD-01, RF-BRN-02 (regla simple del Sprint 1)  
**Rutas:** `/checkout`  
**API:** `POST /api/orders` (autenticado), `POST /api/orders/guest` (extra)

**Criterios de aceptación**

1. Con cuenta: carrito con ítems + dirección guardada → se crea el pedido.
2. Se registran sucursal asignada (activa más cercana), dirección, fecha/hora, detalle, importe y estado `pending`.
3. Tras confirmar, el carrito queda vacío.
4. Si no hay sucursal activa, se muestra error y no se crea el pedido.
5. Extra del grupo: un visitante puede confirmar con nombre, email y dirección puntual. Eso no cubre RF-CLI-05.

**Total Sprint 1: 5+5+8+3+5+3+5+6 = 40 pts**

---

## 5. Backlog de producto (sprints 2 a 5)

Historias listas para estimar en cada planning. No se implementan en Sprint 1.

### Sprint 2 — pedido vivo

| ID | Historia | RF | Épica |
|---|---|---|---|
| HU-09 | *Como cliente, quiero modificar mis datos personales, para mantener mi cuenta al día.* | RF-CLI-04 | E1 |
| HU-10 | *Como cliente, quiero recuperar mi contraseña, para volver a entrar si la olvidé.* | RF-CLI-03 | E1 |
| HU-11 | *Como administrador, quiero crear otros administradores, para no depender de un solo usuario seed.* | RF-ADM-03, RF-ADM-07 | E6 |
| HU-12 | *Como cliente, quiero ver las sucursales disponibles para mi ubicación, para saber quién puede prepararme el pedido.* | RF-BRN-03 | E3 |
| HU-13 | *Como sistema, quiero asignar la sucursal con la estrategia del grupo (cercanía; radio y horario cuando existan parámetros), para que el pedido salga de un local coherente.* | RF-BRN-02, RF-GEO-02 | E3 |
| HU-14 | *Como administrador, quiero cambiar el estado de un pedido y dejar fecha y hora de cada cambio, para moverlo hasta la entrega.* | RF-ORD-02, RF-ORD-03, RF-ADM-10 | E4 / E6 |
| HU-15 | *Como cliente, quiero cancelar un pedido cuando las reglas lo permitan, para no recibirlo si ya no lo necesito.* | RF-ORD-04 | E4 |
| HU-16 | *Como cliente, quiero ver la evolución de mi pedido (sucursal, estado, historial, ETA), para saber qué está pasando.* | RF-TRK-01, RF-TRK-02, RF-TRK-03 | E5 |
| HU-17 | *Como cliente, quiero ver el historial de pedidos con detalle, importe, fecha y estado, para consultar lo que ya pedí.* | RF-CLI-06, RF-HIS-01 | E5 |

**Criterios mínimos a cerrar en el planning del Sprint 2**

- HU-10: flujo demostrable (token) vs correo real.
- HU-13: si el radio de 5 km y el horario de atención entran ya o se dejan para parámetros (HU-22).
- HU-16: fórmula de ETA (`prep_base + ítems + traslado`) con valores fijos hasta que existan parámetros.

### Sprint 3 — stock y operación

| ID | Historia | RF | Épica |
|---|---|---|---|
| HU-18 | *Como cliente, quiero configurar un producto (extras, quitar ingredientes o tamaño) al agregarlo al carrito, para pedir el producto como lo quiero.* | RF-CAT-04, RF-CRT-02 | E2 / E4 |
| HU-19 | *Como administrador, quiero cargar el stock de cada producto por sucursal, para saber qué hay en cada local.* | RF-ADM-06, RF-STK-01, RF-STK-03 | E6 / E8 |
| HU-20 | *Como sistema, quiero verificar y reservar stock al confirmar un pedido, y liberarlo si se cancela, para no vender lo que no hay.* | RF-STK-02, RF-STK-04 | E8 |
| HU-21 | *Como administrador, quiero consultar y filtrar pedidos, para operar el día a día.* | RF-ADM-10 | E6 |
| HU-22 | *Como administrador, quiero consultar y cambiar parámetros y estados generales, para ajustar cobertura, ETA y la máquina de estados sin redeploy.* | RF-ADM-08, RF-ADM-09 | E6 |

### Sprint 4 — promociones y reportes (medio término)

| ID | Historia | RF | Épica |
|---|---|---|---|
| HU-23 | *Como administrador, quiero dar de alta y editar promociones, para ofrecer descuentos o combos.* | RF-ADM-05, RF-PRM-01 | E6 / E8 |
| HU-24 | *Como cliente, quiero que una promoción vigente se aplique al pedido y se vea en el importe, para pagar el precio promocional.* | RF-PRM-02 | E8 |
| HU-25 | *Como administrador, quiero ver productos más/menos vendidos, sin stock y con mayor facturación, para decidir el menú.* | RF-RPT-01 a RF-RPT-04 | E7 |
| HU-26 | *Como cliente, quiero repetir un pedido anterior, para no volver a armar el carrito.* | RF-HIS-02 | E5 |

### Sprint 5 — Extensión 1 extra y cierre

| ID | Historia | RF | Épica |
|---|---|---|---|
| HU-27 | *Como administrador, quiero reportes de pedidos (por día, sucursal, estado, ETA promedio, cancelados), para ver la operación.* | RF-RPT-10 a RF-RPT-14 | E7 |
| HU-28 | *Como administrador, quiero reportes de clientes (más pedidos, nuevos, inactivos), para ver la base.* | RF-RPT-15 a RF-RPT-17 | E7 |
| HU-29 | *Como administrador, quiero reportes de sucursales (ventas, productos, pedidos atendidos), para comparar locales.* | RF-RPT-18 a RF-RPT-20 | E7 |
| HU-30 | *Como administrador, quiero ver promociones más usadas y su impacto en ventas, para decidir cuáles mantener.* | RF-RPT-21, RF-RPT-22 | E7 |
| HU-31 | *Como administrador, quiero una alerta de stock mínimo, para reponer a tiempo.* | RF-STK-05 | E8 |

**Fuera de compromiso (no hay HU de entrega):** mapa (`RF-GEO-03`), Extensión 2 (calificaciones, notificaciones, repartidores).

---

## 6. Trazabilidad HU → RF

| RF | HU que lo cubre | Sprint planeado |
|---|---|---|
| RF-CLI-01, RF-CLI-02 | HU-01 | 1 |
| RF-CLI-03 | HU-10 | 2 |
| RF-CLI-04 | HU-09 | 2 |
| RF-CLI-05 | HU-06 | 1 |
| RF-CLI-06 | HU-17 | 2 |
| RF-CLI-07 | HU-08 | 1 |
| RF-ADM-01, RF-ADM-02, RF-ADM-04 | HU-02 | 1 |
| RF-ADM-03, RF-ADM-07 | HU-11 | 2 |
| RF-ADM-05 | HU-23 | 4 |
| RF-ADM-06 | HU-19 | 3 |
| RF-ADM-08, RF-ADM-09 | HU-22 | 3 |
| RF-ADM-10 | HU-14, HU-21 | 2–3 |
| RF-BRN-01 | HU-05 | 1 |
| RF-BRN-02 | HU-08 (simple), HU-13 (completa) | 1 / 2 |
| RF-BRN-03 | HU-12 | 2 |
| RF-CAT-01, RF-CAT-02 | HU-03 | 1 |
| RF-CAT-03 | HU-04 | 1 |
| RF-CAT-04 | HU-18 | 3 |
| RF-CRT-01 a RF-CRT-04 | HU-07 | 1 |
| RF-ORD-01 | HU-08 | 1 |
| RF-ORD-02, RF-ORD-03 | HU-14 | 2 |
| RF-ORD-04 | HU-15 | 2 |
| RF-GEO-01 | HU-06 | 1 |
| RF-GEO-02 | HU-13 | 2 |
| RF-GEO-03 | — | Fuera |
| RF-TRK-01 a RF-TRK-03 | HU-16 | 2 |
| RF-HIS-01 | HU-17 | 2 |
| RF-HIS-02 | HU-26 | 4 |
| RF-RPT-01 a RF-RPT-04 | HU-25 | 4 |
| RF-STK-01 a RF-STK-04 | HU-19, HU-20 | 3 |
| RF-STK-05 | HU-31 | 5 (si hay tiempo) |
| RF-PRM-01, RF-PRM-02 | HU-23, HU-24 | 4 |
| RF-RPT-10 a RF-RPT-22 | HU-27 a HU-30 | 5 |

---

## 7. Qué no se estima todavía

- Pixel-perfect / marca más allá de un layout usable en celular.
- Upload de imágenes como RF propio (el Sprint 1 cubre imagen por URL).
- Checkout de invitado: ya está como extra de HU-08; no abre una HU nueva del enunciado.
- Cualquier ítem de Extensión 2.
