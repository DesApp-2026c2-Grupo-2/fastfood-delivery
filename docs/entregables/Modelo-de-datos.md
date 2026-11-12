# Modelo de datos

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.4
**Actualizado:** 12/11/2026
**Fuente:** sección homónima de `Carpeta.md`

Una base PostgreSQL. Las cantidades de dinero son decimales de dos posiciones. Las claves son identificadores opacos; el código del pedido es otro dato, único, para decirlo en el local.

## 6.1 Entidades

```mermaid
Cliente {
  string email
  string name
  boolean active
  int loyaltyStamps
  boolean hasTopBuyerReward
}
Administrador {
  string email
  string adminRole
}
Direccion {
  string street
  string city
  string province
  string postalCode
  decimal latitude
  decimal longitude
}
Sucursal {
  string name
  string openingHours
  boolean active
  decimal latitude
  decimal longitude
}
FranjaHoraria {
  string day
  int slot
  string opens
  string closes
}
Producto {
  string name
  decimal price
  boolean available
}
Categoria {
  string name
  string slug
}
Stock {
  int available
  int reserved
}
Carrito {
  string userId
}
LineaCarrito {
  int quantity
  string notes
}
Pedido {
  string code
  string fulfillment
  string status
  decimal subtotal
  decimal discountAmount
  decimal deliveryFee
  decimal totalAmount
  boolean stockReserved
  datetime scheduledFor
}
LineaPedido {
  int quantity
  decimal unitPrice
}
Promocion {
  string type
  int value
  decimal minSubtotal
  boolean active
}
HistorialEstado {
  string status
  datetime changedAt
}
Reclamo {
  string reason
  string message
  string status
  string response
  string couponCode
  decimal couponAmount
  datetime couponCreatedAt
  datetime resolvedAt
  datetime responseSeenAt
}
Parametro {
  string key
  string value
}
```

`openingHours` es el texto de respaldo. Si la sucursal tiene franjas, esas mandan: hasta dos por día (`slot`), con apertura y cierre. Sin franjas, se muestra el texto y el local se toma como abierto. `scheduledFor` en el pedido queda vacío cuando se confirma en horario. Si el cliente lo programa, guarda la próxima apertura.

<!-- diagrama -->

## 6.2 Relaciones

| De | A | Cómo |
|---|---|---|
| Cliente | Dirección, Carrito, Pedido, Reclamo | Un cliente, muchas direcciones y muchos pedidos. Un carrito. |
| Cliente | Pedido | El pedido del invitado no tiene cliente: guarda nombre y correo en el propio pedido. |
| Administrador | HistorialEstado | Quién cambió el estado, cuando fue un usuario del sistema. |
| Sucursal | Pedido, Stock, FranjaHoraria | Todo pedido tiene una sucursal. El stock es por sucursal y producto. Una sucursal tiene varias franjas de horario. |
| Producto | Categoría | Muchos a muchos. |
| Producto | Producto | Los adicionales que ese producto ofrece. |
| Carrito | Línea | Una línea es producto + adicionales + nota. La misma hamburguesa con otro adicional es otra línea. |
| Pedido | Línea, Historial, Promoción, Reclamo | La línea congela precio y nombre del adicional. La promoción guarda el nombre, para que editarla después no cambie el pedido. Un reclamo como máximo. |
| Promoción | Producto | Solo en el 2x1: el producto que sale gratis. |

El cupón de reclamo no es una promoción de la carta: vive en el reclamo, con código, importe y fecha de alta. El código es `REC-` y seis caracteres. El importe va de $1 a $500.000. Vence a los 3 meses de esa fecha. `response` es el texto que lee el cliente, de hasta 500 caracteres. `responseSeenAt` queda vacío hasta que abre el pedido, y vuelve a vacío si cambian la respuesta o el monto. Con el reclamo abierto el cupón no se descuenta. El pedido que usa el cupón apunta a ese reclamo. Si ese pedido se cancela, el cupón vuelve a quedar libre. Los reportes no se guardan: se calculan sobre pedidos y stock. El premio de fidelización y el del top de clientes no son una fila de Promoción: el pedido guarda el nombre («Premio Fidelidad», «Premio Top 3») y el descuento.

---


## Valores cerrados

| Dónde | Valores |
|---|---|
| Pedido, cómo se entrega | `delivery` (domicilio) o `pickup` (retiro) |
| Pedido, estado | `pending`, `confirmed`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled` |
| Promoción | `percent` o `two_for_one` |
| Administrador | `super_admin` o `orders_viewer` |
| Reclamo, motivo | `missing_item`, `wrong_order`, `late`, `cold`, `other` |
| Reclamo, estado | `open` o `resolved` |
| Cupón de reclamo | `available`, `used` o `expired`. Si ya se usó, sigue usado aunque venza |
| Franja | día 0 = lunes … 6 = domingo; `slot` 0 o 1 |

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.4 | 12/11/2026 | El cupón documenta el código `REC-`, el tope del importe y que `responseSeenAt` se vacía al editar la solución |
| 2.3 | 12/11/2026 | El reclamo guarda mensaje, respuesta, cupón, visto por el cliente y el pedido que canjeó el cupón |
| 2.2 | 11/11/2026 | El texto queda igual a la sección de `Carpeta.md` de la entrega del 12/11 |
| 1.1 | 01/11/2026 | Ciudad, provincia y CP en Address y en Branch (HU-34) |
| 1.0 | 07/10/2026 | Modelo de carpeta al cierre del Sprint 3 |
