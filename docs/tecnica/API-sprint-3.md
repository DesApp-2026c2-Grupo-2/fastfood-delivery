# API del Sprint 3 — stock, parámetros, cuenta y admins

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 1.0  
**Actualizado:** 29/09/2026  
**Fuente:** `backend/src/` (`stock/`, `parameters/`, `branches/`, `account/`, `admins/`, `auth/`, `orders/`)  
**Historias:** HU-14 a HU-19 (API) + DEV-14 / DEV-15 (API)

Contrato del backend para los frentes de UI del sprint. Todo lo que no se menciona sigue igual que en
[API-pedidos-cliente.md](API-pedidos-cliente.md).

| Quién | Qué usa de acá |
|---|---|
| **Carla** (admin) | Stock (§3), parámetros y estados (§4), admins (§8), demora en pedidos (§2) |
| **Celeste** (seguimiento, auth) | Hora estimada y demora (§2), recuperar contraseña (§7) |
| **Lucas** (cuenta) | Perfil `/api/me` (§6) |
| **Rafael** (sucursales, checkout) | Sucursales disponibles (§5), errores del checkout (§1) |

Autenticación: `Authorization: Bearer <token>`. Sin token o con token vencido: **401** (el front ya lo manda a login).
Con el rol equivocado: **403**. Los errores traen siempre `message` en español, listo para mostrar.

---

## 0. Después de mergear

```
cd backend
npx prisma migrate deploy
npm run prisma:seed
```

La migración `20260929150000_stock_parameters_password_reset`:

- Crea `Stock`, `Parameter` y `PasswordResetToken`, y agrega `Order.stockReserved`.
- Carga los parámetros con los valores de siempre (radio **5 km**, ETA 15 / 3 / 0,5).
- Da **100 unidades** de cada producto existente en cada sucursal existente, para que el checkout no se corte al aplicarla (también en Neon).

El seed carga 100 unidades de cada producto en *Mordi Centro* si todavía no tienen fila. No pisa lo que haya cargado el admin.

**Un producto nuevo arranca sin stock** (no se puede pedir) hasta que el admin le cargue stock en `/admin/stock`.

---

## 1. Checkout: errores nuevos (`POST /api/orders` y `POST /api/orders/guest`)

El body y la respuesta 201 no cambian. Se suman dos errores; en los dos **no se crea el pedido** y el carrito queda como estaba.

### Sin cobertura — 400

La sucursal que se asigna es la **activa más cercana dentro del radio** (`coverage_radius_km`). Si ninguna llega:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "OUT_OF_COVERAGE",
  "message": "No hay sucursales que lleguen a esa dirección (radio de 5 km)",
  "radiusKm": 5
}
```

### Sin stock — 409

Se verifica el stock de la sucursal asignada para cada producto **y cada adicional** (una hamburguesa ×2 con bacon pide 2 bacon).
Un producto sin fila de stock en esa sucursal cuenta como 0.

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "OUT_OF_STOCK",
  "message": "No hay stock suficiente de \"Hamburguesa simple\" en Mordi Centro (quedan 1)",
  "branch": { "id": "cmf...", "name": "Mordi Centro" },
  "items": [
    { "productId": "cmf...", "name": "Hamburguesa simple", "requested": 2, "available": 1 }
  ]
}
```

- `message` nombra todos los productos que faltan (`"A", "B" y "C"`). El “(quedan N)” aparece solo si falta uno y quedan unidades.
- `items` sirve para marcar las líneas del carrito que hay que ajustar.
- `code` distingue los dos casos sin parsear el texto.

### Política de stock (HU-18)

| Momento | Qué pasa con el stock de la sucursal del pedido |
|---|---|
| Confirmar (`POST /api/orders`, `/guest`) | `available -= qty`, `reserved += qty` |
| Cancelar en `pending` / `confirmed` (cliente o admin) | `available += qty`, `reserved -= qty` |
| Pasar a `delivered` | `reserved -= qty` (queda descontado) |
| Repetir pedido (`POST /api/orders/:id/repeat`) | Nada: solo arma el carrito |

Los pedidos creados antes de la migración no reservaron stock: al cancelarlos o entregarlos el stock no se toca.
Si dos clientes piden la última unidad al mismo tiempo, uno recibe 201 y el otro 409.

---

## 2. Hora estimada y demora (DEV-14, DEV-15)

En `GET /api/orders`, `GET /api/orders/:id`, `GET /api/admin/orders` y `GET /api/admin/orders/:id` (y en la respuesta del checkout):

```json
{
  "estimatedDeliveryAt": "2026-09-29T21:40:00.000Z",
  "etaMinutes": 12,
  "delayMinutes": 0
}
```

| Estado del pedido | `etaMinutes` | `delayMinutes` |
|---|---|---|
| Sin entregar ni cancelar | minutos que faltan (0 si ya pasó la hora) | minutos pasados de la hora (0 si todavía no llegó) |
| `delivered` | `null` | cuánto tarde se entregó (0 si llegó a tiempo) |
| `cancelled` | `null` | `null` |

- `estimatedDeliveryAt` se calcula **una vez al confirmar** y no cambia: `createdAt + preparación base + ítems × minutos por ítem + ceil(km / km por minuto)`.
- Las constantes salen de los parámetros (§4). Cambiarlas no mueve la hora de los pedidos ya confirmados.
- UI sugerida: “Llega aprox. 21:40” con `estimatedDeliveryAt`; si `delayMinutes > 0`, “Demorado N min”.
- El seed deja dos pedidos del cliente de prueba (`test-customer@rapido.local` / `Test123!`) para mostrar la demora: uno en camino ya demorado y uno entregado tarde.

---

## 3. Stock por sucursal — admin (HU-17)

### `GET /api/admin/branches/:branchId/stock`

**Todos** los productos (también los que no tienen stock cargado), ordenados por nombre.

```json
[
  {
    "productId": "cmf...",
    "productName": "Hamburguesa simple",
    "productAvailable": true,
    "imageUrl": "https://i.imgur.com/PpKzGf2.png",
    "categories": [{ "id": "cmf...", "name": "Hamburguesas", "slug": "hamburguesas" }],
    "available": 20,
    "reserved": 2,
    "updatedAt": "2026-09-29T18:00:00.000Z"
  }
]
```

- `available`: lo que se puede vender. `reserved`: lo comprometido en pedidos que todavía no se entregaron.
- Sin fila de stock: `available: 0`, `reserved: 0`, `updatedAt: null`.
- `productAvailable` es si el producto se ofrece en el catálogo (el switch del ABM de productos); no tiene que ver con el stock.
- Sucursal inexistente: 404.

### `PUT /api/admin/branches/:branchId/stock/:productId`

```json
{ "available": 20 }
```

Responde **200** con el mismo objeto del listado. Crea la fila si no existía. `available` es entero, de 0 a 1.000.000.
`reserved` **no** se edita (mandarlo da 400). Sucursal o producto inexistente: 404.

---

## 4. Parámetros y estados — admin (HU-19, RF-ADM-08, RF-ADM-09)

### `GET /api/admin/parameters`

```json
[
  {
    "key": "coverage_radius_km",
    "label": "Radio de cobertura",
    "description": "Distancia máxima entre la sucursal y la dirección de entrega.",
    "unit": "km",
    "value": 5,
    "min": 0.1,
    "max": 100,
    "integer": false,
    "updatedAt": "2026-09-29T18:00:00.000Z"
  },
  { "key": "eta_prep_base_min", "label": "Preparación base", "unit": "min", "value": 15, "min": 0, "max": 240, "integer": true, "...": "..." },
  { "key": "eta_min_per_item", "label": "Minutos por ítem", "unit": "min", "value": 3, "min": 0, "max": 60, "integer": true, "...": "..." },
  { "key": "eta_km_per_min", "label": "Velocidad de traslado", "unit": "km/min", "value": 0.5, "min": 0.05, "max": 10, "integer": false, "...": "..." }
]
```

`min`, `max` e `integer` sirven para armar los inputs y validar en JS.

### `PATCH /api/admin/parameters`

Solo las claves que cambian:

```json
{ "coverage_radius_km": 7.5, "eta_prep_base_min": 20 }
```

Responde **200** con el listado completo. Clave desconocida, fuera de rango o decimal donde va entero: 400.
Rige desde el próximo pedido.

### `GET /api/admin/order-statuses`

Solo lectura, en el orden del ciclo de vida:

```json
[
  {
    "status": "pending",
    "label": "Pendiente",
    "description": "El cliente confirmó el pedido y el stock quedó reservado. Espera que el local lo acepte.",
    "next": ["confirmed", "cancelled"],
    "cancellable": true,
    "final": false
  }
]
```

El color de cada estado no viene del API: es la paleta compartida del front (DEV-12).

---

## 5. Sucursales disponibles — cliente (HU-19, RF-BRN-03)

### `GET /api/branches/available?addressId=...` o `?lat=...&lng=...`

- Con `addressId` (una dirección guardada): hace falta el token del cliente. Sin token: 401. Dirección de otro cliente: 404.
- Con `lat` y `lng` (por ejemplo la ubicación del celular): no hace falta sesión.
- Sin ninguno de los dos, o coordenadas inválidas: 400.

```json
{
  "radiusKm": 5,
  "branches": [
    {
      "id": "cmf...",
      "name": "Mordi Centro",
      "address": "Av. Corrientes 1234, CABA",
      "phone": "+54 11 4000-0000",
      "openingHours": "Lun-Dom 10:00-23:00",
      "latitude": -34.6037,
      "longitude": -58.3816,
      "distanceKm": 1.42
    }
  ]
}
```

Solo sucursales **activas dentro del radio**, de la más cercana a la más lejana. La primera es la que se asigna al confirmar.
Lista vacía = esa dirección no tiene cobertura (el checkout va a responder `OUT_OF_COVERAGE`).

---

## 6. Perfil — `GET` y `PATCH /api/me` (HU-14)

Cualquier usuario logueado (cliente o admin), siempre sobre su propia cuenta.

`GET /api/me` → `{ "id", "email", "name", "role" }` (lo mismo que `GET /api/auth/me`).

`PATCH /api/me`, todos los campos opcionales:

```json
{ "name": "Ana María" }
```

```json
{ "currentPassword": "Actual123!", "newPassword": "Nueva123!" }
```

Responde **200** con `{ "id", "email", "name", "role" }` actualizado: usarlo para refrescar el “Hola {nombre}”.

| Caso | Respuesta |
|---|---|
| `email` en el body | 400 (el email es de solo lectura) |
| Nombre vacío o de más de 80 caracteres | 400 |
| Solo una de las dos contraseñas | 400 |
| `currentPassword` incorrecta | **400** `"La contraseña actual no es correcta"` (no 401, para no cerrar la sesión) |
| `newPassword` de menos de 6 caracteres o igual a la actual | 400 |

---

## 7. Recuperar contraseña (HU-15)

Solo para **clientes**. Un email de admin se trata como no registrado.

### `POST /api/auth/forgot-password`

```json
{ "email": "ana@mail.com" }
```

Responde **200** siempre con el mismo `message`, exista o no el email:

```json
{
  "message": "Si el email está registrado, te enviamos las instrucciones para cambiar la contraseña.",
  "demo": { "resetToken": "q3V0...", "expiresAt": "2026-09-29T19:30:00.000Z" }
}
```

- **`demo`** solo viene en modo demo y si el email es de un cliente. Es la “pantalla de apoyo” sin SMTP: mostrar el token, o llevar directo a `/reset-password?token=...`.
- Modo demo: activo por defecto fuera de producción. En Vercel (`NODE_ENV=production`) está apagado salvo que se configure `PASSWORD_RESET_DEMO=true`. `PASSWORD_RESET_DEMO=false` lo apaga en cualquier entorno.
- El token vence a los **30 minutos**, es de un solo uso y pedir otro invalida el anterior.

### `POST /api/auth/reset-password`

```json
{ "token": "q3V0...", "newPassword": "Nueva123!" }
```

Responde **200** `{ "message": "Listo, ya podés iniciar sesión con la contraseña nueva." }`. Después, login normal.
Token inexistente, vencido o ya usado: **400** `"El código para cambiar la contraseña no es válido o ya venció. Pedí uno nuevo."`.
Contraseña de menos de 6 caracteres: 400.

---

## 8. Administradores — admin (HU-16, RF-ADM-03, RF-ADM-07)

### `GET /api/admin/admins`

```json
[{ "id": "cmf...", "name": "Administrador", "email": "admin@rapido.local", "createdAt": "2026-08-27T10:00:00.000Z" }]
```

Del más viejo al más nuevo. El admin del seed sigue existiendo.

### `POST /api/admin/admins`

```json
{ "name": "Carla", "email": "carla@rapido.local", "password": "Inicial123!" }
```

Responde **201** con `{ "id", "name", "email", "createdAt" }`. El email se guarda en minúsculas.
El nuevo admin entra por el login de siempre y puede cambiar su contraseña con `PATCH /api/me`.

| Caso | Respuesta |
|---|---|
| Email ya registrado (cliente o admin) | 409 `"El email ya está registrado"` |
| Falta el nombre, email inválido o contraseña de menos de 6 | 400 |
| Token de cliente | 403 |

---

## Historial de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 29/09/2026 | Versión inicial: stock, parámetros, radio, sucursales disponibles, perfil, recuperar contraseña, admins |
