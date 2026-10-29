# Ficha Sprint 5

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 1.0 (borrador para la planning)  
**Actualizado:** 29/10/2026  
**Grupo:** 2 · 5 integrantes (Celeste, Carla, Lucas, Nicolas, Rafael)  
**Sprint:** 5 de 5 (el último)  
**Planning:** 29/10/2026 (misma clase que el review del Sprint 4)  
**Seguimiento:** 05/11/2026  
**Carpeta (PDF único):** 12/11/2026  
**Review:** 19/11/2026  
**Corte de tareas:** 18/11/2026 23:59 (solo cuenta lo mergeado a `main` hasta esa hora)  
**Presentación final:** 27/11/2026  
**Duración:** 3 semanas  
**Extensiones:** sigue **Extensión 1** (promociones y reportes extra). Extensión 2 queda fuera  
**Stack:** React + Vite (front cliente y admin) · NestJS + TypeScript (back) · PostgreSQL + Prisma (datos) · JWT

**Después de este sprint no queda otro.** Lo que no esté en `main` el 18/11 no se muestra el 19/11 ni el 27/11.

Los IDs siguen los de las fichas (HU-23 y DEV-25 cerraron el Sprint 4). Para este sprint manda esta ficha.

Este sprint toma la lista de pendientes armada el 29/10 y la ordena en tres niveles: **núcleo** (tiene que estar), **segundo nivel** (si el núcleo está verde el 09/11) y **fuera**. Varias cosas de la lista **ya están hechas en el backend** (PR #30) y solo falta la pantalla: eso va primero porque es barato y se ve.

---

## 1. Objetivo del sprint

Al **lunes 09/11 a la noche** tienen que estar en `main`:

1. El admin **ve los clientes que compraron** y **asigna roles** (super admin / solo pedidos). El backend ya existe; falta la UI.
2. El pedido tiene un **código corto de 6 dígitos** y un **medio de pago** elegido en el checkout (simulado).
3. El cliente **junta sellos**: cada pedido entregado suma uno y al llegar a 10 recibe un premio que puede usar en el próximo pedido. Es la “promo con condición” que el profesor dejó para este sprint.
4. Los reportes tienen **filtro por fecha y sucursal**, **gráficos** y **descarga**, y suman los reportes de pedidos y de promociones de la Extensión 1.

Si falta una de las cuatro, el sprint no está cumplido. Del 10 al 16/11 entra el segundo nivel. El 17 y 18/11 son de pruebas y ensayo, no de features.

El Sprint 4 dejó el pedido elegible y con precio promocional. Este sprint cierra la Extensión 1 (reportes y promo con condición), le da al admin el control de quién entra y qué ve, y pule el cliente para la presentación final.

---

## 2. Estado y lista de pendientes

### 2.1 Qué cerró el Sprint 4 (en `main`, no rehacer)

| Qué | PR |
|---|---|
| Retiro o domicilio, elección de sucursal, avisos que desaparecen (HU-23, DEV-24, DEV-18) | #26 |
| Reportes de productos (HU-22) | #27 |
| Promo porcentual automática y 2x1 aplicados al confirmar (HU-21) | #28, #29 |
| ABM de clientes, roles de admin, costo de envío por km (solo backend + checkout) | #30 |
| Términos y condiciones y pie de página | #31 |

### 2.2 Qué de la lista **ya está hecho** (no replanificar)

| Ítem de la lista | Estado | Dónde |
|---|---|---|
| Precios de envío → definir un criterio | **Hecho.** Precio por km × distancia, cobrando cada cuadra (D57). El admin lo edita en `/admin/parameters`. El checkout muestra el envío por sucursal | `delivery-fees/`, `CheckoutPage.tsx` |
| Usuarios que compraron, en el admin | **Backend hecho** (`GET /api/admin/customers?withOrders=true`). **Falta la pantalla** → HU-24 | `customers/`, `docs/tecnica/API-clientes-y-envios.md` §2 |
| Roles: super admin y uno que solo ve pedidos | **Backend hecho** (`AdminRole`, 403 en el resto). **Falta la UI** (campo en el ABM y menú según rol) → HU-24 | `auth/admin.guard.ts`, API-clientes-y-envios §6 |
| Código postal en la búsqueda de direcciones | **A medias.** El geocode ya pide `addressdetails` y devuelve `postcode`, pero `Address` no lo guarda ni se puede buscar por CP o provincia → HU-34 | `branches/geocode.ts` |
| Revisar cómo se ve el pedido en retiro | **A medias.** El detalle ya dice “Retiro” en vez de “Entrega”. Falta revisar la confirmación del checkout y el admin → DEV-30 | `OrderDetailPage.tsx` |

### 2.3 Qué quedó del Sprint 4 sin hacer

| Qué | Estado hoy | Decisión |
|---|---|---|
| Filtro de fechas en los reportes (`from`, `to`) | El API no recibe parámetros | Entra en HU-28, junto con la sucursal |
| Cupón (`code`) y promo `fixed` | El modelo quedó con `percent` y `two_for_one`, sin código | **No entra.** El premio de sellos (HU-27) cubre el caso de “un descuento para vos” |
| Mail de recuperar clave (DEV-25) | Hay soporte de SMTP en `password-reset.service.ts` | Se verifica en el ensayo; no suma trabajo |

### 2.4 La lista, clasificada

| Ítem | Nivel | Dónde queda |
|---|---|---|
| Sello por compra, premio a las 10 | Núcleo | HU-27 |
| Lo de las 10 compras con un sellito en el carrito/checkout | Núcleo | HU-27 (parte cliente) |
| Código del pedido de 6–8 dígitos | Núcleo | HU-25 |
| Métodos de pago simulados (Lucas) | Núcleo | HU-26 |
| Usuarios que compraron / roles en el admin | Núcleo | HU-24 |
| Reportes: filtro fecha y sucursal, gráficos, descarga | Núcleo | HU-28 |
| Dar de baja la cuenta | Núcleo | HU-29 |
| Banner de promo solo en catálogo, detalle y carrito | Núcleo (ajuste) | DEV-26 |
| Detalle de la hamburguesa no aparece sin sesión | Núcleo (bug) | DEV-27 |
| Confirmación del pedido que se actualiza en vivo | Núcleo (ajuste) | DEV-28 |
| Auto scroll a “Agregar al carrito” desde el texto de la promo | Núcleo (ajuste) | DEV-29 |
| Revisar el pedido en retiro | Núcleo (ajuste) | DEV-30 |
| Adicionales aparte, marcados por producto | Segundo nivel | HU-30 |
| Envío gratis | Segundo nivel | HU-31 |
| Top 3 compradores con descuento | Segundo nivel | HU-32 |
| Dashboard con gráficos | Segundo nivel | HU-33 |
| Código postal y provincia en direcciones | Segundo nivel | HU-34 |
| Nosotros, contacto y mapa de sucursales | Segundo nivel | HU-35 |
| Reporte de incidencia con un pedido | Segundo nivel | HU-36 |
| Combos | **Fuera** | Ver §3 |

---

## 3. Alcance

### RF incluidos

| ID | Requerimiento | Dónde |
|---|---|---|
| RF-PRM (condición) | Promo condicionada a cantidad de pedidos (idea del profesor, 08/10) | HU-27 |
| RF-RPT-10 | Pedidos por día | HU-28 |
| RF-RPT-11 | Pedidos por sucursal | HU-28 |
| RF-RPT-12 | Pedidos por estado | HU-28 |
| RF-RPT-13 | Tiempo promedio de entrega | HU-28 |
| RF-RPT-14 | Pedidos cancelados | HU-28 |
| RF-RPT-15 | Clientes con más pedidos | HU-28 (y HU-32 lo usa) |
| RF-RPT-18 | Ventas por sucursal | HU-28 |
| RF-RPT-19 | Productos vendidos por sucursal | HU-28 (sale del filtro por sucursal) |
| RF-RPT-21 | Promociones más utilizadas | HU-28 |

**Si sobra tiempo:** RF-RPT-16 (clientes nuevos por período), RF-RPT-17 (clientes inactivos), RF-RPT-20 (pedidos atendidos por sucursal, casi igual a RF-RPT-11), RF-RPT-22 (impacto de una promo).

**Sin RF nuevo:** código corto, medio de pago, baja de cuenta, adicionales por producto, CP y provincia, nosotros, contacto, incidencias, mapa de sucursales.

### Simplificaciones

| Tema | En Sprint 5 | Fuera |
|---|---|---|
| Medio de pago | Se elige y se guarda. **No se cobra nada.** La tarjeta se valida en el front y no viaja al servidor | Pasarela real (Mercado Pago, etc.) |
| Sellos | Uno por pedido **entregado**, solo con cuenta. Premio: un % de descuento para un pedido | Varios niveles, vencimiento de sellos |
| Premio y promo | El premio **reemplaza** a la promo automática en ese pedido (sigue siendo una por pedido) | Acumulables |
| Envío gratis | Por monto mínimo (parámetro) | Envío gratis como tipo de promo con vigencia |
| Top 3 | El admin lo dispara a mano desde el reporte, una vez por mes | Cron automático |
| Descarga de reportes | CSV generado en el navegador | PDF, Excel |
| Gráficos | Barras y líneas simples (una librería, en el admin) | Tableros configurables |
| Código del pedido | 6 dígitos numéricos al azar, único | Prefijo por sucursal |
| Baja de cuenta | Lógica, la misma de D55 | Borrado físico y anonimizado |
| Contacto | Datos, teléfonos de sucursales y `mailto:` | Formulario que manda mail |

### Fuera de alcance explícito

**Combos.** Tocan carrito, stock (reservar varios productos por una línea), promo (¿el combo ya es una promo?), reportes (¿cuenta el combo o sus productos?) y admin. Es un frente grande para el último sprint y lo que se rompe es el flujo de pedido, que no se recorta. Si el grupo igual lo quiere, la versión mínima es un **producto** con categoría “Combos” y una descripción, con stock propio: no descuenta stock de los componentes.

También fuera: cupón, promo `fixed`, promos acumulables, RF-STK-05 (alertas de stock), RF-GEO-03 (recorrido), Extensión 2, pasarela de pago real.  
No se reabre la máquina de estados. El stock solo se toca si entra HU-30.

---

## 4. Historias de usuario

Estimación en puntos. **Núcleo: 26 pts** (HU-24 a HU-29). Segundo nivel: 21 pts, en orden de prioridad; se toma lo que entre del 10 al 16/11. DEV-26 a DEV-30 no suman puntos.

**DoD de cada historia:** funciona en frontend y backend, usable en viewport mobile, con test de backend si cambia una regla, mergeada a `main` antes del 18/11 23:59.

### Contrato de sellos (HU-27)

```
Quién junta
  solo clientes con cuenta. El invitado no junta sellos

Cuándo suma un sello
  cuando el pedido pasa a delivered (no al confirmar)
  un pedido cancelado nunca suma
  sellos = pedidos entregados del cliente − (premios ganados × STAMPS_PER_REWARD)

Cuándo se gana el premio
  al pasar a delivered, si la cantidad de pedidos entregados es múltiplo de STAMPS_PER_REWARD (10)
  se crea un LoyaltyReward { userId, source: "stamps", percent, earnedAt, usedAt: null }
  percent = parámetro loyalty_reward_percent (por defecto 20)

Cómo se usa
  en el checkout, si tiene un premio sin usar: "Usar mi premio (20%)"
  si lo usa, el pedido lleva ese descuento y NO la promo automática (una por pedido)
  descuento = round(subtotal × percent / 100, 2), solo sobre productos (D58: el envío no se descuenta)
  al confirmar se marca usedAt y orderId
  si ese pedido se cancela, el premio vuelve a estar disponible (usedAt = null)

Qué ve el cliente
  en /account y en el checkout: "7 de 10 sellos" con los 10 casilleros
  en la confirmación: "Este pedido te suma un sello cuando lo recibas"
```

`Order` guarda `promotionName` con “Premio por 10 compras” (así historial, detalle y reportes no cambian) y `rewardId` opcional.

### Contrato de código de pedido (HU-25)

```
Order.code: string de 6 dígitos, único, entre 100000 y 999999
Se genera al crear el pedido; si choca con otro, se reintenta (hasta 5 veces)
Pedidos viejos: la migración les asigna uno
El id (cuid) sigue siendo la clave; el código es lo que se muestra y lo que se busca
GET /api/admin/orders?code=123456 busca por código
```

### Contrato de medio de pago (HU-26)

```
Order.paymentMethod: cash | transfer | card      (obligatorio en pedidos nuevos; los viejos quedan en cash)

cash      delivery: "Pagás al recibir". Opcional: "¿Con cuánto pagás?" (para el vuelto, ≥ total)
          pickup:   "Pagás en el local"
transfer  se muestran alias y CBU de demo (parámetros). El pedido se crea igual, en pending
card      formulario: número (Luhn), vencimiento (no vencido), CVV (3–4), titular
          se valida en el front y NO se manda al servidor. Solo se guarda paymentMethod = card
          (y, como mucho, los últimos 4 dígitos para mostrar)
```

El pago **no cambia el estado** del pedido ni el stock. Es un dato más del pedido que ven el cliente y el admin.

### HU-24 — Pantallas de clientes y roles en el admin — 3 pts

*Como super admin, quiero ver quiénes compraron y darle a otro admin un rol que solo vea pedidos, para separar quién opera de quién consulta.*

**Rutas:** `/admin/customers`, `/admin/customers/:id`, `/admin/admins` (campo nuevo)  
**API:** ya existe — `docs/tecnica/API-clientes-y-envios.md` §2 y §6

Criterios:

- Listado con búsqueda, filtro “Solo los que compraron” y habilitados / deshabilitados. Columnas: nombre, email, pedidos, total gastado, último pedido.
- Detalle con direcciones y últimos pedidos (link al pedido). Editar nombre y email. Habilitar / deshabilitar con confirmación.
- En el alta y edición de admin, selector de rol. Los mensajes 409 del API se muestran tal cual.
- Con `orders_viewer`, el menú solo muestra Pedidos, no hay botones para cambiar estado ni cancelar, y un 403 vuelve a Pedidos.
- En la app de clientes, el login muestra el 403 “Tu cuenta está deshabilitada”.

### HU-25 — Código corto de pedido — 2 pts

*Como cliente y como admin, quiero un código corto del pedido, para dictarlo por teléfono o buscarlo rápido.*

**Rutas:** `/checkout` (confirmación), `/orders`, `/orders/:id`, `/admin/orders`, `/admin/orders/:id`  
**API:** `code` en todas las respuestas de pedido; `?code=` en `GET /api/admin/orders`

Criterios:

- Contrato de arriba. `OrderCode` muestra `#123456` en vez del cuid.
- El admin busca por código en el listado.
- Test: dos pedidos no comparten código; pedido viejo tiene código después de migrar.

### HU-26 — Medio de pago simulado — 3 pts

*Como cliente, quiero elegir cómo pago (efectivo, transferencia o tarjeta), para saber qué hacer cuando llega el pedido.*

**Dueño propuesto:** Lucas  
**Rutas:** `/checkout`, `/orders/:id`, `/admin/orders/:id`  
**API:** `paymentMethod` (y `cashAmount?`) en `POST /api/orders` y `POST /api/orders/guest`

Criterios:

- Contrato de arriba. Sin medio elegido no se confirma.
- En retiro, efectivo dice “en el local”.
- Los datos de tarjeta no aparecen en ninguna request (se revisa en la pestaña Network en el ensayo).
- El detalle (cliente y admin) dice el medio de pago.
- Test: pedido sin `paymentMethod` → 400; `cashAmount` menor que el total → 400.

### HU-27 — Sellos: a las 10 compras, un premio — 8 pts

*Como cliente, quiero que cada pedido que recibo me sume un sello y a los 10 me den un descuento, para que me convenga volver a pedir.*

**Rutas:** `/account`, `/cart`, `/checkout`, `/orders/:id`  
**API:** `GET /api/me/loyalty` → `{ stamps, stampsPerReward, rewards: [{ id, percent, earnedAt }] }`; `useRewardId?` en `POST /api/orders` y en `POST /api/promotions/quote`

Criterios:

- Contrato de arriba.
- La tarjeta de sellos se ve en `/account` y en el checkout (con sesión). El invitado ve “Creá una cuenta y juntá sellos”.
- La cotización con `useRewardId` devuelve el descuento del premio en vez de la promo automática.
- Un premio de otro usuario o ya usado → 400 y no se crea el pedido.
- `stamps_per_reward` y `loyalty_reward_percent` se editan en `/admin/parameters`.
- Seed de demo: un cliente con 9 pedidos entregados, así en la demo el décimo da el premio.
- Tests: entregar el 10.º crea el premio; un cancelado no suma; usar el premio reemplaza la promo; cancelar el pedido devuelve el premio; no se puede usar dos veces.

### HU-28 — Reportes con filtros, gráficos y descarga — 8 pts

*Como administrador, quiero filtrar los reportes por fecha y sucursal, verlos en gráficos y descargarlos, para analizar las ventas fuera del sistema.*

**RF:** RF-RPT-10 a RF-RPT-15, RF-RPT-18, RF-RPT-19, RF-RPT-21  
**Rutas:** `/admin/reports` (con pestañas Productos · Pedidos · Clientes · Promociones)  
**API:** `GET /api/admin/reports/products?from=&to=&branchId=` (extiende el actual), `GET /api/admin/reports/orders?from=&to=&branchId=`

Criterios:

- `from` y `to` opcionales (`YYYY-MM-DD`, día de Argentina); `branchId` opcional. Sin filtros, todo el historial y todas las sucursales. “Sin stock” respeta la sucursal pero no las fechas.
- Pedidos: por día (línea), por estado (barras), por sucursal, cancelados (cantidad y % del total), tiempo promedio de entrega (de `confirmed` a `delivered`, con `OrderStatusHistory`).
- Ventas por sucursal (facturación = `totalAmount`, sin cancelados).
- Top 10 clientes por cantidad de pedidos (sin cancelados, sin invitados).
- Promociones más usadas: cantidad de pedidos y descuento total por `promotionName`.
- Cada listado tiene **Descargar CSV** con los filtros aplicados (separador `;`, UTF-8 con BOM para que Excel lo abra bien).
- Mismo criterio de “cuenta / no cuenta” que HU-22: cancelados no, `pending` sí.
- Tests: filtro de fechas deja afuera un pedido de otro día; filtro de sucursal; tiempo promedio con dos pedidos entregados.

### HU-29 — Dar de baja mi cuenta — 2 pts

*Como cliente, quiero dar de baja mi cuenta, para dejar de usar la app.*

**Rutas:** `/account` (zona “Dar de baja la cuenta”)  
**API:** `DELETE /api/me` con `{ password }`

Criterios:

- Pide la contraseña y una confirmación con el `ConfirmModal`.
- Si tiene un pedido sin terminar (ni `delivered` ni `cancelled`) → 409 “Tenés un pedido en curso”.
- La baja es la misma de D55 (`active = false`): no inicia sesión, sus tokens dejan de valer, pedidos y direcciones quedan para los reportes. El carrito se vacía.
- Después de la baja, cierra la sesión y vuelve al catálogo con un aviso.
- El admin puede volver a habilitarla desde HU-24.
- Test: baja con contraseña mal → 401; con pedido en curso → 409; después de la baja el login da 403.

**Total núcleo: 3+2+3+8+8+2 = 26 pts**

### Segundo nivel (en orden de prioridad)

#### HU-30 — Adicionales elegidos por producto — 5 pts

Hoy un adicional es un producto de la categoría “Adicional” y se ofrece en **todas** las de “Hamburguesas” (`extras.service.ts`). El detalle del producto además filtra los adicionales en el front con `/products`.

- Nuevo `ProductExtra { productId, extraId }`. La migración carga todas las hamburguesas × todos los adicionales, así nada cambia el día que se mergea.
- En `/admin/products`, al editar un producto: “Adicionales que se ofrecen” (selección múltiple de los productos de “Adicional”).
- `ExtrasService.listFor` usa la relación, no la categoría. El detalle del producto pide `GET /api/products/:id/extras` en vez de filtrar `/products`.
- El carrito y el pedido validan contra la relación (un adicional no permitido → 400, como hoy).
- Test: un adicional no marcado no se puede agregar.

#### HU-31 — Envío gratis desde un monto — 2 pts

- Parámetro `free_delivery_min_subtotal` (0 = desactivado).
- Si `subtotal − descuento ≥ mínimo`, `deliveryFee = 0`. No es una promo: no compite con la promo ni con el premio.
- El checkout dice “Envío gratis” o “Te faltan $X para el envío gratis”.
- Test: justo en el mínimo, gratis; un peso menos, paga.

#### HU-32 — Top 3 compradores del mes con descuento — 3 pts

- Reutiliza `LoyaltyReward` (HU-27) con `source: "top_buyer"` y el mes (`period: "2026-10"`).
- En la pestaña Clientes de reportes: “Premiar top 3 de octubre”. Crea un premio (parámetro `top_buyer_reward_percent`) para los 3 clientes con más pedidos no cancelados del mes. Empate: el que más gastó.
- Se puede hacer una sola vez por mes (409 la segunda). El cliente lo ve y lo usa igual que el de sellos.
- Test: no premia dos veces el mismo mes; un deshabilitado no entra.

#### HU-33 — Dashboard con gráficos — 2 pts

- `AdminHomePage` suma: pedidos de hoy, facturación de hoy, pedidos por estado (barras) y ventas de los últimos 7 días (línea).
- Usa el API de HU-28 con `from`/`to`; no hace falta API nueva. Con `orders_viewer` solo se ven los de pedidos.

#### HU-34 — Código postal y provincia en las direcciones — 3 pts

- `Address` suma `postalCode` y `province` (opcionales, los viejos quedan vacíos).
- El formulario de dirección (y el del invitado) pide calle y número, ciudad, provincia (lista de las 24) y CP.
- El geocode usa la búsqueda estructurada de Nominatim (`street`, `city`, `state`, `postalcode`, `countrycodes=ar`) y, si no encuentra, cae a la búsqueda libre de hoy. Se completan CP y provincia desde `addressdetails` si el usuario no los puso.
- El pin del mapa (DEV-23) sigue mandando.
- Test: el geocode arma la query estructurada.

#### HU-35 — Nosotros, contacto y mapa de sucursales — 3 pts

- `/nosotros`: misión, visión y valores. Texto fijo.
- `/contacto`: mail, horarios, y el teléfono de cada sucursal activa (de `GET /api/branches`). Link `mailto:`.
- `/branches`: un mapa (Leaflet, el mismo de DEV-21/23) con un pin por sucursal activa y el de la ubicación del cliente si la hay. Tocar un pin muestra nombre, dirección y horario.
- Links en el pie de página.

#### HU-36 — Reportar un problema con un pedido — 3 pts

- Nuevo `Incident { orderId, userId, reason, message, status, createdAt, resolvedAt }`. `reason`: `missing_item | wrong_item | late | cold | other`. `status`: `open | resolved`.
- En `/orders/:id`, si el pedido está `delivered`, botón “Tuve un problema”. Uno por pedido.
- `/admin/incidents`: listado (abiertas primero), link al pedido, marcar como resuelta.
- Test: no se reporta un pedido de otro cliente ni uno sin entregar.

**Total segundo nivel: 5+2+3+2+3+3+3 = 21 pts**

### Ajustes y bugs (sin puntos, núcleo)

| ID | Qué | Qué hay que hacer |
|---|---|---|
| DEV-26 | El banner de promo sale en todas las pantallas | Sacar `<PromoBanner />` de `ClientLayout` y ponerlo solo en `/products`, `/products/:id` y `/cart`. En el carrito, solo si el pedido **no** tiene promo aplicada. |
| DEV-27 | El detalle de la hamburguesa no aparece sin sesión | Reproducir sin token. Sospechosos: la cotización (`/promotions/quote` con `token: ''`) y la carga de adicionales en `ProductDetailPage`. Con HU-30 la carga de adicionales cambia de todos modos. Test e2e: `GET /api/products/:id` sin token responde 200. |
| DEV-28 | La confirmación del pedido no actualiza el estado | La confirmación de `/checkout` muestra “Pendiente” fijo. Usar `useOrderStatusEvents` igual que `OrderDetailPage` (o redirigir a `/orders/:id` para la cuenta y mantener la pantalla para el invitado con el mismo hook). |
| DEV-29 | Auto scroll desde el texto de la promo | En el detalle del producto, tocar el texto de la promo baja hasta “Agregar al carrito” (`scrollIntoView({ behavior: 'smooth' })`). |
| DEV-30 | Revisar el pedido en retiro | Confirmación, historial, detalle y admin: sin dirección, dice “Retiro en {sucursal}”, sin envío, y efectivo “en el local” (HU-26). |

---

## 5. Incremento visible

### Review (19/11)

**Demo (8–10 min). Todo esto está en `main` el 18/11:**

1. Admin super admin: crea un admin con rol “solo pedidos”. Entra con ese admin: solo ve Pedidos y no puede cambiar estados.
2. Admin: listado de clientes, filtro “los que compraron”, detalle de uno.
3. Cliente con 9 sellos (seed): arma el carrito, ve la promo solo en catálogo/detalle/carrito, elige **efectivo** y confirma. El pedido tiene código de 6 dígitos y la confirmación cambia de estado sola cuando el admin lo avanza.
4. Admin lo entrega → el cliente ve 10/10 y el premio. Nuevo pedido con **tarjeta** (simulada) usando el premio: el descuento reemplaza a la promo.
5. Reportes: filtro por fecha y sucursal, gráfico de pedidos por día, promos más usadas (aparece “Premio por 10 compras”), descarga CSV y se abre en Excel.
6. Cliente: da de baja la cuenta; el login después dice que está deshabilitada.
7. Lo que haya entrado del segundo nivel (por ejemplo, mapa de sucursales o dashboard).

### Presentación final (27/11)

Misma demo, más ordenada, y slides de **decisiones** como en el medio término: qué extensión se tomó y qué quedó fuera (combos, pasarela, Extensión 2) y por qué. Se ensaya el 25/11.

**No se demuestra:** combos, cupón, pasarela real, alertas de stock, recorrido en el mapa, Extensión 2.

---

## 6. Páginas y APIs de este sprint

**Cliente (nuevo / a tocar):**

| Ruta | Uso |
|---|---|
| `/products`, `/products/:id`, `/cart` | Único lugar del banner (DEV-26), scroll (DEV-29), detalle sin sesión (DEV-27) |
| `/checkout` | Medio de pago (HU-26), sellos y premio (HU-27), confirmación en vivo (DEV-28), envío gratis (HU-31) |
| `/account` | Sellos (HU-27), baja de cuenta (HU-29) |
| `/orders`, `/orders/:id` | Código corto (HU-25), medio de pago, reportar problema (HU-36) |
| `/account/addresses` | CP y provincia (HU-34) |
| `/branches` | Mapa con todas (HU-35) |
| `/nosotros`, `/contacto` | Nuevas (HU-35) |

**Admin (nuevo / a tocar):**

| Ruta | Uso |
|---|---|
| `/admin/customers`, `/admin/customers/:id` | Nuevas (HU-24) |
| `/admin/admins` | Selector de rol (HU-24) |
| `AdminLayout` | Menú según rol (HU-24) |
| `/admin/orders`, `/admin/orders/:id` | Código, búsqueda por código, medio de pago (HU-25, HU-26) |
| `/admin/reports` | Filtros, gráficos, CSV, pestañas nuevas (HU-28), premiar top 3 (HU-32) |
| `/admin` | Dashboard (HU-33) |
| `/admin/products` | Adicionales por producto (HU-30) |
| `/admin/parameters` | `stamps_per_reward`, `loyalty_reward_percent`, `free_delivery_min_subtotal`, `top_buyer_reward_percent`, alias/CBU de demo |
| `/admin/incidents` | Nueva (HU-36) |

**API (nueva / extendida):**

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/orders`, `/api/orders/guest` | `paymentMethod`, `cashAmount?`, `useRewardId?` (solo con cuenta) |
| GET | `/api/admin/orders` | `?code=` |
| POST | `/api/promotions/quote` | `useRewardId?` |
| GET | `/api/me/loyalty` | Sellos y premios disponibles |
| DELETE | `/api/me` | Baja de cuenta, con `{ password }` |
| GET | `/api/admin/reports/products` | `from`, `to`, `branchId` |
| GET | `/api/admin/reports/orders` | Por día, estado, sucursal, cancelados, tiempo promedio, ventas por sucursal, top clientes, promos |
| POST | `/api/admin/rewards/top-buyers` | `{ period: "2026-10" }` (HU-32) |
| GET | `/api/products/:id/extras` | Adicionales del producto (HU-30) |
| PUT | `/api/admin/products/:id/extras` | `{ extraIds: [...] }` (HU-30) |
| POST | `/api/orders/:id/incident` | Reportar (HU-36) |
| GET / PATCH | `/api/admin/incidents`, `/api/admin/incidents/:id` | Listado y resolver (HU-36) |

Cambios de modelo:

- `Order` suma `code` (único), `paymentMethod` (enum `PaymentMethod`), `cashAmount?`, `cardLast4?`, `rewardId?`.
- Nuevo `LoyaltyReward` (`userId`, `source` `stamps | top_buyer`, `period?`, `percent`, `earnedAt`, `usedAt?`, `orderId?`).
- Segundo nivel: `ProductExtra`, `Address.postalCode` y `Address.province`, `Incident`.

Nombres en inglés (dominio canónico). UI en español. Toda ruta de admin nueva es solo de `super_admin` (D59), salvo las de pedidos.

Seed de demo: un cliente con 9 pedidos entregados, un admin `orders_viewer`, pedidos en al menos dos sucursales y en días distintos (para que los gráficos tengan forma).

---

## 7. Tareas y reparto (propuesta, se confirma en la planning)

Mismo criterio que el Sprint 4: cada uno toca su zona para no pisarse. **Lucas es el único en `/checkout`.** Nicolas abre los APIs primero para que el front no espere.

| Dueño | Semana 1 (30/10 – 05/11) | Semana 2 (06/11 – 09/11) | Segundo nivel (10 – 16/11) |
|---|---|---|---|
| **Nicolas** | API: código corto, medio de pago, sellos y premio (con tests). Mergea el **lun 02/11** código y pago; el **mié 04/11** sellos | Baja de cuenta (API), tests de HU-27 | HU-30 (API) o HU-32 |
| **Carla** | HU-24: clientes, roles y menú según rol | Código y medio de pago en el admin | HU-33 dashboard, HU-36 (admin) |
| **Celeste** | HU-28: API de reportes con filtros y reportes de pedidos | Gráficos, pestañas y CSV | HU-32 (pantalla), RF-RPT-16/17 si sobra |
| **Lucas** | DEV-26, DEV-28, DEV-29, DEV-30 | HU-26 pago en el checkout, sellos y premio en checkout | HU-31 envío gratis |
| **Rafael** | DEV-27, HU-29 (pantalla de baja), sellos en `/account` | Código corto en el cliente | HU-35, HU-34, HU-36 (cliente) |
| **Cristian** | PDF único (entrega **12/11**). No codea | | |

| Fecha | Qué |
|---|---|
| **29/10** | Planning. Se confirma esta ficha y el reparto |
| **02/11 noche** | API de código y medio de pago en `main` |
| **04/11 noche** | API de sellos en `main` |
| **05/11** | Seguimiento: HU-24 y DEV-26 a DEV-30 mergeados, reportes con filtros andando |
| **09/11 noche** | **Núcleo en `main`** (HU-24 a HU-29) |
| **10 – 16/11** | Segundo nivel, en el orden de la sección 4 |
| **12/11** | Entrega de la carpeta |
| **16/11 noche** | Corte de features |
| **17 – 18/11** | Solo tests, seed de demo y ensayo. Corte 18/11 23:59 |
| **19/11** | Review |
| **25/11** | Ensayo de la presentación final |
| **27/11** | Presentación final |

---

## 8. Definición de terminado del sprint

- [ ] HU-24 a HU-29 cumplen sus criterios. Del segundo nivel, lo que entró cumple los suyos.
- [ ] DEV-26 a DEV-30 en `main`.
- [ ] La demo de la sección 5 corre de punta a punta con el seed, en local y en el deploy.
- [ ] App usable en viewport mobile (cliente y admin).
- [ ] Pruebas de backend, en la suite que ya corre, en verde antes del 18/11:
  - código único y migración de pedidos viejos;
  - pedido sin medio de pago (400) y efectivo menor que el total (400);
  - sellos: el 10.º entregado da premio, cancelado no suma, premio reemplaza la promo, cancelar devuelve el premio, no se usa dos veces;
  - reportes: filtro de fechas, filtro de sucursal, tiempo promedio;
  - baja de cuenta: contraseña mal, pedido en curso, login después de la baja;
  - producto visible sin sesión (DEV-27).
- [ ] Los datos de tarjeta no viajan al servidor.
- [ ] Nada de secretos en git (`.env` ignorado).
- [ ] `Supuestos-y-decisiones.md` suma las decisiones de sellos, pago, código, baja y envío gratis. `Requerimientos-funcionales.md` marca qué RF-RPT quedaron hechos.
- [ ] La carpeta (PDF único) se entregó el 12/11 y refleja este sprint.

---

## 9. Qué queda después

No hay Sprint 6. Lo que no entre queda como **trabajo futuro** en la carpeta y en la última slide:

| Tema | Por qué quedó afuera |
|---|---|
| Combos | Tocan carrito, stock, promo y reportes a la vez |
| Pasarela de pago real | Credenciales, webhooks y conciliación; el pago simulado alcanza para el enunciado |
| Cupón y promos acumulables | El premio de sellos cubre el “descuento personal” |
| Alertas de stock (RF-STK-05) | Opcional dentro de la extensión |
| Recorrido en el mapa (RF-GEO-03) | Optativo |
| Extensión 2 | No se tomó |

Si hay que recortar dentro del sprint: primero el segundo nivel de abajo hacia arriba (HU-36, HU-35, …). **No se recorta** el flujo de pedido, el stock, la sucursal elegida, la promo aplicada ni el núcleo.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Querer hacer todo el listado (47 pts) | No llega el núcleo al 19/11 | Núcleo de 26 pts el 09/11; el resto solo si el núcleo está verde |
| Combos “porque es rápido” | Se rompe el pedido o el stock en el último sprint | Fuera. Si se insiste, solo como producto con stock propio |
| Sellos y promo compitiendo | Dos descuentos en un pedido, reportes que no cierran | El premio reemplaza a la promo; se guarda como `promotionName` |
| La demo del premio necesita 10 pedidos entregados | No se puede mostrar en vivo | Seed con 9 entregados |
| Datos de tarjeta que se mandan al backend | Mala práctica, aunque sea simulado | Se valida en el front y solo se guarda el medio (y los últimos 4) |
| Lucas y Rafael se pisan en el cliente | Conflictos | Lucas: `/checkout` y catálogo. Rafael: `/account`, `/orders`, `/branches`, páginas nuevas |
| La carpeta del 12/11 cae en medio del sprint | Se frena el código | La lleva Cristian; cada dueño le pasa 3 líneas de su HU el 09/11 |
| Reportes lentos con filtros | Pantalla que tarda en la demo | Agrupar en la base (`groupBy`), no en memoria; índices ya existen en `status`, `branchId` |
| Pruebas al final | Se rompe lo que andaba | Los tests entran con cada HU; 17 y 18/11 son solo para arreglar |

---

## 11. Acta

```
Fecha: 29/10/2026 (review del Sprint 4 y planning del Sprint 5)
Ficha 1.0: borrador armado con la lista de pendientes del grupo
Ya hecho (no replanificar): precio de envío por km; clientes y roles en el backend
Núcleo: HU-24 a HU-29 (clientes y roles en el admin, código corto, pago simulado, sellos, reportes con filtros/gráficos/CSV, baja de cuenta) y DEV-26 a DEV-30
Segundo nivel: adicionales por producto, envío gratis, top 3, dashboard, CP y provincia, nosotros/contacto/mapa, incidencias
No entra: combos, cupón, pasarela real, alertas de stock, recorrido, Extensión 2
Carpeta: 12/11 (Cristian). Review: 19/11. Final: 27/11
```

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 29/10/2026 | Borrador para la planning: estado real del repo, lista de pendientes clasificada en núcleo, segundo nivel y fuera |
