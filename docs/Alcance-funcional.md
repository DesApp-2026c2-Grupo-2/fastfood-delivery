# Alcance funcional

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Fuente:** `docs/Enunciado.txt`  
**Versión:** 1.0 (07/09/2026)  
**Estado:** versión de carpeta para el Sprint 1 (review 10/09). Se actualiza si cambia una decisión de negocio.  
**Documentos relacionados:** `Requerimientos-funcionales.md`, `Historias-de-usuario.md`, `Ficha-Sprint-1.md`

---

## 1. Qué es el sistema

Una cadena de comida rápida necesita una plataforma digital para gestionar pedidos de delivery de punta a punta: desde que un administrador configura el menú hasta que el pedido se entrega al cliente.

El enunciado exige **dos aplicaciones obligatorias** que comparten la misma base de datos:

| Aplicación | Usuario | Dónde vive en el repo | Obligatoria |
|---|---|---|---|
| App de clientes (delivery) | Cliente / visitante | `/frontend` | Sí |
| App administrativa | Administrador | `/backend/admin` | Sí |
| App de repartidores | Repartidor | no se construye | No (Extensión 2, fuera de compromiso) |

Las tres piezas hablan con la misma API REST (`/backend`) y la misma base PostgreSQL.

La documentación y la UI se escriben en **español**. Código, tablas, JSON y URLs van en **inglés** (`Customer`, `Admin`, `Branch`, `Product`, `Cart`, `Order`).

---

## 2. Qué entra en el producto (funcionalidades base)

El alcance del trabajo práctico es el bloque **Funcionalidades base** del enunciado, más la **Extensión 1**. Lo que sigue es el compromiso del grupo para los 5 sprints, no lo que se entrega el 10/09.

### 2.1 Clientes

El cliente se registra, inicia sesión, recupera contraseña, modifica sus datos, administra direcciones de entrega (texto + latitud/longitud), consulta pedidos anteriores, arma un carrito y confirma pedidos nuevos.

### 2.2 Administradores

El sistema nace con un administrador inicial (seed). Los administradores inician sesión en una aplicación independiente y gestionan la información del negocio: productos, categorías, sucursales, promociones, stock, otros administradores, estados generales, parámetros y pedidos.

### 2.3 Sucursales

Cada sucursal es un local físico (nombre, dirección, lat/lng, horarios, teléfono, activa/inactiva). Al confirmar un pedido, el sistema elige desde qué sucursal se prepara. El cliente debe poder ver las sucursales disponibles para su ubicación.

**Estrategia de asignación (Sprint 1):** sucursal **activa más cercana** a la dirección de entrega, distancia Haversine. Si no hay ninguna activa, no se crea el pedido. Radio de cobertura, horario de atención y stock quedan para sprints siguientes.

### 2.4 Catálogo

ABM de categorías y productos. El producto tiene nombre, descripción, categoría, precio, imagen y estado disponible/no disponible. El cliente consulta solo productos disponibles.

Las configuraciones especiales (extras, quitar ingredientes, tamaños) están **dentro del alcance del TP** y fuera del Sprint 1.

### 2.5 Carrito

Agregar productos, indicar cantidad y observaciones, ver el importe total y modificar el carrito antes de confirmar.

### 2.6 Pedidos

Al confirmar se registran: cliente (o datos de invitado, ver §5), sucursal asignada, dirección de entrega, fecha y hora, detalle, importe y estado inicial `pending`.

Estados previstos (lista del enunciado, sin recortar):

`pending` → `confirmed` → `preparing` → `ready` → `on_the_way` → `delivered`  
`cancelled` desde `pending` o `confirmed`.

En Sprint 1 solo se persiste el estado inicial. La máquina de estados, el cambio en backoffice, el seguimiento y el historial entran después.

### 2.7 Geolocalización, seguimiento e historial

Las direcciones guardan ubicación geográfica. Esa ubicación se usa para asignar sucursal. El mapa con recorrido es **optativo** (`RF-GEO-03`) y queda fuera del núcleo.

El cliente podrá ver la evolución del pedido (sucursal, estado, historial de cambios, ETA) y el historial (detalle, importe, fecha, estado final, repetir pedido).

### 2.8 Reportes base (obligatorios)

En el admin: productos más vendidos, menos vendidos, sin stock y con mayor facturación.

---

## 3. Extensión elegida

**Extensión 1 — Stock, promociones y reportes extra.**

Motivo: el admin base ya nombra stock y promociones; no suma una tercera aplicación; los reportes extra son evidencia clara en reviews. La Extensión 2 (calificaciones, notificaciones, app de repartidores) queda como plus **después del medio término (22/10)** solo si hay holgura. No forma parte del compromiso de los 5 sprints.

Dentro de Extensión 1:

- Stock por sucursal y producto, verificación al pedir, reserva/descuento/liberación.
- Promociones administrables y aplicables al pedido (el grupo acota las reglas: no un motor infinito).
- Reportes adicionales de pedidos, clientes, sucursales y promociones.

En Sprint 1 la extensión **no se implementa**. El ABM de stock y promociones del bloque administrativo base se cubre cuando se abra esa extensión / sprints 3–4.

---

## 4. Fuera de alcance (explícito)

No se construye, salvo plus post medio término:

| Ítem | Motivo |
|---|---|
| App de repartidores | Extensión 2 |
| Calificaciones de pedidos | Extensión 2 |
| Notificaciones (email/push/in-app de eventos) | Extensión 2 |
| Mapa con recorrido estimado | Optativo del enunciado |
| Navegación real / Google Places | El enunciado no lo exige; lat/lng se cargan a mano en el núcleo |
| Motor genérico de reglas de producto | Solo configuraciones acotadas, más adelante |
| Cobertura / horario / stock en la asignación del Sprint 1 | Simplificación aceptada en la ficha |

---

## 5. Decisiones que delimitan el alcance

Estas decisiones ya están tomadas para no inflar el enunciado. El detalle vive en la carpeta de supuestos cuando se cierre ese documento; acá se anotan porque cambian qué entra y qué no.

| Decisión | Valor |
|---|---|
| Aplicaciones | Dos SPAs independientes (cliente y admin), misma API y misma BD |
| Extensión | Propuesta 1 |
| Asignación Sprint 1 | Activa más cercana (Haversine) |
| Estados Sprint 1 | Solo `pending` al confirmar |
| Configuraciones de producto Sprint 1 | No. Solo observaciones en el ítem |
| Imagen de producto Sprint 1 | URL (upload es mejora, no bloquea el RF) |
| Carrito autenticado | Persistido en backend, uno por cliente |
| Visitante | Puede ver catálogo, armar carrito local y confirmar un pedido como invitado (`POST /api/orders/guest`). **No reemplaza** registro, login ni direcciones de cuenta |
| Moneda / zona | ARS, timezone Argentina |
| Mapa | Fuera del núcleo |

El checkout de invitado es una **capacidad adicional del grupo**. El enunciado sigue exigiendo registro, sesión y direcciones del cliente; esos RF no se dan por cubiertos con el flujo guest.

---

## 6. Alcance del Sprint 1 (40% del TP base)

Corte: **09/09/2026 23:59**. Review: **10/09/2026**.

El incremento es un **hilo vertical**, no pantallas sueltas: configurar el menú → armar el pedido → registrarlo.

**Entra (16 RF):** RF-CLI-01, RF-CLI-02, RF-CLI-05, RF-CLI-07, RF-ADM-01, RF-ADM-02, RF-ADM-04, RF-BRN-01, RF-CAT-01, RF-CAT-02, RF-CAT-03, RF-CRT-01 a RF-CRT-04, RF-ORD-01. Lat/lng de direcciones arranca RF-GEO-01 como parte de RF-CLI-05.

**Demo mínima:**

1. Admin seed inicia sesión y carga categoría, producto y sucursal.
2. El cliente ve el catálogo (un producto `available=false` no aparece).
3. Se arma el carrito, se ve el total y se confirma un pedido con sucursal, dirección, detalle, importe y estado `pending`.

**No entra en Sprint 1:** recuperar contraseña, perfil, seguimiento, historial, repetir pedido, máquina de estados, cancelación, alta de más admins, reportes, stock/promos aplicadas, mapa, Extensión 1 y 2.

---

## 7. Mapa de páginas del producto

Rutas de pantalla alineadas a los recursos de la API. Texto visible en español.

### 7.1 App cliente (`/frontend`)

| Ruta | En Sprint 1 | Función |
|---|---|---|
| `/login` | Sí | Iniciar sesión |
| `/register` | Sí | Registro |
| `/products` | Sí | Catálogo filtrable por categoría |
| `/products/:id` | Sí | Detalle y agregar al carrito |
| `/cart` | Sí | Ítems, cantidades, observaciones, total |
| `/checkout` | Sí | Confirmar pedido (cuenta o invitado) |
| `/account/addresses` | Sí | ABM de direcciones (requiere cuenta) |
| `/forgot-password` | No | Recuperar contraseña |
| `/account` | No | Datos personales |
| `/orders` | No | Historial |
| `/orders/:id` | No | Seguimiento y repetir |

### 7.2 App admin (`/backend/admin`)

| Ruta | En Sprint 1 | Función |
|---|---|---|
| `/admin/login` | Sí | Login de administrador |
| `/admin` | Sí | Home |
| `/admin/categories` | Sí | ABM categorías |
| `/admin/products` | Sí | ABM productos |
| `/admin/branches` | Sí | ABM sucursales |
| `/admin/orders` | No | Pedidos y cambio de estado |
| `/admin/admins` | No | Alta de administradores |
| `/admin/stock` | No | Stock por sucursal |
| `/admin/promotions` | No | ABM promociones |
| `/admin/parameters` | No | Parámetros y estados |
| `/admin/reports` | No | Reportes |

---

## 8. Visión de incrementos (5 sprints)

No sustituye las fichas de cada sprint. Sirve para no abrir frentes de más.

| Sprint | Review | Foco |
|---|---|---|
| 1 | 10/09 | Núcleo: auth, catálogo, sucursales, carrito, confirmar pedido, docs v0 |
| 2 | 24/09 | Perfil, recuperar contraseña, estados, seguimiento, historial, sucursales visibles para la ubicación |
| 3 | 08/10 | Stock por sucursal, configuraciones de producto, gestión de pedidos en admin |
| 4 | 29/10 | Promociones, reportes base, medio término (22/10) con demo estable |
| 5 | 19/11 | Reportes extra de Extensión 1, testing, carpeta final (entrega 12/11), demo 27/11 |

Si hay que recortar, se recorta mapa, notificaciones y Extensión 2. **No se recorta** el flujo de pedido ni el ABM de productos y categorías.

---

## 9. Trazabilidad enunciado → este alcance

| Bloque del enunciado | ¿En el producto? | ¿En Sprint 1? |
|---|---|---|
| Gestión de usuarios (clientes) | Sí | Registro, login, direcciones, nuevo pedido |
| Administradores | Sí | Seed + login + app independiente |
| Sucursales | Sí | ABM + asignación simple |
| Catálogo | Sí | ABM + consulta; sin configs especiales |
| Carrito | Sí | Completo (sin configs especiales) |
| Realización de pedidos | Sí | Confirmación + estado inicial |
| Geolocalización | Sí (mapa optativo) | Lat/lng en direcciones |
| Seguimiento | Sí | No |
| Historial | Sí | No |
| Sistema administrativo (resto del ABM) | Sí | Solo productos, categorías, sucursales |
| Reportes base | Sí | No |
| Extensión 1 | Sí (compromiso) | No |
| Extensión 2 | No (plus) | No |
