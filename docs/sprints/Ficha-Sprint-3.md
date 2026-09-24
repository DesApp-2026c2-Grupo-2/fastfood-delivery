# Ficha Sprint 3

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 1.0  
**Actualizado:** 24/09/2026  
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

1. Un **administrador** carga **stock por sucursal y producto**, crea otro admin si hace falta y ajusta **parámetros** (radio / ETA).
2. Un **cliente** completa su **cuenta** (perfil y, si olvidó la clave, recuperarla), ve el **historial** de pedidos, **repite** uno y elige **adicionales** al armar el carrito.
3. Al confirmar un pedido, el sistema **verifica stock** en la sucursal asignada, lo **reserva** y, si el cliente cancela a tiempo, lo **libera**.
4. El cliente ve las **sucursales disponibles** para su ubicación (radio de cobertura).
5. Quedan cerrados los **pendientes del Sprint 2 en el cliente** (sección 2).

Si el hilo stock → confirmar → reservar / liberar no cierra, el sprint no está cumplido, aunque haya más pantallas a medias.

El Sprint 1 dejó el pedido **creado**. El Sprint 2 lo dejó **vivo hasta la entrega**. Este sprint deja el negocio **operable con inventario y cuenta completa**, y arranca Extensión 1.

---

## 2. Pendiente del Sprint 2 (cerrar primero)

Estado en `main` al planning del 24/09. El backend del ciclo de vida y el admin de pedidos **sí** están; el chrome y el historial del cliente **no**.

### Cliente — frente Lucas (no mergeado)

| ID | Qué falta | Dueño | Qué hay que hacer |
|---|---|---|---|
| PEND-01 | Listado `/orders` (HU-09 S2) | **Lucas** | Historial: fecha, importe, estado, sucursal. Enlace al detalle. |
| PEND-02 | Repetir pedido en UI (HU-12 S2) | **Lucas** | CTA en listado/detalle → `POST /api/orders/:id/repeat` → ir al carrito. El API ya existe. |
| PEND-03 | Carrito: elementos pegados (DEV-04) | **Lucas** | Más aire entre ítems, total y acciones. |
| PEND-04 | “Seguir comprando” + badge del carrito (DEV-06) | **Lucas** | Tras agregar, ir a `/products` (o CTA claro). El ícono del carrito muestra cantidad. |
| PEND-05 | “Hola {nombre}” + Salir cierra sesión (DEV-08) | **Lucas** | Nombre visible si hay sesión; Salir borra el token de verdad. |
| PEND-06 | Bottom bar mobile (DEV-11) | **Lucas** | Barra inferior: catálogo, carrito, pedidos/cuenta. |

### Cliente — adicionales (API sí, UI no)

| ID | Qué falta | Dueño | Qué hay que hacer |
|---|---|---|---|
| PEND-07 | UI de adicionales en el detalle (DEV-10) | **Celeste** | En productos que admiten extras (p. ej. hamburguesa): elegir adicionales al agregar. El API (`extraIds`) ya está. |

**Regla:** PEND-01 a PEND-07 se cierran en la **primera semana** del sprint (antes del 01/10). No se abren stock ni perfil hasta que el historial y el chrome del cliente estén en `main`.

Si el review del 24/09 suma ítems nuevos, se agregan como PEND-08+ en el acta; no desplazan el hilo de stock.

---

## 3. Alcance

### Qué ya quedó del Sprint 1 y 2 (no rehacer)

- Auth cliente/admin, catálogo, sucursales, carrito, confirmar pedido (`pending`)
- Máquina de estados, timeline, ETA, cancelar, admin `/admin/orders`
- Seguimiento en `/orders/:id`
- Adicionales en API (carrito/pedido congelan extras)
- Geo con permiso del dispositivo en direcciones

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
| RF-CAT-04 | Configuraciones especiales (UI + regla: productos que admiten adicionales) |
| RF-STK-01 | Stock por sucursal y producto |
| RF-STK-02 | Verificar disponibilidad al pedir |
| RF-STK-03 | Disponibilidad distinta por sucursal |
| RF-STK-04 | Reserva, descuento y liberación |

**Incluido sin RF extra:** al confirmar, la asignación sigue siendo **activa más cercana dentro del radio** (parámetro). Si ninguna cubre, error y no se crea el pedido. Eso cierra el uso fino de RF-BRN-02 / RF-GEO-02 que el Sprint 2 dejó en “regla simple”.

### Simplificaciones

| Tema | En Sprint 3 | Después (Sprint 4–5) |
|---|---|---|
| Stock | Cantidad entera por `(branchId, productId)`. Sin alertas de mínimo | RF-STK-05 (alerta) en Sprint 5 si hay tiempo |
| Política de stock | Al **confirmar**: verificar + **reservar**. Al **cancelar** (`pending`/`confirmed`): **liberar**. Al pasar a `delivered`: **descontar** la reserva (queda vendido) | Ajustes finos si el negocio lo pide |
| Producto sin fila de stock | Se trata como **0** en esa sucursal (no se vende ahí) | — |
| Configuraciones | Adicionales (extras) administrables + UI cliente. Sin motor de tamaños/sabores genérico | Ampliar solo si sobra; no bloquea |
| Recuperar contraseña | Flujo **demostrable**: token de reset visible en respuesta/API o pantalla de demo (sin SMTP real obligatorio) | Correo real si hay holgura post medio término |
| Parámetros | Tabla `Parameter` (clave/valor): `coverage_radius_km`, `eta_prep_base_min`, `eta_min_per_item`. Seed con los valores que hoy están hardcodeados | Más claves si hacen falta |
| Sucursales disponibles | Listado de activas dentro del radio de la dirección (o geo actual) | Mapa (RF-GEO-03) sigue fuera |
| Promociones / reportes | No | Sprint 4 (base) y Sprint 5 (extras Ext. 1) |
| Extensión 2 | No | Fuera de compromiso |

### Fuera de alcance explícito

RF-ADM-05, RF-PRM-*, RF-RPT-* (todos), RF-GEO-03, RF-STK-05, toda Extensión 2.  
No se reabre el ABM de categorías/productos/sucursales salvo lo necesario para vincular stock y extras.

---

## 4. Historias de usuario

Estimación en puntos. Total del sprint: **26 pts** (frente nuevo). Los PEND-01 a PEND-07 no suman puntos nuevos: son deuda del Sprint 2 con dueño fijo.

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

Extras cuentan como productos propios si tienen stock en esa sucursal; si un adicional no tiene fila de stock, se trata como 0.

### HU-14 — Perfil del cliente — 3 pts

*Como cliente, quiero consultar y modificar mis datos personales, para mantener mi cuenta al día.*

**RF:** RF-CLI-04  
**Rutas:** `/account`  
**API:** `GET /api/me`, `PATCH /api/me`

Criterios:

- Veo y edito al menos nombre (email: solo lectura o cambio con re-login; el grupo elige uno y lo documenta).
- Cambio de contraseña desde el perfil (actual + nueva), o se delega al flujo de HU-15.
- Solo el dueño de la cuenta lee/edita sus datos.

### HU-15 — Recuperar contraseña — 4 pts

*Como cliente, quiero recuperar mi contraseña, para volver a entrar si la olvidé.*

**RF:** RF-CLI-03  
**Rutas:** `/forgot-password`, `/reset-password` (o una sola con token)  
**API:** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

Criterios:

- Con un email registrado puedo iniciar el flujo.
- Obtengo un token de reset **demostrable** (respuesta de API en entorno demo / pantalla de apoyo; no hace falta SMTP).
- Con el token + nueva contraseña, puedo iniciar sesión.
- Email inexistente: respuesta genérica (no filtrar usuarios).

### HU-16 — Alta de administradores — 3 pts

*Como administrador, quiero crear otros administradores, para no depender de un solo usuario seed.*

**RF:** RF-ADM-03, RF-ADM-07  
**Rutas:** `/admin/admins`  
**API:** `GET /api/admin/admins`, `POST /api/admin/admins`

Criterios:

- Listado de admins (nombre, email).
- Alta con nombre, email y contraseña inicial.
- Un cliente no accede a estas rutas ni al API.
- El seed del Sprint 1 sigue existiendo.

### HU-17 — Stock por sucursal — 6 pts

*Como administrador, quiero cargar el stock de cada producto por sucursal, para saber qué hay en cada local.*

**RF:** RF-ADM-06, RF-STK-01, RF-STK-03  
**Rutas:** `/admin/stock`  
**API:** `GET/PUT /api/admin/stock` (o por sucursal `GET/PUT /api/admin/branches/:id/stock`)

Criterios:

- Puedo ver y editar cantidad disponible por `(sucursal, producto)`.
- Un producto puede tener stock en una sucursal y 0 / sin fila en otra.
- Se distingue visualmente `available` vs `reserved` (aunque el admin solo edite `available` al cargar).
- Un cliente no accede a estas rutas.

### HU-18 — Verificar y reservar stock al pedir — 5 pts

*Como sistema, quiero verificar y reservar stock al confirmar un pedido, y liberarlo si se cancela, para no vender lo que no hay.*

**RF:** RF-STK-02, RF-STK-04  
**Rutas:** sin pantalla nueva (checkout y cancelación existentes)  
**API:** integrada en `POST /api/orders`, `POST /api/orders/:id/cancel`, transición a `delivered` en admin

Criterios:

- Si no hay stock suficiente en la sucursal asignada, el checkout falla con mensaje claro (409).
- Tras confirmar, el stock queda reservado.
- Cancelar en `pending`/`confirmed` libera la reserva.
- Al marcar `delivered`, la reserva se confirma (descuento definitivo).
- Tests de backend: ok, sin stock, liberar al cancelar, descontar al entregar.

### HU-19 — Parámetros, radio y sucursales disponibles — 5 pts

*Como administrador, quiero ajustar radio y ETA; como cliente, quiero ver qué sucursales me cubren.*

**RF:** RF-ADM-08, RF-ADM-09, RF-BRN-03 (+ uso de RF-BRN-02 / RF-GEO-02 con radio)  
**Rutas:** `/admin/parameters`, `/branches` (cliente)  
**API:** `GET/PATCH /api/admin/parameters`, `GET /api/branches/available?lat=&lng=` (o `addressId=`)

Criterios:

- Admin edita al menos: radio de cobertura (km) y constantes de ETA usadas en el cálculo del Sprint 2.
- Al confirmar, solo se consideran sucursales **activas dentro del radio**; si ninguna, error.
- El cliente ve el listado de sucursales disponibles para su ubicación (nombre, dirección, distancia).
- RF-ADM-08: se listan los estados de pedido del sistema (lectura; no hace falta un editor de máquina de estados).

**Total frente nuevo: 3+4+3+6+5+5 = 26 pts**

---

## 5. Incremento visible (review 08/10)

**Demo (6–8 min):**

1. Admin: `/admin/stock` — cargar stock de un producto en la sucursal cercana; dejar otra sucursal en 0.
2. Admin: `/admin/parameters` — mostrar radio (p. ej. 5 km) y constantes de ETA.
3. Cliente: login → `/branches` (o desde cuenta) → sucursales que lo cubren.
4. Cliente: detalle de producto → elegir adicionales → carrito con badge → confirmar.
5. Si stock insuficiente: error visible. Con stock: pedido `pending` y stock reservado en admin.
6. Cliente cancela → stock liberado. Otro pedido hasta `delivered` → stock descontado.
7. Cliente: `/orders` historial → **Repetir** → carrito. Perfil: cambiar nombre. Forgot password (token demo) → nueva clave → login.
8. Admin: alta de un segundo administrador e inicio de sesión con ese usuario.
9. Celular: bottom bar + admin usable.

**No se demostra:** promociones, reportes, mapa, alertas de stock mínimo, Extensión 2.

---

## 6. Páginas y APIs de este sprint

**Cliente (nuevo / a completar):**

| Ruta | Uso |
|---|---|
| `/orders` | Historial (PEND-01) |
| `/orders/:id` | Ya existe; sumar repetir (PEND-02) si no está |
| `/account` | Perfil (HU-14) |
| `/forgot-password`, `/reset-password` | Recuperar clave (HU-15) |
| `/branches` | Sucursales disponibles (HU-19) |

**Admin (nuevo):**

| Ruta | Uso |
|---|---|
| `/admin/stock` | Stock por sucursal (HU-17) |
| `/admin/admins` | Alta/listado de admins (HU-16) |
| `/admin/parameters` | Parámetros + estados (HU-19) |

**API (nueva / extendida):**

| Método | Ruta | Uso |
|---|---|---|
| GET/PATCH | `/api/me` | Perfil |
| POST | `/api/auth/forgot-password` | Iniciar reset |
| POST | `/api/auth/reset-password` | Body: token + nueva clave |
| GET/POST | `/api/admin/admins` | Listado y alta |
| GET/PUT | `/api/admin/stock` | Stock por sucursal/producto |
| GET/PATCH | `/api/admin/parameters` | Parámetros |
| GET | `/api/branches/available` | Sucursales en radio |

Modelo nuevo: `Stock` (`branchId`, `productId`, `available`, `reserved`, unique compuesto).  
Modelo nuevo: `Parameter` (`key`, `value`).  
Opcional: `PasswordResetToken` (`userId`, `token`, `expiresAt`).

Nombres en inglés (dominio canónico). UI en español.

---

## 7. Tareas y reparto (5 integrantes)

Núcleo compartido (hoy / mañana): cerrar PEND en `main`, modelo Prisma `Stock` + `Parameter`, contrato de error 409 sin stock. **Nicolas mergea el modelo de stock primero.** Sin eso, checkout y pantallas admin se pisan.

### Pendiente del Sprint 2

| ID | Dueño | Rama sugerida |
|---|---|---|
| PEND-01 a PEND-06 | **Lucas** | `feat/lucas-orders-cliente` (o nueva desde `main`) |
| PEND-07 | **Celeste** | `feat/celeste-extras-ui` |

### Frente nuevo

| Dueño | Frente | Historias | Tareas concretas |
|---|---|---|---|
| **Nicolas** | Backend stock + params + auth cuenta | HU-18, HU-15 (API), HU-14 (API), HU-19 (API) | Prisma `Stock`/`Parameter`/reset token; checkout reserva; cancel libera; delivered descuenta; parameters; `branches/available`; tests |
| **Carla** | Admin stock, admins, parámetros | HU-16, HU-17, HU-19 (UI admin) | `/admin/stock`, `/admin/admins`, `/admin/parameters`. No toca `/frontend` |
| **Lucas** | Chrome + historial cliente | PEND-01…06 + enganche a `/account` | Dueño de `ClientLayout`; `/orders`; badge; bottom bar; Hola {nombre} |
| **Celeste** | Extras UI + perfil + forgot | PEND-07, HU-14 (UI), HU-15 (UI) | Detalle con extras; `/account`; forgot/reset |
| **Rafael** | Sucursales disponibles + docs | HU-19 (UI cliente) | `/branches`, consumo de radio/geo; actualizar esta ficha / RF si se cierra un supuesto |

Si aprieta el tiempo: no se recorta HU-17 ni HU-18 (stock). De cuenta, lo último es HU-16 (alta de admins). De PEND, lo último es PEND-03 (spacing del carrito).

Del 01/10 al 07/10: integrar el flujo de la sección 5.

Detalle de ramas (cuando exista): `docs/sprints/Plan-reparto-Sprint-3.md`.

---

## 8. Definición de terminado del sprint

- [ ] Las 6 HU (14–19) cumplen sus criterios.
- [ ] PEND-01 a PEND-07 cerrados en `main`.
- [ ] Flujo de demo de la sección 5 reproducible en local (deploy si da el tiempo; no bloqueante).
- [ ] App usable en viewport mobile (cliente con bottom bar; admin usable).
- [ ] Tests de backend: stock ok, sin stock (409), liberar al cancelar, descontar al entregar; reset password happy path.
- [ ] Nada de secretos en git (`.env` ignorado).
- [ ] Esta ficha en `/docs` y RF/alcance actualizados si cambia un supuesto.

---

## 9. Visión de lo que queda (Sprint 4 y 5)

No sustituye las fichas futuras. Sirve para no abrir frentes de más en este sprint.

| Sprint | Review | Foco |
|---|---|---|
| **3** (este) | 08/10 | Cuenta completa, stock (Ext. 1), parámetros/radio, configs extras en UI, deuda S2 |
| **4** | 29/10 | Promociones (RF-ADM-05, RF-PRM-01/02), reportes base (RF-RPT-01…04), demo estable para **medio término 22/10** |
| **5** | 19/11 | Reportes extra Ext. 1 (RF-RPT-10…22), RF-STK-05 si hay tiempo, testing, carpeta (12/11), demo final 27/11 |

Si hay que recortar más adelante: mapa, Extensión 2 y alertas de stock. **No se recorta** el flujo de pedido ni el stock en checkout una vez abierto.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Abrir promociones o reportes “porque es fácil” | No llega stock el 07/10 | Recortar esas HU, nunca HU-17/18 |
| La deuda PEND se come el sprint | Demo sin inventario | Primera semana = solo PEND + modelo Stock; segunda = operación |
| Política de reserva se discute demasiado | HU-18 no cierra | Contrato de esta ficha, sin variantes |
| SMTP / mail real en recuperar clave | HU-15 no cierra | Token demostrable; mail real queda plus |
| 5 personas en checkout/stock | Conflictos | Nicolas mergea Stock primero. Rama por frente |
| Radio deja pedidos “sin sucursal” en demo | Checkout roto en review | Seed con sucursal dentro del radio de la dirección de demo |

---

## 11. Acta (completar en la planning del 24/09)

```
Fecha:
Presentes:
Ficha aceptada (sí/no):
Ajustes a las HU / PEND:
Dueños Carla / Nicolas / Lucas / Celeste / Rafael:
Ítems nuevos del review Sprint 2 (PEND-08+):
Preguntas a docentes y respuestas:
```

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 24/09/2026 | Versión inicial: stock (Ext. 1), cuenta, parámetros/radio, deuda S2; quedan Sprint 4 y 5 |
