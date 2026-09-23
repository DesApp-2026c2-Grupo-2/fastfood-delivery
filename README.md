# Pedidos en casas de comidas rápidas

Tres piezas en un solo repo, misma base de datos:

- Cliente (quien pide comida): React + Vite en `/frontend`
- Administración: React + Vite en `/backend/admin`
- API: NestJS + TypeScript en `/backend`

Comunicación: API REST + JWT. PostgreSQL con Docker.

Foco del Sprint 1: catálogo admin, sucursales, direcciones, carrito y confirmar un pedido.

## Deploy

- Administrador: https://mordi-admin.vercel.app/
- Web: https://mordi-web.vercel.app/
- API: https://mordi-administrador.vercel.app/api/products

## Cómo levantar todo

Hace falta Node.js 22+, npm y Docker Desktop.

En la raíz del repo:

```bash
docker compose up -d
```

API:

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npm run db:setup
npm run start:dev
```

Admin (otra terminal):

```bash
cd backend/admin
cp .env.example .env
npm install
npm run dev
```

Cliente (otra terminal):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

En PowerShell, en vez de `cp`:

```powershell
Copy-Item .env.example .env
```

URLs:

- App cliente: http://localhost:5173/products
- Login cliente: http://localhost:5173/login
- Catálogo: http://localhost:5173/products
- Carrito: http://localhost:5173/cart
- Checkout: http://localhost:5173/checkout
- Direcciones (con cuenta): http://localhost:5173/account/addresses
- Admin: http://localhost:5174/admin/login
- API: http://localhost:3000/api

Usuario seed (admin):

- Email: `admin@rapido.local`
- Contraseña: `Admin123!`

Sucursal seed (tras `npm run db:setup`):

- Nombre: **Mordi Centro** (activa, con lat/lng en Buenos Aires)

Tests de backend (login + `POST /orders`):

```bash
cd backend
npm test
```

## Flujos a probar

### Catálogo (admin)

Login admin → crear categoría → crear producto (disponible y no disponible) → ver el catálogo del cliente. El producto no disponible no tiene que aparecer.

### Pedido de punta a punta

1. Admin: categoría, producto disponible y sucursal activa.
2. En el cliente, **sin iniciar sesión**: catálogo → detalle → agregar al carrito.
3. `/cart`: cambiar cantidad, ver total, quitar ítems.
4. `/checkout`: nombre, email, dirección con lat/lng y confirmar. El pedido queda `pending`, con sucursal más cercana, y el carrito se vacía.

Si más tarde iniciás sesión o te registrás, el carrito de invitado se pasa a la cuenta.

Las direcciones guardadas (`/account/addresses`) siguen pidiendo login.

Convención de sesión cliente (opcional):

- Token: `customer_token` en `localStorage` o `sessionStorage`
- Usuario: `customer_user` (JSON con `role: "customer"`)
- Carrito invitado: `guest_cart` en `localStorage`

Sesión y token (API):

- El JWT viaja en `Authorization: Bearer <token>` y dura lo que diga `JWT_EXPIRES_IN` (7 días por defecto).
- Un pedido protegido responde **401** si el token falta (`Token requerido`), venció (`La sesión expiró`) o es inválido (`Token inválido`, también cuando el usuario ya no existe).
- En cada pedido protegido el API confirma que el usuario existe y toma su rol de la base, no del token.

## Endpoints

| Método | Ruta | Auth |
|---|---|---|
| POST | `/api/auth/register` | No (crea cliente y devuelve JWT) |
| POST | `/api/auth/login` | No |
| GET | `/api/auth/me` | JWT (cliente o admin). Devuelve `{ id, email, name, role }`; 401 si el token venció, es inválido o el usuario ya no existe |
| GET | `/api/categories` | No |
| GET | `/api/products` | No (`?categoryId=` opcional; solo `available=true`) |
| GET | `/api/products/:id` | No (404 si no está disponible). Incluye `extras`: los adicionales que se pueden elegir (`[]` si el producto no admite) |
| CRUD | `/api/admin/categories` | JWT admin |
| CRUD | `/api/admin/products` | JWT admin |
| CRUD | `/api/admin/branches` | JWT admin |
| GET/POST | `/api/me/addresses` | JWT cliente |
| PATCH/DELETE | `/api/me/addresses/:id` | JWT cliente |
| GET | `/api/cart` | JWT cliente |
| POST | `/api/cart/items` | JWT cliente (acepta `extraIds`) |
| PATCH/DELETE | `/api/cart/items/:id` | JWT cliente |
| POST | `/api/orders` | JWT cliente |
| POST | `/api/orders/guest` | No (pedido como invitado; cada ítem acepta `extraIds`) |

Reglas:

- No se puede borrar una categoría que tenga productos (409).
- Las sucursales inactivas no se asignan a pedidos nuevos.
- Cada cliente solo ve y edita sus propias direcciones.
- El total del carrito es `suma((precio + adicionales) × cantidad)`.
- Al confirmar un pedido se asigna la sucursal **activa más cercana** a la dirección. Si no hay ninguna activa, no se crea el pedido.

### Adicionales de hamburguesa

Un adicional es un producto de la categoría **Adicional** (Bacon, Cheddar…) y se ofrece en los productos de la categoría **Hamburguesas**. No hay que configurar nada en el admin: se identifican por el slug de la categoría (`adicional`, `hamburguesas`), que no conviene cambiar. Cada adicional suma su precio como recargo.

- `GET /api/products/:id` devuelve `extras` con los adicionales disponibles: `[{ "id", "name", "price" }]`, ordenados por nombre (`[]` si el producto no admite).
- `POST /api/cart/items` y cada ítem de `POST /api/orders/guest` aceptan `extraIds` (hasta 10, sin repetir). Sin `extraIds` todo sigue igual que antes.
- La línea del carrito es **producto + adicionales**: la misma hamburguesa con los mismos adicionales suma cantidad; con otros adicionales, o sin ninguno, es otra línea. Los adicionales de una línea no se editan: se quita la línea y se agrega de nuevo.
- `unitPrice` es el precio base del producto. `extras` son los adicionales de la línea, `extrasTotal` su recargo por unidad y `subtotal = (unitPrice + extrasTotal) × quantity`. Lo mismo en los ítems del pedido.
- Al confirmar se congelan nombre y precio de cada adicional (`OrderItemExtra`), igual que `unitPrice`. Si un adicional del carrito dejó de estar disponible, no se confirma (400).
- 400 si el producto no admite adicionales, o si alguno no existe, no es un adicional o no está disponible.

```jsonc
// POST /api/cart/items
{ "productId": "…", "quantity": 2, "notes": "sin cebolla", "extraIds": ["<id de Bacon>", "<id de Cheddar>"] }

// ítem del carrito en la respuesta (en el pedido, extras no trae "available")
{
  "id": "…", "productId": "…", "quantity": 2, "notes": "sin cebolla",
  "unitPrice": 20000,
  "extras": [
    { "id": "…", "name": "Bacon", "price": 2000, "available": true },
    { "id": "…", "name": "Cheddar", "price": 2000, "available": true }
  ],
  "extrasTotal": 4000,
  "subtotal": 48000,
  "product": { "id": "…", "name": "Hamburguesa doble", "available": true, "imageUrl": "…" }
}
```
