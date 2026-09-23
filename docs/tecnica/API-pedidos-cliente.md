# API de pedidos del cliente

**Proyecto:** Pedidos en casas de comidas rápidas  
**Versión:** 1.0  
**Actualizado:** 23/09/2026  
**Fuente:** `backend/src/orders/`  
**Historias:** HU-09 (historial), HU-10 (seguimiento), HU-11 (cancelar), HU-12 (repetir)

Todas las rutas piden el JWT de un **cliente** en `Authorization: Bearer <token>`. Sin token: 401. Con token de admin: 403.
Los pedidos de invitado no tienen usuario y no aparecen en ninguna de estas rutas.

Estados (`status`): `pending`, `confirmed`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled`.
Etiquetas en español para la UI: Pendiente, Confirmado, En preparación, Listo para entregar, En camino, Entregado, Cancelado.

---

## `GET /api/orders` — historial (HU-09)

Mis pedidos, del más reciente al más viejo. Sin paginación.

```json
[
  {
    "id": "cmfv3x...",
    "status": "delivered",
    "totalAmount": 23500,
    "createdAt": "2026-09-23T18:04:11.000Z",
    "branch": { "id": "cmf...", "name": "Sucursal Centro" },
    "itemCount": 3
  }
]
```

`itemCount` es la suma de las cantidades, no la cantidad de líneas.

---

## `GET /api/orders/:id` — detalle y seguimiento (HU-09, HU-10)

Si el pedido no existe **o es de otro cliente**: 404.

```json
{
  "id": "cmfv3x...",
  "status": "confirmed",
  "totalAmount": 23500,
  "createdAt": "2026-09-23T18:04:11.000Z",
  "branch": { "id": "cmf...", "name": "Sucursal Centro", "address": "Av. Corrientes 1234, CABA" },
  "address": { "id": "cmf...", "street": "Av. Rivadavia 5000, CABA" },
  "guestName": null,
  "guestEmail": null,
  "items": [
    {
      "id": "cmf...",
      "productId": "cmf...",
      "quantity": 1,
      "notes": "sin cebolla",
      "unitPrice": 20000,
      "extras": [{ "id": "cmf...", "name": "Bacon", "price": 2000 }],
      "extrasTotal": 2000,
      "subtotal": 22000,
      "product": { "id": "cmf...", "name": "Hamburguesa Clásica", "imageUrl": "https://..." }
    }
  ],
  "history": [
    { "id": "cmf...", "status": "pending", "changedAt": "2026-09-23T18:04:11.000Z" },
    { "id": "cmf...", "status": "confirmed", "changedAt": "2026-09-23T18:06:40.000Z" }
  ],
  "etaMinutes": 32,
  "canCancel": true
}
```

- `history`: el timeline, del más viejo al más nuevo. No dice quién hizo el cambio.
- `etaMinutes`: `15 + (cantidad de ítems × 3) + ceil(distancia_km / 0.5)`. Es `null` si el pedido está `delivered` o `cancelled`.
- `canCancel`: `true` si el estado es `pending` o `confirmed`. Sirve para mostrar u ocultar el botón cancelar.
- Los mismos campos de `items` que devuelve `POST /api/orders` al confirmar.

---

## `POST /api/orders/:id/cancel` — cancelar (HU-11)

Sin body. Responde **200** con el mismo JSON que `GET /api/orders/:id`, ya en `cancelled`.

| Caso | Respuesta |
|---|---|
| `pending` o `confirmed` | 200, queda `cancelled` en el historial |
| `preparing` o posterior, o ya cancelado | 409 `{ "message": "No se puede pasar el pedido a ese estado" }` |
| El admin lo cambió justo antes | 409 `{ "message": "El pedido cambió de estado; actualizá la página" }` |
| De otro cliente o inexistente | 404 |

El cambio se avisa por Pusher igual que los cambios del admin (canal del usuario y canal de admin).

---

## `POST /api/orders/:id/repeat` — repetir (HU-12)

Sin body. **No crea un pedido**: suma los ítems (producto, cantidad, observaciones y adicionales) al carrito que el cliente ya tenía, con los precios de hoy. Después se va a `/cart` y se confirma con el checkout de siempre.

Si en el carrito ya estaba la misma línea (mismo producto con los mismos adicionales), se suma la cantidad.

Responde **200**:

```json
{
  "cart": { "id": "cmf...", "items": [ ... ], "itemCount": 4, "total": 25000 },
  "skipped": [
    { "kind": "product", "name": "Gaseosa 500ml", "message": "\"Gaseosa 500ml\" ya no está disponible y no se agregó" },
    { "kind": "extra", "name": "Bacon", "message": "\"Bacon\" ya no está disponible: \"Hamburguesa Clásica\" se agregó sin ese adicional" }
  ]
}
```

- `cart`: el mismo JSON que `GET /api/cart`.
- `skipped`: lo que no se pudo agregar. Si no está vacío, conviene mostrar los `message` al cliente.
- De otro cliente o inexistente: 404.

---

## Historial de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 23/09/2026 | Versión inicial |
