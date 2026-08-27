# Plan de reparto — Sprint 1

**Proyecto:** Mordi (pedidos en casas de comidas rápidas)  
**Equipo:** Celeste, Carla, Lucas, Nicolas, Rafael  
**Sprint:** 1 de 5  
**Review:** 10/09/2026  
**Corte:** 09/09/2026 23:59 (solo cuenta lo mergeado a `main`)  
**Integración:** 03/09 (tiene que existir el flujo, aunque esté feo)

Foco para el stakeholder (acordado con Lombardi): **gestión de productos y categorías**. Si el tiempo no alcanza, eso no se recorta.

---

## 1. Qué ya está (no rehacer)

El núcleo conjunto ya corre en local:

- Docker + PostgreSQL
- Backend NestJS + Prisma + JWT
- Admin seed, login, ABM de categorías y productos
- Catálogo cliente (solo productos `available=true`)
- Marca Mordi, paleta naranja

Arrancar siempre desde `main` actualizado. No volver a scaffoldar el repo.

---

## 2. Reparto

| Integrante | Frente | Historias | Rama |
|---|---|---|---|
| **Lucas** | Backend extra | HU-01 (API), modelo `Address` / `Branch` / `Cart` / `Order` | `feat/lucas-auth-cliente` |
| **Carla** | Catálogo admin (demo) | HU-02 (UI), HU-03 | `feat/carla-admin-catalogo` |
| **Celeste** | Catálogo cliente | HU-04 | `feat/celeste-catalogo-cliente` |
| **Nicolas** | Carrito y pedido | HU-07, HU-08 | `feat/nicolas-carrito-pedido` |
| **Rafael** | Sucursales + docs | HU-05, HU-06, carpeta | `feat/rafael-sucursales-docs` |

**Carla no se recorta.** Es el demo al stakeholder. Si aprieta el tiempo, adelgazan Nicolas y Rafael.

---

## 3. Qué hace cada uno

### Lucas — Backend extra

**Entrega**

- `POST /api/auth/register` y login de cliente (rol `customer`)
- Un cliente no entra a `/admin`
- Esqueleto Prisma (aunque las pantallas las hagan otros): `Address`, `Branch`, `Cart`, `CartItem`, `Order`, `OrderItem`

**Toca**

- `backend/prisma/schema.prisma`
- `backend/src/auth/`
- módulos nuevos de address / branch / cart / order (API)

**No toca:** pantallas de admin de categorías/productos.

**Depende de él:** Nicolas (carrito/pedido) y Rafael (sucursales/direcciones). Priorizar el schema en los primeros días.

---

### Carla — Catálogo admin (demo)

**Entrega**

- `/admin/login`, `/admin/categories`, `/admin/products` pulidos y usables en celular
- Alta, edición, listado
- Producto no disponible no se ofrece al cliente
- Recorrido de demo: login seed → categoría → producto con precio e imagen URL

**Toca**

- `frontend/src/pages/admin/`
- `frontend/src/layouts/AdminLayout.tsx`
- CSS de esas pantallas

**No toca:** carrito, sucursales, schema Prisma de pedido.

**Credenciales seed:** `admin@rapido.local` / `Admin123!`

---

### Celeste — Catálogo cliente

**Entrega**

- `/products` y `/products/:id` usables en celular
- Filtro por categoría
- Solo productos disponibles
- Detalle con precio, descripción e imagen

**Toca**

- `frontend/src/pages/client/`
- `frontend/src/layouts/ClientLayout.tsx`

**No toca:** admin, carrito.

**Depende de:** el ABM de Carla (tiene que haber productos en la base para verse).

---

### Nicolas — Carrito y pedido

**Entrega**

- Agregar / cambiar / quitar ítems, ver total
- Carrito persistido por usuario (sobrevive recargar)
- Checkout mínimo: `POST /api/orders` con cliente, sucursal, dirección, detalle, importe, estado `pending`
- Tras confirmar, el carrito queda vacío

**Toca**

- `backend/src` de cart y orders
- `frontend` rutas `/cart` y `/checkout`

**No toca:** ABM de productos.

**Depende de:** schema de Lucas. Sucursal del pedido: la activa más cercana a la dirección (regla simple de la ficha). Si Rafael aún no tiene sucursales, coordinar un seed de una sucursal activa.

**Corte si falta tiempo:** carrito + confirmar pedido, aunque el checkout sea feo. No abrir seguimiento ni reportes.

---

### Rafael — Sucursales + docs

**Entrega**

- ABM de sucursales (`/admin/branches`): nombre, dirección, lat, lng, horarios, teléfono, activa/inactiva
- Direcciones del cliente con lat/lng cargados a mano (sin mapa)
- Docs: README al día, ficha/RF si cambia un supuesto

**Toca**

- `backend` branches + addresses
- `frontend` `/admin/branches`, `/account/addresses`
- `docs/` (ficha, este plan, README)

**No toca:** catálogo.

**Corte si falta tiempo:** una sucursal seed + alta de dirección mínima, para que Nicolas pueda confirmar el pedido.

---

## 4. Cómo no pisarse

1. Cada uno trabaja en **su rama**. `main` solo entra por merge.
2. UI en **español**. Código, tablas, JSON y URLs en **inglés** (`Category`, `Product`, `Branch`, `Cart`, `Order`).
3. El catálogo público sigue mostrando **solo** `available=true`.
4. Si hay que tocar Prisma, avisar en el grupo **antes** (sobre todo Lucas / Nicolas / Rafael).
5. Pull de `main` al empezar el día.

```bash
git checkout main
git pull
git checkout -b feat/<nombre>-<frente>
```

---

## 5. Calendario

| Fecha | Qué |
|---|---|
| Ahora | Cada uno crea su rama y arranca |
| **03/09** | Integración: el flujo de la ficha existe en `main`, aunque esté feo |
| 03/09 – 09/09 | Bugs, auth, demo en celular |
| **09/09 23:59** | Corte. Lo que no está en `main` no cuenta |
| **10/09** | Review. Demo: menú (Carla) +, si llega, pedido (Nicolas) |

---

## 6. Demo al stakeholder (prioridad)

1. Login admin seed
2. Crear categoría
3. Crear producto (nombre, descripción, categoría, precio, imagen URL, disponible sí/no)
4. Ver el catálogo cliente: el no disponible **no aparece**

Si sobra tiempo, seguir con sucursal → registro cliente → carrito → confirmar pedido.

---

## 7. Checklist de arranque (los cinco)

- [ ] Core mergeado en `main`
- [ ] Cada uno: `git pull` + rama propia
- [ ] Docker + backend + frontend corriendo (ver `README.md`)
- [ ] Confirmar dueños (si alguien quiere cambiar de frente, se anota acá)

```
Fecha:
Celeste / Carla / Lucas / Nicolas / Rafael: frentes OK (sí/no)
Cambios de dueño:
```
