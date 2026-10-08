# Diseño de APIs

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Versión:** 1.0  
**Actualizado:** 07/10/2026  
**Fuente:** controladores de `backend/src/`  
**Estado:** contrato en uso al cierre del Sprint 3. Promociones y reportes no tienen rutas todavía.

Prefijo `/api`. JSON. Los textos de error vienen en `message`, en español, listos para mostrar.

Los ejemplos de cuerpo de stock, parámetros, perfil y recuperar contraseña están también en `docs/tecnica/API-sprint-3.md`. Los de historial y seguimiento, en `docs/tecnica/API-pedidos-cliente.md`. Este documento es el mapa completo.

---

## 1. Autenticación

El JWT viaja en `Authorization: Bearer <token>`.

| Situación | Código |
|---|---|
| Falta el token, venció o el usuario ya no existe | 401 |
| El rol no corresponde (un cliente en `/api/admin/*`, un admin en un pedido de cliente) | 403 |
| Validación de datos | 400 |
| No existe, o es de otro cliente cuando no debe verse | 404 |
| Regla de negocio (sin stock, categoría con productos, email repetido) | 409 |

`GET /api/auth/me` y `GET /api/me` devuelven `{ id, email, name, role }`.

## 2. Recursos públicos y de cliente

| Método | Ruta | Auth | Para qué |
|---|---|---|---|
| POST | `/api/auth/register` | No | Crea un cliente y devuelve el JWT |
| POST | `/api/auth/login` | No | Cliente o admin |
| GET | `/api/auth/me` | JWT | Sesión actual |
| POST | `/api/auth/forgot-password` | No | Inicia el reset. Siempre el mismo mensaje |
| POST | `/api/auth/reset-password` | No | Body: `token`, `newPassword` |
| GET | `/api/categories` | No | Categorías |
| GET | `/api/categories/:id` | No | Una categoría |
| GET | `/api/products` | No | Solo `available = true`. Filtro opcional `categoryId` |
| GET | `/api/products/:id` | No | Detalle. 404 si no está disponible. Incluye `extras` |
| GET | `/api/branches/available` | Opcional | Sucursales activas dentro del radio |
| GET | `/api/me` | JWT | Perfil |
| PATCH | `/api/me` | JWT | Nombre y/o contraseña. El email no se acepta |
| GET, POST | `/api/me/addresses` | Cliente | Direcciones propias |
| PATCH, DELETE | `/api/me/addresses/:id` | Cliente | Editar o borrar la propia |
| GET | `/api/cart` | Cliente | Carrito, con total |
| POST | `/api/cart/items` | Cliente | Agregar. Acepta `extraIds` |
| PATCH, DELETE | `/api/cart/items/:id` | Cliente | Cantidad, observaciones, o quitar |
| POST | `/api/orders` | Cliente | Confirmar el carrito |
| POST | `/api/orders/guest` | No | Confirmar sin cuenta |
| GET | `/api/orders` | Cliente | Historial propio |
| GET | `/api/orders/:id` | Cliente | Seguimiento. 404 si es de otro |
| POST | `/api/orders/:id/cancel` | Cliente | Cancelar si el estado lo permite |
| POST | `/api/orders/:id/repeat` | Cliente | Copia ítems al carrito. No reserva stock |
| GET | `/api/pusher/config` | JWT | Datos públicos de tiempo real |
| POST | `/api/pusher/auth` | JWT | Autoriza el canal del pedido |
| GET | `/api/health` | No | Salud del servicio |

### Sucursales disponibles

`GET /api/branches/available?addressId=` exige el JWT del dueño de esa dirección.  
`GET /api/branches/available?lat=&lng=` no exige sesión.

Responde `{ radiusKm, branches }`. Cada sucursal trae nombre, dirección, teléfono, horario, coordenadas y `distanceKm`. Solo activas dentro del radio, de la más cercana a la más lejana. Lista vacía: esa ubicación no tiene cobertura.

### Recuperar contraseña

`POST /api/auth/forgot-password` con `{ email }` responde 200 siempre, exista o no el email. En modo demo, y solo si el email es de un cliente, el cuerpo suma `demo.resetToken` y `demo.expiresAt`. El modo demo está apagado en producción salvo `PASSWORD_RESET_DEMO=true`.

`POST /api/auth/reset-password` con un token inexistente, vencido o usado responde 400.

## 3. Confirmación del pedido

`POST /api/orders` (carrito del cliente) y `POST /api/orders/guest` (ítems, nombre, email y dirección en el cuerpo).

Si sale bien, 201: el pedido queda `pending`, con sucursal, `estimatedDeliveryAt`, detalle e importe, y el carrito autenticado se vacía.

Si sale mal, **no se crea el pedido**.

| Caso | Código | `code` |
|---|---|---|
| Ninguna sucursal activa dentro del radio | 400 | `OUT_OF_COVERAGE` |
| No hay stock del producto o de un adicional en la sucursal asignada | 409 | `OUT_OF_STOCK` |
| El producto no admite adicionales, o un adicional no existe o no está disponible | 400 | — |

`OUT_OF_STOCK` nombra los productos que faltan y trae `items` con lo pedido y lo disponible.

### Asignación y hora estimada

Sucursal: la activa más cercana (Haversine) cuya distancia sea menor o igual a `coverage_radius_km`.

Hora, calculada una vez:

```
estimatedDeliveryAt = ahora
  + eta_prep_base_min
  + (unidades × eta_min_per_item)
  + ceil(distanciaKm / eta_km_per_min)
```

En los GET de pedidos, propios y de admin:

| Estado | `etaMinutes` | `delayMinutes` |
|---|---|---|
| Abierto | Minutos que faltan (0 si ya pasó la hora) | Minutos de atraso (0 si todavía no llegó) |
| `delivered` | `null` | Cuánto tarde se entregó (0 si llegó a tiempo) |
| `cancelled` | `null` | `null` |

### Stock al confirmar, cancelar y entregar

| Momento | Efecto en la sucursal del pedido |
|---|---|
| Confirmar | `available -= cantidad`, `reserved += cantidad`, `stockReserved = true` |
| Cancelar en `pending` o `confirmed` | Se revierte la reserva |
| Pasar a `delivered` | `reserved -= cantidad`. No vuelve a `available` |
| Repetir | Nada |

Un producto o adicional sin fila de stock cuenta como 0. Los pedidos creados antes del stock tienen `stockReserved = false` y no lo mueven.

### Adicionales

`extraIds`: hasta 10, sin repetir. `unitPrice` es el precio base. `extrasTotal` es el recargo por unidad. `subtotal = (unitPrice + extrasTotal) × quantity`. En el pedido, nombre y precio del adicional quedan copiados.

### Máquina de estados

```
pending    → confirmed | cancelled
confirmed  → preparing | cancelled
preparing  → ready
ready      → on_the_way
on_the_way → delivered
```

`delivered` y `cancelled` no tienen siguiente. El detalle del cliente trae `canCancel`. El del admin trae `nextStatuses`.

## 4. Administración

Todas piden JWT de admin.

| Método | Ruta | Para qué |
|---|---|---|
| CRUD | `/api/admin/categories` | ABM. Borrar con productos: 409 |
| CRUD | `/api/admin/products` | ABM. Imagen por URL |
| POST | `/api/admin/uploads` | Sube hasta 8 imágenes (jpeg, png, webp, gif) |
| CRUD | `/api/admin/branches` | ABM de sucursales |
| POST | `/api/admin/branches/geocode` | Texto de dirección → lat/lng (Nominatim, Argentina) |
| GET | `/api/admin/branches/:branchId/stock` | Stock de todos los productos en esa sucursal |
| PUT | `/api/admin/branches/:branchId/stock/:productId` | Body `{ "available": 20 }`. No se edita `reserved` |
| GET, POST | `/api/admin/admins` | Listado y alta |
| PATCH, DELETE | `/api/admin/admins/:id` | Editar o borrar. El inicial no se borra ni cambia de email |
| GET, PATCH | `/api/admin/parameters` | Radio y constantes de ETA |
| GET | `/api/admin/order-statuses` | Estados, etiqueta y transiciones. Solo lectura |
| GET | `/api/admin/orders` | Listado, filtro por estado |
| GET | `/api/admin/orders/:id` | Detalle, timeline, hora y demora |
| POST | `/api/admin/orders/:id/status` | Avanza al siguiente estado válido |
| POST | `/api/admin/orders/:id/cancel` | Cancela si está en `pending` o `confirmed` |

### Parámetros

| Clave | Default | Rango |
|---|---|---|
| `coverage_radius_km` | 5 | 0,1 a 100 |
| `eta_prep_base_min` | 15 | 0 a 240, entero |
| `eta_min_per_item` | 3 | 0 a 60, entero |
| `eta_km_per_min` | 0,5 | 0,05 a 10 |

`PATCH` manda solo las claves que cambian. Rigen para el próximo pedido.

### Stock

`GET` devuelve todos los productos, también los que no tienen fila (`available: 0`, `reserved: 0`). `PUT` crea la fila si no existía. `available` es un entero de 0 a 1.000.000.

## 5. Lo que esta API todavía no tiene

Queda para el Sprint 4, ya diseñado en la ficha y todavía sin rutas:

| Método previsto | Ruta | Para qué |
|---|---|---|
| GET, POST | `/api/admin/promotions` | ABM |
| GET, PATCH, DELETE | `/api/admin/promotions/:id` | Editar, desactivar o borrar si nadie la usó |
| POST | `/api/promotions/quote` | Cotizar subtotal, descuento y total |
| GET | `/api/admin/reports/products` | Los cuatro reportes de productos |

Al confirmar, el cuerpo va a aceptar `couponCode` opcional y la respuesta va a sumar `subtotal`, `discountAmount` y `promotionName`. Hoy `totalAmount` es el importe sin descuento.

Los reportes extra del Sprint 5 no tienen ruta definida todavía.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 07/10/2026 | Mapa de la API al cierre del Sprint 3 |
