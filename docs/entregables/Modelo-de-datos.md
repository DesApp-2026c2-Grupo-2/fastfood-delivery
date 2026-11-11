# Modelo de datos

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.2
**Actualizado:** 11/11/2026
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
  string status
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

El cupón de reclamo no es una promoción de la carta: vive en el reclamo, con código, importe y vencimiento a los 3 meses. Los reportes no se guardan: se calculan sobre pedidos y stock. El premio de fidelización y el del top de clientes no son una fila de Promoción: el pedido guarda el nombre («Premio Fidelidad», «Premio Top 3») y el descuento.

---


## Valores cerrados

| Dónde | Valores |
|---|---|
| Pedido, cómo se entrega | `delivery` (domicilio) o `pickup` (retiro) |
| Pedido, estado | `pending`, `confirmed`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled` |
| Promoción | `percent` o `two_for_one` |
| Administrador | `super_admin` o `orders_viewer` |
| Reclamo | abierto o resuelto |
| Franja | día 0 = lunes … 6 = domingo; `slot` 0 o 1 |

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.2 | 11/11/2026 | El texto queda igual a la sección de `Carpeta.md` de la entrega del 12/11 |
| 1.1 | 01/11/2026 | Ciudad, provincia y CP en Address y en Branch (HU-34) |
| 1.0 | 07/10/2026 | Modelo de carpeta al cierre del Sprint 3 |
