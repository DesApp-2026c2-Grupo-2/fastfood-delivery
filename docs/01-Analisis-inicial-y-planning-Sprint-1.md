# Análisis inicial y planning del Sprint 1

**Proyecto:** Pedidos en casas de comidas rápidas  
**Arquitectura acordada:** frontend y backend en el mismo repo (`/frontend` y `/backend`), deploy separados, comunicación por API REST.  
**Equipo:** 4 integrantes.  
**Documento para:** planning conjunto del 20/08 (consultas de requerimientos + arranque del 1er Sprint).  
**No incluye código.** El objetivo es alinear dominio, alcance, decisiones y tareas.

### Convención de lenguaje

La **documentación de carpeta, las historias y la UI** se escriben en español (es el idioma del enunciado y de la materia).

El **dominio técnico** (código, tablas, JSON, URLs de frontend y de API) se escribe en **inglés**, con un solo nombre por concepto. No mezclar `/pedidos` en el front y `/orders` en la API.

| Concepto (español) | Nombre canónico (inglés) | Se usa en |
|---|---|---|
| Cliente | `Customer` | rol, UI copy → “cliente”; código/URLs → `customer` |
| Administrador | `Admin` | `admin` |
| Sucursal | `Branch` | `/branches`, tabla `Branch` |
| Dirección | `Address` | `/addresses` |
| Categoría | `Category` | `/categories` |
| Producto | `Product` | `/products` |
| Carrito | `Cart` | `/cart` |
| Pedido | `Order` | `/orders` |
| Estado de pedido | `OrderStatus` | `pending`, `confirmed`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled` |
| Stock | `Stock` | `/stock` |
| Promoción | `Promotion` | `/promotions` |
| Repartidor | `Driver` | `/driver` (solo Ext. 2) |
| Parámetro | `Parameter` | `/parameters` |
| Reporte | `Report` | `/reports` |

Regla: si el enunciado dice “sucursal”, en una HU decimos sucursal; en la ruta y en el modelo decimos `branch`. Nunca `sucursal`, `local` y `branch` para la misma cosa.

---

## 1. Cómo leer este documento

Mañana no hay que diseñar toda la carpeta de la materia. Hay que salir de la planning con:

1. Un **núcleo funcional compartido** (lo que el enunciado de la materia pide arrancar en conjunto).
2. Un conjunto de **decisiones de negocio** tomadas o explícitamente dejadas como consulta a docentes.
3. Un **backlog del Sprint 1** repartible entre 4 personas.
4. Claridad de **qué documentos de carpeta** se empiezan ahora y cuáles se maduran en sprints siguientes.

La materia pide, al final, esta carpeta:

| Entregable de carpeta | Qué hacemos mañana | Cuándo lo cerramos |
|---|---|---|
| Alcance funcional | Borrador v0 (este doc, sección 3) | Fin Sprint 1 |
| Supuestos y decisiones de negocio | Lista de decisiones a votar (sección 4) | Fin Sprint 1, se actualiza cada sprint |
| Requerimientos funcionales | Extraídos del enunciado (sección 3) | Fin Sprint 1 |
| Historias de usuario | Épicas + HUs del núcleo (sección 8) | Sprint 1: núcleo. Resto: sprints 2-4 |
| Incrementos de los sprints | Incremento 1 propuesto (sección 9) | Cada planning |
| Modelo de datos | Entidades candidatas (sección 6) | Primer diagrama en Sprint 1 |
| Diseño de APIs | Mapa inicial (sección 7) | Contrato v0 en Sprint 1 |
| Testing y automatización | Criterio mínimo (sección 10) | Arranca en Sprint 2, se exige desde Review 2 |

Regla de la materia a no olvidar: **solo cuenta lo mergeado/completado hasta las 23:59 del día anterior al cierre de sprint.** Para el review del 10/09, el corte real es el **09/09 23:59**.

---

## 2. Lectura del enunciado: qué sistema es

Cadena de comida rápida (análoga a McDonald’s / Burger King / Mostaza). Hay que cubrir el proceso completo **desde la configuración de productos hasta la entrega del pedido al cliente**.

Aplicaciones:

| App | Obligatoria | Quién la usa | Nota |
|---|---|---|---|
| App cliente (delivery) | Sí | Clientes | Pedidos, catálogo, seguimiento |
| App administrativa | Sí | Administradores | ABM + reportes. Comparte la misma BD |
| App repartidores | No (extensión 2) | Repartidores | Solo si el grupo elige esa extensión |

Todas las apps **comparten la misma base de datos**.

---

## 3. Funcionalidades a desarrollar (con cita del enunciado)

Cada ítem es un bloque de trabajo. La cita indica de dónde sale; no es opcional salvo que el enunciado lo marque como adicional.

### 3.1 Gestión de usuarios — Clientes

| ID | Funcionalidad | Cita |
|---|---|---|
| F-CLI-01 | Registro de cliente | “Podrán: Registrarse.” |
| F-CLI-02 | Inicio de sesión | “Iniciar sesión.” |
| F-CLI-03 | Recuperación de contraseña | “Recuperar contraseña.” |
| F-CLI-04 | Modificación de datos personales | “Modificar sus datos.” |
| F-CLI-05 | ABM de direcciones del cliente | “Administrar sus direcciones.” |
| F-CLI-06 | Consulta de pedidos anteriores | “Consultar pedidos anteriores.” |
| F-CLI-07 | Realizar un pedido nuevo | “Realizar nuevos pedidos.” |

### 3.2 Gestión de usuarios — Administradores

| ID | Funcionalidad | Cita |
|---|---|---|
| F-ADM-01 | Administrador inicial precargado | “El sistema nace con un administrador inicial.” |
| F-ADM-02 | Alta de nuevos administradores | “Los administradores podrán crear nuevos administradores.” |
| F-ADM-03 | Gestión de información de negocio | “Gestionan toda la información necesaria para el funcionamiento del sistema.” |

### 3.3 Sucursales y asignación

| ID | Funcionalidad | Cita |
|---|---|---|
| F-SUC-01 | Registrar sucursal con nombre, dirección, lat/long, horarios, teléfono, estado activa/inactiva | “De cada una interesa registrar, entre otros datos: Nombre. Dirección. Ubicación geográfica (latitud y longitud). Horarios de atención. Teléfono. Estado (activa/inactiva).” |
| F-SUC-02 | Asignar sucursal a un pedido según una estrategia definida por el grupo | “La aplicación deberá determinar desde qué sucursal preparar un pedido. Queda a criterio de cada grupo definir la estrategia utilizada para dicha asignación.” |
| F-SUC-03 | Mostrar sucursales disponibles para la ubicación del cliente | “También deberá mostrar al cliente las sucursales disponibles para su ubicación.” |

### 3.4 Catálogo

| ID | Funcionalidad | Cita |
|---|---|---|
| F-CAT-01 | ABM de productos (nombre, descripción, categoría, precio, imagen, disponible/no disponible) | “Cada producto posee información como: nombre, descripción, categoría, precio, imagen, estado (disponible/no disponible).” |
| F-CAT-02 | ABM de categorías | “Las categorías también deberán ser administrables.” |
| F-CAT-03 | Configuraciones especiales de producto al pedir (decisión de grupo) | “Cada grupo deberá definir si algunos productos pueden tener configuraciones especiales, a tener en cuenta al realizar pedidos.” |

### 3.5 Carrito

| ID | Funcionalidad | Cita |
|---|---|---|
| F-CAR-01 | Agregar productos al carrito | “Los clientes podrán ir agregando productos al carrito.” |
| F-CAR-02 | Cantidad, observaciones y configuraciones especiales por ítem | “para cada producto incluido en un carrito, se pueda indicar: cantidad, observaciones, configuraciones especiales (si correspondiera).” |
| F-CAR-03 | Cálculo del importe total | “La aplicación calculará el importe total.” |
| F-CAR-04 | Modificar el carrito antes de confirmar | “El cliente podrá modificar el carrito antes de confirmar el pedido.” |

### 3.6 Pedidos, estados y seguimiento

| ID | Funcionalidad | Cita |
|---|---|---|
| F-PED-01 | Confirmar pedido registrando cliente, sucursal, dirección, fecha/hora, detalle, importe, estado inicial | “Al confirmar el pedido se deberán registrar, como mínimo: cliente, sucursal asignada, dirección de entrega, fecha y hora, detalle de productos, importe, estado inicial.” |
| F-PED-02 | Máquina de estados del pedido (el grupo puede ajustar la lista) | “Pendiente / Confirmado / En preparación / Listo para entregar / En camino / Entregado / Cancelado” |
| F-PED-03 | Seguimiento: sucursal, estado actual, historial de cambios, tiempo estimado | “qué sucursal está preparando / preparó el pedido, estado actual, fecha y hora de cada cambio de estado, tiempo estimado de entrega.” |
| F-PED-04 | Historial con detalle, importe, fecha, estado final | “pedidos realizados, detalle de cada pedido, importe, fecha, estado final.” |
| F-PED-05 | Repetir un pedido anterior | “También podrán repetir pedidos anteriores.” |

### 3.7 Geolocalización

| ID | Funcionalidad | Cita |
|---|---|---|
| F-GEO-01 | Direcciones con texto + lat/long | “Además de la dirección textual deberá almacenarse la ubicación geográfica.” |
| F-GEO-02 | Usar geo para asignar sucursal | “La aplicación utilizará dicha información para determinar desde qué sucursal preparar el pedido.” |
| F-GEO-03 | Mapa con cliente, sucursal y recorrido | **Adicional / optativo:** “podrá mostrarse un mapa… No es obligatorio implementar navegación real.” |

### 3.8 Sistema administrativo (ABM)

| ID | Funcionalidad | Cita |
|---|---|---|
| F-ABM-01 | Productos | “Productos.” |
| F-ABM-02 | Categorías | “Categorías.” |
| F-ABM-03 | Promociones | “Promociones.” (entidad listada en el admin base; reglas ricas están en Extensión 1) |
| F-ABM-04 | Sucursales | “Sucursales.” |
| F-ABM-05 | Stock | “Stock.” |
| F-ABM-06 | Administradores | “Administradores.” |
| F-ABM-07 | Estados generales | “Estados generales.” |
| F-ABM-08 | Parámetros del sistema | “Parámetros del sistema.” |

### 3.9 Reportes base (obligatorios)

| ID | Funcionalidad | Cita |
|---|---|---|
| F-REP-01 | Productos más vendidos | “Productos más vendidos.” |
| F-REP-02 | Productos menos vendidos | “Productos menos vendidos.” |
| F-REP-03 | Productos sin stock | “Productos sin stock.” |
| F-REP-04 | Productos con mayor facturación | “Productos con mayor facturación.” |

### 3.10 Extensiones (una de las dos, si se apunta a nota alta)

El enunciado: *“se espera que cada grupo que tome el desafío… elija una de ellas.”*

**Recomendación de liderazgo técnico:** tomar **Extensión 1 (Stock + Promociones + reportes extra)**. Motivos:

- Encaja con entidades que el admin base ya nombra (stock, promociones).
- No suma una tercera app (repartidores), que para 4 personas en 5 sprints es un riesgo de alcance.
- Los reportes extra son evidencias claras en reviews.
- La Extensión 2 (calificaciones + notificaciones + app repartidores) es más “wow”, pero parte el equipo en 3 frontends.

Si el grupo quiere nota máxima y hay capacidad real, se puede dejar Extensión 2 como **plus post medio término**, no como compromiso del Sprint 1.

#### Extensión 1 (si se elige)

| ID | Funcionalidad | Cita |
|---|---|---|
| F-EXT1-01 | Stock por sucursal y por producto | “Cada sucursal administra su propio stock.” |
| F-EXT1-02 | Verificar disponibilidad al pedir | “Cuando un cliente realiza un pedido, la aplicación deberá verificar la disponibilidad correspondiente.” |
| F-EXT1-03 | No todos los productos en todas las sucursales | “No necesariamente todos los productos estarán disponibles en todas las sucursales.” |
| F-EXT1-04 | Política de reserva / descuento / liberación de stock | “La forma en que se reserva, descuenta o libera el stock queda abierta…” |
| F-EXT1-05 | Promociones (combos, descuentos, 2x1, cupones, envío gratis) | “Algunos ejemplos: Combos / Descuentos / 2x1 / Cupones / Envío gratuito.” |
| F-EXT1-06 | Reportes extra de pedidos, clientes, sucursales y promociones | Bloque “Reportes adicionales” de la propuesta 1 |

#### Extensión 2 (alternativa)

| ID | Funcionalidad | Cita |
|---|---|---|
| F-EXT2-01 | Calificación post-entrega | “Luego de recibir un pedido, el cliente podrá realizar una valoración.” |
| F-EXT2-02 | Notificaciones de eventos de pedido | “El sistema deberá informar al cliente los eventos importantes.” |
| F-EXT2-03 | App de repartidores + asignación + viaje + entrega | “Se propone construir una tercer aplicación para uso de los repartidores.” |
| F-EXT2-04 | Reportes extra salvo promociones | “Agregar los reportes detallados para la extensión 1, salvo los relacionados con promociones.” |

---

## 4. Decisiones de negocio a cerrar mañana (o consultar a docentes)

Estas son las ambigüedades que el enunciado deja al grupo. Hay que salir con un sí/no o con una pregunta escrita para la clase.

| # | Decisión | Propuesta del Tech Lead | Impacto |
|---|---|---|---|
| D1 | ¿Qué extensión tomamos? | **Extensión 1**. Extensión 2 queda como plus si hay holgura después del 22/10. | Alcance de los 5 sprints |
| D2 | Estrategia de asignación de sucursal | Sucursal **activa + dentro de radio (km)** + **más cercana** por Haversine. Si hay empate: menor cantidad de pedidos no entregados. | F-SUC-02, geo, stock |
| D3 | Radio de cobertura | Parámetro de sistema, default **5 km**. Fuera de radio: no se puede pedir. | Parámetros + checkout |
| D4 | Horarios de atención | Pedido solo si la sucursal está abierta **ahora**. Fuera de horario: mensaje claro. | Checkout |
| D5 | Configuraciones de producto | **Sí, acotadas:** quitar ingredientes, agregar extras con recargo, tamaños (si el producto lo permite). Sin motor de reglas infinito. | Carrito + admin |
| D6 | Estados de pedido | Usar la lista del enunciado. Transiciones: Pendiente → Confirmado → En preparación → Listo → En camino → Entregado. Cancelado desde Pendiente/Confirmado. | Seguimiento |
| D7 | Quién cambia estados | En el núcleo: **admin**. Cliente solo cancela en estados permitidos. | Admin + API |
| D8 | ETA | Fórmula simple: `prep_base + (items * k) + traslado_estimado`. Valores en parámetros. | Seguimiento |
| D9 | Carrito | Persistido **en backend por usuario** (sobrevive recarga). Un carrito activo por cliente. | API carrito |
| D10 | Auth | JWT. Roles: `cliente`, `admin`. Seed del admin inicial. Recuperar contraseña: token por email **o** flujo simulado si no hay SMTP en el sprint. | Usuarios |
| D11 | Stock (si Ext. 1) | Stock por `(sucursal, producto)`. Al confirmar: **reserva**. Al cancelar: **libera**. Al entregar: **confirma descuento**. | Pedidos |
| D12 | Promociones (si Ext. 1) | Sprint 1: entidad + ABM. Reglas (2x1, cupón, envío gratis) desde Sprint 3. | No inflar Sprint 1 |
| D13 | Imágenes de producto | URL o upload a storage. En Sprint 1: **URL**. Upload después. | Catálogo |
| D14 | Mapa | **Fuera del núcleo.** Post medio término si hay tiempo. | Alcance |
| D15 | Moneda y zona | ARS, timezone Argentina. | Datos |

**Preguntas concretas para docentes mañana** (clase de consultas):

1. ¿El admin es otra SPA en el mismo frontend (rutas `/admin`) o debe ser un deploy/front distinto?
2. ¿Recuperar contraseña exige email real, o alcanza un flujo demostrable?
3. ¿“Estados generales” y “parámetros del sistema” esperan una pantalla de configuración, o alcanza que existan en BD y se usen?
4. ¿Promociones en el bloque admin base obligan reglas de negocio ya en el núcleo, o alcanza el ABM?
5. Confirmación: una sola extensión basta para aspirar a nota alta.

---

## 5. Mapa inicial de páginas

Dos superficies: **Cliente** y **Admin**. Mismo frontend o dos apps en `/frontend` (decisión D-front). Recomendación: **un SPA React con layouts distintos** (`/` cliente, `/admin` backoffice) para no duplicar auth, build y deploy. Si los docentes piden “aplicación independiente”, se parte en dos apps más adelante sin cambiar el backend.

Las rutas de pantalla usan **los mismos recursos** que la API (`products`, `orders`, `branches`). El texto visible sigue en español.

### 5.1 App Cliente

```
/                          Landing / sucursal sugerida + categorías
/login                     Iniciar sesión
/register                  Registro
/forgot-password           Recuperar contraseña
/products                  Listado por categoría
/products/:id              Detalle + configuraciones + agregar al carrito
/cart                      Ítems, cantidades, total, editar/quitar
/checkout                  Dirección, sucursal asignada/sugerida, confirmar
/orders                    Historial
/orders/:id                Detalle + seguimiento + repetir
/account                   Datos personales
/account/addresses         ABM direcciones (texto + geo)
```

### 5.2 App Admin

```
/admin/login               Login admin
/admin                     Home / atajos
/admin/products            ABM productos
/admin/categories          ABM categorías
/admin/branches            ABM sucursales
/admin/stock               Stock por sucursal (Ext. 1 / entidad ya pedida)
/admin/promotions          ABM promociones
/admin/orders              Listado + cambio de estado
/admin/admins              Alta de admins
/admin/parameters          Parámetros y estados
/admin/reports             Reportes de productos (base) + extras según extensión
```

### 5.3 App Repartidores (solo si Extensión 2)

```
/driver/login
/driver/pending
/driver/trip
```

Fuera de Sprint 1.

### 5.4 Qué páginas entran en el núcleo (Sprint 1)

Cliente: login, registro, catálogo, detalle, carrito, checkout mínimo, cuenta básica.  
Admin: login, productos, categorías, sucursales (consulta + alta simple).  
Queda para sprints 2+: recuperar password pulido, seguimiento rico, historial/repetir, reportes, stock/promos reales, parámetros, mapa.

---

## 6. Entidades candidatas (insumo del modelo de datos)

No es el modelo final. Nombres en inglés (canónicos). Entre paréntesis, el término del enunciado.

```
User (role: customer | admin)
Address (dirección)
Branch (sucursal: nombre, dirección, lat, lng, teléfono, activa, horarios)
Category (categoría)
Product (producto: categoría, precio, imagen, disponible, permiteConfig)
ProductOption / Ingredient (configuraciones)
Cart + CartItem (carrito)
Order + OrderItem + OrderStatusHistory (pedido)
Stock (stock por sucursal y producto)     — Ext. 1 / ABM pedido
Promotion (promoción)                     — ABM pedido; reglas después
SystemParameter (parámetro del sistema)
```

Relaciones críticas: **Order pertenece a User y Branch**; **OrderItem copia precio y config** (no depende del catálogo vivo); **Stock es por Branch**.

---

## 7. Esquema inicial de endpoints

Convención: REST, JSON, JWT en `Authorization: Bearer`. Prefijo `/api`.  
Códigos: 200/201 ok, 400 validación, 401/403 auth, 404, 409 conflicto de negocio (sin stock, sucursal cerrada).

### Auth y usuarios

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/auth/register` | F-CLI-01 |
| POST | `/api/auth/login` | F-CLI-02, admin |
| POST | `/api/auth/forgot-password` | F-CLI-03 |
| POST | `/api/auth/reset-password` | F-CLI-03 |
| GET | `/api/me` | Perfil |
| PATCH | `/api/me` | F-CLI-04 |
| GET/POST | `/api/me/addresses` | F-CLI-05, F-GEO-01 |
| PATCH/DELETE | `/api/me/addresses/:id` | F-CLI-05 |

### Catálogo público

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/categories` | Home / catálogo |
| GET | `/api/products` | Filtro por categoría, sucursal, disponibles |
| GET | `/api/products/:id` | Detalle + opciones |

### Sucursales y asignación

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/branches` | Activas, opcionalmente cerca de lat/lng |
| POST | `/api/branches/assign` | Body: `{ addressId }` o `{ lat, lng }` → sucursal + distancia + ETA base (F-SUC-02, F-SUC-03) |

### Carrito

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/cart` | Carrito actual |
| POST | `/api/cart/items` | Agregar |
| PATCH | `/api/cart/items/:id` | Cantidad / observaciones / config |
| DELETE | `/api/cart/items/:id` | Quitar |
| DELETE | `/api/cart` | Vaciar |

### Pedidos (cliente)

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/orders` | Confirmar carrito → pedido (F-PED-01) |
| GET | `/api/orders` | Historial (F-PED-04) |
| GET | `/api/orders/:id` | Detalle + seguimiento (F-PED-03) |
| POST | `/api/orders/:id/cancel` | Cancelar si aplica |
| POST | `/api/orders/:id/repeat` | Copia al carrito (F-PED-05) |

### Admin — ABM

Prefijo `/api/admin`, rol `admin`.

| Recurso | Endpoints típicos |
|---|---|
| Productos | `GET/POST /products`, `GET/PATCH/DELETE /products/:id` |
| Categorías | igual sobre `/categories` |
| Sucursales | igual sobre `/branches` |
| Stock | `GET /stock?branchId=`, `PUT /stock` |
| Promociones | CRUD `/promotions` |
| Administradores | `GET/POST /admins` |
| Parámetros | `GET/PATCH /parameters` |
| Pedidos | `GET /orders`, `POST /orders/:id/status` |

### Reportes

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/admin/reports/products/top-sold` | F-REP-01 |
| GET | `/api/admin/reports/products/least-sold` | F-REP-02 |
| GET | `/api/admin/reports/products/out-of-stock` | F-REP-03 |
| GET | `/api/admin/reports/products/top-revenue` | F-REP-04 |

Los reportes extra de Extensión 1 se agregan como rutas hermanas (`/reports/orders/by-day`, `/by-branch`, etc.) **después** del núcleo.

### Qué endpoints son núcleo Sprint 1

Auth register/login + `/me`, categorías y productos GET, sucursales GET, carrito CRUD, `POST /orders` simplificado, admin CRUD productos/categorías/sucursales. El resto se versiona en el diseño de APIs pero no se implementa aún.

---

## 8. Historias de usuario del núcleo (para estimar mañana)

Formato: *Como / quiero / para*. Independientes lo suficiente para repartir.

**Épica E1 — Identidad**

- HU-01 Como visitante, quiero registrarme e iniciar sesión, para usar la app como cliente.
- HU-02 Como sistema, quiero nacer con un admin, para poder configurar el catálogo.
- HU-03 Como admin, quiero iniciar sesión en el backoffice, para gestionar el negocio.

**Épica E2 — Catálogo**

- HU-04 Como admin, quiero crear categorías y productos, para armar el menú.
- HU-05 Como cliente, quiero ver productos por categoría, para armar un pedido.

**Épica E3 — Sucursal**

- HU-06 Como admin, quiero dar de alta sucursales con geo y horario, para que el delivery sepa de dónde sale el pedido.
- HU-07 Como cliente, quiero que el sistema me asigne una sucursal según mi dirección, para saber quién prepara mi pedido.

**Épica E4 — Carrito y pedido**

- HU-08 Como cliente, quiero agregar/cambiar/quitar ítems y ver el total, para controlar lo que voy a pagar.
- HU-09 Como cliente, quiero confirmar el pedido, para que quede registrado con sucursal, dirección, detalle e importe.

Criterio de “terminada”: UI usable en mobile (responsiva), API cubierta por al menos un test de integración del happy path, mergeada a la rama principal **antes del 09/09 23:59**.

Historias que **no** entran al Sprint 1 (backlog de producto): recuperar password, seguimiento con timeline, repetir pedido, reportes, promociones aplicadas, mapa, app repartidor, notificaciones.

---

## 9. Incrementos de sprint (visión a 5 sprints)

Calendario real:

| Sprint | Planning | Review | Corte de tareas | Foco del incremento |
|---|---|---|---|---|
| 1 | 20/08 | 10/09 | 09/09 23:59 | Núcleo: auth, catálogo, sucursales, carrito, confirmar pedido, admin ABM básico. Repo + deploy esqueleto. Docs v0 |
| 2 | 10/09 | 24/09 | 23/09 23:59 | Direcciones/geo reales, asignación, estados de pedido, seguimiento, historial |
| 3 | 24/09 | 08/10 | 07/10 23:59 | Stock por sucursal + checkout que valida stock. Configuraciones de producto. Admin pedidos |
| 4 | 08/10 | 29/10 | 28/10 23:59 | Promos o calificaciones según extensión. Reportes base. Medio término 22/10 con demo estable |
| 5 | 29/10 | 19/11 | 18/11 23:59 | Reportes extra, pulido UX, testing, carpeta final (entrega 12/11), demo 27/11 |

El incremento 1 debe verse en el review del 10/09 como: **un cliente se registra, mira el menú, arma carrito y genera un pedido; un admin carga productos y sucursales.** Eso es demostrable. No un prototipo de 12 pantallas a medias.

---

## 10. Testing y automatización (criterio, no implementación mañana)

- Sprint 1: 1 test de integración auth + 1 de `POST /orders` (happy path). Script `npm test` en backend.
- Sprint 2: tests de transiciones de estado y asignación de sucursal.
- Desde Sprint 3: CI mínimo (test en cada PR) si el hosting/git lo permite.
- Frontend: tests de componentes críticos cuando el flujo de pedido esté estable (Sprint 3-4).
- No prometemos cobertura alta en el primer review.

---

## 11. Stack recomendado (confirmar mañana, 10 minutos)

Alineado a la materia (React + backend Node) y a deploy separado:

| Capa | Propuesta | Por qué |
|---|---|---|
| Frontend | React + Vite + React Router | Lo que la cursada trabaja; SPA responsiva |
| Backend | Node.js + NestJS + TypeScript | Decisión del grupo. Módulos por dominio, guards JWT, ValidationPipe |
| BD | PostgreSQL | Geo, relaciones, reportes |
| Acceso a datos | Prisma | Nest no reemplaza la BD: Prisma habla con PostgreSQL |
| Auth | JWT + bcrypt (`@nestjs/jwt`) | Estándar REST |
| Deploy | Front en hosting estático (p. ej. Vercel/Netlify), API en Render/Railway, BD gestionada | Enunciado de carpeta permite local **y** deploys gratuitos |

Monorepo:

```
/frontend
/backend
/docs
```

Ramas: `main` protegida de hecho (solo merge), `sprint-1`, ramas por historia `feat/HU-xx-nombre`.

---

## 12. Agenda de la planning (90–120 min)

Usar esta agenda tal cual. Un integrante facilita; otro toma notas en este mismo archivo (sección “acta”).

| Min | Bloque | Resultado esperado |
|---|---|---|
| 0-10 | Objetivo del Sprint 1 y fecha de corte (09/09 23:59) | Todos alineados |
| 10-25 | Recorrer funcionalidades sección 3. Marcar núcleo vs después | Alcance v0 |
| 25-45 | Cerrar D1–D15. Anotar preguntas a docentes | Decisiones o consultas |
| 45-55 | Confirmar stack, repo, dos apps vs un SPA | Arquitectura |
| 55-70 | Reparto de dueños (abajo) | 4 frentes sin solaparse |
| 70-90 | Estimar HU-01 a HU-09. Definir DoD del sprint | Backlog Sprint 1 |
| 90-100 | Qué preguntar en “consultas de requerimientos” | Lista corta |
| Extra | Quién arma el repo vacío hoy/mañana a primera hora | Desbloqueo |

---

## 13. Reparto sugerido para 4 personas (Sprint 1)

La materia pide un **núcleo en conjunto** y después funcionalidades por integrante. El núcleo se hace en pareja o en mob corto (auth + modelo); el resto ya tiene dueño.

| Rol de sprint | Dueño | Entrega del Sprint 1 |
|---|---|---|
| **A — Backend base** | Integrante 1 | Repo `/backend`, BD, Prisma, auth JWT, seed admin, `/me`, esqueleto de rutas |
| **B — Catálogo y admin** | Integrante 2 | Entidades categoría/producto/sucursal, CRUD admin API + pantallas admin |
| **C — Cliente catálogo/carrito** | Integrante 3 | SPA cliente: login/registro, catálogo, detalle, carrito |
| **D — Pedido + docs** | Integrante 4 | `POST /orders` + checkout mínimo + este paquete de docs (alcance, supuestos, RFs, HUs, incremento 1, APIs v0) |

Integración: **miércoles 03/09** (clase de seguimiento) el pedido end-to-end tiene que existir en `main`, aunque sea feo. Del 03/09 al 09/09 solo pulido, auth y demo.

Trabajo conjunto ineludible (2 horas el 20/08 o 21/08): modelo de datos v0 en un pizarrón/Miro y contrato de `Cart` / `Order` para que C y D no se pisen.

---

## 14. Tareas accionables para salir de la planning

No son código. Son el checklist de las próximas 48 h.

### Hoy / mañana antes de la clase

- [ ] Leer este documento los 4.
- [ ] Cada uno anotar desacuerdos con D1–D15.
- [ ] Crear el repo (si no existe) con `/frontend`, `/backend`, `/docs` y README de 10 líneas.
- [ ] Elegir quién facilita la planning.

### Durante la clase 20/08

- [ ] Ejecutar la agenda de la sección 12.
- [ ] Hacer las 5 preguntas a docentes.
- [ ] Congelar: extensión, asignación de sucursal, estados, stack, dueños A–D.
- [ ] Copiar las decisiones a `docs/02-Supuestos-y-decisiones.md` (aunque sea una tabla).

### Antes del 27/08 (próxima clase con React/BE)

- [ ] Backend: hello world + PostgreSQL + Prisma + `POST /auth/login` del admin seed.
- [ ] Frontend: Vite React + rutas vacías del mapa de páginas del núcleo.
- [ ] Docs: alcance v0 + lista de RFs + HUs del núcleo en archivos separados de carpeta.
- [ ] Acuerdo de DoD: PR con descripción, rama por HU, nada directo a `main`.

### Definición de terminado del Sprint 1 (para el review 10/09)

1. Cliente puede registrarse, loguearse, ver menú, usar carrito y crear un pedido.
2. Admin seed puede loguearse y cargar categoría, producto y sucursal.
3. API REST documentada (este esquema, actualizado con lo realmente hecho).
4. App usable en celular (layout responsivo básico, no pixel-perfect).
5. Al menos dos tests de backend del happy path.
6. Documentos v0 de: alcance, supuestos, RFs, HUs del núcleo, incremento 1, entidades, APIs.

Si algo de eso no entra, se recorta **mapa, recuperar password, reportes y promociones**, nunca el flujo de pedido.

---

## 15. Acta de la planning (completar el 20/08)

```
Fecha:
Presentes:
Extensión elegida:
Estrategia de sucursal:
Un SPA vs dos frontends:
Stack cerrado:
Dueño A/B/C/D:
Preguntas hechas a docentes y respuestas:
Riesgos detectados:
Próxima integración (fecha):
```

---

## 16. Principio de liderazgo para este proyecto

El enunciado es amplio a propósito. El riesgo de un grupo de 4 no es “no saber React”: es **abrir demasiados frentes y no tener un pedido funcionando el 10/09**.

Prioridad absoluta del Sprint 1: **pedido creado de punta a punta**. Todo lo demás se cuelga de ese hilo.
