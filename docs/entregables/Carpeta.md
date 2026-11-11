# Carpeta — Mordi

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.2
**Actualizado:** 11/11/2026
**Entrega de esta carpeta:** 12/11/2026
**Review:** 19/11/2026 · **Presentación final:** 27/11/2026

# Alcance funcional

Mordi es la plataforma con la que una casa de comidas rápidas toma un pedido, lo cobra con promoción y envío, y lo sigue hasta que se entrega o se retira. Este documento dice qué hace el producto que se entrega. Se puede leer solo. Los precios de los ejemplos de la carpeta son los del catálogo de demostración: hamburguesa doble $20.000, gaseosa cola $2.000, papas fritas $3.000, cheddar $2.000.

Hay dos aplicaciones y una base PostgreSQL. La API es la misma para las dos.

| Aplicación | Quién entra | Dónde está |
|---|---|---|
| Cliente | Cualquier persona, con cuenta o como invitado | `frontend` |
| Administración | Super admin, o un administrador que solo ve pedidos | `backend/admin`, se abre en `/admin` |

La administrativa no es una pantalla del servidor. Es otra aplicación React, separada de la API. No hay una tercera aplicación para repartidores.

## Qué hace el cliente

Cualquier persona ve el catálogo, el detalle de un producto y sus adicionales, las sucursales en un mapa, las promociones vigentes, términos, nosotros y contacto. El carrito de quien tiene cuenta vive en el servidor. El de quien no inició sesión vive en el navegador. En los dos casos sigue ahí si se recarga la página.

Con cuenta se puede registrar, iniciar sesión, recuperar la contraseña, editar el perfil, guardar direcciones y dar de baja la cuenta. Sin cuenta se puede confirmar igual, como invitado, dejando nombre, correo y, si es envío, una dirección. El invitado no suma sellos ni entra al Top 3.

Al pasar a confirmar, si hay hamburguesas o guarniciones y todavía no hay aderezos, se pregunta si se suman. El valor inicial es la mitad del máximo.

El pedido se retira en el local o se envía a domicilio. La persona elige la sucursal. Después ve el código (tres letras de la sucursal y seis dígitos, por ejemplo `MOR482913`), el estado, la hora estimada y el historial. Con cuenta puede repetir un pedido anterior y, si ya se entregó o se retiró, reportar un problema.

En el checkout se elige un medio de pago simulado: efectivo, tarjeta o transferencia. La transferencia muestra datos de demostración. No se cobra y el medio no se guarda en el pedido.

## Qué hace el administrador

Hay dos roles. **Super admin** opera todo el local. **Solo pedidos** ve el inicio (pedidos de hoy, facturación de hoy, estados y ventas de la semana), el listado de pedidos, los reclamos y los cupones de reclamo. Puede resolver un reclamo. No cambia el estado de un pedido ni lo cancela, y no entra a la carta, el stock, los parámetros, los clientes, los administradores ni los reportes de productos.

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

Al resolver un reclamo, el administrador puede cargar un importe. El cliente recibe un cupón de un solo uso, válido 3 meses. En el próximo pedido se suma al descuento que ya ganó, sin dejar el total de productos en negativo.

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
| `/orders`, `/orders/:id` | Historial, repetir, seguimiento y cancelar |
| `/claims` | Reclamos de pedidos ya entregados o retirados |

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
| `/admin/incidents` | Reclamos. Al resolver se puede cargar el cupón |
| `/admin/incident-coupons` | Cupones de reclamo |

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

# Supuestos y decisiones de negocio


Cada decisión es la regla que usa el sistema hoy.

| # | Decisión | Regla |
|---|---|---|
| D1 | Moneda y horario | Precios en pesos. Las fechas de los reportes usan el día de Argentina. |
| D2 | Dos aplicaciones | Cliente y administración, una base. El front administrativo está en `backend/admin`. |
| D3 | Invitado | Puede confirmar sin cuenta. El pedido guarda nombre y correo. No suma sellos ni entra al Top 3. |
| D4 | Carrito | Con cuenta, en el servidor. Sin cuenta, en el navegador. Recargar no lo vacía. La misma hamburguesa con otros adicionales es otra línea. |
| D5 | Adicionales | Un adicional es un producto de la categoría Adicional. Cada producto ofrece solo los que el administrador marcó. El aderezo de precio 0 también es un adicional. |
| D6 | Direcciones | Calle, ciudad, provincia y código postal. Un alias («Casa», «Trabajo»). El pin del mapa es la ubicación que se guarda. La búsqueda propone hasta cinco candidatos en Argentina. |
| D7 | Elección de sucursal | La sucursal que prepara el pedido la elige el cliente, no la asigna la distancia. En domicilio elige entre las activas que caen en el rango (D7b), aunque haya otra más cerca. En retiro elige entre todas las activas. La distancia se muestra, ordena la lista y calcula el envío de la sucursal marcada. Primero aparecen las que tienen stock de todo el carrito. |
| D7b | Rango de delivery | El administrador configura el radio de cobertura, en kilómetros, desde Parámetros. El valor inicial es 5 km; puede ir de 0,1 a 100. Una sucursal activa entra en la lista de domicilio solo si la distancia a la dirección es menor o igual a ese radio. Cambiarlo no mueve un pedido ya confirmado. El retiro no usa el radio. |
| D8 | Sin cobertura | Si en domicilio ninguna sucursal activa cae dentro del rango, el botón de confirmar queda deshabilitado y no se crea el pedido. |
| D9 | Sin stock | Se puede elegir una sucursal que no alcanza, pero confirmar responde error y no crea el pedido. El mensaje nombra el producto, lo pedido y lo disponible. |
| D10 | Horario | El administrador carga, por día, hasta dos franjas (horario corrido o partido). Si el cliente pide fuera de la franja abierta, puede dejar el pedido programado para la próxima apertura de esa sucursal. La hora estimada se calcula desde esa apertura. Si no lo programa, el pedido no se crea: la respuesta pide confirmación. El stock se reserva al confirmar el programado (D11). Sin franjas cargadas, el local se toma como abierto y se muestra el texto de respaldo. |
| D11 | Stock | Entero por sucursal y producto. Sin fila, cuenta como 0. Reservar al confirmar, liberar al cancelar, descontar al entregar o retirar. El administrador puede devolver el reservado a disponible. Un carrito de invitado armado antes de esa liberación queda inhabilitado: hay que vaciarlo y armarlo de nuevo. El 2x1 reserva también la unidad gratis. |
| D12 | Una promoción | Porcentual o 2x1, o el premio de una campaña. Gana la de mayor descuento. Empate: la creada más tarde. El descuento no supera el subtotal y queda congelado en el pedido. El cupón de reclamo no entra en esta elección: se suma (D26). |
| D13 | Sellos | Cada pedido que llega al mínimo suma un sello al crearlo. Al llegar a 10, ese pedido lleva un descuento sorpresa: el porcentaje lo configura el administrador y no se publica. El cliente ve el premio y el importe, no el número. Si cancela, el sello se revierte. El premio compite con las promociones de la carta y gana solo si descuenta más. |
| D13b | Top 3 | Al cerrar la campaña, los tres clientes que más gastaron reciben un descuento de un solo uso. El porcentaje tampoco se publica. Compite igual que los sellos: gana el que más descuenta. |
| D14 | Costo de delivery | El administrador configura dos números en Parámetros. El precio por kilómetro (inicial $0; $0 no cobra envío) y el mínimo de envío gratis (inicial $0, que deja la bonificación apagada). El envío es precio por km × distancia, por cuadra de 100 m iniciada. Si el subtotal ya descontado llega al mínimo, el envío es 0. En retiro es 0. El importe queda congelado en el pedido: cambiar el precio después no lo recalcula. |
| D15 | Hora estimada | Se calcula una vez al confirmar (preparación base + minutos por ítem + traslado). En retiro la distancia es 0. No se recalcula si cambian los parámetros. |
| D16 | Código | Tres letras del nombre de la sucursal + seis dígitos. «Mordi Centro» empieza con `MOR`. |
| D17 | Pago | Simulado. No se guarda en el pedido y no hay pasarela. |
| D18 | Baja de cuenta | Pide la contraseña. Si hay un pedido en curso, no deja. Los datos personales se anonimizan; los pedidos quedan. |
| D19 | Clientes en el admin | Alta, edición y baja lógica. Deshabilitado no inicia sesión. Sus pedidos quedan. |
| D20 | Administradores | Un solo alta: listar, crear, editar y borrar. El administrador inicial no se borra. El rol es super admin o solo pedidos. |
| D21 | Reportes | Filtro por fecha y sucursal. Un cancelado no suma en las ventas. Un pendiente sí. «Sin stock» respeta la sucursal y no las fechas. |
| D22 | Reclamo | Uno por pedido, solo si está entregado o retirado, y solo el dueño. Motivos: faltó algo, pedido equivocado, llegó tarde, llegó frío, otro. |
| D23 | Contraseña | Token de 30 minutos, un solo uso. Sin correo configurado, la pantalla muestra el token. Un email inexistente recibe la misma respuesta genérica. |
| D24 | Sin stock | En la pantalla de Stock, el producto con disponible 0 sube al tope de la lista y se muestra en rojo, con el borde marcado. El reporte de productos sin stock los lista aparte. No hay un mail ni un número de «stock mínimo» distinto de cero. |
| D25 | Aderezos | Al confirmar, si el carrito tiene hamburguesas o guarniciones y ningún aderezo, se pregunta «¿Sumamos aderezos?». El tope de cada uno es 2 por hamburguesa y 2 por guarnición. El valor que aparece es la mitad de ese tope, redondeada para abajo, para economizar condimentos. Llegar al máximo exige que el cliente pulse «más», a conciencia. Puede seguir sin aderezos. Mayonesa, mostaza y ketchup salen $0. No se venden sueltos: van con la comida. |
| D26 | Cupón de reclamo | Al resolver un reclamo, el administrador puede cargar un importe. El cliente recibe un cupón, válido 3 meses, de un solo uso. En el próximo pedido se suma al descuento que ya ganó la promo o la campaña, sin dejar el total de productos en negativo. Si tiene varios, se usa el que vence antes, salvo que elija otro. Un cupón por pedido. |

## 2.1 Cómo se elige la promoción

El administrador tiene cargadas, todas vigentes:

- **Martes 20:** 20% sobre el pedido, sin mínimo.
- **2x1 Gaseosa Cola:** cada dos gaseosas cola, una sale gratis. El precio de la unidad es $2.000. Los adicionales de esas unidades, si los hubiera, se cobran igual.
- **15% desde $30.000:** 15% solo si el subtotal llega a $30.000.

El descuento del 2x1 es `parte entera de (cantidad / 2) × precio del producto`. Con una sola unidad, el descuento es 0 y esa promo no compite.

**Pedido A.** Una hamburguesa doble y una gaseosa cola. Subtotal $22.000.

| Promoción | Descuento | ¿Compite? |
|---|---:|---|
| Martes 20 | $4.400 | Sí |
| 2x1 Gaseosa Cola | $0 | No: hace falta una segunda gaseosa |
| 15% desde $30.000 | $0 | No: el subtotal no llega |

Se aplica Martes 20. El pedido queda en $17.600 de productos, más el envío si es a domicilio.

**Pedido B.** Dos hamburguesas dobles y dos gaseosas cola. Subtotal $44.000.

| Promoción | Descuento |
|---|---:|
| Martes 20 | $8.800 |
| 2x1 Gaseosa Cola | $2.000 |
| 15% desde $30.000 | $6.600 |

Se aplica Martes 20, que es la que más descuenta. En el carrito y en el checkout se ven las tres, y queda marcada solo Martes 20. Productos: $35.200.

**Pedido C.** Tres gaseosas cola, sin otra cosa. Subtotal $6.000.

| Promoción | Descuento |
|---|---:|
| Martes 20 | $1.200 |
| 2x1 Gaseosa Cola | $2.000 (una unidad gratis; la tercera no alcanza para otra) |
| 15% desde $30.000 | no compite |

Se aplica el 2x1. Paga $4.000. Las dos promos que descuentan se muestran; gana la de $2.000.

**Sellos.** La meta es 10. Cada pedido de al menos $15.000 suma un sello en el momento de crearlo. El pedido que pone el décimo sello lleva un descuento sorpresa. En este ejemplo el administrador dejó el premio en 30%, y ese 30% no está en la tarjeta ni en la página de promociones.

**Pedido D, con sellos.** La clienta tiene 9 sellos y pide una hamburguesa doble ($20.000). Este pedido completa los 10, así que entra **Premio Fidelidad**: 30% de $20.000 = $6.000. Martes 20 descuenta $4.000. Gana el premio y el total de productos es $14.000. En el pedido se lee Premio Fidelidad y $6.000 de descuento, no «30%». Si además tuviera el premio Top 3 al 15% ($3.000), seguiría ganando el de los sellos, porque $6.000 es mayor. Si después cancela, vuelve a 9 sellos y el premio de ese pedido no queda.

Si dos descuentos empatan, queda el de la promoción creada más tarde. Un premio de campaña solo gana si descuenta más que esa promoción.

**Cupón de reclamo.** Sobre el pedido B, ya con Martes 20, los productos quedan en $35.200. El cliente tiene un cupón de $5.000 por un reclamo resuelto. Ese cupón no compite: se suma. El descuento total es $8.800 + $5.000 = $13.800 y los productos quedan en $21.400. Si el cupón fuera de $40.000, solo se usarían $35.200, que es lo que queda después de la promo. Si tiene dos cupones, entra el que vence antes. Al cancelar el pedido, el cupón vuelve a estar disponible.

## 2.2 Rango y costo de delivery, con números

Los dos se editan en Parámetros. En este ejemplo el administrador dejó el radio en 5 km, el kilómetro a $1.000 y el envío gratis desde $25.000 (sobre el subtotal ya descontado).

La dirección del cliente queda a 2,34 km de Mordi Centro, a 4,1 km de Mordi Oeste y a 6,2 km de Mordi Sur.

| Radio configurado | Sucursales que puede elegir en domicilio |
|---|---|
| 5 km | Centro y Oeste. Sur no entra. |
| 3 km | Solo Centro. |
| 8 km | Centro, Oeste y Sur. |

Si baja el radio a 3 km y la persona ya estaba por elegir Oeste, esa sucursal desaparece de la lista. Un pedido que ya se confirmó en Oeste sigue en Oeste.

Con el radio en 5 km puede elegir Centro (2,34 km) u Oeste (4,1 km). El sistema no se queda con Centro por ser la más cercana. Si marca Oeste, el envío se calcula con los 4,1 km de Oeste: 4,1 km son 4,1 km ya cerrados en cuadras, `4,1 × 1.000 = $4.100`. Sur, a 6,2 km, no entra en la lista.

El costo usa la sucursal elegida. Centro está a 2,34 km. La distancia se lleva a una cuadra de 100 m iniciada: 2,34 km son 2,4 km. Con el kilómetro a $1.000, el envío es `2,4 × 1.000 = $2.400`. Si el administrador pasa el kilómetro a $500, el mismo tramo pasa a $1.200. Si lo deja en $0, el envío no se cobra.

Sobre el pedido A ($17.600 después del 20%) faltan $7.400 para el envío gratis. Se cobran $2.400. El total es $20.000.

Sobre el pedido B ($35.200 después del 20%) el mínimo ya se pasó. El envío es $0 y el checkout dice «Envío gratis». El total es $35.200.

En retiro los dos pedidos tienen envío $0, aunque no lleguen a $25.000.

Si el mínimo está en 0, la regla de envío gratis está apagada y siempre se cobra la distancia. El valor inicial del sistema es $0 por kilómetro y mínimo 0: hasta que el administrador cargue un precio, el envío no suma.

## 2.3 Stock y sucursal, con números

El carrito pide dos hamburguesas dobles. El radio es 5 km. Las dos sucursales llegan a la dirección.

| Sucursal | Disponible | ¿Puede armar el pedido? | Lugar en la lista |
|---|---:|---|---|
| Mordi Centro | 5 | Sí | Primera |
| Mordi Norte | 1 | No: pide 2 y hay 1 | Segunda, con el faltante |

Confirmar Mordi Norte no crea el pedido. El stock no se toca. Confirmar Mordi Centro crea el pedido en Pendiente: Centro pasa a 3 disponibles y 2 reservadas.

Si después se cancela, Centro vuelve a 5 disponibles y 0 reservadas. Si se entrega, las 2 reservadas salen del stock: quedan 3 disponibles y 0 reservadas.

Si la dirección está a 8 km de todas las sucursales activas, la lista de domicilio queda vacía, el botón no se puede apretar y no hay pedido.

Mordi Centro abre de lunes a domingo, de 10:00 a 23:00. A las 21:00 del miércoles el checkout no ofrece programar: el pedido sale en el momento. A las 23:30 muestra «Mordi Centro está cerrada» y la opción de dejarlo para el jueves a las 10:00, que es la próxima apertura. Si el cliente acepta, el pedido queda programado para esa hora, la estimada se cuenta desde las 10:00 y el stock se reserva ya. Si no acepta, no se crea el pedido en Centro.

## 2.4 Aderezos, con números

El tope de cada aderezo es 2 por hamburguesa y 2 por guarnición. Lo que se muestra al preguntar es la mitad de ese tope, para abajo.

Dos hamburguesas dobles y una porción de papas fritas: el tope es `(2 + 1) × 2 = 6` de mayonesa, 6 de mostaza y 6 de ketchup. Al abrir «¿Sumamos aderezos?» cada uno figura en 3. Para llevar 6 hay que pulsar «más» tres veces en ese aderezo. Los tres salen $0, así que el total del carrito no cambia.

Una sola hamburguesa doble: el tope es 2 y el valor inicial es 1. El máximo pide un click más.

Si el carrito ya tenía aderezos, la pregunta no vuelve a aparecer. «Continuar sin aderezos» sigue al checkout con la comida sola.

---

# Requerimientos funcionales

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

## Administradores

Hay un solo alta de administradores. Listar, crear, editar y borrar son la misma función: RF-ADM-03 la nombra y RF-ADM-07 es ese mismo ABM, no un segundo alta.

| ID | El sistema deberá | Actor |
|---|---|---|
| RF-ADM-01 | Nacer con un administrador precargado, capaz de entrar a la aplicación administrativa. Ese usuario no se borra. | Sistema |
| RF-ADM-02 | Autenticar administradores y separar super admin de solo pedidos. Quien solo ve pedidos consulta pedidos, reclamos y cupones, y puede resolver un reclamo. No cambia el estado ni cancela. | Administrador |
| RF-ADM-03 | Listar, crear, editar y borrar administradores, y asignarles el rol. | Super admin |
| RF-ADM-04 | Ofrecer la administración como otra aplicación (`backend/admin`), con la misma base que la del cliente. | Administrador |
| RF-ADM-05 | Dar de alta, editar y desactivar promociones de la carta: porcentaje, con mínimo opcional, o 2x1 de un producto. | Super admin |
| RF-ADM-06 | Consultar y cargar el stock disponible de cada producto en cada sucursal. Si el disponible es 0, esa fila va arriba y en rojo. | Super admin |
| RF-ADM-07 | El mismo ABM de RF-ADM-03: listar, editar y borrar. No es otra pantalla de alta. | Super admin |
| RF-ADM-08 | Mostrar los estados del pedido y su etiqueta. La máquina no se edita desde parámetros. | Super admin |
| RF-ADM-09 | Editar radio, tiempos de la hora estimada, precio por kilómetro, mínimo de envío gratis, meta y premio de sellos, y premio del Top 3. Un pedido ya confirmado no se recalcula. | Super admin |
| RF-ADM-10 | Listar pedidos, buscar por código o cliente, y avanzar el estado según la máquina. Solo el super admin cambia el estado o cancela. | Administrador |
| RF-ADM-11 | Listar clientes, buscarlos, ver el detalle y darlos de alta, de baja lógica o editarlos. Un cliente deshabilitado no inicia sesión. Sus pedidos quedan. | Super admin |
| RF-ADM-12 | Ver reclamos abiertos primero, marcarlos resueltos y, si corresponde, cargar el importe del cupón. | Super admin |

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
| RF-CUP-01 | Al resolver un reclamo, poder cargar un importe. El cupón vale 3 meses, es de un solo uso y se suma al descuento ya ganado, sin dejar el total de productos en negativo. | Super admin |
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

# Historias de usuario

Cada historia dice quién la usa y para qué. En las que mueven plata o stock hay un caso feliz y al menos un caso que no debe salir bien. El ejemplo trae situación inicial, acción y resultado. Los precios son los del catálogo de demostración.

## Cómo se leen

| Campo | Significado |
|---|---|
| ID | El de las fichas. No se reutiliza. |
| Estado | Todas las de esta carpeta están hechas en el producto que se entrega. |

Definición de terminada: funciona en la aplicación del cliente o en la administrativa, y en la API, y se puede usar en el celular.

## Actores

| Actor | Quién es |
|---|---|
| Visitante | Persona sin cuenta. Ve el catálogo, arma un carrito en el navegador y puede confirmar como invitado. |
| Cliente | Usuario con cuenta. |
| Super admin | Opera todo el local. |
| Solo pedidos | Ve pedidos, reclamos y cupones. Puede resolver un reclamo. No cambia el estado ni cancela. |
| Sistema | Reserva stock, elige la promoción, calcula el envío y la hora. |

## HU-01 — Registro e inicio de sesión

Como visitante, quiero registrarme e iniciar sesión, para usar la app como cliente.

1. Creo una cuenta con nombre, correo y contraseña y quedo autenticado.
2. Vuelvo a entrar con esas credenciales.
3. Credenciales inválidas muestran un error y no entra.
4. Un cliente no entra a la aplicación administrativa.
5. El catálogo y el carrito se pueden usar sin cuenta.

## HU-02 — Administrador inicial

Como administrador, quiero un usuario inicial e iniciar sesión en la administración, para cargar el menú.

1. El sistema nace con un administrador precargado. Ese usuario no se borra.
2. Inicia sesión y ve el inicio del local.
3. Un cliente no accede a la API de administración.
4. La administración es otra aplicación, con la misma API y la misma base.

## HU-03 — Categorías y productos

Como administrador, quiero crear y editar categorías y productos, para armar el catálogo.

1. Alta, listado y edición de categoría. No se borra una categoría con productos.
2. El producto tiene nombre, descripción, categoría, precio, imagen y disponible sí o no.
3. Un producto no disponible no se ofrece al cliente.

## HU-04 — Consultar el catálogo

Como cliente, quiero ver productos por categoría, para armar un pedido.

1. El listado se filtra por categoría.
2. El detalle muestra nombre, precio, descripción, imagen y solo los adicionales marcados para ese producto.
3. Solo aparecen productos disponibles.

## HU-05 — Sucursales

Como administrador, quiero cargar sucursales con ubicación y horario, para que un pedido tenga un local.

1. Se registran nombre, dirección, mapa, teléfono, hasta dos franjas por día y activa o inactiva.
2. Una sucursal inactiva no se ofrece en un pedido nuevo.
3. Hay al menos una sucursal activa de demostración.

## HU-06 — Direcciones

Como cliente, quiero cargar mis direcciones con ubicación, para indicar dónde entregar.

1. Solo un cliente autenticado administra sus direcciones.
2. Cada dirección tiene calle, ciudad, provincia, código postal, alias, latitud y longitud. La búsqueda propone hasta cinco candidatos y el pin confirma el punto.
3. En el checkout elijo una dirección guardada.
4. No veo ni edito direcciones de otro cliente.

## HU-07 — Carrito

Como cliente, quiero armar el pedido y ver el importe, para saber cuánto llevo antes de confirmar.

**Situación inicial.** El carrito tiene dos hamburguesas dobles. Cada una sale $20.000. El total es $40.000. La gaseosa cola sale $2.000.

**Acción.** Agregar tres gaseosas cola.

**Resultado.** El carrito queda en dos hamburguesas dobles ($40.000) y tres gaseosas ($6.000). El total es $46.000.

Si cambia la cantidad de gaseosas a cuatro, el total pasa a $48.000. Si recarga la página, el carrito sigue igual: dos dobles y cuatro gaseosas, $48.000. Con cuenta, ese carrito está en el servidor. Sin cuenta, en el navegador.

**Otro caso.** Agrega la misma hamburguesa doble con cheddar ($2.000). Es otra línea, no se mezcla con la doble sin adicional. Esa línea sale $22.000 por unidad. Un adicional que ese producto no ofrece no se agrega.

## HU-08 — Confirmar el pedido

Como cliente, quiero confirmar el pedido en una sucursal que pueda prepararlo, para que me lo envíen o lo retire, al precio con la promoción.

**Caso feliz.** Una doble y una cola, subtotal $22.000, descuento Martes 20 de $4.400, productos $17.600. Elige domicilio a 2,34 km de Mordi Centro, que tiene stock. El envío es $2.400.

**Acción.** Confirmar, con pago en efectivo.

**Resultado.** Se crea el pedido en Pendiente, con código `MOR` y seis dígitos. Total $20.000. Quedan guardados el subtotal, el descuento, el nombre de la promo y el envío. En Mordi Centro la hamburguesa doble y la gaseosa pasan de disponible a reservado, una unidad cada una. La hora estimada queda fija. El carrito se vacía. El medio de pago no se guarda.

**No hay sucursal cerca.** La dirección está a 8 km de todas y el radio es 5 km. La lista viene vacía, el botón de confirmar no se puede usar y no se crea un pedido.

**No hay stock.** Elige Mordi Norte, que tiene una sola hamburguesa doble y el carrito pide dos. Confirmar no crea el pedido. La respuesta dice que faltan hamburguesas dobles (pidió 2, hay 1). El stock de Norte no cambia.

**Retiro.** Elige retiro en Mordi Centro. No pide dirección, el envío es $0 y el total es $17.600. El stock se reserva igual.

**Aderezos.** Si el carrito tiene hamburguesas o guarniciones y ningún aderezo, antes de seguir pregunta «¿Sumamos aderezos?». Con dos dobles y una papa el tope de cada aderezo es 6 y el valor inicial es 3. Puede seguir sin aderezos. Si ya había aderezos, la pregunta no vuelve.

## HU-09 — Historial de pedidos

Como cliente, quiero ver mis pedidos anteriores, para saber qué pedí.

1. Solo veo mis pedidos. Un invitado no usa esta pantalla.
2. El listado muestra fecha, importe, estado y sucursal, del más reciente al más viejo.
3. El detalle muestra ítems, dirección, sucursal, descuento e importe.

## HU-10 — Seguimiento

Como cliente, quiero ver en qué está el pedido, para saber si lo preparan, si viene en camino o si ya lo puedo retirar.

**Situación inicial.** El pedido `MOR482913` es a domicilio, está en Pendiente y tiene dos hamburguesas dobles reservadas en Mordi Centro (disponible 3, reservado 2).

**Acción.** El administrador lo pasa a Confirmado.

**Resultado.** El cliente, en el detalle, ve Confirmado y el historial con la fecha del cambio. El administrador ve el mismo estado. El stock sigue reservado.

| Lo pasa el administrador | Lo ve el cliente | Stock |
|---|---|---|
| En preparación | En preparación. Ya no puede cancelar. | Sigue reservado |
| Listo para entregar | Listo para entregar | Sigue reservado |
| En camino | En camino | Sigue reservado |
| Entregado | Entregado | Se descuenta: reservado vuelve a 0 y el disponible sigue en 3 |

Ese último paso es el descuento definitivo. Cancelarlo después ya no devuelve unidades.

Si el pedido fuera de retiro, «Listo para entregar» se lee «Listo para retirar» y el paso siguiente es «Retirado». No aparece «En camino». Al marcarlo retirado, el stock se descuenta igual.

## HU-11 — Cancelar

Como cliente, quiero cancelar un pedido que el local todavía no empezó a preparar, para que el stock vuelva a estar disponible.

**Situación inicial.** `MOR482913` está Confirmado, con la reserva de la historia anterior (Centro: disponible 3, reservado 2). Al crearlo había sumado un sello.

**Acción.** El cliente cancela.

**Resultado.** El estado pasa a Cancelado. El cliente y el administrador lo ven cancelado, con el cambio en el historial. Centro vuelve a disponible 5 y reservado 0. El sello se revierte. Si el pedido tenía un cupón de reclamo, el cupón vuelve a estar disponible.

**No se puede.** Si el administrador ya lo pasó a En preparación, cancelar responde que ese paso no existe. El stock sigue reservado.

El administrador también puede cancelar en Pendiente o Confirmado, con el mismo efecto en el stock.

## HU-12 — Repetir un pedido

Como cliente, quiero volver a pedir lo de la vez anterior, para no armarlo de cero.

**Situación inicial.** El carrito ya tiene una porción de papas fritas ($3.000). El pedido anterior tiene una hamburguesa doble ($20.000) y una porción de papas fritas ($3.000).

**Acción.** Repetir ese pedido.

**Resultado.** El carrito queda con una hamburguesa doble y dos porciones de papas fritas. Total $26.000. No se copian la sucursal, el envío ni la promoción.

**El carrito estaba vacío.** Repetir deja una doble y una papa, total $23.000.

**Un producto ya no se vende.** La hamburguesa doble está desactivada. El carrito solo suma las papas y avisa que la doble no se agregó.

## HU-13 — El administrador mueve el estado

Como administrador, quiero avanzar el pedido, para que el cliente vea el mismo estado que el local y el stock se resuelva al final.

La acción es una sola: el administrador elige el estado siguiente. Las consecuencias son las de HU-10 para el cliente y para el stock, y las de HU-11 si elige Cancelado. Quien tiene el rol solo pedidos ve el estado y no tiene el botón. Si lo intenta por la API, recibe 403. Resolver un reclamo sí puede.

**Situación inicial.** Pedido de retiro en Listo para retirar, con stock reservado.

**Acción.** Marcarlo retirado.

**Resultado.** El cliente ve Retirado. El administrador ve Retirado y una fila nueva en el historial. La reserva se descuenta. No hubo estado En camino.

## HU-14 — Perfil

Como cliente, quiero consultar y modificar mis datos, para mantener la cuenta al día.

1. Veo y edito el nombre. El correo es de solo lectura.
2. Cambio la contraseña con la actual y la nueva.
3. Puedo dar de baja la cuenta con la contraseña. Si hay un pedido en curso, no deja. Los datos personales se anonimizan y los pedidos quedan.

## HU-15 — Recuperar la contraseña

Como cliente, quiero recuperar mi contraseña, para volver a entrar si la olvidé.

1. Desde el ingreso inicio el flujo con el correo.
2. Obtengo un token de 30 minutos y de un solo uso. Sin correo configurado, la pantalla lo muestra.
3. Con el token y una contraseña nueva puedo iniciar sesión.
4. Un correo inexistente recibe la misma respuesta genérica.

## HU-16 — Otros administradores

Como super admin, quiero crear otros administradores, para no depender de un solo usuario.

1. Veo el listado y doy de alta con nombre, correo, contraseña y rol: super admin o solo pedidos.
2. Puedo editar y borrar. El administrador inicial no se borra.
3. Quien solo ve pedidos no entra a esta pantalla.

## HU-17 — Cargar stock

Como administrador, quiero cargar el stock de cada producto por sucursal, para saber qué hay en cada local.

1. Elijo una sucursal y veo o edito la cantidad disponible de cada producto.
2. Se ven disponible y reservado. El admin edita el disponible y puede devolver el reservado a disponible.
3. Si el disponible es 0, la fila sube al tope y se muestra en rojo.
4. Un cliente no accede.

## HU-18 — Reservar stock al pedir

Como sistema, quiero verificar y reservar stock al confirmar, y liberarlo si se cancela, para no vender lo que no hay.

1. Si no alcanza en la sucursal elegida, el checkout nombra el producto y no crea el pedido.
2. Si alcanza, el stock queda reservado. Los adicionales y la unidad gratis del 2x1 también.
3. Cancelar libera la reserva. Entregar o retirar la descuenta para siempre.
4. Repetir no reserva: la verificación es al confirmar de nuevo.

## HU-19 — Parámetros y radio

Como administrador, quiero ajustar el radio, los tiempos y el costo de envío. Como cliente, quiero ver qué sucursales puedo elegir.

1. El admin edita el radio (de 0,1 a 100 km; el inicial es 5), los minutos de la hora estimada, el precio por kilómetro y el mínimo de envío gratis.
2. En domicilio solo entran sucursales activas a una distancia menor o igual al radio. Si ninguna llega, no se confirma.
3. Cambiar un parámetro no mueve ni recalcula un pedido ya confirmado.

## HU-20 — Promociones de la carta

Como administrador, quiero dar de alta, editar y desactivar promociones, para ofrecer un porcentaje o un 2x1.

1. El porcentaje puede tener un monto mínimo. El 2x1 nombra el producto.
2. Desactivar una promoción no cambia los pedidos que ya la tienen guardada.
3. No se carga un monto fijo ni un código de la carta. El cupón de reclamo es otra cosa (HU-36).

## HU-21 — Ver qué promoción aplica

Como cliente, quiero ver el descuento antes de confirmar, para saber cuál ganó y cuánto voy a pagar.

El caso de las tres promos: dos dobles y dos colas, subtotal $44.000. Martes 20 descuenta $8.800, el 2x1 de la cola $2.000 y el 15% desde $30.000 descuenta $6.600. Se ven las tres y queda Martes 20. Productos: $35.200. Con el envío gratis desde $25.000, el envío es $0.

El caso del 2x1: tres colas, subtotal $6.000. El 2x1 descuenta $2.000 y gana sobre el 20% ($1.200). Paga $4.000.

El caso del premio: la clienta tiene 9 sellos y pide una doble de $20.000. Ese pedido completa los 10. Premio Fidelidad descuenta $6.000 y gana sobre Martes 20 ($4.000). En el pedido se lee Premio Fidelidad y $6.000, no «30%». Si después cancela, vuelve a 9 sellos.

Si tiene un cupón de reclamo de $5.000 sobre el pedido de $35.200, el cupón se suma. El descuento total es $13.800 y los productos quedan en $21.400.

## HU-22 — Reportes de productos

Como administrador, quiero ver qué se vende, qué no se vende, qué no tiene stock y qué factura más, para decidir el menú.

1. Los cuatro listados salen de los pedidos y del stock. No se guardan aparte.
2. Un cancelado no suma en las ventas. Un pendiente sí.
3. Sin stock respeta la sucursal elegida y no el rango de fechas.

## HU-23 — Retiro, domicilio y sucursal

Como cliente, quiero elegir si lo retiro o me lo envían, y qué sucursal lo prepara, para no quedar atado a la más cercana.

1. En domicilio elijo entre las activas dentro del radio, aunque haya otra más cerca.
2. En retiro elijo entre todas las activas. No hay dirección ni costo de envío.
3. Primero aparecen las que tienen stock de todo el carrito.
4. La distancia se muestra, ordena y cotiza el envío de la sucursal que marqué.

Con el radio en 5 km, Centro a 2,34 km y Oeste a 4,1 km entran las dos. Si marco Oeste y el kilómetro está a $1.000, el envío es $4.100. Sur, a 6,2 km, no entra.

## HU-24 — Rol solo pedidos

Como administrador de solo pedidos, quiero consultar la operación sin tocar la carta ni el stock, para no cambiar un pedido por error.

1. El menú es Inicio, Pedidos, Reclamos y Cupones de reclamos.
2. En el inicio ve los pedidos de hoy, la facturación de hoy, los estados y las ventas de la semana. No ve los paneles de carta, stock, parámetros ni reportes de productos.
3. No hay botones para avanzar el estado ni para cancelar. La API de cambio de estado responde 403.
4. Ve los reclamos y los cupones, y puede marcar un reclamo resuelto.

## HU-28 — Reportes con filtro, gráfico y CSV

Como administrador, quiero acotar los reportes por fecha y sucursal, verlos en un gráfico y bajarlos, para mirar una semana o un local.

1. Sin filtro, el corte es todo el historial y todas las sucursales.
2. Las fechas son días de Argentina.
3. Cada lista se puede descargar en CSV con el filtro que está puesto.

## HU-30 — Adicionales de cada producto

Como administrador, quiero marcar qué adicionales ofrece cada producto, para que una gaseosa no ofrezca cheddar.

1. En el producto marco los adicionales.
2. En el detalle del cliente solo aparecen esos.
3. Agregar uno que no está marcado responde error y no crea la línea.

## HU-31 — Envío gratis

Como cliente, quiero ver si el envío ya es gratis o cuánto me falta, para saber el total antes de confirmar.

Sobre el pedido de una doble y una cola ($17.600 después del 20%), con el gratis desde $25.000, faltan $7.400 y se cobran $2.400 de envío. El total es $20.000.

Sobre dos dobles y dos colas ($35.200 después del 20%) el mínimo ya se pasó. El envío es $0. En retiro el envío es $0 aunque no se llegue al mínimo. Si el mínimo está en 0, la bonificación está apagada.

## HU-33 — Tablero del inicio

Como super admin, quiero ver el día de un vistazo, para saber si el local está vendiendo antes de abrir un reporte.

**Situación inicial.** Es el 11/11, de noche. En el día entraron 4 pedidos. Tres se entregaron y uno se canceló. Lo facturado, sin el cancelado, es $60.000.

**Acción.** Abrir el inicio.

**Resultado.** Se ven 4 pedidos de hoy, facturación $60.000, una barra por estado y la línea de ventas de los últimos siete días. Quien entra con el rol solo pedidos ve ese mismo tablero, y no ve los paneles de carta, stock ni reportes de productos.

## HU-34 — Provincia y código postal

Como cliente, quiero guardar provincia y código postal en la dirección, para que el envío quede completo.

1. La dirección pide calle, ciudad, provincia y código postal.
2. La búsqueda puede completar esos datos.
3. El pedido de domicilio guarda esa dirección.

## HU-35 — Nosotros, contacto y mapa

Como visitante, quiero leer quiénes son y ver las sucursales en un mapa, para saber a dónde ir.

1. Nosotros y contacto se leen sin cuenta.
2. El mapa muestra un marcador por sucursal activa.
3. En contacto también se lee el horario de cada local.

## HU-36 — Reportar un problema

Como cliente, quiero reportar un problema de un pedido que ya recibí, para que el local lo resuelva.

1. Uno por pedido, solo si está entregado o retirado, y solo el dueño.
2. Motivos: faltó algo, pedido equivocado, llegó tarde, llegó frío, otro.
3. El administrador ve los abiertos primero y los marca resueltos.
4. Al resolver puede cargar un importe. El cliente recibe un cupón de 3 meses y un solo uso, que se suma al descuento del próximo pedido.

## HU-37 — Horario de la sucursal

Como cliente, quiero saber si la sucursal está abierta, para no pedir en un local que ya cerró sin enterarme.

**Situación inicial.** Mordi Centro abre de lunes a domingo, de 10:00 a 23:00. El carrito tiene stock en Centro y la dirección está dentro del radio. Son las 23:30 del miércoles.

**Acción.** Elegir Centro y aceptar dejar el pedido para la próxima apertura.

**Resultado.** El checkout dice «Mordi Centro está cerrada» y ofrece programarlo para el jueves a las 10:00. Al aceptar, el pedido queda programado para esa hora y la estimada se cuenta desde las 10:00. El stock se reserva en el momento. Si no acepta, el pedido no se crea. A las 21:00 esa opción no aparece y el pedido sale enseguida.

El administrador puede cargar el día corrido o partido, con hasta dos franjas. Si no cargó franjas, el local se toma como abierto y se muestra el texto de respaldo.

# Incrementos de los sprints


La carpeta describe el producto de las secciones anteriores, no el diario de cada cierre. Esta tabla solo dice qué capacidad quedó en Mordi en cada incremento, para ubicar el recorrido del cuatrimestre.

| Incremento | Qué quedó en el producto |
|---|---|
| 1 | Cuenta, catálogo, carrito, sucursal y pedido en Pendiente, también como invitado. |
| 2 | Adicionales, seguimiento, historial, cancelación, repetir pedido y la máquina de estados. |
| 3 | Stock con reserva, radio de cobertura, hora estimada, parámetros, recuperar contraseña y alta de administradores. |
| 4 | El cliente elige retiro o domicilio y la sucursal. Promociones aplicadas al confirmar. Reportes de productos. Costo de envío por km. |
| 5 | Sellos, Top 3, código del pedido, clientes, roles, envío gratis, adicionales por producto, dirección con provincia y código postal, nosotros, contacto, mapa, reclamos, banner de la promo, reportes con filtro, gráfico y CSV, horario de la sucursal y tablero del inicio. |

---

# Modelo de datos


Una base PostgreSQL. Las cantidades de dinero son decimales de dos posiciones. Las claves son identificadores opacos; el código del pedido es otro dato, único, para decirlo en el local.

## 6.1 Entidades

```mermaid
Cliente {
  string email
  string name
  boolean active
  int loyaltyStamps
  boolean hasTopBuyerReward
}
Administrador {
  string email
  string adminRole
}
Direccion {
  string street
  string city
  string province
  string postalCode
  decimal latitude
  decimal longitude
}
Sucursal {
  string name
  string openingHours
  boolean active
  decimal latitude
  decimal longitude
}
FranjaHoraria {
  string day
  int slot
  string opens
  string closes
}
Producto {
  string name
  decimal price
  boolean available
}
Categoria {
  string name
  string slug
}
Stock {
  int available
  int reserved
}
Carrito {
  string userId
}
LineaCarrito {
  int quantity
  string notes
}
Pedido {
  string code
  string fulfillment
  string status
  decimal subtotal
  decimal discountAmount
  decimal deliveryFee
  decimal totalAmount
  boolean stockReserved
  datetime scheduledFor
}
LineaPedido {
  int quantity
  decimal unitPrice
}
Promocion {
  string type
  int value
  decimal minSubtotal
  boolean active
}
HistorialEstado {
  string status
  datetime changedAt
}
Reclamo {
  string reason
  string status
}
Parametro {
  string key
  string value
}
```

`openingHours` es el texto de respaldo. Si la sucursal tiene franjas, esas mandan: hasta dos por día (`slot`), con apertura y cierre. Sin franjas, se muestra el texto y el local se toma como abierto. `scheduledFor` en el pedido queda vacío cuando se confirma en horario. Si el cliente lo programa, guarda la próxima apertura.

<!-- diagrama -->

## 6.2 Relaciones

| De | A | Cómo |
|---|---|---|
| Cliente | Dirección, Carrito, Pedido, Reclamo | Un cliente, muchas direcciones y muchos pedidos. Un carrito. |
| Cliente | Pedido | El pedido del invitado no tiene cliente: guarda nombre y correo en el propio pedido. |
| Administrador | HistorialEstado | Quién cambió el estado, cuando fue un usuario del sistema. |
| Sucursal | Pedido, Stock, FranjaHoraria | Todo pedido tiene una sucursal. El stock es por sucursal y producto. Una sucursal tiene varias franjas de horario. |
| Producto | Categoría | Muchos a muchos. |
| Producto | Producto | Los adicionales que ese producto ofrece. |
| Carrito | Línea | Una línea es producto + adicionales + nota. La misma hamburguesa con otro adicional es otra línea. |
| Pedido | Línea, Historial, Promoción, Reclamo | La línea congela precio y nombre del adicional. La promoción guarda el nombre, para que editarla después no cambie el pedido. Un reclamo como máximo. |
| Promoción | Producto | Solo en el 2x1: el producto que sale gratis. |

El cupón de reclamo no es una promoción de la carta: vive en el reclamo, con código, importe y vencimiento a los 3 meses. Los reportes no se guardan: se calculan sobre pedidos y stock. El premio de fidelización y el del top de clientes no son una fila de Promoción: el pedido guarda el nombre («Premio Fidelidad», «Premio Top 3») y el descuento.

---


## Valores cerrados

| Dónde | Valores |
|---|---|
| Pedido, cómo se entrega | `delivery` (domicilio) o `pickup` (retiro) |
| Pedido, estado | `pending`, `confirmed`, `preparing`, `ready`, `on_the_way`, `delivered`, `cancelled` |
| Promoción | `percent` o `two_for_one` |
| Administrador | `super_admin` o `orders_viewer` |
| Reclamo | abierto o resuelto |
| Franja | día 0 = lunes … 6 = domingo; `slot` 0 o 1 |

# Diseño de APIs


La API está en `/api`. Estos ocho recursos son los que arman el pedido, el precio, el stock y la lectura del local, y más abajo traen un ejemplo concreto. El resto sigue el mismo criterio: JSON, error con mensaje legible, y el que no tiene permiso recibe 401 o 403.

| Área | Recursos |
|---|---|
| Cuenta | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/me`, `PATCH /api/me` |
| Direcciones | `GET /api/addresses`, `POST /api/addresses`, `PATCH /api/addresses/:id`, `POST /api/geocode` |
| Catálogo | `GET /api/categories`, `GET /api/products`, `GET /api/products/:id`, `GET /api/products/:id/extras`, `GET /api/promotions/active`, `GET /api/promotions/banner` |
| Sucursales | `GET /api/branches`, `GET /api/branches/available` |
| Pedido | `POST /api/orders/guest`, `GET /api/orders`, `POST /api/orders/:id/cancel`, `POST /api/orders/:id/incident` |
| Administración | pedidos, stock y liberación de reservado, parámetros, productos y sus adicionales, sucursales, clientes, administradores, promociones, campañas, reclamos, `GET /api/admin/reports/products` |

Precios del catálogo usados abajo: hamburguesa doble `prod-doble` a $20.000, gaseosa cola `prod-cola` a $2.000.

## 7.1 Agregar al carrito

`POST /api/cart/items` · cliente con sesión.

Entrada: tres gaseosas, con el carrito que ya tenía dos hamburguesas dobles.

```json
{ "productId": "prod-cola", "quantity": 3 }
```

Salida: el carrito completo. El total es el subtotal, todavía sin promoción ni envío (RF-CRT-03).

```json
{
  "itemCount": 5,
  "total": 46000,
  "items": [
    { "productId": "prod-doble", "quantity": 2, "unitPrice": 20000, "extras": [], "subtotal": 40000 },
    { "productId": "prod-cola", "quantity": 3, "unitPrice": 2000, "extras": [], "subtotal": 6000 }
  ]
}
```

Si la cantidad de gaseosas pasa a 4, `total` es 48000. Un adicional que ese producto no ofrece responde 400 y no agrega la línea.

## 7.2 Cotizar la promoción

`POST /api/promotions/quote` · con sesión o, el invitado, mandando las líneas.

Entrada del pedido C: tres gaseosas cola.

```json
{ "items": [{ "productId": "prod-cola", "quantity": 3 }] }
```

Salida: gana el 2x1. Las otras ofertas viajan en `offers` con `applied` en falso.

```json
{
  "subtotal": 6000,
  "discountAmount": 2000,
  "totalAmount": 4000,
  "promotion": { "name": "2x1 Gaseosa Cola", "type": "two_for_one", "value": 0 },
  "offers": [
    { "name": "2x1 Gaseosa Cola", "discountAmount": 2000, "applied": true },
    { "name": "Martes 20", "discountAmount": 1200, "applied": false }
  ]
}
```

Con la doble y la cola del pedido A, `promotion.name` es «Martes 20», `discountAmount` es 4400 y `totalAmount` es 17600. El envío no entra en esta cuenta.

## 7.3 Sucursales para este carrito

`POST /api/branches/checkout`

Entrada: domicilio, dos hamburguesas dobles, dirección ya guardada.

```json
{
  "fulfillment": "delivery",
  "addressId": "dir-casa",
  "items": [{ "productId": "prod-doble", "quantity": 2 }]
}
```

Salida: Centro puede, Norte no. El orden ya viene con las que pueden primero. Con Martes 20 el subtotal descontado es $32.000, así que el envío gratis aplica y las dos sucursales cobran $0. El envío de $2.400 de la sección 2.2 es el de un pedido que, ya descontado, no llega a $25.000.

```json
{
  "fulfillment": "delivery",
  "radiusKm": 5,
  "freeDelivery": { "minSubtotal": 25000, "qualifies": true, "missing": 0 },
  "branches": [
    {
      "name": "Mordi Centro",
      "openingHours": "Lun-Dom 10:00-23:00",
      "openNow": true,
      "nextOpenAt": null,
      "distanceKm": 2.34,
      "deliveryFee": 0,
      "canFulfill": true,
      "missing": []
    },
    {
      "name": "Mordi Norte",
      "distanceKm": 3.1,
      "deliveryFee": 0,
      "canFulfill": false,
      "missing": [{ "name": "Hamburguesa doble", "requested": 2, "available": 1 }]
    }
  ]
}
```

Si ninguna sucursal cae dentro del radio, `branches` viene vacío. En retiro la lista trae todas las activas, `deliveryFee` 0 y no hace falta dirección. Si `openNow` es falso, cada sucursal trae `nextOpenAt`, la próxima apertura. El checkout ofrece programar el pedido para esa hora.

## 7.4 Confirmar el pedido

`POST /api/orders` · con cuenta. El invitado usa `POST /api/orders/guest` con nombre, correo y la dirección escrita. El medio de pago no viaja en este cuerpo: la pantalla de confirmación lo recuerda en esa visita y no lo guarda.

Entrada del caso feliz de HU-08.

```json
{
  "fulfillment": "delivery",
  "addressId": "dir-casa",
  "branchId": "suc-centro"
}
```

Salida:

```json
{
  "code": "MOR482913",
  "status": "pending",
  "fulfillment": "delivery",
  "subtotal": 22000,
  "discountAmount": 4400,
  "promotionName": "Martes 20",
  "deliveryFee": 2400,
  "totalAmount": 20000,
  "branch": { "name": "Mordi Centro" },
  "scheduledFor": null
}
```

Ese pedido se confirmó a las 21:00, dentro del horario, así que `scheduledFor` va vacío. A las 23:30 la misma sucursal está cerrada. Confirmar sin aceptar responde 409, con el código `BRANCH_CLOSED` y la pregunta de programarlo. Si el cliente acepta, la entrada lleva `"scheduleWhenClosed": true` y la salida trae `"scheduledFor": "2026-11-12T10:00:00.000-03:00"`. La estimada se cuenta desde esa hora.

Si `branchId` es Mordi Norte, la salida es un 409 y no hay fila nueva:

```json
{
  "statusCode": 409,
  "code": "OUT_OF_STOCK",
  "message": "No hay stock suficiente de \"Hamburguesa doble\" en Mordi Norte (quedan 1)",
  "branch": { "name": "Mordi Norte" },
  "items": [{ "name": "Hamburguesa doble", "requested": 2, "available": 1 }]
}
```

## 7.5 Seguimiento

`GET /api/orders/:id` · el dueño, con sesión. `:id` es la clave interna; `code` es el que se dice en el local.

Cuando el administrador ya lo marcó entregado (HU-10):

```json
{
  "code": "MOR482913",
  "status": "delivered",
  "fulfillment": "delivery",
  "totalAmount": 20000,
  "promotionName": "Martes 20",
  "estimatedDeliveryAt": "2026-11-11T21:40:00.000Z",
  "canCancel": false,
  "history": [
    { "status": "pending", "changedAt": "2026-11-11T20:10:00.000Z" },
    { "status": "confirmed", "changedAt": "2026-11-11T20:14:00.000Z" },
    { "status": "delivered", "changedAt": "2026-11-11T21:05:00.000Z" }
  ]
}
```

En un retiro entregado, la pantalla dice «Retirado» aunque el estado guardado sea `delivered`. Al entregar o al cancelar, la reserva de esa sucursal ya se resolvió: no queda stock apartado para ese pedido.

## 7.6 El administrador cambia el estado

`POST /api/admin/orders/:id/status` · solo super admin.

Entrada, el paso en el que el stock se descuenta:

```json
{ "status": "delivered" }
```

Salida: el pedido con `status` «delivered». En la sucursal, esas unidades salen de `reserved` y no vuelven a `available`.

Si el pedido estaba en Pendiente y el cuerpo es `{ "status": "cancelled" }`, la reserva vuelve a `available`. Si estaba en En preparación y se pide cancelar, responde 409 y el stock no se toca. Quien tiene el rol solo pedidos recibe 403 en este recurso. Sí puede hacer `GET /api/admin/orders` y consultar o resolver reclamos.

## 7.7 Reportes de pedidos

`GET /api/admin/reports/orders?from=2026-11-01&to=2026-11-11&branchId=suc-centro` · super admin.

Sin `from`, `to` ni `branchId`, el corte es todo el historial y todas las sucursales. Las fechas son días de Argentina.

```json
{
  "ordersByDay": [{ "date": "2026-11-11", "count": 4 }],
  "ordersByStatus": [{ "status": "delivered", "count": 3 }, { "status": "cancelled", "count": 1 }],
  "cancelled": { "count": 1, "percent": 25 },
  "averageDeliveryMinutes": 48,
  "salesByBranch": [{ "branchName": "Mordi Centro", "totalAmount": 60000 }],
  "topCustomers": [{ "name": "Cliente de prueba", "orderCount": 3 }],
  "topPromotions": [{ "promotionName": "Martes 20", "orderCount": 2, "totalDiscount": 8800 }]
}
```

Un cancelado no entra en `salesByBranch` ni en el top de clientes. Un pendiente sí entra en las ventas. El mismo filtro en `GET /api/admin/reports/products` devuelve más vendidos, menos vendidos, mayor facturación y sin stock. La pantalla ofrece «Descargar CSV» de cada lista, con el filtro que está puesto.

## 7.8 Repetir

`POST /api/orders/MOR-id/repeat` · el dueño.

No lleva cuerpo. Con el carrito de HU-12 (una papa) y un pedido de una doble más una papa, la salida trae el carrito ya sumado:

```json
{
  "cart": {
    "total": 26000,
    "items": [
      { "productId": "prod-papas", "quantity": 2, "subtotal": 6000 },
      { "productId": "prod-doble", "quantity": 1, "subtotal": 20000 }
    ]
  },
  "skipped": []
}
```

Si la doble ya no se vende, `items` solo tiene las papas y `skipped` nombra la hamburguesa. No se crea un pedido nuevo en este paso.

---

# Testing y automatización

Los tests son de la API, en `backend`. `npm test` prepara la base `fastfood_test` y corre ahí, un archivo por vez. No escriben la base de la aplicación y no hace falta tener el servidor levantado: los de integración arrancan Nest en el propio test.

## Contra la base

| Archivo | Qué fija |
|---|---|
| `sprint1.e2e.test.ts` | Login y confirmar, con cuenta y como invitado. |
| `auth-token.e2e.test.ts` | El token, `/api/auth/me` y una ruta protegida que responde 401. |
| `catalog.e2e.test.ts` | Alta de categoría y producto, slug, imagen, producto desactivado que el público no ve, y que un cliente no administra el catálogo. |
| `extras.e2e.test.ts` | Adicionales en el detalle, en el carrito y al confirmar. |
| `orders-lifecycle.e2e.test.ts` | Historial, seguimiento, hora estimada fija, demora, cambio de estado, cancelar y repetir. |
| `stock.e2e.test.ts` | Reserva, faltante que no crea el pedido, dos pedidos a la vez por la última unidad, liberación al cancelar, descuento al entregar, y el admin que devuelve el reservado a disponible. Ese último paso inhabilita el carrito que ya tenía el producto, también el del invitado. |
| `promotions.e2e.test.ts` | Porcentual, 2x1 que reserva la unidad gratis, mínimo, promo vencida, empate que se queda con la más nueva, y la cotización con la misma regla. |
| `fulfillment.e2e.test.ts` | Retiro, domicilio y sucursal fuera del radio. |
| `parameters-branches.e2e.test.ts` | Radio, hora estimada que no se recalcula, sucursales dentro y fuera del radio, y la sucursal que eligió el cliente aunque haya otra más cerca. |
| `delivery-fees.e2e.test.ts` | Precio por km, cuadra de 100 m iniciada, envío congelado, y envío gratis justo en el mínimo y un peso abajo. |
| `loyalty-top3.e2e.test.ts` | Sello al crear, premio al llegar a la meta, reverso al cancelar, porcentaje que no se publica, y Top 3 de un solo uso. |
| `reports.test.ts` | Un pedido de otro día o de otra sucursal queda afuera del filtro. El pendiente suma y el cancelado no. El tiempo promedio sale de dos entregas. Sin stock respeta la sucursal y no las fechas. |
| `admin-roles.e2e.test.ts` | El rol solo pedidos ve pedidos, reclamos y cupones, y puede resolver un reclamo. Cambiar el estado o cancelar responde 403. El administrador inicial no se baja de rol. |
| `incidents.e2e.test.ts` | No se reporta el pedido de otro ni uno que no se entregó. Es uno por pedido. El cupón lo ve solo ese cliente, se descuenta una vez y, si hay varios, entra el que vence antes. |
| `customers.e2e.test.ts` | Alta, edición y baja lógica. Deshabilitado no inicia sesión y sus pedidos quedan. Un cancelado no cuenta como compra. |
| `account.e2e.test.ts` | Perfil, baja de cuenta y alta de administradores. |
| `address-alias.e2e.test.ts` | El alias de una dirección. |
| `address-province.e2e.test.ts` | Provincia, código postal, alta, edición y un valor inválido que responde 400. |

## Sin base

Estos no reemplazan una prueba de punta a punta. Fijan una regla que la pantalla o el arranque usan.

| Archivo | Qué fija |
|---|---|
| `branch-hours.test.ts` | Franja abierta, próxima apertura, día partido, domingo que salta al lunes, y el rechazo de una tercera franja o de dos franjas que se pisan. |
| `geocode.test.ts` | Hasta cinco candidatos en Argentina, provincia llevada a uno de los 24 nombres, búsqueda estructurada y, si no encuentra, la libre. No llama a Nominatim en vivo. |
| `admin-rules.test.ts` | Ajuste de stock (sumar, restar, poner en 0) y los textos de demora. |
| `password.test.ts` | Un admin sin rol explícito sale con rol vacío. Un cliente sin sellos sale en cero. |
| `upload-dir.test.ts` | La carpeta de imágenes, y el reemplazo por `/tmp` si no se puede crear. |
| `database-url.test.ts` | Sin `DATABASE_URL` la API no arranca. En Neon completa ssl y los timeouts. |
| `pusher.service.test.ts` | Sin credenciales no publica. Con credenciales firma el canal del rol y, si Pusher falla, el pedido igual sigue. |
| `prisma-exception.filter.test.ts` | Un valor único repetido es 409, un registro que ya no está es 404 y una referencia inválida es 400. |

## Qué no cubre un test

No hay tests del navegador ni un pipeline que los corra al integrar. Quien integra corre `npm test` en la máquina antes de sumar el cambio a la rama principal.

La pregunta de aderezos es de la pantalla: no tiene un test de API. El cálculo de franjas sí está en `branch-hours.test.ts`. Confirmar el pedido con `scheduleWhenClosed` no tiene un caso propio en la suite.

---

# Historial de la carpeta

Hasta el 11/11 la carpeta eran ocho documentos. Esta tabla sigue ese recorrido y, arriba, las versiones de este texto.

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.2 | 11/11/2026 | El modelo incluye el dibujo de las entidades principales y sus relaciones. |
| 2.1 | 11/11/2026 | El rol solo pedidos también ve reclamos y cupones. Testing lista la suite que corre hoy, contra la base y sin base. |
| 2.0 | 11/11/2026 | La carpeta queda en los ocho documentos, cada uno desde una hoja nueva, con los cinco integrantes en la portada. |
| 1.10 | 11/11/2026 | El ejemplo de sucursales del checkout usa los campos que devuelve la API. El alcance aclara que el cupón de reclamo se suma al descuento. |
| 1.9 | 11/11/2026 | Cierre de la carpeta con lo construido: horario partido, cupón de reclamo que se suma, liberación de stock reservado y el campo real para programar el pedido. |
| 1.8 | 11/11/2026 | La sucursal que prepara el pedido la elige el cliente. La distancia ordena la lista y cotiza el envío; no asigna sola. |
| 1.7 | 11/11/2026 | Al confirmar se pregunta por los aderezos. El valor inicial es la mitad del máximo; el máximo pide un click del cliente. |
| 1.6 | 11/11/2026 | Fuera del horario, el cliente puede programar el pedido para la próxima apertura de la sucursal. |
| 1.5 | 11/11/2026 | El sin stock queda en la pantalla de Stock (arriba y en rojo). Las dos campañas, fidelización y top de clientes, quedan junto a las promociones de la carta. |
| 1.4 | 11/11/2026 | Los sellos quedan como decisión: a los 10, un descuento sorpresa. El porcentaje no se publica. |
| 1.3 | 11/11/2026 | El horario de la sucursal y el tablero del inicio quedan descriptos como parte del producto. La sección 9 solo lista lo que queda afuera. |
| 1.2 | 11/11/2026 | El historial deja constancia de las etapas anteriores de la carpeta. |
| 1.1 | 11/11/2026 | El rango de delivery y el costo de delivery quedan como decisiones configurables, con ejemplo de radio y de precio por km. |
| 1.0 | 11/11/2026 | Los ocho documentos pasan a esta carpeta única: alcance, decisiones con ejemplos, requerimientos, historias, incrementos, modelo, ocho recursos de la API, testing y lo que falta cerrar. |
| Modelo 1.1, APIs 1.2, testing 1.1 | 01/11/2026 | Ciudad, provincia y código postal en direcciones y sucursales. |
| Decisiones 1.2 | 27/10/2026 | Clientes con baja lógica, costo de envío por kilómetro y roles de administrador. |
| APIs 1.1 | 15/10/2026 | Listado de todas las sucursales activas, no solo las que cubren la dirección. |
| Alcance 1.4, decisiones 1.1 | 12/10/2026 | Devolución: el cliente elige la sucursal (retiro o domicilio) y el mapa de pin para confirmar una dirección. |
| Ocho documentos 1.0 | 07/10/2026 | Quedan escritos alcance, decisiones, requerimientos, historias, incrementos, modelo, APIs y testing, y se exportan a Word. |
| Alcance 1.1, requerimientos 1.1 | 03/10/2026 | Radio de cobertura, sucursales disponibles y política de stock. |
| Alcance, requerimientos e historias 1.0 | 07/09/2026 | Primera versión de esos tres documentos. |
