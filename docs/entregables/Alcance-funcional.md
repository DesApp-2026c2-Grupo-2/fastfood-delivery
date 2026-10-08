# Alcance funcional

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Fuente:** `docs/interno/Enunciado.txt`  
**Versión:** 1.3  
**Actualizado:** 07/10/2026  
**Estado:** cierre del Sprint 3 (corte 07/10, review 08/10) y decisión de promociones para el Sprint 4. Describe el producto comprometido y qué de eso ya está construido.  
**Documentos relacionados:** `Supuestos-y-decisiones.md`, `Requerimientos-funcionales.md`, `Historias-de-usuario.md`, `Incrementos-de-los-sprints.md`, `docs/sprints/Ficha-Sprint-4.md`

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

**Estrategia de asignación (Sprint 1):** sucursal **activa más cercana** a la dirección de entrega, distancia Haversine. Si no hay ninguna activa, no se crea el pedido.

**Estrategia de asignación (desde Sprint 3):** sucursal **activa más cercana dentro del radio de cobertura** (parámetro `coverage_radius_km`, 5 km por defecto, editable en `/admin/parameters`). Si ninguna llega, no se crea el pedido y el checkout avisa que esa dirección no tiene cobertura. El horario de atención se muestra pero no se usa para asignar.

**Sucursales disponibles (Sprint 3):** el cliente ve en `/branches` las sucursales activas dentro del radio, para una dirección guardada o para la ubicación del dispositivo, de la más cercana a la más lejana. La primera es la que se asigna al confirmar.

### 2.4 Catálogo

ABM de categorías y productos. El producto tiene nombre, descripción, categoría, precio, imagen y estado disponible/no disponible. El cliente consulta solo productos disponibles.

Configuraciones especiales: el grupo las acotó a **adicionales de hamburguesa** (un producto de la categoría Adicional, ofrecido en Hamburguesas). Están implementadas desde el Sprint 2. Quitar ingredientes, tamaños y sabores no entran.

### 2.5 Carrito

Agregar productos, indicar cantidad y observaciones, ver el importe total y modificar el carrito antes de confirmar.

### 2.6 Pedidos

Al confirmar se registran: cliente (o datos de invitado, ver §5), sucursal asignada, dirección de entrega, fecha y hora, detalle, importe y estado inicial `pending`.

Estados previstos (lista del enunciado, sin recortar):

`pending` → `confirmed` → `preparing` → `ready` → `on_the_way` → `delivered`  
`cancelled` desde `pending` o `confirmed`.

Desde el Sprint 2 la máquina está en uso: el admin avanza el estado y el cliente cancela en `pending` o `confirmed`. Cada cambio queda en `OrderStatusHistory`. El seguimiento, el historial y repetir pedido también están desde ese sprint.

### 2.7 Geolocalización, seguimiento e historial

Las direcciones guardan ubicación geográfica. Esa ubicación se usa para asignar sucursal. El mapa con recorrido es **optativo** (`RF-GEO-03`) y queda fuera del núcleo.

El cliente ve la evolución del pedido (sucursal, estado, historial de cambios, hora estimada y demora) y el historial (detalle, importe, fecha, estado final, repetir pedido). Está desde el Sprint 2; la hora fija y la demora, desde el Sprint 3.

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

El stock está implementado desde el Sprint 3. Las promociones y los reportes (base y extra) quedan para los Sprints 4 y 5.

**Política de stock (Sprint 3):** cantidad entera por sucursal y producto. Al confirmar se verifica que alcance en la sucursal asignada y se **reserva**; si falta algo, no se crea el pedido y el checkout nombra los productos que faltan. Al cancelar (`pending` o `confirmed`) se **libera** la reserva y al pasar a `delivered` se **descuenta** definitivamente. Un producto sin stock cargado en una sucursal cuenta como 0 ahí. Los adicionales también son productos y descuentan stock igual.

**Política de promociones (Sprint 4):** una sola promoción por pedido, aplicada al confirmar. Tipos: porcentual, monto fijo o 2x1 de un producto. Sin código es automática (gana la que más descuenta); con código es cupón y reemplaza a la automática. El descuento no supera el subtotal y queda congelado en el pedido. No hay combos, envío gratis ni cupón de un solo uso. El 2x1 no libera stock: se reservan todas las unidades. El contrato está en `docs/sprints/Ficha-Sprint-4.md`.

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
| Horario de atención en la asignación de sucursal | Simplificación aceptada; el radio y el stock sí se usan desde el Sprint 3 |
| Correo real para recuperar contraseña | Flujo demostrable con token en modo demo; el correo es mejora |

---

## 5. Decisiones que delimitan el alcance

Estas decisiones ya están tomadas para no inflar el enunciado. El detalle y el resto de las reglas viven en `Supuestos-y-decisiones.md`. Acá se anotan las que cambian qué entra y qué no.

| Decisión | Valor |
|---|---|
| Aplicaciones | Dos SPAs independientes (cliente y admin), misma API y misma BD |
| Extensión | Propuesta 1 |
| Asignación Sprint 1 | Activa más cercana (Haversine) |
| Asignación desde Sprint 3 | Activa más cercana dentro del radio de cobertura (parámetro). Sin cobertura, no se crea el pedido |
| Stock (Sprint 3) | Reservar al confirmar, liberar al cancelar, descontar al entregar. Sin fila de stock = 0 |
| Parámetros (Sprint 3) | Tabla `Parameter`: radio de cobertura y constantes de ETA. Cambiarlos no recalcula pedidos ya confirmados |
| Recuperar contraseña (Sprint 3) | Token demostrable (sin SMTP), vence a los 30 min y es de un solo uso |
| Promociones (Sprint 4) | Una por pedido, aplicada al confirmar: porcentual, monto fijo o 2x1; automática o cupón. Sin combos ni envío gratis |
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

Rutas de pantalla alineadas a los recursos de la API. Texto visible en español. Estado al **07/10/2026**.

### 7.1 App cliente (`/frontend`)

| Ruta | Estado | Función |
|---|---|---|
| `/login` | Hecho | Iniciar sesión |
| `/register` | Hecho | Registro |
| `/products` | Hecho | Catálogo filtrable por categoría |
| `/products/:id` | Hecho | Detalle, adicionales de hamburguesa y agregar al carrito |
| `/cart` | Hecho | Ítems, cantidades, observaciones, adicionales, total |
| `/checkout` | Hecho | Confirmar pedido (cuenta o invitado); avisa sin cobertura o sin stock |
| `/account/addresses` | Hecho | ABM de direcciones, alias y geolocalización del dispositivo |
| `/forgot-password` | Hecho | Recuperar contraseña (token demo) |
| `/reset-password` | Hecho | Nueva contraseña con el token |
| `/account` | Hecho | Datos personales y cambio de contraseña |
| `/branches` | Hecho | Sucursales activas dentro del radio |
| `/orders` | Hecho | Historial y repetir (suma al carrito si ya hay ítems) |
| `/orders/:id` | Hecho | Seguimiento: sucursal, timeline, hora estimada, demora, cancelar |

### 7.2 App admin (`/backend/admin`)

| Ruta | Estado | Función |
|---|---|---|
| `/admin/login` | Hecho | Login de administrador |
| `/admin` | Hecho | Home |
| `/admin/categories` | Hecho | ABM categorías |
| `/admin/products` | Hecho | ABM productos (URL o carga de imagen) |
| `/admin/branches` | Hecho | ABM sucursales; la dirección se puede geocodificar |
| `/admin/orders` | Hecho | Pedidos, código completo, cambio de estado, hora y demora |
| `/admin/admins` | Hecho | Alta, edición y baja de administradores |
| `/admin/stock` | Hecho | Stock por sucursal (disponible y reservado) |
| `/admin/parameters` | Hecho | Radio, constantes de ETA y estados en lectura |
| `/admin/promotions` | Sprint 4 | ABM promociones |
| `/admin/reports` | Sprint 4–5 | Reportes base y extra |

---

## 8. Visión de incrementos (5 sprints)

No sustituye las fichas de cada sprint. Sirve para no abrir frentes de más.

| Sprint | Review | Foco |
|---|---|---|
| 1 | 10/09 | Núcleo: auth, catálogo, sucursales, carrito, confirmar pedido, docs v0 |
| 2 | 24/09 | Estados del pedido, gestión de pedidos en admin, seguimiento, cancelar, historial, repetir pedido, adicionales de hamburguesa |
| 3 | 08/10 | Stock por sucursal (Ext. 1), perfil, recuperar contraseña, alta de admins, parámetros y radio de cobertura, sucursales disponibles, hora estimada y demora |
| 4 | 29/10 | Promociones, reportes base, medio término (22/10) con demo estable |
| 5 | 19/11 | Reportes extra de Extensión 1, testing, carpeta final (entrega 12/11), demo 27/11 |

Si hay que recortar, se recorta mapa, notificaciones y Extensión 2. **No se recorta** el flujo de pedido ni el ABM de productos y categorías.

---

## 9. Qué está hecho al cierre del Sprint 3

De los **40 RF obligatorios**, están cubiertos **35**. Faltan el ABM de promociones (`RF-ADM-05`) y los cuatro reportes base (`RF-RPT-01` a `RF-RPT-04`).

De la **Extensión 1** está el stock en el checkout (`RF-STK-01` a `RF-STK-04`). Faltan promociones, reportes extra y la alerta de stock mínimo.

| Hecho (Sprints 1 a 3) | Pendiente |
|---|---|
| Cuenta de cliente completa: registro, sesión, perfil, recuperar contraseña, direcciones | Promociones (ABM y aplicación en el pedido) |
| Catálogo, carrito, adicionales de hamburguesa, checkout de cuenta e invitado | Reportes base de productos |
| Pedido vivo: estados, cancelar, seguimiento con hora y demora, historial, repetir | Reportes extra de Extensión 1 |
| Admin: productos, categorías, sucursales, pedidos, stock, parámetros, más administradores | Alerta de stock mínimo |
| Asignación por radio y reserva de stock | Mapa y Extensión 2 (siguen fuera) |

El detalle de cada incremento está en `Incrementos-de-los-sprints.md`.

---

## 10. Trazabilidad enunciado → este alcance

| Bloque del enunciado | ¿En el producto? | Al 07/10/2026 |
|---|---|---|
| Gestión de usuarios (clientes) | Sí | Completo |
| Administradores | Sí | Seed, login, alta, edición y baja |
| Sucursales | Sí | ABM, radio de cobertura y listado para el cliente |
| Catálogo | Sí | ABM, consulta y adicionales de hamburguesa |
| Carrito | Sí | Completo, con adicionales |
| Realización de pedidos | Sí | Confirmación, máquina de estados y cancelación |
| Geolocalización | Sí (mapa optativo) | Lat/lng, GPS del cliente y geocodificación de sucursales. Sin mapa |
| Seguimiento | Sí | Sucursal, timeline, hora estimada y demora |
| Historial | Sí | Listado, detalle y repetir |
| Sistema administrativo | Sí | Falta promociones |
| Reportes base | Sí | No empezados |
| Extensión 1 | Sí (compromiso) | Stock sí; promociones y reportes extra no |
| Extensión 2 | No (plus) | No |

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.3 | 07/10/2026 | Política de promociones del Sprint 4 (una por pedido, aplicada al confirmar) |
| 1.2 | 07/10/2026 | Estado al cierre del Sprint 3: páginas hechas, 35/40 RF base y stock de Extensión 1 |
| 1.1 | 03/10/2026 | Asignación con radio de cobertura, sucursales disponibles, política de stock y decisiones del Sprint 3; visión de sprints según lo cubierto |
| 1.0 | 07/09/2026 | Versión inicial en la carpeta |
