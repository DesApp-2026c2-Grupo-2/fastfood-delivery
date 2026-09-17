# Ficha Sprint 2

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 1.4  
**Actualizado:** 17/09/2026  
**Grupo:** 2 · 5 integrantes (Celeste, Carla, Lucas, Nicolas, Rafael)  
**Sprint:** 2 de 5  
**Planning:** 10/09/2026 (misma clase que el review del Sprint 1)  
**Review:** 24/09/2026  
**Corte de tareas:** 23/09/2026 23:59 (solo cuenta lo mergeado a `main` hasta esa hora)  
**Duración:** 2 semanas  
**Extensiones:** fuera de este sprint  
**Stack:** React + Vite (front cliente y admin) · NestJS + TypeScript (back) · PostgreSQL + Prisma (datos) · JWT

---

## 1. Objetivo del sprint

Al 24/09 se puede demostrar, en un celular, este flujo de punta a punta **sobre un pedido que ya existe**:

1. Un **administrador** ve los pedidos, avanza el estado (Pendiente → Confirmado → En preparación → Listo → En camino → Entregado) y cada cambio queda con fecha y hora.
2. Un **cliente** abre ese pedido y ve: sucursal que lo prepara, estado actual, historial de cambios y tiempo estimado de entrega.
3. El cliente puede **cancelar** si el pedido todavía lo permite, consultar el **historial** de pedidos y **repetir** uno anterior (el detalle vuelve al carrito).
4. Quedan resueltas las **mejoras de la devolución del Sprint 1** (sección 2).

Si el ciclo de vida no cierra, el sprint no está cumplido, aunque haya más pantallas a medias.

El Sprint 1 dejó el pedido **creado**. Este sprint lo deja **vivo hasta la entrega** y corrige lo que marcaron en el review.

---

## 2. Devolución del Sprint 1

Pedidos del review. Entran a este sprint (además del ciclo de vida del pedido).

### App administrativa

| ID | Qué pidieron | Dueño | Qué hay que hacer |
|---|---|---|---|
| DEV-01 | Responsividad del admin; cambiaría el menú | **Carla** | El backoffice tiene que usarse en celular. El menú actual no alcanza: hay que rediseñarlo. |

### App cliente

| ID | Qué pidieron | Dueño | Qué hay que hacer |
|---|---|---|---|
| DEV-02 | Latitud y longitud: pedir permiso para obtener los datos | **Rafael** | Al cargar una dirección, pedir geolocalización del dispositivo. El usuario puede aceptar o cargar a mano si niega el permiso. |
| DEV-03 | Mejorar diseño de las direcciones | **Rafael** | La pantalla `/account/addresses` se ve mal; rearmar layout y jerarquía visual. |
| DEV-04 | Estética del carrito: elementos muy pegados | **Lucas** | Más aire entre ítems, total y acciones. |
| DEV-05 | Botón volver al menú, muy pegado al header | **Celeste** | Separarlo del topbar; que no se pise con el header. |
| DEV-06 | Al agregar al carrito, volver al menú (“Seguir comprando”). Conteo en el header | **Lucas** | Tras agregar, ir a `/products` (o un CTA claro). El ícono/link del carrito muestra la cantidad de ítems. |
| DEV-07 | Validaciones de formularios en HTML; pasarlas a JS | **Celeste** | Login, registro, confirmar pedido: validar en JavaScript, con mensajes visibles. No alcanzar con `required` del browser. |
| DEV-08 | Salir no cierra bien la sesión; logueado tiene que verse el nombre | **Lucas** | “Salir” borra el token y vuelve a visitante. Si hay sesión: **Hola {nombre}**. |
| DEV-09 | Revisar el asunto del token | **Nicolas** | El JWT tiene que persistir, ir en `Authorization` y, si expira o es inválido, sacar al usuario al login. |
| DEV-10 | Los adicionales que sean para la hamburguesa | **Nicolas** (API) + **Celeste** (UI) | En el producto hamburguesa: extras / adicionales al agregar al carrito (arranca RF-CAT-04, acotado a ese producto). |
| DEV-11 | El menú mobile que sea bottom bar | **Lucas** | En celular, la navegación del cliente es una barra inferior (catálogo, carrito, cuenta/pedidos). |

---

## 3. Alcance

### RF incluidos

| ID | Requerimiento |
|---|---|
| RF-CLI-06 | Consultar pedidos anteriores |
| RF-ORD-02 | Estados del pedido (máquina completa) |
| RF-ORD-03 | Cambio de estado con fecha y hora |
| RF-ORD-04 | Cancelación |
| RF-TRK-01 | Consultar evolución del pedido |
| RF-TRK-02 | Información de seguimiento (sucursal, estado, timeline, ETA) |
| RF-TRK-03 | Cálculo de tiempo estimado de entrega |
| RF-HIS-01 | Historial de pedidos (detalle, importe, fecha, estado) |
| RF-HIS-02 | Repetir un pedido anterior |
| RF-ADM-10 | Gestión de pedidos en backoffice (listado + cambio de estado) |

**Incluido sin RF extra:** la sucursal asignada en el Sprint 1 (activa más cercana) se **muestra** en seguimiento y en el detalle del historial. Eso arranca la visibilidad de RF-BRN-03, sin abrir todavía el listado de sucursales disponibles por radio.

### Simplificaciones

| Tema | En Sprint 2 | Después |
|---|---|---|
| Asignación de sucursal | Sigue: **activa más cercana** (Haversine). No se reabre | Radio de cobertura, horario, stock, pedidos pendientes |
| Sucursales disponibles | Se muestra la **asignada** (nombre, dirección, distancia si está a mano) | Listado de todas las que cubren la ubicación (RF-BRN-03 completo) |
| Quién cambia estados | **Admin** avanza la máquina. El **cliente** solo cancela en estados permitidos | — |
| Cancelación | Cliente y admin: desde `pending` o `confirmed` | Ampliar a `preparing` si el negocio lo pide |
| ETA | Fórmula fija: `prep_base + (ítems × k) + traslado`. Constantes en código (minutos) | Parámetros editables (RF-ADM-09) |
| Historial de estados | Tabla `OrderStatusHistory` (estado, fecha/hora, actor) | Motivo de cancelación rico, notificaciones |
| Pedido guest (S1) | No entra al historial ni al seguimiento de cuenta. El hilo de demo es **cliente logueado** | Si se mantiene guest, tracking por id/email |
| Lat/lng | Sprint 1: se cargaban a mano | **DEV-02:** permiso del dispositivo; fallback a mano si niega |
| Adicionales | No (solo observaciones) | **DEV-10:** extras en hamburguesa. El resto de configs, después |
| Recuperar contraseña | No | Sprint 3 |
| Perfil / alta de admins | No (DEV-08 muestra el nombre que ya está en el login) | Editar perfil: Sprint 3 |
| Mapa | No | Optativo, post medio término |

### Fuera de alcance explícito

RF-CLI-03, RF-CLI-04, RF-ADM-03, RF-ADM-05 a RF-ADM-09, RF-BRN-02/03 más allá de la regla simple, RF-CAT-04 salvo adicionales de hamburguesa (DEV-10), RF-GEO-03, RF-RPT-*, toda Extensión 1 y 2.

---

## 4. Historias de usuario

Estimación en puntos. Total del sprint: **25 pts**.

**DoD de cada historia:** funciona en frontend y backend, usable en viewport mobile, mergeada a `main` antes del 23/09 23:59.

### Estados (contrato del sprint)

Lista del enunciado, nombres canónicos en inglés:

| Código | UI (español) |
|---|---|
| `pending` | Pendiente |
| `confirmed` | Confirmado |
| `preparing` | En preparación |
| `ready` | Listo para entregar |
| `on_the_way` | En camino |
| `delivered` | Entregado |
| `cancelled` | Cancelado |

Transiciones válidas:

```
pending    → confirmed | cancelled
confirmed  → preparing | cancelled
preparing  → ready
ready      → on_the_way
on_the_way → delivered
delivered  (terminal)
cancelled  (terminal)
```

El enum ya existe en Prisma (Sprint 1). Falta usarlo: transiciones, historial y pantallas.

### HU-09 — Historial de pedidos — 4 pts

*Como cliente, quiero ver mis pedidos anteriores con detalle, importe, fecha y estado, para saber qué pedí y cómo terminó.*

**RF:** RF-CLI-06, RF-HIS-01  
**Rutas:** `/orders`, `/orders/:id` (el detalle comparte pantalla con el seguimiento)  
**API:** `GET /api/orders`, `GET /api/orders/:id`

Criterios:

- Solo veo **mis** pedidos (JWT cliente). Un guest no usa esta pantalla.
- El listado muestra fecha, importe, estado y sucursal.
- El detalle muestra ítems (nombre, cantidad, observaciones, subtotal), dirección, sucursal e importe.
- Orden: más recientes primero.

### HU-10 — Seguimiento del pedido — 6 pts

*Como cliente, quiero ver cómo evoluciona mi pedido, para saber quién lo prepara, en qué está y cuándo llega.*

**RF:** RF-TRK-01, RF-TRK-02, RF-TRK-03  
**Rutas:** `/orders/:id`  
**API:** `GET /api/orders/:id` (incluye sucursal, estado, historial de cambios, ETA)

Criterios:

- Se ve la sucursal que prepara / preparó el pedido.
- Se ve el estado actual (etiqueta en español).
- Se ve el **timeline**: cada cambio con fecha y hora.
- Se ve un **tiempo estimado de entrega** en minutos (o reloj), calculado por el backend.
- ETA de este sprint: `15 + (cantidad_de_ítems × 3) + minutos_de_traslado`. Traslado = `ceil(distancia_km / 0.5)` (aprox. 30 km/h en ciudad). Si el pedido está `delivered` o `cancelled`, no se promete ETA a futuro.

### HU-11 — Cancelar pedido — 3 pts

*Como cliente, quiero cancelar un pedido que todavía no empezó a prepararse, para no recibirlo si me arrepentí.*

**RF:** RF-ORD-04  
**Rutas:** acción en `/orders/:id`  
**API:** `POST /api/orders/:id/cancel`

Criterios:

- Puedo cancelar si el estado es `pending` o `confirmed`.
- Si está `preparing` o posterior, el botón no está (o el API responde 409) y el pedido no cambia.
- El admin también puede cancelar en esos mismos estados desde el backoffice.
- Queda un registro en el historial de estados (`cancelled` + fecha/hora).

### HU-12 — Repetir un pedido anterior — 3 pts

*Como cliente, quiero repetir un pedido anterior, para no armar el carrito de nuevo.*

**RF:** RF-HIS-02  
**Rutas:** acción en `/orders` o `/orders/:id`  
**API:** `POST /api/orders/:id/repeat`

Criterios:

- Copia los ítems (producto, cantidad, observaciones) al carrito del usuario.
- Si un producto ya no está `available`, se omite o se avisa (no se confirma un pedido inválido).
- Después de repetir, voy al carrito. Confirmar es el flujo de checkout que ya existe (Sprint 1).
- No se clona el pedido viejo: se arma un carrito para un pedido **nuevo**.

### HU-13 — Pedidos en admin y máquina de estados — 9 pts

*Como administrador, quiero ver los pedidos y cambiar su estado, para llevar cada uno hasta la entrega.*

**RF:** RF-ORD-02, RF-ORD-03, RF-ADM-10  
**Rutas:** `/admin/orders`, `/admin/orders/:id`  
**API:** `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `POST /api/admin/orders/:id/status`

Criterios:

- Listado con filtro por estado (como mínimo).
- Detalle: cliente, sucursal, dirección, ítems, importe, estado, timeline.
- El admin solo puede pasar al **siguiente estado válido** (no salta de `pending` a `delivered`).
- Cada cambio persiste en `OrderStatusHistory` con fecha/hora y quién lo hizo (admin).
- Un cliente no accede a estas rutas.

**Total: 4+6+3+3+9 = 25 pts**

---

## 5. Incremento visible (review 24/09)

**Demo (5–7 min):**

1. Cliente logueado confirma un pedido (flujo Sprint 1, 30 s). Queda `pending`.
2. Admin en `/admin/orders`: abre ese pedido → Confirmado → En preparación → Listo → En camino.
3. Cliente en `/orders/:id`: se ve sucursal, estado **En camino**, timeline con horarios y ETA.
4. Admin pasa a **Entregado**. El cliente refresca: estado final, sin ETA a futuro.
5. Otro pedido: el cliente lo **cancela** desde Pendiente. Aparece en el historial como Cancelado.
6. Desde un pedido entregado: **Repetir** → el carrito se llena → se puede ir a checkout.
7. Mostrar que en celular el layout no se rompe (cliente con bottom bar; admin usable).
8. Mostrar dos ítems de la devolución: geo con permiso al cargar dirección, y “Hola {nombre}” + conteo del carrito.

**No se demostra:** reportes, mapa, stock, promociones, recuperar password, alta de admins.

---

## 6. Páginas y APIs de este sprint

**Cliente (nuevo):** `/orders`, `/orders/:id`  
**Admin (nuevo):** `/admin/orders`, `/admin/orders/:id`

**API (nueva):**

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/orders` | Historial del cliente |
| GET | `/api/orders/:id` | Detalle + seguimiento + timeline + ETA |
| POST | `/api/orders/:id/cancel` | Cancelar (cliente) |
| POST | `/api/orders/:id/repeat` | Copiar ítems al carrito |
| GET | `/api/admin/orders` | Listado (filtro `?status=`) |
| GET | `/api/admin/orders/:id` | Detalle admin |
| POST | `/api/admin/orders/:id/status` | Body: `{ "status": "confirmed" }` (siguiente válido) |
| POST | `/api/admin/orders/:id/cancel` | Cancelar (admin), o el mismo endpoint de status con `cancelled` |

Modelo nuevo: `OrderStatusHistory` (`orderId`, `status`, `changedAt`, `changedByUserId`). Al crear el pedido (Sprint 1) también se inserta el primer evento `pending`.

Nombres en inglés (dominio canónico). UI en español.

---

## 7. Tareas y reparto (5 integrantes)

Núcleo compartido (hoy / mañana): tabla `OrderStatusHistory`, contrato JSON de `GET /orders/:id` (estado + historial + ETA), etiquetas en español. **Nicolas mergea el modelo primero.** Sin eso, las pantallas se pisan.

### Pendiente del Sprint 1 (devolución)

Cada ítem DEV tiene dueño. No queda “para el que pueda”.

| ID | Pendiente del review | Dueño | Cómo se resuelve |
|---|---|---|---|
| DEV-01 | Admin no es usable en celular; hay que cambiar el menú | **Carla** | Nuevo nav/layout en `backend/admin` |
| DEV-02 | Lat/lng a mano; pedir permiso del dispositivo | **Rafael** | Geolocation API al cargar dirección; fallback a mano |
| DEV-03 | Diseño de direcciones | **Rafael** | Rearmar `/account/addresses` |
| DEV-04 | Carrito: elementos pegados | **Lucas** | Spacing en `/cart` |
| DEV-05 | Botón volver al menú, pegado al header | **Celeste** | Separarlo del topbar en detalle de producto |
| DEV-06 | Al agregar, volver al menú + conteo en el carrito | **Lucas** | CTA “Seguir comprando” → `/products`; badge en el header |
| DEV-07 | Validaciones solo HTML | **Celeste** | Validar login, registro y checkout en JS |
| DEV-08 | Salir no cierra sesión; no se ve el nombre | **Lucas** | “Hola {nombre}”; Salir borra el token |
| DEV-09 | Asunto del token | **Nicolas** | JWT en header, persistencia, 401 → login |
| DEV-10 | Adicionales de la hamburguesa | **Nicolas** (API) + **Celeste** (UI) | Extras al agregar al carrito |
| DEV-11 | Menú mobile = bottom bar | **Lucas** | Barra inferior en el cliente |

### Frente nuevo (ciclo de vida del pedido)

| Dueño | Frente | Historias | Tareas concretas |
|---|---|---|---|
| **Carla** | Admin pedidos | HU-13 (UI) | `/admin/orders` listado + detalle + siguiente estado / cancelar. No toca el front del cliente |
| **Nicolas** | Backend | HU-13/10/11/12 (API) | Prisma `OrderStatusHistory`, transiciones, `GET` cliente/admin, `POST` status/cancel/repeat, ETA, tests |
| **Lucas** | Frontend cliente | HU-09, HU-12 | `/orders` listado, repetir al carrito |
| **Celeste** | Frontend cliente | HU-10 (UI) | `/orders/:id` sucursal + timeline + ETA |
| **Rafael** | Cliente + docs | HU-11 (UI) | Botón cancelar en el detalle, ficha/RF al día |

Si aprieta el tiempo: no se recorta HU-13 (admin) ni el API de Nicolas. De la devolución, lo último es **DEV-10**.

Del 17/09 al 23/09: integrar el flujo de la sección 5 y cerrar DEV-01 a DEV-11.

Detalle de ramas y “qué no tocar”: `docs/sprints/Plan-reparto-Sprint-2.md`.

---

## 8. Definición de terminado del sprint

- [ ] Las 5 HU cumplen sus criterios.
- [ ] Flujo de demo de la sección 5 reproducible en local (y en el deploy de Mordi si da el tiempo; no es bloqueante).
- [ ] Los ítems DEV-01 a DEV-11 de la devolución están resueltos.
- [ ] App usable en viewport mobile.
- [ ] Tests de backend (además de los del Sprint 1): transiciones válidas, transición inválida (409), cancelación permitida y no permitida. Script `npm test` en backend.
- [ ] Nada de secretos en git (`.env` ignorado).
- [ ] Esta ficha en `/docs` y RF/alcance actualizados si cambia un supuesto.

---

## 9. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Abrir stock, promos o recuperar password “porque es fácil” | No llega el seguimiento el 23/09 | Recortar esas HU, nunca el timeline ni el cambio de estado |
| La devolución (DEV-*) se come el ciclo de vida | Demo sin estados ni historial | El hilo HU-09 a HU-13 no se recorta; si aprieta, DEV-10 (adicionales) queda para el final |
| HU-13 se come el sprint (listado admin + máquina + historial) | Demo sin que el cliente vea cambios | El 17/09 alcanza con pending → confirmed → preparing visible en cliente |
| ETA se discute demasiado | HU-10 no cierra | Fórmula de esta ficha, sin parámetros editables |
| 5 personas en `orders` | Conflictos de merge | Contrato JSON el día 1. **Nicolas** mergea el modelo primero. Rama por frente |
| Pedidos guest del Sprint 1 | Confusión en el historial | Historial = solo `userId` del cliente logueado |

---

## 10. Acta (completar en la planning del 10/09)

```
Fecha:
Presentes:
Ficha aceptada (sí/no):
Ajustes a las HU:
Dueños Carla / Nicolas / Lucas / Celeste / Rafael:
Preguntas a docentes y respuestas:
```

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 07/09/2026 | Versión inicial en la carpeta |
| 1.1 | 07/09/2026 | Se saca la justificación del 25% del TP |
| 1.2 | 17/09/2026 | Entra la devolución del Sprint 1 (DEV-01 a DEV-11) |
| 1.3 | 17/09/2026 | Reparto: Carla admin, Nicolas backend, Lucas frontend |
| 1.4 | 17/09/2026 | El pendiente del Sprint 1 queda asignado ítem por ítem en el reparto |
