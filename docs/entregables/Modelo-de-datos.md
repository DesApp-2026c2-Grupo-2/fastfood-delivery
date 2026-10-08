# Modelo de datos

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Versión:** 1.0  
**Actualizado:** 07/10/2026  
**Fuente:** `backend/prisma/schema.prisma`  
**Notación:** Crow’s Foot (modelo lógico), alineado a lo que está en la base al cierre del Sprint 3

No hay tablas de promociones ni de reportes: los reportes se calculan sobre los pedidos y el stock. Esas entidades entran con el Sprint 4.

Salvo que una nota diga lo contrario, las entidades tienen `createdAt` y `updatedAt`. No se dibujan en cada caja.

```mermaid
erDiagram
    User {
        String id PK
        String email UK
        String passwordHash
        Role role
        String name
    }

    PasswordResetToken {
        String id PK
        String userId FK
        String tokenHash UK
        DateTime expiresAt
        DateTime usedAt "nullable"
    }

    Address {
        String id PK
        String userId FK "nullable"
        String alias
        String street
        Decimal latitude
        Decimal longitude
        Boolean isDefault
    }

    Cart {
        String id PK
        String userId FK UK
    }

    CartItem {
        String id PK
        String cartId FK
        String productId FK
        Int quantity
        String notes
        String extrasKey
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

    Stock {
        String id PK
        String branchId FK
        String productId FK
        Int available
        Int reserved
    }

    Parameter {
        String key PK
        String value
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
        DateTime estimatedDeliveryAt
        Boolean stockReserved
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
        String name
        Decimal price
    }

    OrderStatusHistory {
        String id PK
        String orderId FK
        OrderStatus status
        DateTime changedAt
        String changedByUserId FK "nullable"
    }

    User ||--o| Cart : "tiene"
    User ||--o{ Address : "guarda"
    User ||--o{ Order : "realiza"
    User ||--o{ PasswordResetToken : "pide"
    User ||--o{ OrderStatusHistory : "cambia"
    Cart ||--o{ CartItem : "contiene"
    Product ||--o{ CartItem : "aparece_en"
    CartItem ||--o{ CartItemExtra : "adicionales"
    Product ||--o{ CartItemExtra : "elegido_como_adicional"
    Product }o--o{ Category : "clasificado_en"
    Product ||--o{ ProductImage : "tiene"
    Product ||--o{ Stock : "stock_en"
    Branch ||--o{ Stock : "tiene_stock"
    Branch ||--o{ Order : "atiende"
    Address ||--o{ Order : "entrega_en"
    Order ||--|{ OrderItem : "detalle"
    Product ||--o{ OrderItem : "aparece_en"
    OrderItem ||--o{ OrderItemExtra : "adicionales"
    Product ||--o{ OrderItemExtra : "adicional_en"
    Order ||--o{ OrderStatusHistory : "historial"
```

## Cardinalidades

| Entidad A | Card. | Entidad B | Relación |
|---|---|---|---|
| User | 1 — 0..1 | Cart | Un usuario tiene a lo sumo un carrito |
| User | 1 — 0..N | Address | Direcciones del cliente. `userId` nulo: dirección de un invitado |
| User | 1 — 0..N | Order | Pedidos del cliente. `userId` nulo: checkout de invitado |
| User | 1 — 0..N | PasswordResetToken | Tokens de recuperación. Se borran con el usuario |
| User | 1 — 0..N | OrderStatusHistory | Cambios de estado hechos por ese usuario |
| Cart | 1 — 0..N | CartItem | Único por (`cartId`, `productId`, `extrasKey`) |
| CartItem | 1 — 0..N | CartItemExtra | Adicionales de la línea. Se borra en cascada con la línea |
| Product | N — N | Category | Tabla `_ProductCategories` |
| Product | 1 — 0..N | ProductImage | Galería. Se borra con el producto |
| Branch | 1 — 0..N | Stock | Único por (`branchId`, `productId`). Sin fila, el producto no se vende ahí |
| Product | 1 — 0..N | Stock | El mismo producto en varias sucursales |
| Branch | 1 — 0..N | Order | Sucursal que prepara el pedido |
| Address | 1 — 0..N | Order | Dirección de entrega |
| Order | 1 — 1..N | OrderItem | Detalle. Se borra con el pedido |
| OrderItem | 1 — 0..N | OrderItemExtra | Adicionales congelados al confirmar |
| Order | 1 — 0..N | OrderStatusHistory | Timeline. Se borra con el pedido |
| Parameter | — | — | No se relaciona. Una fila por clave |

## Enums

**Role:** `customer`, `admin`

**OrderStatus:** `pending`, `confirmed`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled`

## Qué guarda cada bloque

**Pedido de invitado.** `Order.userId` y `Address.userId` pueden ser nulos. El pedido guarda `guestName` y `guestEmail`. El carrito sigue siendo solo de un usuario logueado; el invitado arma el suyo en el navegador.

**Precios congelados.** `OrderItem.unitPrice` y `OrderItemExtra.name` / `price` no se recalculan si después cambia el catálogo.

**Adicionales.** Un adicional es un `Product` de la categoría Adicional. `CartItem.extrasKey` (ids ordenados, vacío si no hay) distingue dos líneas del mismo producto. No hay tabla de “configuraciones”.

**Stock.** `available` es lo que se puede vender. `reserved` es lo comprometido en pedidos que todavía no se entregaron. `Order.stockReserved` dice si ese pedido tiene reserva viva. Los pedidos anteriores a esta tabla quedan en `false` y no mueven stock.

**Hora estimada.** `Order.estimatedDeliveryAt` se escribe al confirmar y no se vuelve a calcular.

**Parámetros.** Claves: `coverage_radius_km`, `eta_prep_base_min`, `eta_min_per_item`, `eta_km_per_min`. El valor es texto y la API lo interpreta como número.

**Recuperar contraseña.** `PasswordResetToken` guarda el hash del token, no el token. `usedAt` nulo significa que todavía no se usó.

**Dirección.** `alias` es el nombre corto (“Casa”, “Trabajo”). Puede ir vacío.

## Qué no está en el modelo

Promoción, descuento del pedido, cupón y cualquier tabla de reportes. El Sprint 4 va a sumar, como mínimo, la promoción y en el pedido el subtotal, el descuento y la promo aplicada. Hasta entonces `totalAmount` es el importe cobrado, sin descuento.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 07/10/2026 | Modelo de carpeta al cierre del Sprint 3: stock, parámetros, token de reset, historial de estados, hora estimada y alias |
