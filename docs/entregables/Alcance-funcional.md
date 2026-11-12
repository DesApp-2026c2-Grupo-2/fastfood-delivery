# Alcance funcional

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.5
**Actualizado:** 12/11/2026
**Fuente:** sección homónima de `Carpeta.md`

Mordi es la plataforma con la que una casa de comidas rápidas toma un pedido, lo cobra con promoción y envío, y lo sigue hasta que se entrega o se retira. Este documento dice qué hace el producto que se entrega. Se puede leer solo. Los precios de los ejemplos de la carpeta son los del catálogo de demostración: hamburguesa doble $20.000, gaseosa cola $2.000, papas fritas $3.000, cheddar $2.000.

Hay dos aplicaciones y una base PostgreSQL. La API es la misma para las dos.

| Aplicación | Quién entra | Dónde está |
|---|---|---|
| Cliente | Cualquier persona, con cuenta o como invitado | `frontend` |
| Administración | Super admin, o un administrador que solo ve pedidos | `backend/admin`, se abre en `/admin` |

La administrativa no es una pantalla del servidor. Es otra aplicación React, separada de la API.

## Qué hace el cliente

Cualquier persona ve el catálogo, el detalle de un producto y sus adicionales, las sucursales en un mapa, las promociones vigentes, términos, nosotros y contacto. El carrito de quien tiene cuenta vive en el servidor. El de quien no inició sesión vive en el navegador. En los dos casos sigue ahí si se recarga la página.

Con cuenta se puede registrar, iniciar sesión, recuperar la contraseña, editar el perfil, guardar direcciones y dar de baja la cuenta. Sin cuenta se puede confirmar igual, como invitado, dejando nombre, correo y, si es envío, una dirección. El invitado no suma sellos ni entra al Top 3.

Al pasar a confirmar, si hay hamburguesas o guarniciones y todavía no hay aderezos, se pregunta si se suman. El valor inicial es la mitad del máximo.

El pedido se retira en el local o se envía a domicilio. La persona elige la sucursal. Después ve el código (tres letras de la sucursal y seis dígitos, por ejemplo `MOR482913`), el estado, la hora estimada y el historial. Con cuenta puede repetir un pedido anterior y, si ya se entregó o se retiró, reportar un problema. Es uno por pedido y solo del dueño. Si el motivo es otro, tiene que contar qué pasó. La respuesta del local se lee en ese pedido. Hasta abrirla, figura «Nueva respuesta».

En el checkout se elige un medio de pago simulado: efectivo, tarjeta o transferencia. La transferencia muestra datos de demostración. No se cobra y el medio no se guarda en el pedido.

## Qué hace el administrador

Hay dos roles. **Super admin** opera todo el local. **Solo pedidos** ve el inicio (pedidos de hoy, facturación de hoy, estados y ventas de la semana), el listado de pedidos, los reclamos y los cupones de reclamo. Resuelve un reclamo igual que el super admin: escribe la respuesta y puede cargar el cupón. Si el cupón no se usó, puede reabrir el reclamo. No cambia el estado de un pedido ni lo cancela, y no entra a la carta, el stock, los parámetros, los clientes, los administradores ni los reportes de productos.

El inicio del super admin muestra el día: cuántos pedidos entraron, cuánto se facturó, los pedidos por estado y las ventas de los últimos siete días.

El super admin gestiona categorías, productos (con la foto y los adicionales que cada uno ofrece), sucursales, stock por sucursal, clientes, otros administradores, parámetros, promociones de la carta y dos campañas (sellos y Top 3). Ve los pedidos, cambia el estado, atiende reclamos y consulta reportes con filtro de fecha y sucursal, gráficos y descarga CSV.

## Pedido, sucursal, horario y stock

El cliente elige retiro o domicilio y después la sucursal que prepara el pedido. La distancia no elige por él: ordena la lista y, en domicilio, define el costo de envío de la sucursal que marcó.

- En domicilio se listan las sucursales activas que llegan a la dirección, dentro del rango de delivery. Ese rango es el radio de cobertura: lo configura el administrador (5 km si nadie lo cambió). Dentro de esa lista puede elegir una más lejana. Si ninguna llega, no se puede confirmar.
- En retiro se listan todas las activas. No hace falta dirección y no hay costo de envío.
- En los dos casos van primero las que tienen stock de todo el carrito. El resto aparece debajo, con lo que falta. Confirmar una que no alcanza no crea el pedido.

El horario de la sucursal son días y franjas, hasta dos por día. Se lee en la sucursal, en el checkout y en contacto. Si el pedido cae fuera de la franja abierta, el checkout ofrece dejarlo programado para la próxima apertura de esa sucursal. Si acepta, el pedido queda para esa hora, la estimada se cuenta desde la apertura y el stock se reserva igual. Si no acepta, el pedido no se crea. Si una sucursal no tiene franjas, se toma como abierta y se muestra el texto de respaldo, por ejemplo «Lun-Dom 10:00-23:00».

Al confirmar se reserva el stock de esa sucursal. Si se cancela, la reserva vuelve a estar disponible. Si se entrega o se retira, la reserva se descuenta y no vuelve. El administrador puede devolver el reservado a disponible. Un carrito de invitado armado antes de esa liberación queda inhabilitado: hay que vaciarlo y armarlo de nuevo.

En la pantalla de Stock, el producto con disponible 0 sube al tope de la lista y se muestra en rojo. El reporte de productos sin stock los lista aparte. No hay un mail ni un número de stock mínimo distinto de cero.

El importe es `total = subtotal − descuento + envío`. El descuento de la carta o de una campaña es uno solo, el que más descuenta. El cupón de un reclamo se suma a ese importe, sin pasar el subtotal. El envío es un precio por kilómetro, redondeando cada cuadra de 100 m iniciada, y puede ser gratis desde un monto. En retiro el envío es 0. El descuento y el envío quedan congelados en el pedido.

## Promociones, campañas y cupón

Las promociones de la carta son de dos tipos: un porcentaje sobre el pedido (con o sin monto mínimo) o un 2x1 de un producto. No se suman entre sí. No hay descuento de monto fijo en la carta, ni un cupón que se tipee en el menú, ni combos.

La fidelización suma un sello por pedido que llega a un mínimo, al crearlo. Si se cancela, se revierte. Al llegar a 10 sellos, ese pedido lleva un descuento sorpresa: el cliente ve el premio y el importe, no el porcentaje. El top de clientes premia a los tres que más gastaron desde que se inició la campaña, con un descuento de un solo uso. El porcentaje de los dos premios lo edita el administrador y no se publica. La carta y las dos campañas compiten. Gana un solo descuento.

Al resolver un reclamo, el super admin o el rol solo pedidos escribe una respuesta y puede cargar un importe. El código del cupón es `REC-` y seis caracteres. El monto va de $1 a $500.000, y en el detalle se puede copiar el total cobrado del pedido. El cliente recibe un cupón de un solo uso, válido 3 meses. En el próximo pedido se suma al descuento que ya ganó, sin dejar el total de productos en negativo. Si el cupón todavía no se usó, la solución se puede cambiar y el cliente vuelve a ver «Nueva respuesta». Si se reabre el reclamo, el cupón deja de descontarse hasta que se resuelve de nuevo. Si ya se usó, queda fija.

## Estados

Domicilio: Pendiente, Confirmado, En preparación, Listo para entregar, En camino, Entregado. Retiro: el mismo recorrido, pero de «Listo para retirar» pasa a «Retirado» y no usa «En camino». Cancelado corta el recorrido. El cliente cancela en Pendiente o Confirmado. Desde En preparación ya no.

Cada cambio queda en un historial con fecha y quién lo hizo. El cliente y el administrador ven el mismo estado. Si hay tiempo real configurado, la pantalla del cliente se actualiza sola.

## Pantallas del cliente

| Ruta | Qué hace |
|---|---|
| `/login`, `/register` | Iniciar sesión y crear la cuenta |
| `/forgot-password`, `/reset-password` | Pedir el token y elegir la contraseña nueva |
| `/products`, `/products/:id` | Catálogo y detalle, con los adicionales de ese producto |
| `/promociones` | Promociones vigentes de la carta. El porcentaje de los premios no se publica |
| `/terminos`, `/nosotros`, `/contacto` | Textos del local. Contacto muestra las sucursales |
| `/cart` | Líneas, cantidades, nota y total del carrito |
| `/checkout` | Retiro o domicilio, sucursal, horario, promo, envío y pago simulado |
| `/branches` | Sucursales activas y el mapa con un marcador por local |
| `/account` | Nombre, contraseña y baja de la cuenta |
| `/account/addresses` | Direcciones con calle, ciudad, provincia, código postal, alias y pin |
| `/orders`, `/orders/:id` | Historial, repetir, seguimiento, cancelar y la respuesta del reclamo |
| `/claims` | Reclamos del cliente. Abierto: todavía no hay cupón, o el cupón no se usó. Cerrado: el cupón ya se usó |

## Pantallas de administración

| Ruta | Qué hace |
|---|---|
| `/admin/login` | Entrada del administrador |
| `/admin` | Tablero del día. Quien solo ve pedidos ve ese tablero, y no los paneles de carta ni de reportes de productos |
| `/admin/orders`, `/admin/orders/:id` | Pedidos, estado y cancelación. El rol solo pedidos no cambia el estado |
| `/admin/categories`, `/admin/products` | Carta, foto y adicionales de cada producto |
| `/admin/branches` | Sucursales, mapa y hasta dos franjas por día |
| `/admin/stock` | Disponible y reservado. El disponible 0 queda arriba y en rojo |
| `/admin/customers` | Alta, edición y baja lógica de clientes |
| `/admin/admins` | Alta, edición, rol y baja. El administrador inicial no se borra |
| `/admin/parameters` | Radio, tiempos, precio por km, envío gratis, sellos y Top 3 |
| `/admin/promotions` | Porcentaje y 2x1 |
| `/admin/campaigns` | Fidelización y top de clientes |
| `/admin/reports` | Filtro, gráficos y CSV |
| `/admin/incidents` | Reclamos. Super admin y solo pedidos escriben la respuesta, cargan el cupón o copian el total cobrado. El listado se filtra por estado |
| `/admin/incident-coupons` | Cupones de reclamo. Los ven los dos roles |

## Qué no entra

| Tema | Por qué queda afuera |
|---|---|
| Combos | Mueven a la vez el carrito, el stock, la promo y los reportes |
| Descuento de monto fijo en la carta, o un cupón que se tipea en el menú | La carta es porcentaje o 2x1. El único cupón es el del reclamo |
| Recorrido del pedido sobre el mapa | El pin y el mapa de sucursales alcanzan para confirmar una ubicación |
| Pasarela de pago | El medio simulado alcanza para cerrar el pedido |
| Aplicación de repartidores, calificaciones y avisos por correo del pedido | No entran en este producto |
| Correo obligatorio para la contraseña | Sin servidor de correo, el token en pantalla sigue siendo el flujo válido |
| Clientes nuevos del período y clientes inactivos | El reporte de clientes que sí está es el top de quienes más pidieron |
| Mail de stock mínimo | El sin stock se ve en la pantalla de Stock y en el reporte |

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.5 | 12/11/2026 | El cupón es `REC-` y seis caracteres, de $1 a $500.000. Cambiar la solución avisa de nuevo. Reabierto, el cupón no se descuenta |
| 2.4 | 12/11/2026 | El reclamo pide respuesta, avisa «Nueva respuesta» y se puede reabrir si el cupón no se usó. El rol solo pedidos también resuelve y carga el importe |
| 2.3 | 12/11/2026 | Se quita la frase de que no hay una tercera aplicación para repartidores |
| 2.2 | 11/11/2026 | El texto queda igual a la sección de `Carpeta.md` de la entrega del 12/11 |
| 1.4 | 12/10/2026 | Feedback del profesor: el cliente elige sucursal, mapa de pin, mail opcional. La promo con condición queda en el Sprint 5 |
| 1.3 | 07/10/2026 | Política de promociones del Sprint 4 (una por pedido, aplicada al confirmar) |
| 1.2 | 07/10/2026 | Estado al cierre del Sprint 3: páginas hechas, 35/40 RF base y stock de Extensión 1 |
| 1.1 | 03/10/2026 | Asignación con radio de cobertura, sucursales disponibles, política de stock y decisiones del Sprint 3; visión de sprints según lo cubierto |
| 1.0 | 07/09/2026 | Versión inicial en la carpeta |
