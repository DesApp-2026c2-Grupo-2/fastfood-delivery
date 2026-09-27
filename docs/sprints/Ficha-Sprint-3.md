# Ficha Sprint 3

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 2.0  
**Actualizado:** 27/09/2026  
**Grupo:** 2 · 5 integrantes (Celeste, Carla, Lucas, Nicolas, Rafael)  
**Sprint:** 3 de 5  
**Planning:** 24/09/2026 (misma clase que el review del Sprint 2)  
**Review:** 08/10/2026  
**Corte de tareas:** 07/10/2026 23:59 (solo cuenta lo mergeado a `main` hasta esa hora)  
**Duración:** 2 semanas  
**Extensiones:** arranca **Extensión 1** (stock). Promociones y reportes quedan para Sprint 4–5  
**Stack:** React + Vite (front cliente y admin) · NestJS + TypeScript (back) · PostgreSQL + Prisma (datos) · JWT

**Después de este sprint quedan 2:** Sprint 4 (review 29/10, medio término 22/10) y Sprint 5 (review 19/11, carpeta 12/11).

---

## 1. Objetivo del sprint

Al 08/10 se puede demostrar, en un celular, este flujo de punta a punta **sobre operación real del negocio**:

1. Un **administrador** carga **stock por sucursal y producto**, crea otro admin y ajusta **parámetros** (radio / ETA).
2. Un **cliente** completa su **cuenta** (perfil y recuperar clave) y ve las **sucursales disponibles** para su ubicación.
3. Al confirmar un pedido, el sistema **verifica stock** en la sucursal asignada, lo **reserva** y, si el cliente cancela a tiempo, lo **libera**.
4. En el seguimiento, el cliente ve la **hora estimada de entrega** y, si se pasó, el **tiempo de retraso**.
5. Quedan resueltas las **mejoras de la devolución del Sprint 2** (sección 2).

Si el hilo stock → confirmar → reservar / liberar no cierra, el sprint no está cumplido, aunque haya más pantallas a medias.

El Sprint 1 dejó el pedido **creado**. El Sprint 2 lo dejó **vivo hasta la entrega**. Este sprint deja el negocio **operable con inventario y cuenta completa**, y arranca Extensión 1.

---

## 2. Estado del Sprint 2 y devolución

### 2.1 Qué cerró el Sprint 2 (en `main`, no rehacer)

| Qué | PR |
|---|---|
| Admin de pedidos, máquina de estados, `OrderStatusHistory`, eventos por Pusher (HU-13, DEV-01) | #6, #8 |
| Direcciones rediseñadas + geolocalización del dispositivo (DEV-02, DEV-03) | #7 |
| Token con expiración y 401 → login (DEV-09) | #8 |
| Botón volver separado del header + validaciones en JS (DEV-05, DEV-07) | #9 |
| Seguimiento `/orders/:id`: sucursal, estado, timeline, ETA (HU-10) | #10, #14 |
| Cancelar desde el detalle (HU-11) | #11 |
| Historial `/orders` y repetir pedido (HU-09, HU-12) + carrito con aire, “Seguir comprando”, contador del carrito, “Hola {nombre}”, Salir, bottom bar (DEV-04, DEV-06, DEV-08, DEV-11) | #12 |
| Adicionales de hamburguesa: API + selector visual en el detalle (DEV-10) | #8, #13 |

**No queda deuda del Sprint 2** respecto de la ficha anterior: DEV-01 a DEV-11 y HU-09 a HU-13 están mergeados.

### 2.2 Devolución del review (24/09) — entra a este sprint

Pedidos del profesor. Tienen dueño y se cierran en la **primera semana** (antes del 01/10).

| ID | Qué pidieron | Dueño | Qué hay que hacer |
|---|---|---|---|
| DEV-12 | Cambiar el color del estado **Pendiente** en *Mis pedidos* | **Lucas** | Hoy `pending` (ámbar) y `preparing` (ámbar) casi no se distinguen. Darle a Pendiente un color propio y usar la **misma paleta** en `/orders`, `/orders/:id` y el admin. |
| DEV-13 | En el admin, el **código del pedido completo** | **Carla** | Hoy se muestra `#` + los últimos 6 caracteres (`shortId`). Mostrar el id entero en listado y detalle (con corte visual / copiar si no entra en mobile). La búsqueda por código acepta el id completo. |
| DEV-14 | **Hora estimada de entrega** | **Nicolas** (API) + **Celeste** (UI) | Además de “Aprox. N minutos”, mostrar una **hora** (“Llega aprox. 21:40”). La hora se calcula **una vez**, al confirmar, y queda fija. |
| DEV-15 | **Tiempo de retraso** | **Nicolas** (API) + **Celeste** (UI) | Si pasó la hora estimada y el pedido no está entregado: “Demorado N min”. Si se entregó tarde, el detalle muestra cuánto se demoró. Visible también en el admin. |
| DEV-16 | Repetir pedido **cuando el carrito ya tiene productos**: que pase a agregar al carrito | **Lucas** | Si el carrito no está vacío, el botón dice **“Agregar al carrito”** y, al confirmar, avisa que los ítems se **suman** a lo que ya hay (no se reemplaza). Después va a `/cart` con el aviso. Con carrito vacío sigue “Repetir pedido”. |

Hallazgo propio del equipo (revisión del seguimiento en celular), entra con la devolución:

| ID | Qué pasa | Dueño | Qué hay que hacer |
|---|---|---|---|
| DEV-17 | El seguimiento arma los “adicionales” partiendo el texto de **observaciones** (`notes`); no muestra los extras reales y muestra “sin cebolla” como si fuera un adicional | **Celeste** | Leer `item.extras` del API (ya viene) y mostrar `notes` aparte como observación. Sumar `extras` al tipo `OrderItem` del front. |

Si en la clase de seguimiento (01/10) aparecen ítems nuevos, se suman como DEV-18+ en el acta; no desplazan el hilo de stock.

### 2.3 Contrato de ETA (DEV-14 / DEV-15)

Hoy `etaMinutes` se recalcula en cada `GET` como minutos relativos, así que nunca “avanza” y no hay contra qué medir un retraso. Pasa a ser un **instante fijo**:

```
Al confirmar (POST /api/orders y /orders/guest):
  estimatedDeliveryAt = createdAt + (15 + ítems × 3 + traslado) min   ← se guarda en Order

En GET /api/orders/:id y /api/admin/orders/:id:
  estimatedDeliveryAt   (ISO)
  etaMinutes            = max(0, estimatedDeliveryAt − ahora)  si no está delivered/cancelled; si no, null
  delayMinutes          = max(0, ahora − estimatedDeliveryAt)  si no está delivered/cancelled
                        = max(0, deliveredAt − estimatedDeliveryAt)  si está delivered
                        = null si está cancelled
```

`deliveredAt` sale del evento `delivered` de `OrderStatusHistory`. Los pedidos viejos sin `estimatedDeliveryAt` se completan en la migración con la misma fórmula sobre `createdAt`. Cuando exista HU-19, las constantes salen de `Parameter`. Esto deja listo el dato para el reporte “tiempo promedio de entrega” (RF-RPT-13, Sprint 5).

---

## 3. Alcance

### RF incluidos (frente nuevo)

| ID | Requerimiento |
|---|---|
| RF-CLI-03 | Recuperar contraseña |
| RF-CLI-04 | Modificar datos personales |
| RF-ADM-03 | Alta de administradores |
| RF-ADM-07 | ABM / consulta de administradores en backoffice |
| RF-ADM-06 | ABM de stock |
| RF-ADM-08 | Gestión de estados generales (consulta; la máquina ya existe) |
| RF-ADM-09 | Parámetros del sistema (radio, constantes de ETA) |
| RF-BRN-03 | Sucursales disponibles para la ubicación del cliente |
| RF-STK-01 | Stock por sucursal y producto |
| RF-STK-02 | Verificar disponibilidad al pedir |
| RF-STK-03 | Disponibilidad distinta por sucursal |
| RF-STK-04 | Reserva, descuento y liberación |

**Mejora sin RF nuevo:** RF-TRK-02 / RF-TRK-03 se completan con hora estimada y retraso (DEV-14, DEV-15).

**Ya cubierto en Sprint 2 (no se replanifica):** RF-CAT-04 acotado a adicionales de hamburguesa (DEV-10). Tamaños / sabores / quitar ingredientes no entran.

**Incluido sin RF extra:** al confirmar, la asignación pasa a **activa más cercana dentro del radio** (parámetro). Si ninguna cubre, error y no se crea el pedido. Cierra el uso fino de RF-BRN-02 / RF-GEO-02.

### Simplificaciones

| Tema | En Sprint 3 | Después (Sprint 4–5) |
|---|---|---|
| Stock | Cantidad entera por `(branchId, productId)`. Sin alertas de mínimo | RF-STK-05 (alerta) en Sprint 5 si hay tiempo |
| Política de stock | Al **confirmar**: verificar + **reservar**. Al **cancelar** (`pending`/`confirmed`): **liberar**. Al pasar a `delivered`: **descontar** la reserva | Ajustes finos si el negocio lo pide |
| Producto sin fila de stock | Se trata como **0** en esa sucursal (no se vende ahí) | — |
| Configuraciones | Solo adicionales (ya hechos). Sin motor de tamaños/sabores | Solo si sobra; no bloquea |
| Recuperar contraseña | Flujo **demostrable**: token visible en respuesta/pantalla de demo (sin SMTP obligatorio) | Correo real si hay holgura post medio término |
| Parámetros | Tabla `Parameter` (clave/valor): `coverage_radius_km`, `eta_prep_base_min`, `eta_min_per_item`, `eta_km_per_min`. Seed con los valores actuales (15, 3, 0.5) | Más claves si hacen falta |
| ETA | Instante fijo al confirmar (§2.3). Cambiar parámetros **no** recalcula pedidos ya confirmados | — |
| Sucursales disponibles | Listado de activas dentro del radio de la dirección (o geo actual) | Mapa (RF-GEO-03) sigue fuera |
| Promociones / reportes | No | Sprint 4 (base) y Sprint 5 (extras Ext. 1) |
| Extensión 2 | No | Fuera de compromiso |

### Fuera de alcance explícito

RF-ADM-05, RF-PRM-*, RF-RPT-* (todos), RF-GEO-03, RF-STK-05, toda Extensión 2.  
No se reabre el ABM de categorías/productos/sucursales salvo lo necesario para vincular stock.

---

## 4. Historias de usuario

Estimación en puntos. Total del sprint: **26 pts** (frente nuevo). DEV-12 a DEV-17 no suman puntos: son devolución con dueño fijo.

**DoD de cada historia:** funciona en frontend y backend, usable en viewport mobile, mergeada a `main` antes del 07/10 23:59.

### Política de stock (contrato del sprint)

```
Confirmar pedido
  → para cada ítem: stock.available >= quantity en la sucursal asignada
  → si falta alguno: 409, no se crea el pedido
  → si alcanza: available -= qty, reserved += qty

Cancelar (pending | confirmed)
  → reserved -= qty, available += qty

Transición a delivered
  → reserved -= qty  (queda descontado; no vuelve a available)
```

Los adicionales son productos (categoría “Adicional”): si tienen fila de stock en esa sucursal, se descuentan igual; si no tienen fila, se tratan como 0.

### HU-14 — Perfil del cliente — 3 pts

*Como cliente, quiero consultar y modificar mis datos personales, para mantener mi cuenta al día.*

**RF:** RF-CLI-04  
**Rutas:** `/account`  
**API:** `GET /api/me`, `PATCH /api/me`

Criterios:

- Veo y edito al menos nombre (email solo lectura; se documenta).
- Cambio de contraseña desde el perfil (actual + nueva).
- El “Hola {nombre}” del header se actualiza al guardar.
- Solo el dueño de la cuenta lee/edita sus datos.

### HU-15 — Recuperar contraseña — 4 pts

*Como cliente, quiero recuperar mi contraseña, para volver a entrar si la olvidé.*

**RF:** RF-CLI-03  
**Rutas:** `/forgot-password`, `/reset-password`  
**API:** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

Criterios:

- Con un email registrado puedo iniciar el flujo (link desde `/login`).
- Obtengo un token de reset **demostrable** (respuesta de API en entorno demo / pantalla de apoyo; no hace falta SMTP).
- Con el token + nueva contraseña, puedo iniciar sesión. El token vence y es de un solo uso.
- Email inexistente: respuesta genérica (no filtrar usuarios).

### HU-16 — Alta de administradores — 3 pts

*Como administrador, quiero crear otros administradores, para no depender de un solo usuario seed.*

**RF:** RF-ADM-03, RF-ADM-07  
**Rutas:** `/admin/admins`  
**API:** `GET /api/admin/admins`, `POST /api/admin/admins`

Criterios:

- Listado de admins (nombre, email).
- Alta con nombre, email y contraseña inicial (validaciones en JS).
- Un cliente no accede a estas rutas ni al API.
- El seed del Sprint 1 sigue existiendo.

### HU-17 — Stock por sucursal — 6 pts

*Como administrador, quiero cargar el stock de cada producto por sucursal, para saber qué hay en cada local.*

**RF:** RF-ADM-06, RF-STK-01, RF-STK-03  
**Rutas:** `/admin/stock`  
**API:** `GET /api/admin/branches/:id/stock`, `PUT /api/admin/branches/:id/stock/:productId`

Criterios:

- Elijo una sucursal y veo/edito la cantidad disponible de cada producto.
- Un producto puede tener stock en una sucursal y 0 / sin fila en otra.
- Se ven `available` y `reserved` (el admin edita solo `available`).
- Un cliente no accede a estas rutas.

### HU-18 — Verificar y reservar stock al pedir — 5 pts

*Como sistema, quiero verificar y reservar stock al confirmar un pedido, y liberarlo si se cancela, para no vender lo que no hay.*

**RF:** RF-STK-02, RF-STK-04  
**Rutas:** sin pantalla nueva (checkout y cancelación existentes)  
**API:** integrada en `POST /api/orders`, `POST /api/orders/guest`, cancelar (cliente y admin), transición a `delivered`

Criterios:

- Si no hay stock suficiente en la sucursal asignada, el checkout falla con mensaje claro (409) que nombra el producto.
- Tras confirmar, el stock queda reservado.
- Cancelar en `pending`/`confirmed` libera la reserva.
- Al marcar `delivered`, la reserva se confirma (descuento definitivo).
- Repetir pedido **no** reserva stock (solo arma el carrito); la verificación es al confirmar.
- Tests de backend: ok, sin stock, liberar al cancelar, descontar al entregar.

### HU-19 — Parámetros, radio y sucursales disponibles — 5 pts

*Como administrador, quiero ajustar radio y ETA; como cliente, quiero ver qué sucursales me cubren.*

**RF:** RF-ADM-08, RF-ADM-09, RF-BRN-03 (+ uso de RF-BRN-02 / RF-GEO-02 con radio)  
**Rutas:** `/admin/parameters`, `/branches` (cliente)  
**API:** `GET/PATCH /api/admin/parameters`, `GET /api/branches/available?addressId=` (o `lat=&lng=`)

Criterios:

- Admin edita al menos: radio de cobertura (km) y constantes de ETA (las de §2.3).
- Al confirmar, solo se consideran sucursales **activas dentro del radio**; si ninguna, error.
- El cliente ve el listado de sucursales disponibles para su ubicación (nombre, dirección, distancia, horario).
- RF-ADM-08: se listan los estados de pedido del sistema con su etiqueta y color (lectura; misma paleta que DEV-12).

**Total frente nuevo: 3+4+3+6+5+5 = 26 pts**

---

## 5. Incremento visible (review 08/10)

**Demo (6–8 min):**

1. **Devolución primero (1 min):** *Mis pedidos* con Pendiente en su color nuevo; admin con el código completo del pedido.
2. Admin: `/admin/stock` — cargar stock de un producto en la sucursal cercana; dejar otra sucursal en 0.
3. Admin: `/admin/parameters` — mostrar radio (p. ej. 5 km) y constantes de ETA.
4. Cliente: login → `/branches` → sucursales que lo cubren.
5. Cliente: hamburguesa con adicionales → confirmar. Sin stock: error visible. Con stock: `pending` y stock reservado en admin.
6. Cliente en `/orders/:id`: **hora estimada de entrega**. Con un pedido viejo (o forzando la hora en el seed): **“Demorado N min”**, también visible en el admin.
7. Cliente cancela → stock liberado. Otro pedido hasta `delivered` → stock descontado.
8. Con productos en el carrito: *Mis pedidos* → **Agregar al carrito** → aviso de que se sumaron → `/cart`.
9. Perfil: cambiar nombre (se ve en el header). Forgot password (token demo) → nueva clave → login.
10. Admin: alta de un segundo administrador e inicio de sesión con ese usuario.

**No se demostra:** promociones, reportes, mapa, alertas de stock mínimo, Extensión 2.

---

## 6. Páginas y APIs de este sprint

**Cliente (nuevo / a tocar):**

| Ruta | Uso |
|---|---|
| `/orders` | Color de Pendiente (DEV-12), “Agregar al carrito” (DEV-16) |
| `/orders/:id` | Hora estimada y retraso (DEV-14/15), adicionales reales (DEV-17) |
| `/account` | Perfil (HU-14) |
| `/forgot-password`, `/reset-password` | Recuperar clave (HU-15) |
| `/branches` | Sucursales disponibles (HU-19) |

**Admin (nuevo / a tocar):**

| Ruta | Uso |
|---|---|
| `/admin/orders`, `/admin/orders/:id` | Código completo (DEV-13), hora estimada y retraso (DEV-15) |
| `/admin/stock` | Stock por sucursal (HU-17) |
| `/admin/admins` | Alta/listado de admins (HU-16) |
| `/admin/parameters` | Parámetros + estados (HU-19) |

**API (nueva / extendida):**

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/orders/:id`, `/api/admin/orders/:id` | + `estimatedDeliveryAt`, `delayMinutes` (DEV-14/15) |
| GET | `/api/orders`, `/api/admin/orders` | + `estimatedDeliveryAt`, `delayMinutes` para marcar demorados en listados |
| GET/PATCH | `/api/me` | Perfil |
| POST | `/api/auth/forgot-password` | Iniciar reset |
| POST | `/api/auth/reset-password` | Body: token + nueva clave |
| GET/POST | `/api/admin/admins` | Listado y alta |
| GET | `/api/admin/branches/:id/stock` | Stock de una sucursal |
| PUT | `/api/admin/branches/:id/stock/:productId` | Body: `{ "available": 20 }` |
| GET/PATCH | `/api/admin/parameters` | Parámetros |
| GET | `/api/branches/available` | Sucursales en radio |

Cambios de modelo:

- `Order.estimatedDeliveryAt` (`DateTime`), con backfill en la migración.
- Nuevo `Stock` (`branchId`, `productId`, `available`, `reserved`, unique `(branchId, productId)`).
- Nuevo `Parameter` (`key` único, `value`).
- Nuevo `PasswordResetToken` (`userId`, `tokenHash`, `expiresAt`, `usedAt`).

Nombres en inglés (dominio canónico). UI en español.

---

## 7. Tareas y reparto (5 integrantes)

Núcleo compartido (primeros días): **Nicolas mergea primero** la migración con `estimatedDeliveryAt`, `Stock` y `Parameter`, y el contrato JSON de §2.3 y del 409 sin stock. Sin eso, Celeste y Carla se pisan.

### Devolución del Sprint 2 (primera semana)

| ID | Dueño | Rama sugerida |
|---|---|---|
| DEV-12, DEV-16 | **Lucas** | `fix/lucas-dev-12-16` |
| DEV-13 | **Carla** | `fix/carla-dev-13-codigo` |
| DEV-14, DEV-15 (API) | **Nicolas** | `feat/nicolas-eta-stock` |
| DEV-14, DEV-15, DEV-17 (UI cliente) | **Celeste** | `fix/celeste-eta-extras` |
| DEV-15 (UI admin) | **Carla** | junto con DEV-13 |

### Frente nuevo

| Dueño | Frente | Historias | Tareas concretas |
|---|---|---|---|
| **Nicolas** | Backend | HU-18, HU-19 (API), HU-15 (API), HU-14 (API), HU-16 (API) + DEV-14/15 | Prisma (`estimatedDeliveryAt`, `Stock`, `Parameter`, reset token); reserva/libera/descuenta; parámetros; `branches/available`; `/me`; forgot/reset; admins; tests |
| **Carla** | Admin | HU-16, HU-17, HU-19 (UI admin) + DEV-13, DEV-15 (admin) | `/admin/stock`, `/admin/admins`, `/admin/parameters`; código completo y demora en pedidos. No toca `/frontend` |
| **Lucas** | Cliente (chrome, cuenta, historial) | HU-14 (UI) + DEV-12, DEV-16 | `/account`; paleta de estados compartida; “Agregar al carrito” en repetir. Sigue siendo dueño de `ClientLayout` |
| **Celeste** | Cliente (seguimiento, auth) | HU-15 (UI) + DEV-14, DEV-15, DEV-17 | Hora estimada, demora y adicionales reales en `/orders/:id`; `/forgot-password`, `/reset-password` |
| **Rafael** | Cliente (sucursales) + docs | HU-19 (UI cliente) | `/branches`; mensaje de checkout sin stock / sin cobertura; esta ficha, RF y alcance al día |

Si aprieta el tiempo: no se recorta HU-17 ni HU-18 (stock) ni la devolución (DEV-12 a DEV-16). De cuenta, lo último es HU-16 (alta de admins).

| Fecha | Qué |
|---|---|
| 24/09 – 30/09 | Migración de Nicolas en `main`; DEV-12 a DEV-17 cerrados |
| **01/10** | Clase de seguimiento: devolución mostrable + stock reservando en checkout |
| 02/10 – 06/10 | HU-14 a HU-19; integrar el flujo de la sección 5 |
| **07/10 23:59** | Corte |
| **08/10** | Review |

Detalle de ramas (cuando exista): `docs/sprints/Plan-reparto-Sprint-3.md`.

---

## 8. Definición de terminado del sprint

- [ ] Las 6 HU (14–19) cumplen sus criterios.
- [ ] DEV-12 a DEV-17 resueltos en `main`.
- [ ] Flujo de demo de la sección 5 reproducible en local (deploy si da el tiempo; no bloqueante).
- [ ] App usable en viewport mobile (cliente con bottom bar; admin usable; código completo no rompe el layout).
- [ ] Tests de backend: stock ok, sin stock (409), liberar al cancelar, descontar al entregar; `estimatedDeliveryAt` fijo y `delayMinutes` (a tiempo / demorado / entregado tarde); reset password happy path.
- [ ] Nada de secretos en git (`.env` ignorado).
- [ ] Esta ficha en `/docs` y RF/alcance actualizados si cambia un supuesto.

---

## 9. Visión de lo que queda (Sprint 4 y 5)

No sustituye las fichas futuras. Sirve para no abrir frentes de más en este sprint.

| Sprint | Review | Foco |
|---|---|---|
| **3** (este) | 08/10 | Devolución S2, cuenta completa, stock (Ext. 1), parámetros/radio, ETA con hora y demora |
| **4** | 29/10 | Promociones (RF-ADM-05, RF-PRM-01/02), reportes base (RF-RPT-01…04), demo estable para **medio término 22/10** |
| **5** | 19/11 | Reportes extra Ext. 1 (RF-RPT-10…22, incluye tiempo promedio de entrega con `estimatedDeliveryAt`), RF-STK-05 si hay tiempo, testing, carpeta (12/11), demo final 27/11 |

Si hay que recortar más adelante: mapa, Extensión 2 y alertas de stock. **No se recorta** el flujo de pedido ni el stock en checkout una vez abierto.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Abrir promociones o reportes “porque es fácil” | No llega stock el 07/10 | Recortar esas HU, nunca HU-17/18 |
| La devolución se come el sprint | Demo sin inventario | Primera semana = devolución + migración; segunda = stock y cuenta |
| La hora estimada se sigue recalculando en cada GET | El retraso nunca aparece | Contrato §2.3: se guarda al confirmar. Test que lo verifique |
| Demora difícil de mostrar en vivo | DEV-15 no se ve en la review | Pedido de seed con `estimatedDeliveryAt` en el pasado |
| Política de reserva se discute demasiado | HU-18 no cierra | Contrato de esta ficha, sin variantes |
| SMTP / mail real en recuperar clave | HU-15 no cierra | Token demostrable; mail real queda plus |
| 5 personas en `orders` y checkout | Conflictos | Nicolas mergea el modelo primero. Rama por frente |
| Radio deja pedidos “sin sucursal” en demo | Checkout roto en review | Seed con sucursal dentro del radio de la dirección de demo |
| Stock en 0 para productos nuevos rompe la demo | Nadie puede pedir | Seed carga stock inicial en la sucursal de demo |

---

## 11. Acta (completar en la planning del 24/09)

```
Fecha:
Presentes:
Ficha aceptada (sí/no):
Ajustes a las HU / DEV:
Dueños Carla / Nicolas / Lucas / Celeste / Rafael:
Ítems nuevos del seguimiento 01/10 (DEV-18+):
Preguntas a docentes y respuestas:
  - DEV-16: ¿“agregar al carrito” = sumar a lo que ya hay (propuesta) o preguntar si reemplazar?
```

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.0 | 27/09/2026 | Reestructura: Sprint 2 cerrado (incluye DEV-10); entra la devolución del review (DEV-12 a DEV-16) + DEV-17; contrato de ETA con hora fija y retraso |
| 1.0 | 24/09/2026 | Versión inicial: stock (Ext. 1), cuenta, parámetros/radio, deuda S2; quedan Sprint 4 y 5 |
