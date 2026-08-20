# Requerimientos funcionales

**Proyecto:** Pedidos en casas de comidas rápidas  
**Fuente:** `docs/Enunciado.txt`  
**Versión:** 0.1 (20/08/2026)  
**Estado:** borrador para carpeta de la materia. Pendiente de ajustar según respuestas de docentes (stock/promos base vs extensión, alcance de parámetros y estados).

## 1. Cómo leer este documento

Un requerimiento funcional (RF) describe **qué debe hacer el sistema**, no cómo se implementa.

| Campo | Significado |
|---|---|
| ID | Identificador estable. No se reutiliza si se elimina un RF. |
| Nombre | Acción o capacidad, en español. |
| Descripción | Frase tipo “El sistema deberá…”. |
| Actor | Quién dispara o se beneficia de la función. |
| Prioridad | `Obligatorio` (funcionalidades base) · `Optativo` · `Extensión 1` · `Extensión 2` |
| Entidad | Nombre canónico en inglés (código, URLs, API). |
| Fuente | Cita o párrafo del enunciado. |

Convención de lenguaje (igual que el resto de la carpeta): documentación y UI en español; código, tablas y URLs en inglés. Ver glosario en `docs/01-Analisis-inicial-y-planning-Sprint-1.md`.

Los RF de extensión **no forman parte del mínimo** del enunciado. Se implementan solo si el grupo elige esa propuesta.

## 2. Actores

| Actor | Descripción |
|---|---|
| Visitante | Persona no autenticada. Puede registrarse e iniciar sesión. |
| Cliente (`Customer`) | Usuario autenticado que realiza pedidos de delivery. |
| Administrador (`Admin`) | Usuario autenticado que gestiona el negocio desde la aplicación administrativa. |
| Sistema | Comportamiento automático (asignación de sucursal, cálculo de total, registro de estados, seed inicial). |
| Repartidor (`Driver`) | Solo si se elige Extensión 2. |

## 3. Requerimientos — funcionalidades base

### 3.1 Gestión de usuarios — Cliente

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-CLI-01 | Registro de cliente | El sistema deberá permitir a un visitante crear una cuenta de cliente con los datos mínimos para autenticarse y operar. | Visitante | Obligatorio | `Customer` | “Podrán: Registrarse.” |
| RF-CLI-02 | Inicio de sesión | El sistema deberá autenticar a un cliente con sus credenciales y mantener una sesión válida para usar la aplicación. | Cliente | Obligatorio | `Customer` | “Iniciar sesión.” |
| RF-CLI-03 | Recuperar contraseña | El sistema deberá permitir a un cliente iniciar un flujo para restablecer su contraseña. | Cliente | Obligatorio | `Customer` | “Recuperar contraseña.” |
| RF-CLI-04 | Modificar datos personales | El sistema deberá permitir a un cliente autenticado consultar y modificar sus datos personales. | Cliente | Obligatorio | `Customer` | “Modificar sus datos.” |
| RF-CLI-05 | Administrar direcciones | El sistema deberá permitir a un cliente dar de alta, consultar, modificar y eliminar una o más direcciones de entrega. | Cliente | Obligatorio | `Address` | “Administrar sus direcciones.” |
| RF-CLI-06 | Consultar pedidos anteriores | El sistema deberá permitir a un cliente consultar los pedidos que realizó. | Cliente | Obligatorio | `Order` | “Consultar pedidos anteriores.” |
| RF-CLI-07 | Realizar un pedido nuevo | El sistema deberá permitir a un cliente autenticado confirmar un pedido de delivery a partir del carrito. | Cliente | Obligatorio | `Order` | “Realizar nuevos pedidos.” |

### 3.2 Gestión de usuarios — Administrador

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-ADM-01 | Administrador inicial | El sistema deberá nacer con un administrador precargado, capaz de iniciar sesión en la aplicación administrativa. | Sistema | Obligatorio | `Admin` | “El sistema nace con un administrador inicial.” |
| RF-ADM-02 | Inicio de sesión de administrador | El sistema deberá autenticar a un administrador y restringir las operaciones de backoffice a ese rol. | Administrador | Obligatorio | `Admin` | “Gestionan toda la información necesaria para el funcionamiento del sistema.” |
| RF-ADM-03 | Alta de administradores | El sistema deberá permitir a un administrador crear nuevos administradores. | Administrador | Obligatorio | `Admin` | “Los administradores podrán crear nuevos administradores.” |

### 3.3 Sucursales

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-BRN-01 | ABM de sucursales | El sistema deberá permitir al administrador el alta, baja, modificación y consulta de sucursales. De cada sucursal se registrarán al menos: nombre, dirección, latitud, longitud, horarios de atención, teléfono y estado (activa/inactiva). | Administrador | Obligatorio | `Branch` | “De cada una interesa registrar, entre otros datos: Nombre. Dirección. Ubicación geográfica (latitud y longitud). Horarios de atención. Teléfono. Estado (activa/inactiva).” |
| RF-BRN-02 | Asignación de sucursal al pedido | El sistema deberá determinar desde qué sucursal se prepara cada pedido, según la estrategia definida por el grupo. | Sistema | Obligatorio | `Branch`, `Order` | “La aplicación deberá determinar desde qué sucursal preparar un pedido.” |
| RF-BRN-03 | Sucursales disponibles para el cliente | El sistema deberá mostrar al cliente las sucursales disponibles para su ubicación. | Cliente | Obligatorio | `Branch` | “También deberá mostrar al cliente las sucursales disponibles para su ubicación.” |

### 3.4 Catálogo de productos

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-CAT-01 | ABM de productos | El sistema deberá permitir al administrador el alta, baja, modificación y consulta de productos. De cada producto se registrarán al menos: nombre, descripción, categoría, precio, imagen y estado (disponible/no disponible). | Administrador | Obligatorio | `Product` | “Cada producto posee información como: nombre, descripción, categoría, precio, imagen, estado (disponible/no disponible).” |
| RF-CAT-02 | ABM de categorías | El sistema deberá permitir al administrador el alta, baja, modificación y consulta de categorías de producto. | Administrador | Obligatorio | `Category` | “Las categorías también deberán ser administrables.” |
| RF-CAT-03 | Consulta del catálogo | El sistema deberá permitir al cliente consultar los productos disponibles, organizados por categoría. | Cliente | Obligatorio | `Product`, `Category` | “Catálogo de Productos” / “Son quienes realizan pedidos mediante la aplicación.” |
| RF-CAT-04 | Configuraciones especiales de producto | El sistema deberá permitir, en los productos que el grupo defina, indicar configuraciones especiales al armar el pedido (por ejemplo extras, quitar ingredientes, tamaños o sabores). | Cliente, Administrador | Obligatorio | `Product`, `ProductOption` | “Cada grupo deberá definir si algunos productos pueden tener configuraciones especiales, a tener en cuenta al realizar pedidos.” |

### 3.5 Carrito de compras

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-CRT-01 | Agregar productos al carrito | El sistema deberá permitir al cliente agregar productos al carrito. | Cliente | Obligatorio | `Cart` | “Los clientes podrán ir agregando productos al carrito.” |
| RF-CRT-02 | Datos del ítem de carrito | El sistema deberá permitir indicar, por cada producto del carrito, cantidad, observaciones y configuraciones especiales si correspondieran. | Cliente | Obligatorio | `CartItem` | “para cada producto incluido en un carrito, se pueda indicar: cantidad, observaciones, configuraciones especiales (si correspondiera).” |
| RF-CRT-03 | Cálculo del importe total | El sistema deberá calcular y mostrar el importe total del carrito. | Sistema | Obligatorio | `Cart` | “La aplicación calculará el importe total.” |
| RF-CRT-04 | Modificar el carrito | El sistema deberá permitir al cliente modificar el carrito (cambiar cantidades, observaciones, configuraciones, quitar ítems) antes de confirmar el pedido. | Cliente | Obligatorio | `Cart` | “El cliente podrá modificar el carrito antes de confirmar el pedido.” |

### 3.6 Realización de pedidos

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-ORD-01 | Confirmación del pedido | Al confirmar, el sistema deberá registrar al menos: cliente, sucursal asignada, dirección de entrega, fecha y hora, detalle de productos, importe y estado inicial. | Cliente | Obligatorio | `Order` | “Al confirmar el pedido se deberán registrar, como mínimo: cliente, sucursal asignada, dirección de entrega, fecha y hora, detalle de productos, importe, estado inicial.” |
| RF-ORD-02 | Estados del pedido | El sistema deberá hacer atravesar cada pedido por una máquina de estados. Lista de referencia del enunciado: Pendiente, Confirmado, En preparación, Listo para entregar, En camino, Entregado, Cancelado. El grupo puede ajustar la lista. | Sistema, Administrador | Obligatorio | `OrderStatus` | “Cada pedido atravesará diferentes estados, por ejemplo: …” |
| RF-ORD-03 | Cambio de estado | El sistema deberá permitir registrar el cambio de estado de un pedido y dejar constancia de fecha y hora de cada cambio. | Administrador | Obligatorio | `OrderStatusHistory` | “fecha y hora de cada cambio de estado” |
| RF-ORD-04 | Cancelación | El sistema deberá permitir cancelar un pedido cuando las reglas de negocio del grupo lo habiliten, dejando el estado `cancelled`. | Cliente y/o Administrador | Obligatorio | `Order` | Estado “Cancelado” en la lista de ejemplo. |

### 3.7 Geolocalización

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-GEO-01 | Ubicación geográfica de direcciones | El sistema deberá almacenar, además de la dirección textual, la ubicación geográfica (latitud y longitud) de cada dirección del cliente. | Cliente | Obligatorio | `Address` | “Además de la dirección textual deberá almacenarse la ubicación geográfica.” |
| RF-GEO-02 | Uso de geo para asignar sucursal | El sistema deberá utilizar la ubicación de la dirección de entrega para determinar la sucursal que prepara el pedido. | Sistema | Obligatorio | `Address`, `Branch` | “La aplicación utilizará dicha información para determinar desde qué sucursal preparar el pedido.” |
| RF-GEO-03 | Mapa de pedido | El sistema podrá mostrar un mapa con la ubicación del cliente, la sucursal asignada y un recorrido estimado. No es obligatorio implementar navegación real. | Cliente | Optativo | `Order`, `Branch`, `Address` | “Como funcionalidad adicional y optativa, podrá mostrarse un mapa… No es obligatorio implementar navegación real.” |

### 3.8 Seguimiento e historial

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-TRK-01 | Consultar evolución del pedido | Una vez confirmado el pedido, el sistema deberá permitir al cliente consultar su evolución. | Cliente | Obligatorio | `Order` | “Una vez confirmado el pedido, el cliente podrá consultar su evolución.” |
| RF-TRK-02 | Información de seguimiento | El sistema deberá mostrar: sucursal que prepara o preparó el pedido, estado actual, fecha y hora de cada cambio de estado, y tiempo estimado de entrega. | Cliente | Obligatorio | `Order`, `Branch`, `OrderStatusHistory` | “qué sucursal está preparando / preparó el pedido, estado actual, fecha y hora de cada cambio de estado, tiempo estimado de entrega.” |
| RF-TRK-03 | Cálculo de tiempo estimado | El sistema deberá calcular el tiempo estimado de entrega según el criterio definido por el grupo. | Sistema | Obligatorio | `Order` | “Cada grupo podrá definir cómo calcula dicho tiempo.” |
| RF-HIS-01 | Historial de pedidos | El sistema deberá permitir al cliente consultar pedidos realizados con detalle, importe, fecha y estado final. | Cliente | Obligatorio | `Order` | “Los clientes podrán consultar: pedidos realizados, detalle de cada pedido, importe, fecha, estado final.” |
| RF-HIS-02 | Repetir un pedido anterior | El sistema deberá permitir al cliente repetir un pedido anterior (cargar su detalle en el carrito para volver a confirmarlo). | Cliente | Obligatorio | `Order`, `Cart` | “También podrán repetir pedidos anteriores.” |

### 3.9 Sistema administrativo (ABM)

El enunciado exige una aplicación administrativa independiente que comparte la misma base de datos. Además de sucursales, productos y categorías (ya cubiertos), el administrador gestiona:

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-ADM-04 | Aplicación administrativa independiente | El sistema deberá ofrecer una aplicación administrativa, distinta de la de clientes, que comparte la misma base de datos. | Administrador | Obligatorio | — | “Los administradores disponen de una aplicación independiente que comparte la misma base de datos con el sistema de delivery.” |
| RF-ADM-05 | ABM de promociones | El sistema deberá permitir al administrador el alta, baja, modificación y consulta de promociones. | Administrador | Obligatorio | `Promotion` | Entidad “Promociones.” en el ABM del sistema administrativo. |
| RF-ADM-06 | ABM de stock | El sistema deberá permitir al administrador consultar y actualizar stock. | Administrador | Obligatorio | `Stock` | Entidad “Stock.” en el ABM del sistema administrativo. |
| RF-ADM-07 | ABM de administradores | El sistema deberá permitir consultar y dar de alta administradores desde el backoffice. | Administrador | Obligatorio | `Admin` | Entidad “Administradores.” |
| RF-ADM-08 | Gestión de estados generales | El sistema deberá permitir administrar los estados generales usados por el negocio (como mínimo, los estados de pedido). | Administrador | Obligatorio | `OrderStatus` / `Parameter` | Entidad “Estados generales.” |
| RF-ADM-09 | Gestión de parámetros del sistema | El sistema deberá permitir consultar y modificar parámetros de funcionamiento (por ejemplo radio de cobertura, valores de ETA u otros que defina el grupo). | Administrador | Obligatorio | `Parameter` | Entidad “Parámetros del sistema.” |
| RF-ADM-10 | Gestión de pedidos en backoffice | El sistema deberá permitir al administrador consultar pedidos y cambiar su estado. | Administrador | Obligatorio | `Order` | Necesario para “entrega del pedido al cliente” y para RF-ORD-03. No está listado como entidad ABM, pero el proceso completo lo exige. |

Nota: RF-ADM-05 y RF-ADM-06 cubren el **ABM** pedido en el bloque administrativo. Las reglas de reserva de stock al confirmar un pedido y la aplicación de promociones en el checkout son RF de Extensión 1 (sección 4). Hasta que los docentes confirmen lo contrario, el mínimo es poder cargar esos datos; no necesariamente usarlos en el checkout.

### 3.10 Reportes base

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-RPT-01 | Productos más vendidos | El sistema administrativo deberá mostrar los productos más vendidos. | Administrador | Obligatorio | `Report`, `Product` | “Productos más vendidos.” |
| RF-RPT-02 | Productos menos vendidos | El sistema administrativo deberá mostrar los productos menos vendidos. | Administrador | Obligatorio | `Report`, `Product` | “Productos menos vendidos.” |
| RF-RPT-03 | Productos sin stock | El sistema administrativo deberá mostrar los productos sin stock. | Administrador | Obligatorio | `Report`, `Stock` | “Productos sin stock.” |
| RF-RPT-04 | Productos con mayor facturación | El sistema administrativo deberá mostrar los productos con mayor facturación. | Administrador | Obligatorio | `Report`, `Product` | “Productos con mayor facturación.” |

## 4. Requerimientos — Extensión 1 (stock, promociones, reportes extra)

Aplican solo si el grupo elige la propuesta 1.

### 4.1 Stock por sucursal

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-STK-01 | Stock por sucursal y producto | El sistema deberá registrar el stock disponible de cada producto en cada sucursal. | Administrador | Extensión 1 | `Stock` | “Cada sucursal administra su propio stock. Debe existir una forma de registrar el stock disponible para cada producto.” |
| RF-STK-02 | Verificar disponibilidad al pedir | Al realizar un pedido, el sistema deberá verificar que exista stock suficiente en la sucursal asignada. | Sistema | Extensión 1 | `Stock`, `Order` | “Cuando un cliente realiza un pedido, la aplicación deberá verificar la disponibilidad correspondiente.” |
| RF-STK-03 | Disponibilidad distinta por sucursal | El sistema deberá permitir que un producto no esté disponible en todas las sucursales. | Administrador | Extensión 1 | `Stock`, `Product` | “No necesariamente todos los productos estarán disponibles en todas las sucursales.” |
| RF-STK-04 | Reserva, descuento y liberación | El sistema deberá reservar, descontar o liberar stock según la política definida por el grupo (por ejemplo reservar al confirmar, liberar al cancelar, confirmar el descuento al entregar). | Sistema | Extensión 1 | `Stock` | “La forma en que se reserva, descuenta o libera el stock queda abierta para ser definida por cada grupo.” |
| RF-STK-05 | Alertas o niveles de stock | El sistema podrá manejar niveles de stock o alertas (por ejemplo stock mínimo). | Administrador | Extensión 1 (opcional dentro de la extensión) | `Stock` | “También queda abierta la posibilidad de manejar distintos niveles de stock o alertas.” |

### 4.2 Promociones

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-PRM-01 | Administración de promociones | El sistema deberá administrar promociones aplicables a pedidos (ejemplos del enunciado: combos, descuentos, 2x1, cupones, envío gratuito). | Administrador | Extensión 1 | `Promotion` | “El sistema podrá administrar promociones.” |
| RF-PRM-02 | Aplicación de promociones | El sistema deberá aplicar al carrito o al pedido las promociones vigentes según las reglas definidas por el grupo, y reflejarlo en el importe. | Sistema, Cliente | Extensión 1 | `Promotion`, `Cart`, `Order` | “Las reglas de aplicación quedan abiertas para que cada grupo las defina.” |

### 4.3 Reportes adicionales (Extensión 1)

**Pedidos**

| ID | Nombre | Descripción | Actor | Prioridad | Fuente |
|---|---|---|---|---|---|
| RF-RPT-10 | Pedidos por día | El sistema deberá mostrar la cantidad de pedidos agrupados por día. | Administrador | Extensión 1 | “Pedidos por día.” |
| RF-RPT-11 | Pedidos por sucursal | El sistema deberá mostrar pedidos agrupados por sucursal. | Administrador | Extensión 1 | “Pedidos por sucursal.” |
| RF-RPT-12 | Pedidos por estado | El sistema deberá mostrar pedidos agrupados por estado. | Administrador | Extensión 1 | “Pedidos por estado.” |
| RF-RPT-13 | Tiempo promedio de entrega | El sistema deberá mostrar el tiempo promedio de entrega. | Administrador | Extensión 1 | “Tiempo promedio de entrega.” |
| RF-RPT-14 | Pedidos cancelados | El sistema deberá mostrar información de pedidos cancelados. | Administrador | Extensión 1 | “Pedidos cancelados.” |

**Clientes**

| ID | Nombre | Descripción | Actor | Prioridad | Fuente |
|---|---|---|---|---|---|
| RF-RPT-15 | Clientes con mayor cantidad de pedidos | El sistema deberá listar los clientes con más pedidos. | Administrador | Extensión 1 | “Clientes con mayor cantidad de pedidos.” |
| RF-RPT-16 | Clientes nuevos por período | El sistema deberá mostrar clientes nuevos en un período. | Administrador | Extensión 1 | “Clientes nuevos por período.” |
| RF-RPT-17 | Clientes inactivos | El sistema deberá mostrar clientes inactivos según el criterio del grupo. | Administrador | Extensión 1 | “Clientes inactivos.” |

**Sucursales**

| ID | Nombre | Descripción | Actor | Prioridad | Fuente |
|---|---|---|---|---|---|
| RF-RPT-18 | Ventas por sucursal | El sistema deberá mostrar ventas por sucursal. | Administrador | Extensión 1 | “Ventas por sucursal.” |
| RF-RPT-19 | Productos vendidos por sucursal | El sistema deberá mostrar productos vendidos por sucursal. | Administrador | Extensión 1 | “Productos vendidos por sucursal.” |
| RF-RPT-20 | Pedidos atendidos por sucursal | El sistema deberá mostrar la cantidad de pedidos atendidos por sucursal. | Administrador | Extensión 1 | “Cantidad de pedidos atendidos.” |

**Promociones**

| ID | Nombre | Descripción | Actor | Prioridad | Fuente |
|---|---|---|---|---|---|
| RF-RPT-21 | Promociones más utilizadas | El sistema deberá mostrar las promociones más utilizadas. | Administrador | Extensión 1 | “Promociones más utilizadas.” |
| RF-RPT-22 | Impacto de una promoción | El sistema deberá mostrar el impacto de una promoción sobre las ventas. | Administrador | Extensión 1 | “Impacto sobre las ventas de una promoción.” |

## 5. Requerimientos — Extensión 2 (calificaciones, notificaciones, repartidores)

Aplican solo si el grupo elige la propuesta 2. Los reportes extra de esta extensión son RF-RPT-10 a RF-RPT-20 (los de Extensión 1 salvo promociones).

| ID | Nombre | Descripción | Actor | Prioridad | Entidad | Fuente |
|---|---|---|---|---|---|---|
| RF-RAT-01 | Calificar un pedido | Luego de recibir un pedido, el sistema deberá permitir al cliente valorarlo con puntuación y/o comentario. | Cliente | Extensión 2 | `Rating` | “Luego de recibir un pedido, el cliente podrá realizar una valoración. Podrá incluir puntuación y/o comentario.” |
| RF-NOT-01 | Notificar eventos del pedido | El sistema deberá informar al cliente eventos relevantes del pedido (al menos: confirmado, en preparación, en camino, entregado, cancelación). El canal lo define el grupo (email, in-app u otro). | Sistema | Extensión 2 | `Notification` | “El sistema deberá informar al cliente los eventos importantes.” |
| RF-DRV-01 | Aplicación de repartidores | El sistema deberá ofrecer una tercera aplicación para uso de los repartidores, sobre la misma base de datos. | Repartidor | Extensión 2 | `Driver` | “Se propone construir una tercer aplicación para uso de los repartidores.” |
| RF-DRV-02 | Asignación de repartidor | Cuando un pedido queda listo para entregar, el sistema deberá asignarlo a un repartidor según el criterio del grupo. | Sistema | Extensión 2 | `Order`, `Driver` | “Cuando un pedido queda listo para entregar, se asigna a un repartidor…” |
| RF-DRV-03 | Pedidos pendientes de entrega | El sistema deberá mostrar al repartidor los pedidos pendientes de entrega. | Repartidor | Extensión 2 | `Order` | “En la aplicación del repartidor aparecen los pedidos pendientes de entrega.” |
| RF-DRV-04 | Inicio de viaje | El sistema deberá permitir al repartidor marcar el inicio de un viaje e indicar qué pedidos lleva. | Repartidor | Extensión 2 | `Trip` | “El repartidor marca cuando empieza un viaje, indicando qué pedidos está llevando…” |
| RF-DRV-05 | Registrar entrega | El sistema deberá permitir al repartidor marcar la entrega de cada pedido. | Repartidor | Extensión 2 | `Order` | “…y cuando entrega cada pedido.” |

## 6. Resumen cuantitativo

| Alcance | Cantidad de RF |
|---|---|
| Obligatorios | 40 (incluye RF-ADM-10, necesario para el proceso de entrega) |
| Optativos | 1 (RF-GEO-03 mapa) |
| Extensión 1 | 18 (stock, promos, reportes extra; RF-STK-05 es opcional dentro de la extensión) |
| Extensión 2 | 7 + reportes RF-RPT-10 a RF-RPT-20 |

Núcleo mínimo demostrable (Sprint 1), no es el alcance total: RF-CLI-01, RF-CLI-02, RF-ADM-01, RF-ADM-02, RF-CAT-01, RF-CAT-02, RF-CAT-03, RF-CRT-01 a RF-CRT-04, RF-ORD-01, RF-BRN-01.

## 7. Trazabilidad enunciado → RF

| Bloque del enunciado | RF |
|---|---|
| Clientes (registro a nuevos pedidos) | RF-CLI-01 a RF-CLI-07 |
| Administradores | RF-ADM-01 a RF-ADM-03, RF-ADM-07 |
| Sucursales | RF-BRN-01 a RF-BRN-03 |
| Catálogo | RF-CAT-01 a RF-CAT-04 |
| Carrito | RF-CRT-01 a RF-CRT-04 |
| Realización de pedidos | RF-ORD-01 a RF-ORD-04 |
| Geolocalización | RF-GEO-01 a RF-GEO-03 |
| Seguimiento | RF-TRK-01 a RF-TRK-03 |
| Historial | RF-HIS-01, RF-HIS-02 |
| Sistema administrativo | RF-ADM-04 a RF-ADM-10 |
| Reportes base | RF-RPT-01 a RF-RPT-04 |
| Extensión 1 | RF-STK-*, RF-PRM-*, RF-RPT-10 a RF-RPT-22 |
| Extensión 2 | RF-RAT-01, RF-NOT-01, RF-DRV-01 a RF-DRV-05 |

## 8. Pendientes de confirmación con docentes

Estos RF pueden bajar o subir de prioridad según la consulta de requerimientos:

1. RF-ADM-05 y RF-ADM-06: ¿ABM alcanza sin Extensión 1, o el checkout ya debe usar stock y promos?
2. RF-ADM-08 y RF-ADM-09: ¿pantalla de configuración o valores en BD?
3. RF-CLI-03: ¿correo real o flujo demostrable?
4. RF-ADM-04: ¿mismo SPA con `/admin` o deploy separado?
5. RF-GEO-03: confirmar que sigue optativo para medio término.
