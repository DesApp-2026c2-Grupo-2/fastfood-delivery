# Diagrama DER

**Proyecto:** Pedidos en casas de comidas rápidas  
**Versión:** 1.1  
**Actualizado:** 21/09/2026  
**Fuente:** `backend/prisma/schema.prisma`  
**Notación:** Crow’s Foot (modelo lógico)

Todas las entidades (salvo `ProductImage`, `OrderItem`, `CartItemExtra` y `OrderItemExtra`) incluyen `createdAt` y `updatedAt`. Esos campos no se repiten en cada caja para no saturar el diagrama.

```mermaid
erDiagram
    User {
        String id PK
        String email UK
        String passwordHash
        Role role
        String name
    }

    Address {
        String id PK
        String userId FK "nullable"
        String street
        Decimal latitude
        Decimal longitude
        Boolean isDefault
    }

    Cart {
        String id PK
        String userId FK "unique"
    }

    CartItem {
        String id PK
        String cartId FK
        String productId FK
        Int quantity
        String notes
        String extrasKey "ids de adicionales, ordenados"
    }

    CartItemExtra {
        String cartItemId PK, FK
        String extraId PK, FK
    }

    Category {
        String id PK
        String name UK
        String slug UK
    }

    Product {
        String id PK
        String name
        String slug UK
        String description
        Decimal price
        Boolean available
    }

    ProductImage {
        String id PK
        String productId FK
        String url
        Int sortOrder
    }

    Branch {
        String id PK
        String name
        String address
        Decimal latitude
        Decimal longitude
        String openingHours
        String phone
        Boolean active
    }

    Order {
        String id PK
        String userId FK "nullable"
        String branchId FK
        String addressId FK
        String guestName "nullable"
        String guestEmail "nullable"
        OrderStatus status
        Decimal totalAmount
    }

    OrderItem {
        String id PK
        String orderId FK
        String productId FK
        Int quantity
        Decimal unitPrice
        String notes
    }

    OrderItemExtra {
        String id PK
        String orderItemId FK
        String extraId FK
        String name "snapshot"
        Decimal price "snapshot"
    }

    User ||--o| Cart : "tiene"
    User ||--o{ Address : "guarda"
    User ||--o{ Order : "realiza"
    Cart ||--o{ CartItem : "contiene"
    Product ||--o{ CartItem : "aparece_en"
    CartItem ||--o{ CartItemExtra : "adicionales"
    Product ||--o{ CartItemExtra : "elegido_como_adicional"
    Product }o--o{ Category : "clasificado_en"
    Product ||--o{ ProductImage : "tiene"
    Branch ||--o{ Order : "atiende"
    Address ||--o{ Order : "entrega_en"
    Order ||--|{ OrderItem : "detalle"
    Product ||--o{ OrderItem : "aparece_en"
    OrderItem ||--o{ OrderItemExtra : "adicionales"
    Product ||--o{ OrderItemExtra : "adicional_en"
```

## Cardinalidades

| Entidad A | Card. | Entidad B | Relación |
|---|---|---|---|
| User | 1 — 0..1 | Cart | Un usuario tiene a lo sumo un carrito |
| User | 1 — 0..N | Address | Direcciones del cliente; `userId` puede ser null (invitado) |
| User | 1 — 0..N | Order | Pedidos del cliente; `userId` opcional en checkout guest |
| Cart | 1 — 0..N | CartItem | Ítems del carrito; único por (`cartId`, `productId`, `extrasKey`) |
| Product | 1 — 0..N | CartItem | Un producto puede estar en muchos carritos |
| CartItem | 1 — 0..N | CartItemExtra | Adicionales elegidos en la línea; se borra en cascada con la línea |
| Product | 1 — 0..N | CartItemExtra | Producto usado como adicional; si se borra, sale de los carritos |
| Product | N — N | Category | Tabla implícita `_ProductCategories` |
| Product | 1 — 0..N | ProductImage | Galería; se borra en cascada con el producto |
| Branch | 1 — 0..N | Order | Sucursal que prepara el pedido |
| Address | 1 — 0..N | Order | Dirección de entrega del pedido |
| Order | 1 — 1..N | OrderItem | Detalle; se borra en cascada con el pedido |
| Product | 1 — 0..N | OrderItem | Snapshot de precio en `unitPrice` |
| OrderItem | 1 — 0..N | OrderItemExtra | Adicionales de la línea; se borra en cascada con el ítem |
| Product | 1 — 0..N | OrderItemExtra | Producto usado como adicional; no se puede borrar si tiene pedidos |

## Enums

**Role:** `customer`, `admin`

**OrderStatus:** `pending`, `confirmed`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled`

## Notas

- **Product–Category** es N:N. Prisma no declara la tabla intermedia; en PostgreSQL queda `_ProductCategories`.
- **Checkout de invitado:** `Order.userId` y `Address.userId` son opcionales. El pedido guarda `guestName` y `guestEmail`. El carrito sigue siendo 1:1 con usuario logueado.
- **OrderItem.unitPrice** congela el precio al confirmar; no se recálcula si después cambia el producto.
- **Adicionales de hamburguesa (DEV-10):** un adicional es un `Product` de la categoría *Adicional* y se ofrece en los de *Hamburguesas*; la regla se resuelve por slug de categoría, sin tabla de configuración. `CartItem.extrasKey` (ids de adicionales ordenados, `""` si no hay) hace única la línea por producto + adicionales. `OrderItemExtra` congela nombre y precio, como `OrderItem.unitPrice`.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.1 | 21/09/2026 | Adicionales de hamburguesa (DEV-10): `CartItemExtra`, `OrderItemExtra` y `CartItem.extrasKey` |
| 1.0 | 07/09/2026 | DER inicial según `schema.prisma` (guest checkout, N:N Product–Category) |
