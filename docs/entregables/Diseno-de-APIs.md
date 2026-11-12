# Diseño de APIs

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.4
**Actualizado:** 12/11/2026
**Fuente:** sección homónima de `Carpeta.md`

La API está en `/api`. Estos ocho recursos son los que arman el pedido, el precio, el stock y la lectura del local, y más abajo traen un ejemplo concreto. El resto sigue el mismo criterio: JSON, error con mensaje legible, y el que no tiene permiso recibe 401 o 403.

| Área | Recursos |
|---|---|
| Cuenta | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/me`, `PATCH /api/me` |
| Direcciones | `GET /api/addresses`, `POST /api/addresses`, `PATCH /api/addresses/:id`, `POST /api/geocode` |
| Catálogo | `GET /api/categories`, `GET /api/products`, `GET /api/products/:id`, `GET /api/products/:id/extras`, `GET /api/promotions/active`, `GET /api/promotions/banner` |
| Sucursales | `GET /api/branches`, `GET /api/branches/available` |
| Pedido | `POST /api/orders/guest`, `GET /api/orders`, `POST /api/orders/:id/cancel`, `POST /api/orders/:id/incident`, `POST /api/orders/:id/incident/seen` |
| Administración | pedidos, stock y liberación de reservado, parámetros, productos y sus adicionales, sucursales, clientes, administradores, promociones, campañas, `GET /api/admin/incidents`, `GET /api/admin/incidents/coupons`, `PATCH /api/admin/incidents/:id`, `GET /api/admin/reports/products` |

Precios del catálogo usados abajo: hamburguesa doble `prod-doble` a $20.000, gaseosa cola `prod-cola` a $2.000.

## 7.1 Agregar al carrito

`POST /api/cart/items` · cliente con sesión.

Entrada: tres gaseosas, con el carrito que ya tenía dos hamburguesas dobles.

```json
{ "productId": "prod-cola", "quantity": 3 }
```

Salida: el carrito completo. El total es el subtotal, todavía sin promoción ni envío (RF-CRT-03).

```json
{
  "itemCount": 5,
  "total": 46000,
  "items": [
    { "productId": "prod-doble", "quantity": 2, "unitPrice": 20000, "extras": [], "subtotal": 40000 },
    { "productId": "prod-cola", "quantity": 3, "unitPrice": 2000, "extras": [], "subtotal": 6000 }
  ]
}
```

Si la cantidad de gaseosas pasa a 4, `total` es 48000. Un adicional que ese producto no ofrece responde 400 y no agrega la línea.

## 7.2 Cotizar la promoción

`POST /api/promotions/quote` · con sesión o, el invitado, mandando las líneas.

Entrada del pedido C: tres gaseosas cola.

```json
{ "items": [{ "productId": "prod-cola", "quantity": 3 }] }
```

Salida: gana el 2x1. Las otras ofertas viajan en `offers` con `applied` en falso.

```json
{
  "subtotal": 6000,
  "discountAmount": 2000,
  "totalAmount": 4000,
  "promotion": { "name": "2x1 Gaseosa Cola", "type": "two_for_one", "value": 0 },
  "offers": [
    { "name": "2x1 Gaseosa Cola", "discountAmount": 2000, "applied": true },
    { "name": "Martes 20", "discountAmount": 1200, "applied": false }
  ]
}
```

Con la doble y la cola del pedido A, `promotion.name` es «Martes 20», `discountAmount` es 4400 y `totalAmount` es 17600. El envío no entra en esta cuenta.

## 7.3 Sucursales para este carrito

`POST /api/branches/checkout`

Entrada: domicilio, dos hamburguesas dobles, dirección ya guardada.

```json
{
  "fulfillment": "delivery",
  "addressId": "dir-casa",
  "items": [{ "productId": "prod-doble", "quantity": 2 }]
}
```

Salida: Centro puede, Norte no. El orden ya viene con las que pueden primero. Con Martes 20 el subtotal descontado es $32.000, así que el envío gratis aplica y las dos sucursales cobran $0. El envío de $2.400 de la sección 2.2 es el de un pedido que, ya descontado, no llega a $25.000.

```json
{
  "fulfillment": "delivery",
  "radiusKm": 5,
  "freeDelivery": { "minSubtotal": 25000, "qualifies": true, "missing": 0 },
  "branches": [
    {
      "name": "Mordi Centro",
      "openingHours": "Lun-Dom 10:00-23:00",
      "openNow": true,
      "nextOpenAt": null,
      "distanceKm": 2.34,
      "deliveryFee": 0,
      "canFulfill": true,
      "missing": []
    },
    {
      "name": "Mordi Norte",
      "distanceKm": 3.1,
      "deliveryFee": 0,
      "canFulfill": false,
      "missing": [{ "name": "Hamburguesa doble", "requested": 2, "available": 1 }]
    }
  ]
}
```

Si ninguna sucursal cae dentro del radio, `branches` viene vacío. En retiro la lista trae todas las activas, `deliveryFee` 0 y no hace falta dirección. Si `openNow` es falso, cada sucursal trae `nextOpenAt`, la próxima apertura. El checkout ofrece programar el pedido para esa hora.

## 7.4 Confirmar el pedido

`POST /api/orders` · con cuenta. El invitado usa `POST /api/orders/guest` con nombre, correo y la dirección escrita. El medio de pago no viaja en este cuerpo: la pantalla de confirmación lo recuerda en esa visita y no lo guarda.

Entrada del caso feliz de HU-08.

```json
{
  "fulfillment": "delivery",
  "addressId": "dir-casa",
  "branchId": "suc-centro"
}
```

Salida:

```json
{
  "code": "MOR482913",
  "status": "pending",
  "fulfillment": "delivery",
  "subtotal": 22000,
  "discountAmount": 4400,
  "promotionName": "Martes 20",
  "deliveryFee": 2400,
  "totalAmount": 20000,
  "branch": { "name": "Mordi Centro" },
  "scheduledFor": null
}
```

Ese pedido se confirmó a las 21:00, dentro del horario, así que `scheduledFor` va vacío. A las 23:30 la misma sucursal está cerrada. Confirmar sin aceptar responde 409, con el código `BRANCH_CLOSED` y la pregunta de programarlo. Si el cliente acepta, la entrada lleva `"scheduleWhenClosed": true` y la salida trae `"scheduledFor": "2026-11-12T10:00:00.000-03:00"`. La estimada se cuenta desde esa hora.

Si el cliente con cuenta elige un cupón de reclamo, la entrada lleva `couponIncidentId` con el id de ese reclamo. Si no lo manda y tiene cupones vigentes, entra el que vence antes. El invitado no tiene cupón.

Si `branchId` es Mordi Norte, la salida es un 409 y no hay fila nueva:

```json
{
  "statusCode": 409,
  "code": "OUT_OF_STOCK",
  "message": "No hay stock suficiente de \"Hamburguesa doble\" en Mordi Norte (quedan 1)",
  "branch": { "name": "Mordi Norte" },
  "items": [{ "name": "Hamburguesa doble", "requested": 2, "available": 1 }]
}
```

## 7.5 Seguimiento

`GET /api/orders/:id` · el dueño, con sesión. `:id` es la clave interna; `code` es el que se dice en el local.

Cuando el administrador ya lo marcó entregado (HU-10):

```json
{
  "code": "MOR482913",
  "status": "delivered",
  "fulfillment": "delivery",
  "totalAmount": 20000,
  "promotionName": "Martes 20",
  "estimatedDeliveryAt": "2026-11-11T21:40:00.000Z",
  "canCancel": false,
  "history": [
    { "status": "pending", "changedAt": "2026-11-11T20:10:00.000Z" },
    { "status": "confirmed", "changedAt": "2026-11-11T20:14:00.000Z" },
    { "status": "delivered", "changedAt": "2026-11-11T21:05:00.000Z" }
  ]
}
```

En un retiro entregado, la pantalla dice «Retirado» aunque el estado guardado sea `delivered`. Al entregar o al cancelar, la reserva de esa sucursal ya se resolvió: no queda stock apartado para ese pedido.

## 7.6 El administrador cambia el estado

`POST /api/admin/orders/:id/status` · solo super admin.

Entrada, el paso en el que el stock se descuenta:

```json
{ "status": "delivered" }
```

Salida: el pedido con `status` «delivered». En la sucursal, esas unidades salen de `reserved` y no vuelven a `available`.

Si el pedido estaba en Pendiente y el cuerpo es `{ "status": "cancelled" }`, la reserva vuelve a `available`. Si estaba en En preparación y se pide cancelar, responde 409 y el stock no se toca. Quien tiene el rol solo pedidos recibe 403 en este recurso. Sí puede hacer `GET /api/admin/orders`, listar reclamos y cupones, resolver, cargar el importe y reabrir si el cupón no se usó.

## 7.7 Reportes de pedidos

`GET /api/admin/reports/orders?from=2026-11-01&to=2026-11-11&branchId=suc-centro` · super admin.

Sin `from`, `to` ni `branchId`, el corte es todo el historial y todas las sucursales. Las fechas son días de Argentina.

```json
{
  "ordersByDay": [{ "date": "2026-11-11", "count": 4 }],
  "ordersByStatus": [{ "status": "delivered", "count": 3 }, { "status": "cancelled", "count": 1 }],
  "cancelled": { "count": 1, "percent": 25 },
  "averageDeliveryMinutes": 48,
  "salesByBranch": [{ "branchName": "Mordi Centro", "totalAmount": 60000 }],
  "topCustomers": [{ "name": "Cliente de prueba", "orderCount": 3 }],
  "topPromotions": [{ "promotionName": "Martes 20", "orderCount": 2, "totalDiscount": 8800 }]
}
```

Un cancelado no entra en `salesByBranch` ni en el top de clientes. Un pendiente sí entra en las ventas. El mismo filtro en `GET /api/admin/reports/products` devuelve más vendidos, menos vendidos, mayor facturación y sin stock. La pantalla ofrece «Descargar CSV» de cada lista, con el filtro que está puesto.

## 7.8 Repetir

`POST /api/orders/MOR-id/repeat` · el dueño.

No lleva cuerpo. Con el carrito de HU-12 (una papa) y un pedido de una doble más una papa, la salida trae el carrito ya sumado:

```json
{
  "cart": {
    "total": 26000,
    "items": [
      { "productId": "prod-papas", "quantity": 2, "subtotal": 6000 },
      { "productId": "prod-doble", "quantity": 1, "subtotal": 20000 }
    ]
  },
  "skipped": []
}
```

Si la doble ya no se vende, `items` solo tiene las papas y `skipped` nombra la hamburguesa. No se crea un pedido nuevo en este paso.

## 7.9 Reclamo y cupón

`POST /api/orders/:id/incident` · el dueño, con sesión. Uno por pedido, y solo si está entregado o retirado. Si el motivo es `other`, el mensaje es obligatorio. El mensaje puede tener hasta 500 caracteres.

```json
{ "reason": "cold", "message": "Llegó fría" }
```

`POST /api/orders/:id/incident/seen` · el dueño. No lleva cuerpo. Marca que ya vio la respuesta. Hasta entonces el pedido figura con «Nueva respuesta». Si después cambian la respuesta o el monto, vuelve a figurar.

`GET /api/admin/incidents` · super admin o solo pedidos. Los abiertos van primero. Con `?status=open` o `?status=resolved` queda solo ese estado. `GET /api/admin/incidents/coupons` lista los cupones. `GET /api/admin/incidents/:id` es el detalle, y desde ahí se puede copiar el total cobrado del pedido como importe del cupón.

`PATCH /api/admin/incidents/:id` · los dos roles.

```json
{ "status": "resolved", "response": "Te dejamos un cupón.", "couponAmount": 5000 }
```

`response` es obligatoria al resolver y puede tener hasta 500 caracteres. `couponAmount` es opcional: un monto de $1 a $500.000 crea o actualiza el cupón, y `null` lo quita si todavía no se usó. El código sale `REC-` y seis caracteres. El cupón vence a los 3 meses. Si se cambia la respuesta o el monto, la respuesta vuelve a quedar no vista.

Reabrir, si el cupón no se usó:

```json
{ "status": "open" }
```

Mientras el reclamo está abierto, el cupón no se descuenta. Vuelve a aplicar al resolverlo de nuevo. Si el cliente ya usó el cupón, el mismo PATCH responde 409 y la solución queda como estaba.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.4 | 12/11/2026 | El reclamo documenta el tope de 500 caracteres, el filtro por estado, el código `REC-` y el cupón pausado al reabrir |
| 2.3 | 12/11/2026 | Alta de reclamo, respuesta vista, listado y resolución. El rol solo pedidos también resuelve y carga el cupón |
| 2.2 | 11/11/2026 | El texto queda igual a la sección de `Carpeta.md` de la entrega del 12/11 |
| 1.2 | 01/11/2026 | Ciudad, provincia y CP en direcciones y sucursales. Geocode estructurado e inverso (HU-34) |
| 1.1 | 15/10/2026 | Alta de GET /api/branches: todas las sucursales activas |
| 1.0 | 07/10/2026 | Mapa de la API al cierre del Sprint 3 |
