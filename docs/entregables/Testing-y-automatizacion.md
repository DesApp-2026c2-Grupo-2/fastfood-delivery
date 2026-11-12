# Testing y automatización

**Proyecto:** Mordi, pedidos de una casa de comidas rápidas
**Materia:** Desarrollo de Aplicaciones · 2.º cuatrimestre 2026 · Grupo 2
**Versión:** 2.4
**Actualizado:** 12/11/2026
**Fuente:** sección homónima de `Carpeta.md`

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
| `admin-roles.e2e.test.ts` | El rol solo pedidos ve pedidos, reclamos y cupones, resuelve un reclamo y puede cargar el cupón. Cambiar el estado o cancelar responde 403. El administrador inicial no se baja de rol. |
| `incidents.e2e.test.ts` | No se reporta el pedido de otro ni uno que no se entregó. Es uno por pedido. El cupón lo ve solo ese cliente, se descuenta una vez y, si hay varios, entra el que vence antes. Cambiar la solución la vuelve a marcar como no leída. |
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

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.4 | 12/11/2026 | El test de reclamos también fija que cambiar la solución la vuelve a marcar como no leída |
| 2.3 | 12/11/2026 | El rol solo pedidos también carga el cupón al resolver un reclamo |
| 2.2 | 11/11/2026 | El texto queda igual a la sección de `Carpeta.md` de la entrega del 12/11 |
| 1.1 | 01/11/2026 | address-province.e2e.test.ts y geocode estructurado e inverso (HU-34) |
| 1.0 | 07/10/2026 | Inventario de tests al cierre del Sprint 3 |
