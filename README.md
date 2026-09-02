# Pedidos en casas de comidas rápidas

Tres piezas en un solo repo, misma base de datos:

- Cliente (quien pide comida): React + Vite en `/frontend`
- Administración: React + Vite en `/backend/admin`
- API: NestJS + TypeScript en `/backend`

Comunicación: API REST + JWT. PostgreSQL con Docker.

Foco actual del equipo: **gestión de productos y categorías**.

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
- Admin: http://localhost:5174/admin/login
- API: http://localhost:3000/api

Usuario seed (admin):

- Email: `admin@rapido.local`
- Contraseña: `Admin123!`

Flujo mínimo a probar: login admin → crear categoría → crear producto (disponible y no disponible) → ver el catálogo del cliente. El producto no disponible no tiene que aparecer.

## Endpoints de este núcleo

| Método | Ruta | Auth |
|---|---|---|
| POST | `/api/auth/login` | No |
| GET | `/api/categories` | No |
| GET | `/api/products` | No (`?categoryId=` opcional; solo `available=true`) |
| GET | `/api/products/:id` | No (404 si no está disponible) |
| CRUD | `/api/admin/categories` | JWT admin |
| CRUD | `/api/admin/products` | JWT admin |

No se puede borrar una categoría que tenga productos (409).
