# API de clientes y costo de envío

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 1.0  
**Actualizado:** 27/10/2026  
**Fuente:** `backend/src/` (`customers/`, `delivery-fees/`, `orders/`, `auth/`)  
**Decisiones:** D54 a D58 de `docs/entregables/Supuestos-y-decisiones.md`

Contrato del backend para las pantallas que faltan. El backend ya está hecho y testeado; falta la UI.

| Quién | Qué usa de acá |
|---|---|
| **Admin** (`backend/admin`) | Clientes (§2), tramos de envío (§3), envío en el detalle de pedidos (§4) |
| **App de clientes** (`frontend`) | Envío por sucursal en el checkout y en el pedido (§4), cuenta deshabilitada (§5) |

Autenticación: `Authorization: Bearer <token>`. Sin token: **401**. Con rol cliente en rutas de admin: **403**.
Los errores traen `message` en español, listo para mostrar.

---

## 1. Después de mergear

```
cd backend
npx prisma migrate deploy
```

Dos migraciones: `20261027120000_user_active` (todos los usuarios quedan habilitados) y
`20261027130000_delivery_fees` (pedidos viejos con envío 0, sin tramos cargados). **Mientras no se cargue
ningún tramo, el envío es gratis y todo funciona como antes.**

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

## 3. Tramos de envío — `/api/admin/delivery-fees`

Cada tramo cubre desde el tope del anterior hasta su `upToKm`, **inclusive**. Ejemplo: tramos de 2 y 4 km →
de 0 a 2 km paga el primero, de más de 2 hasta 4 km paga el segundo. Más lejos que el último tope se cobra el
último. Sin tramos, envío gratis. La distancia es en línea recta entre la sucursal y la dirección, redondeada a 2
decimales (la misma `distanceKm` que ya muestra el checkout).

### `GET /api/admin/delivery-fees`

Ordenados por tope. `fromKm` lo calcula el backend para mostrar “de X a Y km”:

```json
[
  { "id": "…", "fromKm": 0, "upToKm": 2, "price": 500, "updatedAt": "…" },
  { "id": "…", "fromKm": 2, "upToKm": 4, "price": 900, "updatedAt": "…" }
]
```

### `POST /api/admin/delivery-fees` → 201

```json
{ "upToKm": 2, "price": 500 }
```

### `PATCH /api/admin/delivery-fees/:id` → 200

```json
{ "price": 550 }
```

### `DELETE /api/admin/delivery-fees/:id` → 200 `{ "id": "…" }`

| Caso | Respuesta |
|---|---|
| `upToKm` fuera de 0,01–100 o con más de 2 decimales | 400 |
| `price` negativo o con más de 2 decimales | 400 |
| Ya hay un tramo con ese `upToKm` | 409 `Ya hay un tramo con ese tope de km` |
| PATCH sin campos | 400 `No hay cambios para guardar` |
| Id inexistente | 404 `Tramo de envío no encontrado` |

Cambiar o borrar tramos **no toca pedidos ya hechos**: cada pedido guarda su envío al confirmar.

---

## 4. Envío en el checkout y en los pedidos

### `POST /api/branches/checkout` — campo nuevo por sucursal

```json
{ "id": "…", "name": "Centro", "distanceKm": 3.31, "withinRadius": true, "deliveryFee": 900, "canFulfill": true, "…": "…" }
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
