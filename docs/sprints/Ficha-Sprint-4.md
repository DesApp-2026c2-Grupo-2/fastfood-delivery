# Ficha Sprint 4

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 2.2  
**Actualizado:** 12/10/2026  
**Grupo:** 2 · 5 integrantes (Celeste, Carla, Lucas, Nicolas, Rafael)  
**Sprint:** 4 de 5  
**Planning:** 08/10/2026 (misma clase que el review del Sprint 3)  
**Feedback del profesor:** 12/10/2026  
**Seguimiento:** 15/10/2026  
**Medio término:** 22/10/2026, **presencial**, unos 20 minutos, con slides  
**Review:** 29/10/2026  
**Corte de tareas:** 28/10/2026 23:59 (solo cuenta lo mergeado a `main` hasta esa hora)  
**Duración:** 3 semanas  
**Extensiones:** sigue **Extensión 1** (promociones). Reportes extra, alerta de stock y Extensión 2 quedan para Sprint 5 o fuera  
**Stack:** React + Vite (front cliente y admin) · NestJS + TypeScript (back) · PostgreSQL + Prisma (datos) · JWT

**Después de este sprint queda 1:** Sprint 5 (review 19/11, carpeta 12/11, demo final 27/11).

Los IDs de esta ficha siguen los de las fichas (HU-19 cerró el Sprint 3). El backlog de `Historias-de-usuario.md` quedó con otra numeración; para este sprint manda esta ficha.

El profesor dijo que **no queda mucho del enunciado** (faltan promociones y los reportes base) y que **ya hay partes extra hechas**. Este sprint cierra eso, incorpora la devolución del 08/10 y deja las pruebas más firmes. No abre otro frente grande.

---

## 1. Objetivo del sprint

Al **jueves 22** tienen que estar cerradas estas tres cosas, ya mergeadas el **martes 20 a la noche**:

1. El cliente **elige** si retira el pedido o lo recibe en su domicilio, y **elige la sucursal**. Las que tienen el stock del carrito van primero.
2. Una promoción vigente **se aplica al confirmar** y queda en el importe. En estos días es un porcentual automático. El 2x1 y el cupón no entran antes de la presentación.
3. El admin ve los **cuatro reportes de productos** (más vendidos, menos vendidos, sin stock, mayor facturación).

Si falta una de las tres, el sprint no está cumplido. El miércoles 21 es el ensayo. El jueves 22 se presenta eso. Después no se abre código nuevo: el review del 29/10 muestra lo mismo.

El Sprint 3 dejó el negocio operable con inventario y cuenta. Este sprint deja el pedido **elegible** (cómo y desde dónde), **con un precio promocional** y con la primera lectura de ventas, a tiempo para la presentación.

---

## 2. Estado del Sprint 3 y devolución

### 2.1 Qué cerró el Sprint 3 (en `main`, no rehacer)

| Qué | PR |
|---|---|
| ETA fija, reserva de stock y parámetros (API) | #15 |
| Admin: stock, administradores, parámetros, pedidos | #16 |
| Recuperar contraseña | #18 |
| Sucursales disponibles y mensajes de checkout (sin stock / sin cobertura) | #19 |
| Color de Pendiente y “Agregar al carrito” (DEV-12, DEV-16) | #20 |
| Perfil del cliente (HU-14) | #22 |

HU-14 a HU-19 y DEV-12 a DEV-17 no se reabren.

### 2.2 Devolución del review (08/10), anotada el 12/10

Pedidos del profesor. Los obligatorios se notan en el medio término. Los opcionales no corren a la promo ni a los reportes.

| ID | Qué pidieron | Dueño | Qué hay que hacer |
|---|---|---|---|
| DEV-18 | Los carteles informativos se quedan. En el admin, “Se actualizaron X productos” no se va. | **Carla** (admin) y **Lucas** (cliente) | Un aviso de éxito o información desaparece a los **4 segundos**. Los de error se quedan hasta que la persona corrija o cierre. Mismo criterio en las dos apps. |
| DEV-19 | Eliminar otros administradores | **Carla** | El botón **Borrar** y el `DELETE /api/admin/admins/:id` ya están. El seed no se puede borrar. En la demo hay que **crear un admin y borrarlo**, con confirmación. El aviso de “se borró” entra en DEV-18. |
| DEV-20 | No se encuentran ciertas direcciones | **Nicolas** | Hoy Nominatim pide **un** resultado en Argentina (`limit=1`). Pasar a **hasta 5** candidatos y dejar elegir. Si no hay ninguno, el mensaje sigue siendo claro y la ubicación se marca en el mapa (DEV-21 / DEV-23). No se cambia a Google. |
| DEV-21 | Un mapita al crear o editar una sucursal | **Carla** | Mapa chico (Leaflet + teselas de OpenStreetMap, sin API key). El pin es lat/lng. Buscar la dirección mueve el pin; mover el pin actualiza las coordenadas. No es un recorrido. |
| DEV-22 | No se pueden ver **todas** las sucursales, solo las que cubren la ubicación | **Rafael** | En `/branches`, además de “Las que me cubren”, una lista de **todas las activas**. Las inactivas no aparecen. Si hay ubicación, se muestra la distancia igual. |
| DEV-23 | Un mapa para confirmar que la dirección del cliente es la correcta | **Rafael** | En el alta y la edición de dirección (y en la dirección del invitado), el mismo mapa chico. El pin es lo que se guarda. Geocodificar mueve el pin; la persona lo confirma viéndolo. |

Opcionales. Si el 21/10 lo obligatorio está verde y sobra tiempo; si no, quedan para después del medio término y no bloquean el 29/10:

| ID | Qué pidieron | Dueño | Qué hay que hacer |
|---|---|---|---|
| DEV-24 | Deshabilitar “Confirmar pedido” si está fuera de rango | **Lucas** | Si elige domicilio y ninguna sucursal cubre la dirección, el botón queda deshabilitado y se lee por qué. Con cobertura, se confirma. |
| DEV-25 | Recuperar contraseña por mail, no solo el token del backend | **Celeste** | Si hay SMTP, el mail lleva el link. Si no hay SMTP, sigue el token en pantalla (el flujo de la review no puede depender del correo). |

La idea de promos **con condición** (“si hiciste X pedidos en el último mes, te regalamos Y”) queda anotada. **No entra** en el contrato de este sprint. Se mira en el Sprint 5, cuando la promo base ya se aplique.

---

## 3. Alcance

### Qué pidió el profesor para este sprint

- Cerrar lo que falta del enunciado: **promociones** y **reportes**.
- No inventar otra extensión: las partes extra (stock, cuenta, radio) ya están.
- Mejorar la **robustez de las pruebas** (sección 8).
- En el review del 29/10 **hablan más Lucas, Nicolas y Rafael**.

### Decisión que esta ficha cierra

El ABM de promociones **no alcanza**. La promoción vigente se aplica al confirmar (RF-PRM-02), con el contrato de la sección 4.

La sucursal **ya no se asigna sola**. Desde este sprint el cliente elige retiro o domicilio, y elige el local. El radio y el stock ordenan la lista; no eligen por él. El contrato está en HU-23.

### RF incluidos

| ID | Requerimiento |
|---|---|
| RF-ADM-05 | ABM de promociones |
| RF-PRM-01 | Administración de promociones (descuento, 2x1, cupón) |
| RF-PRM-02 | Aplicar la promoción vigente y reflejarla en el importe |
| RF-RPT-01 | Productos más vendidos |
| RF-RPT-02 | Productos menos vendidos |
| RF-RPT-03 | Productos sin stock |
| RF-RPT-04 | Productos con mayor facturación |

**Sin RF nuevo:** retiro o domicilio, elección de sucursal, listado de todas las sucursales y el mapa de pin. Cambian D21 y D5 de `Supuestos-y-decisiones.md`. El mapa con recorrido (`RF-GEO-03`) sigue fuera.

**Ya cubierto, no se replanifica:** repetir pedido (Sprint 2). Al repetir no se copia la promo ni la sucursal: el checkout nuevo vuelve a preguntar.

### Simplificaciones

| Tema | En Sprint 4 | Después (Sprint 5 o fuera) |
|---|---|---|
| Tipos de promo | `percent`, `fixed`, `two_for_one` | Combos. Condición por cantidad de pedidos (idea del profesor) |
| Cupón | Código reutilizable mientras esté vigente | Cupón de un solo uso |
| Cuántas promos por pedido | **Una** | Acumulables |
| Envío gratis | No. El pedido no tiene costo de envío | — |
| Retiro | Sin dirección. ETA sin traslado (distancia 0). La máquina de estados no se toca | Un estado distinto para “listo para retirar” |
| Domicilio | Dirección obligatoria. Solo sucursales activas dentro del radio | Horario de atención como filtro |
| Elección de sucursal | El cliente elige. Primero las que tienen stock de **todo** el carrito | — |
| Mapa | Pin para confirmar sucursal o dirección. Leaflet + OpenStreetMap | Recorrido del pedido, navegación, Google |
| Reportes | Los 4 de productos, top 10 | RF-RPT-10 a RF-RPT-22 |
| Filtro de fechas | Entra, sobre los 3 reportes de ventas | — |
| Mail de recuperar clave | Opcional (DEV-25). El token demo sigue | — |
| Stock y 2x1 | Se reservan todas las unidades, también la que sale gratis | — |

### Fuera de alcance explícito

Combos, envío gratuito, cupón de un solo uso, promos acumulables, promos con condición, RF-RPT-10 a RF-RPT-22, RF-STK-05, RF-GEO-03 (recorrido), toda Extensión 2.  
No se reabre la máquina de estados ni el stock, salvo lo que hace falta para elegir sucursal.

---

## 4. Historias de usuario

Estimación en puntos. Total del sprint: **23 pts** (18 del frente de enunciado + 5 de la devolución que cambia el pedido). DEV-18 a DEV-25 no suman puntos.

**DoD de cada historia:** funciona en frontend y backend, usable en viewport mobile, mergeada a `main` antes del 28/10 23:59. Para el 21/10 23:59 tienen que estar en `main` la devolución obligatoria (DEV-18 a DEV-23) y HU-23, más un reporte que se pueda mostrar.

### Contrato de retiro, domicilio y sucursal (HU-23)

```
El checkout pregunta primero: delivery | pickup

delivery
  hace falta una dirección
  se listan sucursales activas dentro del radio
  si no hay ninguna: no se puede confirmar (DEV-24)

pickup
  no hace falta dirección
  se listan todas las sucursales activas
  la ETA usa distancia 0 (queda la preparación; no el traslado)

Orden de la lista, en los dos casos
  primero las que tienen stock de todos los ítems del carrito (producto y adicionales)
  después el resto, de la más cercana a la más lejana si hay ubicación
  el cliente elige una. Si hay una sola, viene preseleccionada

Al confirmar, el servidor no “elige la más cercana”
  delivery: la sucursal elegida está activa y dentro del radio; si no, 400
  pickup: la sucursal elegida está activa; si no, 400
  stock: la regla del Sprint 3 contra ESA sucursal (409 y no se crea el pedido si falta algo)
```

El pedido guarda `fulfillment` (`delivery` o `pickup`) y `branchId`. En retiro, `addressId` queda vacío. Pedidos viejos: se completan como `delivery` (ya tienen dirección).

### Contrato de promociones

```
Subtotal (igual que el total de hoy)
  = Σ (precio del producto + Σ precios de adicionales) × cantidad

Una promo vigente
  active = true
  y (startsAt es null o startsAt <= ahora)
  y (endsAt es null o endsAt >= ahora)

Descuento, nunca mayor que el subtotal
  percent       = round(subtotal × value / 100, 2)     value entero 1..100
  fixed         = min(value, subtotal)                 value > 0, pesos
  two_for_one   = floor(cantidadDelProducto / 2) × precioUnitario
                  Los adicionales de esas unidades se cobran.
                  Si el producto está en varias líneas, se suman las cantidades.
                  Con cantidad < 2 el descuento es 0.

Elección (una sola)
  Si el cliente manda couponCode:
    se busca por código (trim, sin distinguir mayúsculas)
    si no está vigente → 400 "Cupón inválido o vencido", no se crea el pedido
    si está vigente y el descuento es 0 → 400 "El cupón no aplica a este pedido"
    si aplica → esa promo, aunque una automática descuente más
  Si no manda código:
    entre las automáticas (code null) con descuento > 0, gana la de mayor descuento
    empate: la creada más tarde
    si ninguna descuenta → sin promo

total = subtotal − descuento
```

El 2x1 no cambia la reserva de stock: se reservan todas las unidades. No hay condición del estilo “X pedidos en el mes”.

Al confirmar se guardan `subtotal`, `discountAmount`, `promotionId` y `promotionName` (copia del nombre). `totalAmount` pasa a ser lo que se cobra. Pedidos viejos: `subtotal = totalAmount`, `discountAmount = 0`, sin promo.

### HU-20 — ABM de promociones — 5 pts

*Como administrador, quiero dar de alta, editar y desactivar promociones, para ofrecer un descuento, un 2x1 o un cupón.*

**RF:** RF-ADM-05, RF-PRM-01  
**Rutas:** `/admin/promotions`  
**API:** `GET/POST /api/admin/promotions`, `GET/PATCH /api/admin/promotions/:id`

Criterios:

- Alta y edición con nombre, tipo (`percent`, `fixed`, `two_for_one`), valor, producto (obligatorio en 2x1), código opcional, activa sí/no, vigencia opcional.
- Sin código, la promo es automática. Con código, es cupón. El código no se repite.
- Listado: nombre, tipo, código, vigencia, activa.
- La baja es lógica (`active = false`). Borrar el registro solo si ningún pedido la usó; si alguno la usó, 409 y queda la desactivación.
- Un cliente no accede a estas rutas ni al API.
- Validaciones en JS antes de enviar.

### HU-21 — Aplicar la promoción al confirmar — 8 pts

*Como cliente, quiero que una promoción vigente se aplique al pedido y se vea en el importe, para pagar el precio promocional.*

**RF:** RF-PRM-02  
**Rutas:** `/checkout`, `/orders`, `/orders/:id`, `/admin/orders/:id`  
**API:** `POST /api/promotions/quote`; `couponCode` opcional en `POST /api/orders` y `POST /api/orders/guest`

Criterios:

- Antes de confirmar, el checkout muestra subtotal, descuento (o “sin descuento”) y total. Con sesión cotiza el carrito; el invitado cotiza los ítems que está por pedir.
- Si hay una automática que descuenta, se ve el nombre sin escribir código.
- Un cupón válido reemplaza a la automática. Un cupón inválido o que no aplica no deja confirmar y el mensaje es el del contrato.
- Cuenta e invitado, y retiro o domicilio, usan la misma regla. La promo no depende de la sucursal.
- El detalle del pedido (cliente y admin) y el historial muestran subtotal, descuento, nombre de la promo y total.
- Editar o desactivar la promo después no cambia pedidos ya creados.
- Repetir pedido no arrastra la promo.
- El stock se reserva por las unidades pedidas, también en un 2x1.
- Tests de backend: porcentual automático, cupón 2x1 con 2 unidades, cupón inválido (400, no crea pedido), descuento que no pasa el subtotal, promo vencida que no aplica.

### HU-22 — Reportes de productos — 5 pts

*Como administrador, quiero ver qué se vende, qué no se vende, qué no tiene stock y qué factura más, para decidir el menú.*

**RF:** RF-RPT-01 a RF-RPT-04  
**Rutas:** `/admin/reports`  
**API:** `GET /api/admin/reports/products?from=&to=`

Criterios:

- Una pantalla con los cuatro listados.
- Más vendidos, menos vendidos y mayor facturación: pedidos con `status != cancelled`, top 10. Cuentan también los `pending`.
- Cantidad = suma de `OrderItem.quantity`. Facturación = suma de `quantity × unitPrice`. Los adicionales no entran en estos tres listados (queda dicho en la pantalla).
- Menos vendidos: productos con `available = true`, incluidos los que vendieron 0, de menor a mayor cantidad.
- Sin stock: producto activo en sucursal activa con `available = 0` o sin fila de stock. No usa el filtro de fechas.
- `from` y `to` opcionales (`YYYY-MM-DD`, día de Argentina) sobre los tres de ventas. Sin filtro, todo el historial.
- Un cliente no accede.
- Test: un pedido cancelado no suma; uno `pending` sí.

### HU-23 — Retiro o domicilio, y sucursal — 5 pts

*Como cliente, quiero elegir si retiro el pedido o me lo traen, y desde qué sucursal, para no quedar atado a la más cercana.*

**RF:** sin RF nuevo (cambia la asignación de RF-BRN-02)  
**Rutas:** `/checkout`, `/branches`  
**API:** listado para el carrito (activas, con `canFulfill` y distancia); `fulfillment` y `branchId` en `POST /api/orders` y `POST /api/orders/guest`

Criterios:

- El checkout pregunta retiro o domicilio antes de confirmar.
- Domicilio: solo sucursales activas dentro del radio, y hace falta dirección. Sin cobertura, no se confirma.
- Retiro: todas las activas, sin dirección. La hora estimada no suma traslado.
- En los dos casos, primero las que tienen stock de todo el carrito. El cliente elige. El pedido guarda esa sucursal, no “la más cercana”.
- Si la elegida no tiene stock, el 409 de siempre nombra el producto y no crea el pedido.
- El servidor rechaza una sucursal fuera de las reglas (inactiva, o domicilio fuera del radio).
- Invitado incluido.
- Tests: retiro sin dirección, domicilio con sucursal fuera del radio (no crea), stock insuficiente en la sucursal elegida.

**Total: 5+8+5+5 = 23 pts**

---

## 5. Incremento visible

### Medio término (22/10), presencial, unos 20 minutos

La PPT va de **decisiones de desarrollo**, con enfoque funcional. No es un recorrido de todas las pantallas. Hablan **Lucas, Nicolas y Rafael**. Celeste y Carla suman si hace falta, pero el profesor pidió que esta vez hablen más ellos.

Slides, en este orden:

1. Qué es Mordi y qué extensión se tomó (y cuál no).
2. Decisiones que ya están en el producto: dos aplicaciones, stock que se reserva, radio de cobertura, hora estimada fija.
3. Decisiones de este sprint: el cliente elige retiro o domicilio y la sucursal (stock primero); una sola promo, sin condiciones.
4. Demo corta (abajo). Una sola historia, bien elegida.
5. Qué queda para el Sprint 5 y cómo se está armando la carpeta.

**Demo (5–7 min). Todo esto está en `main` el martes 20 a la noche:**

1. Admin: el cartel de stock se va solo a los pocos segundos. Crear un admin y borrarlo.
2. Admin: alta o edición de sucursal con el pin en el mapa. Si la dirección no aparece en la búsqueda, el pin igual queda.
3. Cliente: `/branches` muestra las que cubren y también todas.
4. Cliente: dirección con el pin a la vista. Checkout: domicilio, dos sucursales en rango, primero la que tiene el stock. Elige la otra y, si no alcanza, el error nombra el producto.
5. El mismo carrito en **retiro**, sin dirección, sucursal elegida.
6. Una promo porcentual aplicada: subtotal, descuento y total.
7. Un reporte de más vendidos con ese pedido.

### Review (29/10)

Se muestra lo mismo que el 22/10. No hay un frente nuevo después de la presentación. Hablan otra vez más Lucas, Nicolas y Rafael.

**No se demuestra:** combos, 2x1, cupón, promo con condición, envío gratis, reportes extra, alerta de stock, recorrido en el mapa, Extensión 2.

---

## 6. Páginas y APIs de este sprint

**Cliente (a tocar):**

| Ruta | Uso |
|---|---|
| `/checkout` | Retiro o domicilio, sucursal, cupón y desglose (HU-23, HU-21, DEV-24) |
| `/branches` | Las que cubren y todas (DEV-22) |
| `/account/addresses` | Mapa para confirmar el pin (DEV-23) |
| `/orders`, `/orders/:id` | Desglose de la promo, si hay (HU-21) |

**Admin (nuevo / a tocar):**

| Ruta | Uso |
|---|---|
| `/admin/stock`, avisos de éxito | Se van a los 4 segundos (DEV-18) |
| `/admin/admins` | Borrar otro admin en la demo (DEV-19) |
| `/admin/branches` | Candidatos de dirección y mapa (DEV-20, DEV-21) |
| `/admin/promotions` | ABM (HU-20) |
| `/admin/reports` | Cuatro listados (HU-22) |
| `/admin/orders/:id` | Desglose del descuento (HU-21) |

**API (nueva / extendida):**

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/admin/branches/geocode` | Hasta 5 candidatos |
| GET | `/api/branches` | Todas las activas. El listado “dentro del radio” sigue en `/api/branches/available` |
| GET | listado para checkout | Sucursales del carrito con `canFulfill`, distancia y si entran en el radio. Lo define Nicolas en el primer merge |
| POST | `/api/orders`, `/api/orders/guest` | `fulfillment`, `branchId`, `couponCode?` |
| GET/POST | `/api/admin/promotions` | Listado y alta |
| GET/PATCH | `/api/admin/promotions/:id` | Detalle y edición |
| DELETE | `/api/admin/promotions/:id` | Solo si ningún pedido la usó |
| POST | `/api/promotions/quote` | `{ couponCode?: string, items?: [...] }`. Con JWT y sin `items`, cotiza el carrito |
| GET | `/api/admin/reports/products` | Query `from`, `to` opcionales |

`POST /api/promotions/quote` responde:

```json
{
  "subtotal": 10000,
  "discountAmount": 1000,
  "totalAmount": 9000,
  "promotion": { "id": "...", "name": "Promo de la casa", "type": "percent" }
}
```

`promotion` es `null` cuando no hay descuento. Un cupón inválido responde 400 también en la cotización.

Cambios de modelo:

- `Order.fulfillment` (`delivery` por defecto en los pedidos viejos) y `addressId` opcional.
- Nuevo `Promotion` (`name`, `type`, `value`, `productId` opcional, `code` único opcional, `active`, `startsAt`, `endsAt`).
- `Order` suma `subtotal`, `discountAmount` (default 0), `promotionId` opcional, `promotionName` opcional.

Nombres en inglés (dominio canónico). UI en español.

Seed de demo: dos sucursales activas cerca de la dirección de la demo, una con stock del producto y otra sin. Promo automática 10% y cupón `2X1`, cuando entre HU-20.

---

## 7. Tareas y reparto (dos días por persona)

El detalle, las ramas y el checklist de cada uno están en `docs/sprints/Plan-reparto-Sprint-4.md`.

Nicolas mergea el **miércoles 14 a la noche**. Sin ese API, Lucas no abre el checkout. Carla y Rafael hacen sus dos días en paralelo (admin y cliente). Cada uno mergea al terminar su segundo día.

| Dueño | Días | Qué cierra |
|---|---|---|
| **Nicolas** | mar 13 y mié 14 | API de retiro o domicilio, sucursal elegida, geocode de 5 candidatos, tests |
| **Carla** | jue 15 y vie 16 | Carteles, borrar un admin, mapa de sucursal |
| **Rafael** | jue 15 y vie 16 | Todas las sucursales y mapa de la dirección |
| **Lucas** | sáb 17 y dom 18 | Checkout: retiro o domicilio, elegir sucursal, botón fuera de rango |
| **Celeste** | sáb 17 y dom 18 | Los cuatro reportes (API y pantalla) |
| **Nicolas, Carla y Lucas** | lun 19 y mar 20 | Solo una promo porcentual automática. Si el lunes a la noche no está el API, no se improvisa el 2x1 |
| **Cristian** | lun 19 y mar 20 | Borrador del PDF. No codea |

El miércoles 21 es ensayo (Lucas, Nicolas y Rafael). No es un día de features. El mail de recuperar clave no entra. Después del martes 20 no se abre código.

| Fecha | Qué |
|---|---|
| **14/10 noche** | API de sucursal en `main` |
| **15/10** | Clase. A la tarde arrancan Carla y Rafael |
| **16/10** | Admin y sucursales del cliente mergeados |
| **18/10 noche** | Checkout y reportes en `main` |
| **20/10 noche** | Promo porcentual en `main`. Corte de código |
| **21/10** | Ensayo |
| **22/10** | Presentación |

---

## 8. Definición de terminado del sprint

- [ ] HU-20 a HU-23 cumplen sus criterios.
- [ ] DEV-18 a DEV-23 en `main`. DEV-24 y DEV-25, si se tomaron.
- [ ] El demo de la sección 5 está en `main` el martes 20 a la noche. El miércoles 21 solo se ensaya.
- [ ] Slides del 22/10 listas, orientadas a decisiones. Las presentan Lucas, Nicolas y Rafael.
- [ ] App usable en viewport mobile.
- [ ] Pruebas de backend, en la suite que ya corre, y en verde antes del 29/10:
  - retiro sin dirección;
  - domicilio con sucursal fuera del radio, sin crear el pedido;
  - sin stock en la sucursal elegida (409);
  - promo: porcentual, cupón 2x1, cupón inválido, tope del descuento, promo vencida;
  - reporte que ignora cancelados y cuenta un `pending`.
- [ ] Nada de secretos en git (`.env` ignorado).
- [ ] Supuestos, alcance y esta ficha dicen lo mismo sobre sucursal, mapa y promo.
- [ ] Cristian tiene el esquema del PDF único (la carpeta cierra el 12/11, no el 22/10).

---

## 9. Visión de lo que queda (Sprint 5)

| Sprint | Review | Foco |
|---|---|---|
| **4** (este) | 29/10 | Devolución del 08/10, retiro o domicilio, promo aplicada, reportes base, pruebas de esos contratos, presentación del 22/10 |
| **5** | 19/11 | Reportes extra (RF-RPT-10…22), promo con condición si la base ya está, RF-STK-05 si hay tiempo, PDF único (12/11), demo final 27/11 |

Si hay que recortar en el Sprint 5: recorrido en el mapa, Extensión 2 y alerta de stock. **No se recorta** el flujo de pedido, el stock, la sucursal elegida por el cliente ni la promo aplicada.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Hacer la promo con condición porque el profesor la mencionó | No llega la promo simple ni el 22/10 | Queda en Sprint 5. El contrato de la sección 4 no tiene condiciones |
| La devolución se come el fin de semana | El jueves no hay reportes ni promo | El sábado y el domingo son de Lucas (checkout) y Celeste (reportes). La promo es solo el lunes y el martes, y se corta ahí |
| Volver a “la más cercana gana” a mitad de camino | Checkout y API no cierran | Contrato de HU-23 |
| Dos mapas distintos (Google y Leaflet) | Tiempo y claves | Un solo mapa: Leaflet y OpenStreetMap |
| El 22/10 se presenta un tour de pantallas | No es lo que pidió | Seis slides de decisiones y un solo demo |
| Lucas y Rafael se pisan en el checkout | Conflictos | Lucas es el único en `/checkout`. Rafael toca `/branches` y las direcciones |
| Nominatim no encuentra la dirección de la demo | El mapa “no anda” | El pin se puede mover a mano. El seed ya tiene lat/lng |
| Pruebas al final, el día del review | Se rompe lo que ya andaba | Los tests entran con cada HU, no en una semana aparte |

---

## 11. Acta

```
Fecha: 12/10/2026 (feedback del profesor, después del review del 08/10)
Ficha 2.0: incorpora esa devolución
Obligatorio: DEV-18 a DEV-23, HU-23, promociones, cuatro reportes, pruebas de esos contratos
Opcional: DEV-24 (botón deshabilitado fuera de rango), DEV-25 (mail)
No entra: promo condicionada a cantidad de pedidos (Sprint 5)
Presentación 22/10: presencial, ~20 min, slides de decisiones. Hablan más Lucas, Nicolas y Rafael
Carpeta: un solo PDF. La lleva Cristian (entrega 12/11)
```

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 2.2 | 12/10/2026 | Todo el código termina el martes 20. Sábado y domingo cuentan |
| 2.1 | 12/10/2026 | Reparto: dos días por persona. El plan está en `Plan-reparto-Sprint-4.md` |
| 2.0 | 12/10/2026 | Feedback del profesor: devolución del Sprint 3 (carteles, admins, direcciones, mapas, todas las sucursales, retiro o domicilio, elección de sucursal con stock primero). Presentación del 22/10. Pruebas como cierre. La promo con condición no entra |
| 1.0 | 07/10/2026 | Versión para la planning del 08/10: promociones aplicadas y reportes base. Medio término como corte del hilo de promo |
