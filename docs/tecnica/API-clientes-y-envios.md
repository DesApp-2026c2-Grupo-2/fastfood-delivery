# API de clientes y costo de envío

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 1.0  
**Actualizado:** 28/10/2026  
**Fuente:** `backend/src/` (`customers/`, `delivery-fees/`, `parameters/`, `orders/`, `auth/`, `admins/`)  
**Decisiones:** D54 a D60 de `docs/entregables/Supuestos-y-decisiones.md`

Contrato del backend para las pantallas que faltan. El backend ya está hecho y testeado; falta la UI.

| Quién | Qué usa de acá |
|---|---|
| **Admin** (`backend/admin`) | Clientes (§2), precio de envío por km (§3), envío en el detalle de pedidos (§4), roles (§6) |
| **App de clientes** (`frontend`) | Envío por sucursal en el checkout y en el pedido (§4), cuenta deshabilitada (§5) |

Autenticación: `Authorization: Bearer <token>`. Sin token: **401**. Con rol cliente en rutas de admin: **403**.
Los errores traen `message` en español, listo para mostrar.

---

## 1. Después de mergear

```
cd backend
npx prisma migrate deploy
```

Migraciones: `20261027120000_user_active` (todos los usuarios quedan habilitados),
`20261027130000_delivery_fees` (pedidos viejos con envío 0) y `20261028120000_delivery_price_per_km` (precio por
km en 0). **Mientras el admin no cargue el precio por km, el envío es gratis y todo funciona como antes.**

---

## 2. Clientes — `/api/admin/customers`

### `GET /api/admin/customers`

Query (todos opcionales):

| Param | Valores | Qué hace |
|---|---|---|
| `q` | texto | Busca en nombre y email, sin distinguir mayúsculas |
| `withOrders` | `true` | Solo los que compraron (al menos un pedido no cancelado) |
| `active` | `true` \| `false` | Habilitados o deshabilitados. Otro valor: 400 |
| `page` | 1, 2, … | 20 por página, los más nuevos primero |

```json
{
  "items": [
    {
      "id": "cmv…",
      "name": "Ana Pérez",
      "email": "ana@mail.com",
      "active": true,
      "createdAt": "2026-10-01T12:00:00.000Z",
      "orderCount": 3,
      "totalSpent": 45200,
      "lastOrderAt": "2026-10-25T21:14:00.000Z"
    }
  ],
  "total": 57,
  "page": 1,
  "pageSize": 20
}
```

`orderCount`, `totalSpent` y `lastOrderAt` cuentan solo pedidos **no cancelados** (`totalSpent` incluye el envío).
Sin compras: `0`, `0` y `null`. Los admins y los invitados no aparecen.

### `GET /api/admin/customers/:id`

Lo mismo que una fila del listado, más direcciones y los últimos 20 pedidos (incluidos los cancelados):

```json
{
  "id": "cmv…", "name": "Ana Pérez", "email": "ana@mail.com", "active": true,
  "createdAt": "…", "orderCount": 3, "totalSpent": 45200, "lastOrderAt": "…",
  "addresses": [{ "id": "…", "alias": "Casa", "street": "Av. Siempre Viva 742", "isDefault": true }],
  "recentOrders": [
    {
      "id": "…", "status": "delivered", "fulfillment": "delivery", "totalAmount": 15900,
      "createdAt": "…", "branch": { "id": "…", "name": "Centro" }
    }
  ]
}
```

Para ver un pedido completo, usar el `id` con `GET /api/admin/orders/:id`. Id inexistente o de un admin: **404**.

### `PATCH /api/admin/customers/:id`

```json
{ "name": "Ana P.", "email": "ana.p@mail.com" }
```

Se mandan solo los campos que cambian. Devuelve la fila actualizada (como en el listado).

| Caso | Respuesta |
|---|---|
| Cuerpo vacío | 400 `No hay cambios para guardar` |
| Email de otro cliente o de un admin | 409 `El email ya está registrado` |
| Manda `password` u otro campo | 400 (la contraseña no se edita desde el admin) |

### `PATCH /api/admin/customers/:id/status`

```json
{ "active": false }
```

Baja lógica. `active` tiene que ser booleano de verdad (`"false"` como texto da 400). Devuelve la fila actualizada.
Deshabilitar no borra nada: pedidos, direcciones e historial quedan y el pedido se sigue viendo en `/api/admin/orders`.
Para rehabilitar, `{ "active": true }`.

Sugerencia de UI: botón “Deshabilitar” con confirmación y un badge “Deshabilitado” en la fila.

---

## 3. Precio de envío por km — parámetro `delivery_price_per_km`

**Envío = precio por km × km**, cobrando cada cuadra (100 m) iniciada. La distancia es en línea recta entre la
sucursal y la dirección, redondeada antes a 2 decimales (la misma `distanceKm` que ya muestra el checkout).
Ejemplo con $1000/km: 0,43 km → 5 cuadras → $500; 1,11 km → 1,2 km → $1200; 5 km → $5000. Precio 0: envío gratis.

Es un parámetro más del sistema, junto al radio de cobertura y las constantes de ETA. No tiene ABM propio.

### `GET /api/admin/parameters`

Aparece en la lista con los demás:

```json
{
  "key": "delivery_price_per_km", "label": "Precio de envío por km", "description": "…", "unit": "$/km",
  "value": 1000, "min": 0, "max": 1000000, "integer": false, "updatedAt": "…"
}
```

### `PATCH /api/admin/parameters` → 200

```json
{ "delivery_price_per_km": 1000 }
```

Negativo, mayor a 1.000.000, con más de 2 decimales o no numérico: **400**.

Cambiar el precio **no toca pedidos ya hechos**: cada pedido guarda su envío al confirmar.

---

## 4. Envío en el checkout y en los pedidos

### `POST /api/branches/checkout` — campo nuevo por sucursal

```json
{ "id": "…", "name": "Centro", "distanceKm": 3.31, "withinRadius": true, "deliveryFee": 3400, "canFulfill": true, "…": "…" }
```

En domicilio es lo que se cobraría desde esa sucursal; en retiro siempre `0`. Mostrarlo al elegir sucursal.

### Pedido: campo nuevo `deliveryFee`

Aparece en todas las respuestas de pedido: `POST /api/orders`, `POST /api/orders/guest`, `GET /api/orders`,
`GET /api/orders/:id`, `GET /api/admin/orders` y `GET /api/admin/orders/:id`.

```json
{ "subtotal": 10000, "discountAmount": 1000, "deliveryFee": 500, "totalAmount": 9500 }
```

**`totalAmount = subtotal − discountAmount + deliveryFee`.** La promo descuenta solo los productos. Retiro y pedidos
anteriores a este cambio: `deliveryFee: 0`.

### `POST /api/promotions/quote` — sin cambios

La cotización sigue siendo solo de productos (no sabe qué sucursal se va a elegir). Antes de confirmar, el total a
mostrar es `quote.totalAmount + deliveryFee` de la sucursal elegida en el checkout.

---

## 5. Cuenta deshabilitada (app de clientes)

| Dónde | Respuesta |
|---|---|
| `POST /api/auth/login` con la contraseña correcta | **403** `Tu cuenta está deshabilitada` (con la contraseña mal sigue siendo 401) |
| Cualquier ruta con un token de ese cliente | **401** `Tu cuenta está deshabilitada` (el front ya manda a login con 401) |
| `POST /api/auth/forgot-password` | La respuesta genérica, sin token: se trata como no registrado |

En el login conviene mostrar el `message` del 403 tal cual.

---

## 6. Roles de administrador

Migración `20261027150000_admin_roles`: los admins que ya existían quedan como `super_admin`.

| Rol | Puede |
|---|---|
| `super_admin` | Todo el backoffice, como hasta ahora |
| `orders_viewer` | `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `GET /api/admin/order-statuses`, el canal en tiempo real de pedidos y su perfil (`/api/me`). **No** cambia estados ni cancela |

Cualquier otra ruta de admin con `orders_viewer` responde **403** `Tu rol solo permite consultar pedidos`.

### Saber qué mostrar

`POST /api/auth/login`, `GET /api/auth/me` y `GET /api/me` traen `adminRole` en los admins (en los clientes no viene):

```json
{ "id": "…", "email": "pedidos@mordi.com", "name": "Lucía", "role": "admin", "adminRole": "orders_viewer" }
```

Con `orders_viewer` el admin debería mostrar solo la sección de pedidos, sin los botones de cambiar estado ni de
cancelar. Un cambio de rol rige en la próxima llamada, sin volver a iniciar sesión: conviene releer `/api/auth/me`
al entrar y, ante un 403, volver a la sección de pedidos.

### ABM de admins — campo nuevo `adminRole`

`GET /api/admin/admins` devuelve `adminRole` en cada fila. En el alta (`POST`) y la edición (`PATCH`) se puede mandar
`"adminRole": "super_admin" | "orders_viewer"`. Sin rol en el alta se crea `super_admin`.

| Caso | Respuesta |
|---|---|
| Rol inexistente | 400 `El rol debe ser super_admin u orders_viewer` |
| Cambiar el propio rol | 409 `No podés cambiar tu propio rol` |
| Bajar de rol al admin inicial | 409 `El administrador inicial tiene que seguir siendo super admin` |
