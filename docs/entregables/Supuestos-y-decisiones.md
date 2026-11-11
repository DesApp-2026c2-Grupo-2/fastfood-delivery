# Supuestos y decisiones de negocio

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.2
**Actualizado:** 11/11/2026
**Fuente:** sección homónima de `Carpeta.md`

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

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.2 | 11/11/2026 | El texto queda igual a la sección de `Carpeta.md` de la entrega del 12/11 |
| 1.4 | 11/11/2026 | D59: el rol solo pedidos también resuelve reclamos y carga el cupón |
| 1.3 | 11/11/2026 | D59: el rol solo pedidos también consulta reclamos y sus cupones |
| 1.2 | 27/10/2026 | ABM de clientes con baja lógica, costo de envío por km y roles de admin (D54 a D60) |
| 1.1 | 12/10/2026 | Feedback del profesor: el cliente elige sucursal, mapa de pin, hasta 5 candidatos de dirección |
| 1.0 | 07/10/2026 | Primera versión de carpeta, con las reglas en uso al cierre del Sprint 3 |
