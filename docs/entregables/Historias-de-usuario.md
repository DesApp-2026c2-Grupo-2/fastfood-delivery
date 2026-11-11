# Historias de usuario

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.2
**Actualizado:** 11/11/2026
**Fuente:** sección homónima de `Carpeta.md`

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

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.2 | 11/11/2026 | El texto queda igual a la sección de `Carpeta.md` de la entrega del 12/11. Todas las historias de la carpeta están hechas |
| 2.0 | 07/10/2026 | Se adopta la numeración real de las fichas. HU-01 a HU-19 quedan hechas; HU-20 a HU-22 eran el Sprint 4 |
| 1.0 | 07/09/2026 | Versión inicial |
