# Ficha Sprint 1

**Proyecto:** Pedidos en casas de comidas rápidas  
**Equipo:** 4 integrantes  
**Sprint:** 1 de 5  
**Planning:** 20/08/2026  
**Review:** 10/09/2026  
**Corte de tareas:** 09/09/2026 23:59 (solo cuenta lo mergeado hasta esa hora)  
**Duración:** 3 semanas  
**Porcentaje del TP en este incremento:** **40%** de las funcionalidades base del enunciado  
**Extensiones:** fuera de este sprint

---

## 1. Objetivo del sprint

Al 10/09 se puede demostrar, en un celular, este flujo de punta a punta:

1. Un **administrador** inicia sesión (usuario seed) y carga categorías, productos y sucursales.
2. Un **cliente** se registra, inicia sesión, carga una dirección con ubicación geográfica, arma el carrito y **confirma un pedido**.
3. El pedido queda persistido con: cliente, sucursal, dirección, fecha/hora, detalle, importe y estado inicial.

Si ese flujo no cierra, el sprint no está cumplido, aunque haya más pantallas a medias.

---

## 2. Por qué es el 40% del TP

El enunciado base tiene **40 RF obligatorios** (`docs/Requerimientos-funcionales.md`). Este sprint toma **16 RF** (40%) que forman el **hilo vertical del negocio**: configurar el menú → armar el pedido → registrarlo.

No es el 40% de pantallas sueltas. Es el 40% que desbloquea el resto (seguimiento, historial, reportes, stock, promos).

| Módulo del enunciado | Peso sobre el TP base | En Sprint 1 | Qué entra | Qué queda para sprints 2–5 |
|---|---|---|---|---|
| Usuarios cliente | 12% | 8% | Registro, login, direcciones | Recuperar contraseña, perfil completo |
| Usuarios admin | 6% | 4% | Admin inicial + login | Alta de más admins |
| Sucursales | 10% | 5% | ABM con geo, teléfono, horario, estado | Asignación inteligente, listado “disponibles para mi ubicación” |
| Catálogo | 12% | 8% | ABM categorías/productos + consulta cliente | Configuraciones especiales (extras, tamaños) |
| Carrito | 10% | 10% | Completo | — |
| Pedidos | 15% | 5% | Confirmación con datos mínimos y estado inicial | Máquina de estados, cancelar, cambio de estado en admin |
| Geolocalización | 8% | 0% extra | Cubierta junto con direcciones (lat/lng) | Mapa (optativo), uso fino para asignar sucursal |
| Seguimiento | 8% | 0% | — | Sucursal, timeline, ETA |
| Historial | 5% | 0% | — | Listado, detalle, repetir |
| Admin extra (promos, stock, params, estados) | 8% | 0% | — | ABM restante |
| Reportes | 6% | 0% | — | 4 reportes de productos + extras de extensión |
| **Total base** | **100%** | **40%** | | |
| Extensión 1 o 2 | fuera del mínimo | 0% | — | A partir de Sprint 3 |

### RF incluidos (16 / 40 = 40%)

| ID | Requerimiento |
|---|---|
| RF-CLI-01 | Registro de cliente |
| RF-CLI-02 | Inicio de sesión de cliente |
| RF-CLI-05 | Administrar direcciones |
| RF-CLI-07 | Realizar un pedido nuevo |
| RF-ADM-01 | Administrador inicial |
| RF-ADM-02 | Inicio de sesión de administrador |
| RF-ADM-04 | Aplicación administrativa independiente (`/admin`) |
| RF-BRN-01 | ABM de sucursales |
| RF-CAT-01 | ABM de productos |
| RF-CAT-02 | ABM de categorías |
| RF-CAT-03 | Consulta del catálogo |
| RF-CRT-01 | Agregar productos al carrito |
| RF-CRT-02 | Cantidad, observaciones (config especiales: no en este sprint) |
| RF-CRT-03 | Cálculo del importe total |
| RF-CRT-04 | Modificar el carrito |
| RF-ORD-01 | Confirmación del pedido (datos mínimos + estado inicial) |

**Incluido como parte de RF-CLI-05 (sin RF extra):** latitud y longitud en cada dirección (arranca RF-GEO-01).

### Simplificaciones aceptadas (para no inflar el 40%)

| Tema | En Sprint 1 | Después |
|---|---|---|
| Sucursal del pedido | Se asigna la sucursal **activa más cercana** a la dirección; si no hay dirección, la primera activa | Radio, horario, stock, pedidos pendientes |
| Estados | Solo estado inicial `pending` | Máquina completa |
| Configuraciones de producto | No. Solo **observaciones** en el ítem | Extras, quitar ingredientes, tamaños |
| Imagen de producto | URL | Upload |
| Recuperar contraseña | No | Sprint 2 |
| Responsivo | Layout usable en celular (no pixel-perfect) | Pulido |

### Fuera de alcance explícito

RF-CLI-03, RF-CLI-04, RF-CLI-06, RF-ADM-03, RF-ADM-05 a RF-ADM-10, RF-BRN-02/03 (más allá de la regla simple de arriba), RF-CAT-04, RF-ORD-02 a RF-ORD-04, RF-GEO-03, RF-TRK-*, RF-HIS-*, RF-RPT-*, toda Extensión 1 y 2.

---

## 3. Historias de usuario

Estimación en puntos. Total del sprint: **40 pts** (= 40% de un backlog base de 100).

**DoD de cada historia:** funciona en frontend y backend, usable en viewport mobile, mergeada a `main` antes del 09/09 23:59.

### HU-01 — Registro e inicio de sesión (cliente) — 5 pts

*Como visitante, quiero registrarme e iniciar sesión, para usar la app como cliente.*

**RF:** RF-CLI-01, RF-CLI-02  
**Rutas:** `/register`, `/login`  
**API:** `POST /api/auth/register`, `POST /api/auth/login`

Criterios:

- No puedo entrar a `/products` ni `/cart` sin token.
- Credenciales inválidas muestran error.
- Tras login correcto voy al catálogo.

### HU-02 — Admin inicial y backoffice — 5 pts

*Como administrador, quiero un usuario seed e iniciar sesión en `/admin`, para cargar el menú.*

**RF:** RF-ADM-01, RF-ADM-02, RF-ADM-04  
**Rutas:** `/admin/login`, `/admin`  
**API:** `POST /api/auth/login` (rol `admin`)

Criterios:

- El sistema nace con un admin (seed).
- Un cliente no entra a `/admin`.
- Un admin no usa el flujo de pedido de cliente (layouts separados).

### HU-03 — ABM de categorías y productos — 8 pts

*Como administrador, quiero crear y editar categorías y productos, para armar el catálogo.*

**RF:** RF-CAT-01, RF-CAT-02  
**Rutas:** `/admin/categories`, `/admin/products`  
**API:** CRUD `/api/admin/categories`, `/api/admin/products`

Criterios:

- Alta/edición/listado de categoría.
- Producto con nombre, descripción, categoría, precio, imagen (URL), disponible sí/no.
- Un producto no disponible no se ofrece al cliente en el catálogo.

### HU-04 — Consultar catálogo — 3 pts

*Como cliente, quiero ver productos por categoría, para armar un pedido.*

**RF:** RF-CAT-03  
**Rutas:** `/`, `/products`, `/products/:id`  
**API:** `GET /api/categories`, `GET /api/products`, `GET /api/products/:id`

Criterios:

- Listado filtrable por categoría.
- Detalle con precio y descripción.
- Solo productos `available`.

### HU-05 — ABM de sucursales — 5 pts

*Como administrador, quiero cargar sucursales con ubicación y horario, para que un pedido tenga un local de origen.*

**RF:** RF-BRN-01  
**Rutas:** `/admin/branches`  
**API:** CRUD `/api/admin/branches`

Criterios:

- Campos: nombre, dirección, lat, lng, horarios, teléfono, activa/inactiva.
- Una sucursal inactiva no se asigna a pedidos nuevos.

### HU-06 — Direcciones del cliente — 3 pts

*Como cliente, quiero cargar mis direcciones con ubicación geográfica, para indicar dónde entregar.*

**RF:** RF-CLI-05 (+ lat/lng de RF-GEO-01)  
**Rutas:** `/account/addresses`  
**API:** `GET/POST /api/me/addresses`, `PATCH/DELETE /api/me/addresses/:id`

Criterios:

- Alta y listado de direcciones.
- Cada dirección tiene texto + latitud + longitud.
- Puedo elegir una como dirección de entrega en el checkout.

### HU-07 — Carrito — 5 pts

*Como cliente, quiero agregar, cambiar y quitar productos y ver el total, para controlar lo que voy a pagar.*

**RF:** RF-CRT-01 a RF-CRT-04  
**Rutas:** `/cart`  
**API:** `GET /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/:id`

Criterios:

- Agregar desde el detalle de producto (cantidad + observaciones).
- El total es `suma(precio × cantidad)`.
- Puedo cambiar cantidad, observaciones y quitar ítems.
- El carrito es por usuario (sobrevive recargar la página).

### HU-08 — Confirmar pedido — 6 pts

*Como cliente, quiero confirmar el pedido, para que quede registrado en el sistema.*

**RF:** RF-CLI-07, RF-ORD-01  
**Rutas:** `/checkout`  
**API:** `POST /api/orders`

Criterios:

- Requiere cliente logueado, carrito con ítems y una dirección.
- Se registra: cliente, sucursal asignada (activa más cercana), dirección, fecha/hora, detalle, importe, estado `pending`.
- Tras confirmar, el carrito queda vacío.
- Si no hay sucursal activa, se muestra error y no se crea el pedido.

**Total: 5+5+8+3+5+3+5+6 = 40 pts**

---

## 4. Incremento visible (review 10/09)

**Demo (5–7 min):**

1. Login admin seed → crear categoría “Hamburguesas” → crear un producto con precio e imagen URL.
2. Crear una sucursal activa con lat/lng.
3. Logout. Registro de un cliente → login → alta de dirección con lat/lng.
4. Catálogo → detalle → agregar 2 unidades al carrito con una observación → cambiar cantidad → ver total.
5. Checkout → confirmar → mostrar el pedido persistido (id, sucursal, importe, `pending`).
6. Mostrar que en celular el layout no se rompe.

**No se demostra:** reportes, mapa, seguimiento, repetir pedido, promociones, stock, recuperar password.

---

## 5. Páginas y APIs de este sprint

**Cliente:** `/login`, `/register`, `/products`, `/products/:id`, `/cart`, `/checkout`, `/account/addresses`  
**Admin:** `/admin/login`, `/admin`, `/admin/categories`, `/admin/products`, `/admin/branches`

**API:** auth register/login, `/api/me/addresses`, GET catálogo, CRUD admin categories/products/branches, CRUD cart, `POST /api/orders`.

Nombres en inglés (dominio canónico). UI en español.

---

## 6. Tareas y reparto (4 integrantes)

Núcleo compartido (entre todos, primeras 48–72 h): modelo de datos v0, contrato de `Cart` y `Order`, carpetas `/frontend` y `/backend` andando.

| Dueño | Historias | Tareas concretas |
|---|---|---|
| **A — Backend base** | HU-01 (API), HU-02 (seed) | Node + Express, PostgreSQL, Prisma, JWT, seed admin, CORS, `.env.example` |
| **B — Catálogo y admin** | HU-02 (UI admin), HU-03, HU-05 | Pantallas ABM + endpoints admin de categories, products, branches |
| **C — Cliente catálogo/carrito** | HU-01 (UI), HU-04, HU-07 | SPA cliente, catálogo, detalle, carrito, layout responsivo |
| **D — Pedido + docs** | HU-06, HU-08 + carpeta | Direcciones, checkout, `POST /orders`, asignación simple de sucursal, ficha/RF/alcance actualizados |

Integración obligatoria: **03/09** (clase de seguimiento) el flujo de la sección 4 tiene que existir, aunque esté feo. Del 03/09 al 09/09: bugs, auth y demo.

---

## 7. Definición de terminado del sprint

- [ ] Las 8 HU cumplen sus criterios.
- [ ] Flujo de demo de la sección 4 reproducible en local (y deploy si da el tiempo; no es bloqueante).
- [ ] App usable en viewport mobile.
- [ ] Al menos 2 tests de backend: login y `POST /orders` (happy path).
- [ ] Nada de secretos en git (`.env` ignorado).
- [ ] Documentación v0 en `/docs`: esta ficha, RF, y supuestos que se hayan cerrado.

---

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Abrir seguimiento, reportes o promos “porque es fácil” | No llega el pedido el 09/09 | Recortar esas HU, nunca el checkout |
| ABM de productos se come el sprint | Demo sin pedido | HU-03 en corte: alta + listado; edición fina si sobra |
| Geo (lat/lng) traba direcciones | HU-06 y HU-08 se pisan | En Sprint 1 lat/lng se cargan a mano (número). Sin mapa ni Google Places |
| 4 personas en la misma rama | Conflictos | Rama por HU, `main` solo por merge |

---

## 9. Acta (completar en la planning)

```
Fecha:
Presentes:
Ficha aceptada (sí/no):
Ajustes a las HU:
Dueños A / B / C / D:
Preguntas a docentes y respuestas:
```
