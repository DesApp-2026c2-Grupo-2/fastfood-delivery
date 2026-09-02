# Pedidos en casas de comidas rápidas

Tres piezas en un solo repo, misma base de datos:

- Cliente (quien pide comida): React + Vite en `/frontend`
- Administración: React + Vite en `/backend/admin`
- API: NestJS + TypeScript en `/backend`

Comunicación: API REST + JWT. PostgreSQL con Docker.

Foco actual del equipo: **gestión de productos y categorías**, más **sucursales** y **direcciones de cliente** (Sprint 1).

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
- Direcciones cliente: http://localhost:5173/account/addresses
- Admin: http://localhost:5174/admin/login
- Sucursales admin: http://localhost:5174/admin/branches
- API: http://localhost:3000/api

Usuario seed (admin):

- Email: `admin@rapido.local`
- Contraseña: `Admin123!`

Sucursal seed (tras `npm run db:setup`):

- Nombre: **Mordi Centro** (activa, con lat/lng en Buenos Aires)

## Flujos a probar

### Catálogo (núcleo actual)

Login admin → crear categoría → crear producto (disponible y no disponible) → ver el catálogo del cliente. El producto no disponible no tiene que aparecer.

### Sucursales (HU-05)

Login admin → **Sucursales** → crear o editar un local con nombre, dirección, lat/lng, horarios, teléfono y estado activa/inactiva.

### Direcciones (HU-06)

Requiere **login de cliente** (lo implementa Lucas). La UI de direcciones está en `/account/addresses` y la API en `/api/me/addresses`.

Convención de sesión cliente para integrar con Lucas:

- Token: `customer_token` en `localStorage` o `sessionStorage`
- Usuario: `customer_user` (JSON con `role: "customer"`)

Hasta que exista login, `/account/addresses` redirige a `/login` (placeholder).

## Endpoints

| Método | Ruta | Auth |
|---|---|---|
| POST | `/api/auth/login` | No |
| GET | `/api/categories` | No |
| GET | `/api/products` | No (`?categoryId=` opcional; solo `available=true`) |
| GET | `/api/products/:id` | No (404 si no está disponible) |
| CRUD | `/api/admin/categories` | JWT admin |
| CRUD | `/api/admin/products` | JWT admin |
| CRUD | `/api/admin/branches` | JWT admin |
| GET/POST | `/api/me/addresses` | JWT cliente |
| PATCH/DELETE | `/api/me/addresses/:id` | JWT cliente |

Reglas:

- No se puede borrar una categoría que tenga productos (409).
- Las sucursales inactivas no se asignan a pedidos nuevos (lógica de pedido en desarrollo).
- Cada cliente solo ve y edita sus propias direcciones.
