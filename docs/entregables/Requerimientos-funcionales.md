# Requerimientos funcionales

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.4
**Actualizado:** 12/11/2026
**Fuente:** sección homónima de `Carpeta.md`

«El sistema deberá» describe lo que Mordi hace. El identificador es el de la carpeta desde el inicio del cuatrimestre: no se reutiliza ni se cambia de significado. Stock, promociones y reportes de operación forman parte del producto, no de una lista aparte para más adelante.

## Cómo se lee

| Campo | Significado |
|---|---|
| ID | Identificador estable |
| El sistema deberá | La capacidad, con la regla que usa el producto hoy |
| Actor | Quién la dispara |

## Cuenta del cliente

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-CLI-01 | Registrar un cliente con nombre, correo y contraseña. | Visitante |
| RF-CLI-02 | Iniciar sesión y mantenerla hasta que cierre o el token venza. | Cliente |
| RF-CLI-03 | Recuperar la contraseña con un token de 30 minutos y un solo uso. Sin correo configurado, la pantalla muestra el token. Un email inexistente recibe la misma respuesta. | Cliente |
| RF-CLI-04 | Dejar que el cliente edite su nombre y su contraseña. El correo no se cambia. | Cliente |
| RF-CLI-05 | Guardar direcciones con calle, ciudad, provincia, código postal, alias y ubicación. Buscar hasta cinco candidatos y confirmar el punto en el mapa. | Cliente |
| RF-CLI-06 | Consultar los pedidos anteriores, con detalle, importe, fecha y estado. | Cliente |
| RF-CLI-07 | Confirmar un pedido nuevo, con cuenta o como invitado. El invitado deja nombre, correo y, si es envío, una dirección. | Cliente o visitante |
| RF-CLI-08 | Dar de baja la cuenta con la contraseña, anonimizar los datos personales y conservar los pedidos. Rechazar la baja si hay un pedido en curso. | Cliente |
| RF-CLI-09 | Reportar un problema de un pedido entregado o retirado, uno por pedido y solo el dueño. Si el motivo es otro, el mensaje es obligatorio. El mensaje puede tener hasta 500 caracteres. Leer la respuesta en el pedido. Hasta abrirla, figura «Nueva respuesta». Si cambian la solución, vuelve a figurar. En reclamos, abierto es sin cupón o con cupón sin usar; cerrado es el cupón ya usado. | Cliente |

## Administradores

Hay un solo alta de administradores. Listar, crear, editar y borrar son la misma función: RF-ADM-03 la nombra y RF-ADM-07 es ese mismo ABM, no un segundo alta.

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-ADM-01 | Nacer con un administrador precargado, capaz de entrar a la aplicación administrativa. Ese usuario no se borra. | Sistema |
| RF-ADM-02 | Autenticar administradores y separar super admin de solo pedidos. Quien solo ve pedidos consulta pedidos, reclamos y cupones, escribe la respuesta, resuelve el reclamo y puede cargar el cupón. No cambia el estado ni cancela. | Administrador |
| RF-ADM-03 | Listar, crear, editar y borrar administradores, y asignarles el rol. | Super admin |
| RF-ADM-04 | Ofrecer la administración como otra aplicación (`backend/admin`), con la misma base que la del cliente. | Administrador |
| RF-ADM-05 | Dar de alta, editar y desactivar promociones de la carta: porcentaje, con mínimo opcional, o 2x1 de un producto. | Super admin |
| RF-ADM-06 | Consultar y cargar el stock disponible de cada producto en cada sucursal. Si el disponible es 0, esa fila va arriba y en rojo. | Super admin |
| RF-ADM-07 | El mismo ABM de RF-ADM-03: listar, editar y borrar. No es otra pantalla de alta. | Super admin |
| RF-ADM-08 | Mostrar los estados del pedido y su etiqueta. La máquina no se edita desde parámetros. | Super admin |
| RF-ADM-09 | Editar radio, tiempos de la hora estimada, precio por kilómetro, mínimo de envío gratis, meta y premio de sellos, y premio del Top 3. Un pedido ya confirmado no se recalcula. | Super admin |
| RF-ADM-10 | Listar pedidos, buscar por código o cliente, y avanzar el estado según la máquina. Solo el super admin cambia el estado o cancela. | Administrador |
| RF-ADM-11 | Listar clientes, buscarlos, ver el detalle y darlos de alta, de baja lógica o editarlos. Un cliente deshabilitado no inicia sesión. Sus pedidos quedan. | Super admin |
| RF-ADM-12 | Ver reclamos abiertos primero, con filtro por estado. Al resolver, escribir la respuesta (hasta 500 caracteres) y, si corresponde, cargar el importe del cupón o copiar el total cobrado. Si se cambia la respuesta o el monto, el cliente vuelve a ver «Nueva respuesta». Si el cupón no se usó, reabrir y cambiar la solución: mientras está abierto, el cupón no se descuenta. Si ya se usó, dejarla fija. | Super admin o solo pedidos |

## Sucursales

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-BRN-01 | Gestionar sucursales con nombre, dirección, mapa, teléfono, hasta dos franjas por día y activa o inactiva. | Super admin |
| RF-BRN-02 | Dejar que el cliente elija la sucursal que prepara el pedido. La distancia ordena la lista y cotiza el envío. No asigna sola. | Cliente |
| RF-BRN-03 | Ofrecer en el checkout las sucursales de retiro (todas las activas) o de domicilio (las activas dentro del radio). Primero las que tienen stock de todo el carrito. Si en domicilio ninguna llega, no se puede confirmar. | Cliente |
| RF-SUC-04 | Mostrar el horario. Si el pedido cae fuera de la franja, ofrecer programarlo para la próxima apertura. Sin franjas, tomar el local como abierto. | Cliente |

## Catálogo y carrito

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-CAT-01 | Dar de alta, editar y consultar productos, con nombre, descripción, categoría, precio, imagen y disponible sí o no. | Super admin |
| RF-CAT-02 | Dar de alta, editar y consultar categorías. No se borra una categoría que todavía tiene productos. | Super admin |
| RF-CAT-03 | Mostrar al cliente solo los productos disponibles, organizados por categoría. | Cliente |
| RF-CAT-04 | Ofrecer, en el detalle, solo los adicionales que el administrador marcó para ese producto. El aderezo de precio 0 también es un adicional. | Cliente |
| RF-CRT-01 | Agregar productos al carrito, con cantidad, nota y adicionales. | Cliente |
| RF-CRT-02 | Conservar el carrito al recargar. Con cuenta, en el servidor. Sin cuenta, en el navegador. La misma hamburguesa con otros adicionales es otra línea. | Cliente |
| RF-CRT-03 | Calcular el importe del carrito como suma de `(precio + adicionales) × cantidad`. El importe a pagar, con la promoción y el envío, se calcula al preparar el pedido (RF-PRM-02). | Sistema |
| RF-CRT-04 | Cambiar la cantidad, la nota y quitar líneas antes de confirmar. | Cliente |
| RF-CRT-05 | Al confirmar, si hay hamburguesas o guarniciones y no hay aderezos, preguntar si se suman y proponer la mitad del máximo de cada uno. El máximo solo se alcanza si el cliente lo aumenta. | Cliente |

## Pedido, seguimiento e historial

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-ORD-01 | Al confirmar, registrar sucursal elegida, dirección si es domicilio, fecha, detalle, subtotal, descuento, envío, total y estado Pendiente. | Cliente |
| RF-ORD-02 | Recorrer Pendiente, Confirmado, En preparación, Listo, En camino y Entregado. En retiro, Listo para retirar pasa a Retirado y no usa En camino. | Sistema |
| RF-ORD-03 | Registrar cada cambio de estado con fecha y quién lo hizo. El cliente y el administrador ven el mismo estado. | Administrador |
| RF-ORD-04 | Dejar cancelar en Pendiente o Confirmado, al cliente o al administrador, y devolver el stock reservado. Desde En preparación, no. | Cliente o administrador |
| RF-ORD-05 | Asignar un código de tres letras de la sucursal y seis dígitos, y una hora estimada que no se recalcula. | Sistema |
| RF-ORD-06 | Dejar elegir un medio de pago simulado, sin guardarlo ni cobrarlo. | Cliente |
| RF-TRK-01 | Mostrar la evolución del pedido después de confirmarlo. | Cliente |
| RF-TRK-02 | Mostrar sucursal, estado, historial, hora estimada y la demora si ya se pasó. | Cliente |
| RF-TRK-03 | Calcular la hora estimada una vez, con preparación base, minutos por ítem y traslado. Si el pedido queda programado, la cuenta empieza en la apertura. | Sistema |
| RF-HIS-01 | Listar los pedidos del cliente, del más reciente al más viejo. | Cliente |
| RF-HIS-02 | Repetir un pedido anterior sumando las cantidades a lo que el carrito ya tenía. No se copian la promoción ni la sucursal. Si un producto ya no se vende, se avisa y se omite. | Cliente |

## Ubicación

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-GEO-01 | Guardar, además del texto, la latitud y la longitud de cada dirección. | Cliente |
| RF-GEO-02 | Usar esa ubicación para ordenar sucursales, filtrar el radio y cotizar el envío de la sucursal elegida. | Sistema |
| RF-GEO-03 | Mostrar un mapa con el recorrido del pedido. No entra: el producto muestra un pin para confirmar una dirección o una sucursal, y un mapa con las sucursales activas. | — |

## Stock

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-STK-01 | Registrar el stock entero de cada producto en cada sucursal. Sin fila, cuenta como 0. | Super admin |
| RF-STK-02 | Al confirmar, verificar que alcance en la sucursal elegida. Si falta, no crear el pedido y nombrar el producto, lo pedido y lo disponible. | Sistema |
| RF-STK-03 | Permitir que un producto tenga stock en una sucursal y cero en otra. | Super admin |
| RF-STK-04 | Reservar al confirmar, liberar al cancelar y descontar al entregar o retirar. El 2x1 reserva también la unidad gratis. El administrador puede devolver el reservado a disponible. | Sistema |
| RF-STK-05 | Mostrar el disponible 0 arriba y en rojo en Stock, y listarlo en el reporte de productos sin stock. No hay mail ni un mínimo distinto de cero. | Super admin |

## Promociones, campañas, cupón y envío

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-PRM-01 | Administrar promociones porcentuales y 2x1, con vigencia. | Super admin |
| RF-PRM-02 | Aplicar al pedido la promoción o el premio de campaña que más descuenta, y mostrar cuáles otras habrían aplicado. El descuento no supera el subtotal y queda congelado. El cupón de reclamo se suma a ese descuento. | Sistema |
| RF-CAM-01 | Sumar un sello por pedido que llega al mínimo, al crearlo. Al llegar a 10, aplicar el descuento sorpresa en ese pedido y revertir el sello si se cancela. El porcentaje no se publica. | Sistema |
| RF-CAM-02 | Al cerrar el Top 3, otorgar un descuento de un solo uso a los tres que más gastaron. Compite igual que los sellos. | Super admin |
| RF-CUP-01 | Al resolver un reclamo, poder cargar un importe de $1 a $500.000. Lo hacen el super admin y el rol solo pedidos. El código es `REC-` y seis caracteres. El cupón vale 3 meses, es de un solo uso y se suma al descuento ya ganado, sin dejar el total de productos en negativo. Con el reclamo abierto, no se descuenta. | Super admin o solo pedidos |
| RF-ENV-01 | Cobrar el envío con el precio por kilómetro y el mínimo de envío gratis. En retiro el envío es 0. El importe queda congelado. | Sistema |

## Reportes

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-RPT-01 | Informar los productos más vendidos. | Super admin |
| RF-RPT-02 | Informar los productos menos vendidos. | Super admin |
| RF-RPT-03 | Informar los productos sin stock. Respeta la sucursal y no las fechas. | Super admin |
| RF-RPT-04 | Informar los productos de mayor facturación. | Super admin |
| RF-RPT-10 | Informar pedidos por día. Las fechas son días de Argentina. | Super admin |
| RF-RPT-11 | Informar pedidos por sucursal. | Super admin |
| RF-RPT-12 | Informar pedidos por estado. | Super admin |
| RF-RPT-13 | Informar el tiempo promedio hasta la entrega. | Super admin |
| RF-RPT-14 | Informar los cancelados. Un cancelado no suma en las ventas. Un pendiente sí. | Super admin |
| RF-RPT-15 | Informar los clientes con más pedidos, hasta diez. | Super admin |
| RF-RPT-16 | Informar clientes nuevos por período. No entra en este producto. | — |
| RF-RPT-17 | Informar clientes inactivos. No entra en este producto. | — |
| RF-RPT-18 | Informar ventas por sucursal. | Super admin |
| RF-RPT-19 | Informar productos vendidos por sucursal. | Super admin |
| RF-RPT-20 | Informar la cantidad de pedidos atendidos por sucursal. | Super admin |
| RF-RPT-21 | Informar las promociones más usadas. | Super admin |
| RF-RPT-22 | Informar el descuento acumulado de cada promoción, como impacto en las ventas. | Super admin |
| RF-RPT-23 | Filtrar los reportes por fecha y por sucursal, mostrarlos en gráficos y descargarlos en CSV. | Super admin |
| RF-RPT-24 | Mostrar en el inicio los pedidos de hoy, la facturación de hoy, los pedidos por estado y las ventas de los últimos siete días. El rol solo pedidos ve ese tablero. Los reportes de productos quedan para el super admin. | Super admin |

## Lo que el enunciado nombra y este producto no hace

Calificar un pedido, avisar por correo cada cambio de estado, y la aplicación de repartidores (asignar, ver pendientes, iniciar un viaje y marcar la entrega) no forman parte de Mordi.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.4 | 12/11/2026 | El cupón tiene código `REC-`, importe de $1 a $500.000, y no se descuenta mientras el reclamo está abierto |
| 2.3 | 12/11/2026 | RF-CLI-09 para el reclamo del cliente. RF-ADM-12 y RF-CUP-01 también los cumple el rol solo pedidos |
| 2.2 | 11/11/2026 | El texto queda igual a la sección de `Carpeta.md` de la entrega del 12/11 |
| 1.2 | 07/10/2026 | Estado al cierre del Sprint 3 (35/40 obligatorios y stock). Cerrada la consulta de RF-ADM-05: las promociones se aplican al confirmar en el Sprint 4 |
| 1.1 | 03/10/2026 | Asignación a sprints según lo cubierto en S2 y S3; cerradas las consultas de RF-ADM-06, RF-ADM-08/09 y RF-CLI-03 |
| 1.0 | 07/09/2026 | Versión inicial en la carpeta |
