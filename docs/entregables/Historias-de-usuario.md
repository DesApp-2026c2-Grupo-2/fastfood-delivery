# Historias de usuario

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Versión:** 2.0  
**Actualizado:** 07/10/2026  
**Estado:** HU-01 a HU-19 hechas (Sprints 1 a 3). HU-20 a HU-22 son el Sprint 4, todavía no construidas.  
**Relacionados:** `Alcance-funcional.md`, `Requerimientos-funcionales.md`, `Incrementos-de-los-sprints.md`

---

## 1. Cómo leer este documento

Formato: *Como [actor], quiero [acción], para [beneficio].*

Los IDs de HU-09 en adelante son los de las fichas y del código. El borrador del 07/09 los había numerado distinto (el perfil era HU-09; en la ficha del Sprint 2 ese número pasó al historial). Esta versión adopta la numeración que quedó implementada.

| Campo | Significado |
|---|---|
| ID | Identificador estable. No se reutiliza. |
| Épica | Agrupa historias del mismo bloque. |
| RF | Requerimientos que cubre. |
| Sprint | En cuál se construyó o se va a construir. |
| Estado | `Hecha` o `Pendiente`. |

**Definición de terminada:** funciona en frontend y backend, usable en el celular, y está en `main` antes del corte del sprint.

---

## 2. Actores

| Actor | Quién es |
|---|---|
| Visitante | Persona sin cuenta. Puede registrarse, ver el catálogo y confirmar un pedido invitado. |
| Cliente | Usuario autenticado con rol `customer`. |
| Administrador | Usuario autenticado con rol `admin`. |
| Sistema | Comportamiento automático (seed, total, sucursal, stock, ETA). |

## 3. Épicas

| Épica | Nombre | Qué cubre |
|---|---|---|
| E1 | Identidad | Registro, sesión, perfil, recuperar contraseña, admins |
| E2 | Catálogo | ABM, consulta y adicionales |
| E3 | Sucursales y geo | Sucursales, direcciones, radio, asignación |
| E4 | Carrito y pedido | Carrito, confirmación, estados, cancelación |
| E5 | Seguimiento e historial | Timeline, hora estimada, demora, repetir |
| E6 | Administración | Pedidos, stock, parámetros, más admins, promos, reportes |
| E7 | Extensión 1 | Reserva de stock y, en el Sprint 4, promociones aplicadas |

---

## 4. Sprint 1 — hechas (40 pts)

### HU-01 — Registro e inicio de sesión — 5 pts — Hecha

*Como visitante, quiero registrarme e iniciar sesión, para usar la app como cliente.*

**Épica:** E1 · **RF:** RF-CLI-01, RF-CLI-02 · **Rutas:** `/register`, `/login`

1. Creo una cuenta con nombre, email y contraseña y quedo autenticado como `customer`.
2. Inicio sesión con esas credenciales (JWT).
3. Credenciales inválidas muestran un error y no entra.
4. Un cliente no entra a la app administrativa.
5. El catálogo y el carrito se pueden usar sin cuenta. Las direcciones guardadas piden sesión.

### HU-02 — Admin inicial y backoffice — 5 pts — Hecha

*Como administrador, quiero un usuario seed e iniciar sesión en la app de administración, para cargar el menú.*

**Épica:** E1 · **RF:** RF-ADM-01, RF-ADM-02, RF-ADM-04 · **Rutas:** `/admin/login`, `/admin`

1. El sistema nace con un administrador precargado.
2. Ese usuario inicia sesión y ve el home del backoffice.
3. Un cliente no accede a `/api/admin/*`.
4. La app de administración es otro SPA, con la misma API y la misma base.

### HU-03 — ABM de categorías y productos — 8 pts — Hecha

*Como administrador, quiero crear y editar categorías y productos, para armar el catálogo.*

**Épica:** E2 · **RF:** RF-CAT-01, RF-CAT-02 · **Rutas:** `/admin/categories`, `/admin/products`

1. Alta, listado y edición de categoría. No se borra una categoría con productos (409).
2. El producto tiene nombre, descripción, categoría, precio, imagen y disponible sí/no.
3. Un producto con `available = false` no se ofrece al cliente.

### HU-04 — Consultar catálogo — 3 pts — Hecha

*Como cliente, quiero ver productos por categoría, para armar un pedido.*

**Épica:** E2 · **RF:** RF-CAT-03 · **Rutas:** `/products`, `/products/:id`

1. El listado se filtra por categoría.
2. El detalle muestra nombre, precio, descripción e imagen.
3. Solo aparecen productos disponibles. El layout se usa en el celular.

### HU-05 — ABM de sucursales — 5 pts — Hecha

*Como administrador, quiero cargar sucursales con ubicación y horario, para que un pedido tenga un local de origen.*

**Épica:** E3 · **RF:** RF-BRN-01 · **Rutas:** `/admin/branches`

1. Se registran nombre, dirección, latitud, longitud, horarios, teléfono y activa/inactiva.
2. Una sucursal inactiva no se asigna a pedidos nuevos.
3. Hay al menos una sucursal activa de seed para demostrar el checkout.

### HU-06 — Direcciones del cliente — 3 pts — Hecha

*Como cliente, quiero cargar mis direcciones con ubicación geográfica, para indicar dónde entregar.*

**Épica:** E3 · **RF:** RF-CLI-05, RF-GEO-01 · **Rutas:** `/account/addresses`

1. Solo un cliente autenticado administra sus direcciones.
2. Cada dirección tiene texto, latitud y longitud. Desde el Sprint 2 también puede usar la ubicación del dispositivo, y un alias para reconocerla.
3. En el checkout autenticado elijo una dirección guardada.
4. No veo ni edito direcciones de otro cliente.

### HU-07 — Carrito — 5 pts — Hecha

*Como cliente, quiero agregar, cambiar y quitar productos y ver el total, para controlar lo que voy a pagar.*

**Épica:** E4 · **RF:** RF-CRT-01 a RF-CRT-04 · **Rutas:** `/cart`, `/products/:id`

1. Agrego desde el detalle, con cantidad y observaciones.
2. El total es la suma de `(precio + adicionales) × cantidad`. En el Sprint 1, sin adicionales, era `precio × cantidad`.
3. Cambio cantidad y observaciones, y quito ítems, antes de confirmar.
4. El carrito autenticado sobrevive recargar. El de visitante vive en el navegador y, al entrar, pasa a la cuenta.
5. Desde el Sprint 2 una hamburguesa puede llevar adicionales. Esos adicionales no se editan en la línea: se quita y se vuelve a agregar.

### HU-08 — Confirmar pedido — 6 pts — Hecha

*Como cliente, quiero confirmar el pedido, para que quede registrado en el sistema.*

**Épica:** E4 · **RF:** RF-CLI-07, RF-ORD-01, RF-BRN-02 · **Rutas:** `/checkout`

1. Con cuenta: carrito con ítems y dirección guardada crean el pedido.
2. Quedan sucursal, dirección, fecha y hora, detalle, importe y estado `pending`.
3. Después el carrito queda vacío.
4. En el Sprint 1, si no había sucursal activa, no se creaba el pedido. Desde el Sprint 3 tampoco se crea si ninguna sucursal activa está dentro del radio, o si no hay stock.
5. Un visitante puede confirmar con nombre, email y dirección puntual. Eso no cubre el ABM de direcciones.

---

## 5. Sprint 2 — hechas (25 pts)

### HU-09 — Historial de pedidos — 4 pts — Hecha

*Como cliente, quiero ver mis pedidos anteriores con detalle, importe, fecha y estado, para saber qué pedí.*

**Épica:** E5 · **RF:** RF-CLI-06, RF-HIS-01 · **Rutas:** `/orders`, `/orders/:id`

1. Solo veo mis pedidos. Un invitado no usa esta pantalla.
2. El listado muestra fecha, importe, estado y sucursal, del más reciente al más viejo.
3. El detalle muestra ítems, dirección, sucursal e importe.

### HU-10 — Seguimiento del pedido — 6 pts — Hecha

*Como cliente, quiero ver cómo evoluciona mi pedido, para saber quién lo prepara, en qué está y cuándo llega.*

**Épica:** E5 · **RF:** RF-TRK-01, RF-TRK-02, RF-TRK-03 · **Rutas:** `/orders/:id`

1. Se ve la sucursal, el estado en español y el timeline con fecha y hora de cada cambio.
2. Desde el Sprint 3 la hora estimada se calculó una vez al confirmar (“Llega aprox. 21:40”) y, si se pasó, se ve la demora.
3. Un pedido cancelado no promete llegada.

### HU-11 — Cancelar pedido — 3 pts — Hecha

*Como cliente, quiero cancelar un pedido que todavía no empezó a prepararse, para no recibirlo si me arrepentí.*

**Épica:** E4 · **RF:** RF-ORD-04 · **Rutas:** `/orders/:id`

1. Puedo cancelar en `pending` o `confirmed`.
2. Desde `preparing` el botón no está y la API no cambia el pedido.
3. El admin también puede cancelar en esos estados.
4. Queda el registro `cancelled` con fecha y hora. Desde el Sprint 3, cancelar libera el stock reservado.

### HU-12 — Repetir un pedido anterior — 3 pts — Hecha

*Como cliente, quiero repetir un pedido anterior, para no armar el carrito de nuevo.*

**Épica:** E5 · **RF:** RF-HIS-02

1. Copia producto, cantidad, observaciones y adicionales al carrito. No clona el pedido.
2. Si un producto ya no está disponible, se omite.
3. Después voy al carrito. Confirmar es un pedido nuevo: la verificación de stock y de cobertura es en ese momento.
4. Si el carrito ya tenía productos, el botón dice “Agregar al carrito” y los ítems se suman.

### HU-13 — Pedidos en admin y máquina de estados — 9 pts — Hecha

*Como administrador, quiero ver los pedidos y cambiar su estado, para llevar cada uno hasta la entrega.*

**Épica:** E4 / E6 · **RF:** RF-ORD-02, RF-ORD-03, RF-ADM-10 · **Rutas:** `/admin/orders`, `/admin/orders/:id`

1. Listado con filtro por estado y el código completo del pedido.
2. El detalle muestra cliente, sucursal, dirección, ítems, importe, estado, timeline, hora estimada y demora.
3. Solo se pasa al siguiente estado válido. Cada cambio queda en el historial, con quién lo hizo.
4. Al pasar a `delivered`, la reserva de stock se descuenta.
5. Un cliente no accede a estas rutas.

---

## 6. Sprint 3 — hechas (26 pts)

### HU-14 — Perfil del cliente — 3 pts — Hecha

*Como cliente, quiero consultar y modificar mis datos personales, para mantener mi cuenta al día.*

**Épica:** E1 · **RF:** RF-CLI-04 · **Rutas:** `/account` · **API:** `GET /api/me`, `PATCH /api/me`

1. Veo y edito el nombre. El email es de solo lectura.
2. Cambio la contraseña con la actual y la nueva.
3. El “Hola {nombre}” del encabezado se actualiza al guardar.
4. Solo el dueño de la cuenta lee y edita sus datos.

### HU-15 — Recuperar contraseña — 4 pts — Hecha

*Como cliente, quiero recuperar mi contraseña, para volver a entrar si la olvidé.*

**Épica:** E1 · **RF:** RF-CLI-03 · **Rutas:** `/forgot-password`, `/reset-password`

1. Desde el login inicio el flujo con el email.
2. Obtengo un token demostrable (sin SMTP), vigente 30 minutos y de un solo uso.
3. Con el token y una contraseña nueva puedo iniciar sesión.
4. Un email inexistente recibe la misma respuesta genérica.

### HU-16 — Alta de administradores — 3 pts — Hecha

*Como administrador, quiero crear otros administradores, para no depender de un solo usuario seed.*

**Épica:** E6 · **RF:** RF-ADM-03, RF-ADM-07 · **Rutas:** `/admin/admins`

1. Veo el listado (nombre, email) y doy de alta con nombre, email y contraseña inicial.
2. Puedo editar y borrar. El administrador inicial no se borra ni cambia de email.
3. Un cliente no accede. El seed del Sprint 1 sigue existiendo.

### HU-17 — Stock por sucursal — 6 pts — Hecha

*Como administrador, quiero cargar el stock de cada producto por sucursal, para saber qué hay en cada local.*

**Épica:** E6 · **RF:** RF-ADM-06, RF-STK-01, RF-STK-03 · **Rutas:** `/admin/stock`

1. Elijo una sucursal y veo o edito la cantidad disponible de cada producto.
2. Un producto puede tener stock en una sucursal y cero, o ninguna fila, en otra.
3. Se ven disponible y reservado. El admin edita solo el disponible.
4. Un cliente no accede.

### HU-18 — Verificar y reservar stock al pedir — 5 pts — Hecha

*Como sistema, quiero verificar y reservar stock al confirmar, y liberarlo si se cancela, para no vender lo que no hay.*

**Épica:** E7 · **RF:** RF-STK-02, RF-STK-04

1. Si no hay stock suficiente en la sucursal asignada, el checkout falla con un mensaje que nombra el producto y no se crea el pedido.
2. Si alcanza, el stock queda reservado. Los adicionales descuentan igual.
3. Cancelar en `pending` o `confirmed` libera la reserva.
4. Al marcar `delivered`, la reserva se descuenta para siempre.
5. Repetir no reserva: la verificación es al confirmar.

### HU-19 — Parámetros, radio y sucursales disponibles — 5 pts — Hecha

*Como administrador, quiero ajustar radio y ETA; como cliente, quiero ver qué sucursales me cubren.*

**Épica:** E3 / E6 · **RF:** RF-ADM-08, RF-ADM-09, RF-BRN-03 · **Rutas:** `/admin/parameters`, `/branches`

1. El admin edita el radio de cobertura y las constantes de la hora estimada.
2. Al confirmar solo se consideran sucursales activas dentro del radio. Si ninguna llega, no se crea el pedido.
3. El cliente ve las sucursales que lo cubren: nombre, dirección, distancia y horario, de la más cercana a la más lejana.
4. Los estados de pedido se listan con su etiqueta, en solo lectura. La máquina no se edita.

---

## 7. Sprint 4 — pendientes (18 pts)

El contrato de precios está en `Supuestos-y-decisiones.md` (D46 a D52) y en `docs/sprints/Ficha-Sprint-4.md`.

### HU-20 — ABM de promociones — 5 pts — Pendiente

*Como administrador, quiero dar de alta, editar y desactivar promociones, para ofrecer un descuento, un 2x1 o un cupón.*

**Épica:** E6 · **RF:** RF-ADM-05, RF-PRM-01 · **Rutas:** `/admin/promotions`

### HU-21 — Aplicar la promoción al confirmar — 8 pts — Pendiente

*Como cliente, quiero que una promoción vigente se aplique al pedido y se vea en el importe, para pagar el precio promocional.*

**Épica:** E7 · **RF:** RF-PRM-02 · **Rutas:** `/checkout`, detalle del pedido

### HU-22 — Reportes de productos — 5 pts — Pendiente

*Como administrador, quiero ver qué se vende, qué no se vende, qué no tiene stock y qué factura más, para decidir el menú.*

**Épica:** E6 · **RF:** RF-RPT-01 a RF-RPT-04 · **Rutas:** `/admin/reports`

---

## 8. Sprint 5 — pendientes, sin estimar en ficha

| ID | Historia | RF | Estado |
|---|---|---|---|
| HU-23 | *Como administrador, quiero reportes de pedidos (por día, sucursal, estado, tiempo promedio, cancelados), para ver la operación.* | RF-RPT-10 a RF-RPT-14 | Pendiente |
| HU-24 | *Como administrador, quiero reportes de clientes (más pedidos, nuevos, inactivos), para ver la base.* | RF-RPT-15 a RF-RPT-17 | Pendiente |
| HU-25 | *Como administrador, quiero reportes de sucursales (ventas, productos, pedidos atendidos), para comparar locales.* | RF-RPT-18 a RF-RPT-20 | Pendiente |
| HU-26 | *Como administrador, quiero ver las promociones más usadas y su impacto en las ventas, para decidir cuáles mantener.* | RF-RPT-21, RF-RPT-22 | Pendiente |
| HU-27 | *Como administrador, quiero una alerta de stock mínimo, para reponer a tiempo.* | RF-STK-05 | Pendiente, si hay tiempo |

**Fuera de compromiso:** mapa (`RF-GEO-03`) y Extensión 2 (calificaciones, notificaciones, repartidores). No tienen historia de entrega.

---

## 9. Trazabilidad HU → RF

| RF | HU | Sprint | Estado |
|---|---|---|---|
| RF-CLI-01, RF-CLI-02 | HU-01 | 1 | Hecha |
| RF-CLI-03 | HU-15 | 3 | Hecha |
| RF-CLI-04 | HU-14 | 3 | Hecha |
| RF-CLI-05, RF-GEO-01 | HU-06 | 1 | Hecha |
| RF-CLI-06, RF-HIS-01 | HU-09 | 2 | Hecha |
| RF-CLI-07, RF-ORD-01 | HU-08 | 1 | Hecha |
| RF-ADM-01, RF-ADM-02, RF-ADM-04 | HU-02 | 1 | Hecha |
| RF-ADM-03, RF-ADM-07 | HU-16 | 3 | Hecha |
| RF-ADM-05, RF-PRM-01 | HU-20 | 4 | Pendiente |
| RF-ADM-06, RF-STK-01, RF-STK-03 | HU-17 | 3 | Hecha |
| RF-ADM-08, RF-ADM-09, RF-BRN-03 | HU-19 | 3 | Hecha |
| RF-ADM-10, RF-ORD-02, RF-ORD-03 | HU-13 | 2 | Hecha |
| RF-BRN-01 | HU-05 | 1 | Hecha |
| RF-BRN-02, RF-GEO-02 | HU-08, HU-19 | 1 y 3 | Hecha |
| RF-CAT-01, RF-CAT-02 | HU-03 | 1 | Hecha |
| RF-CAT-03 | HU-04 | 1 | Hecha |
| RF-CAT-04 | HU-07 (desde el Sprint 2) | 2 | Hecha, solo adicionales |
| RF-CRT-01 a RF-CRT-04 | HU-07 | 1 | Hecha |
| RF-ORD-04 | HU-11 | 2 | Hecha |
| RF-TRK-01 a RF-TRK-03 | HU-10 | 2 | Hecha |
| RF-HIS-02 | HU-12 | 2 | Hecha |
| RF-GEO-03 | — | — | Fuera |
| RF-PRM-02 | HU-21 | 4 | Pendiente |
| RF-RPT-01 a RF-RPT-04 | HU-22 | 4 | Pendiente |
| RF-STK-02, RF-STK-04 | HU-18 | 3 | Hecha |
| RF-STK-05 | HU-27 | 5 | Pendiente |
| RF-RPT-10 a RF-RPT-22 | HU-23 a HU-26 | 5 | Pendiente |

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.0 | 07/10/2026 | Se adopta la numeración real de las fichas. HU-01 a HU-19 quedan hechas; HU-20 a HU-22 son el Sprint 4 |
| 1.0 | 07/09/2026 | Versión inicial. El backlog de HU-09 en adelante se reasignó en los plannings siguientes |
