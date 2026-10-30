# Ficha Sprint 5

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 1.2  
**Actualizado:** 29/10/2026  
**Grupo:** 2 · 5 integrantes, en el orden de trabajo: Rafael, Nicolas, Lucas, Celeste, Carla  
**Sprint:** 5 de 5 (el último)  
**Planning:** 29/10/2026 (misma clase que el review del Sprint 4)  
**Seguimiento:** 05/11/2026  
**Carpeta (PDF único):** 12/11/2026  
**Review:** 19/11/2026  
**Corte de tareas:** 18/11/2026 23:59 (solo cuenta lo mergeado a `main` hasta esa hora)  
**Presentación final:** 27/11/2026  
**Duración:** 3 semanas  
**Extensiones:** sigue **Extensión 1** (promociones y reportes extra). Extensión 2 queda fuera  
**Stack:** React + Vite (front cliente y admin) · NestJS + TypeScript (back) · PostgreSQL + Prisma (datos) · JWT

**Después de este sprint no queda otro.** Lo que no esté en `main` el 18/11 no se muestra el 19/11 ni el 27/11.

Los IDs siguen los de la ficha 1.0. Esta versión saca lo que ya está construido y deja solo lo que falta.

---

## 1. Objetivo del sprint

El equipo trabaja en este orden: **Rafael, Nicolas, Lucas, Celeste, Carla.** El detalle de días e historias está en `Plan-reparto-Sprint-5.md`.

Al **lunes 16/11 a la noche** tienen que estar en `main`, como mínimo:

1. En el admin se puede **asignar el rol** (super admin / solo pedidos) y el menú de “solo pedidos” no muestra el resto.
2. Los reportes filtran por **fecha y sucursal**, se ven en **gráficos** y se pueden **descargar**.

Esas dos no se recortan. El resto entra en el mismo plazo, en el orden del plan. El 17 y 18/11 son de pruebas y ensayo, no de features.

El pedido, el stock, la sucursal elegida, las promos del menú, los sellos y el Top 3 **ya andan**. Este sprint no los reabre.

---

## 2. Qué ya está hecho (no replanificar)

### 2.1 Cerró el Sprint 4

| Qué | PR |
|---|---|
| Retiro o domicilio, elección de sucursal, avisos que desaparecen (HU-23, DEV-24, DEV-18) | #26 |
| Reportes de productos (HU-22) | #27 |
| Promo porcentual automática y 2x1 aplicados al confirmar (HU-21) | #28, #29 |
| ABM de clientes, roles de admin y costo de envío por km en el backend | #30 |
| Términos y condiciones y pie de página | #31 |

### 2.2 De la lista del 29/10, ya construido

| Ítem | Cómo quedó |
|---|---|
| Precios de envío | Precio por km × distancia. El admin lo edita en Parámetros. El checkout muestra el envío de cada sucursal. |
| Clientes que compraron | Pantalla en `/admin/customers`: listado, búsqueda, detalle, alta, edición y baja lógica. |
| Roles de admin | El API distingue `super_admin` y `orders_viewer` (el viewer recibe 403 fuera de pedidos). **Falta la pantalla** → queda HU-24. |
| Código del pedido | No son 6–8 dígitos sueltos. Es **3 letras de la sucursal + 6 dígitos** (`MOR482913`). Los pedidos viejos se completaron con las letras de su sucursal. El admin busca por el código completo o por los 6 dígitos. |
| Sellos | Campaña con inicio y fin. Cada pedido que llega al mínimo suma un sello al crearlo; si se cancela, se revierte. Al completar la tarjeta, ese pedido lleva el premio. La cantidad de pedidos, el mínimo y el % se editan en la card de Campañas. En el cliente: tarjeta en la cuenta, en Mis pedidos, en el detalle y en la confirmación. **El % del premio no se publica**: es sorpresa. |
| Top 3 compradores | Campaña propia, al lado de Promociones. Ranking por gasto desde que se inicia. Al premiar, los 3 primeros reciben un descuento de un solo uso. El % se edita en la card y tampoco se publica. |
| Baja de cuenta | En `/account`, con contraseña. Si hay un pedido en curso, 409. Los datos personales se anonimizan; los pedidos quedan. |
| Medio de pago simulado | En el checkout (con cuenta y como invitado) se elige efectivo, tarjeta o transferencia. La transferencia muestra los datos de demo. **No se cobra y no se guarda en el pedido**: queda en la confirmación de esa sesión. |
| Banner de promo | Solo en el catálogo, y en el carrito si todavía no se aplicó una promo. No está en términos, checkout ni el resto. **No está en el detalle del producto** → DEV-26, si se quiere ahí también. |
| Detalle del producto sin sesión | El detalle y los adicionales de la hamburguesa se ven igual sin estar logueado. |
| Pedido de retiro | Tag **Retiro**. No pasa por “en camino”: de listo va a retirado. Las etiquetas son “Listo para retirar” y “Retirado”. |
| Confirmación del pedido | El estado se actualiza solo, igual que en el detalle, y la pantalla queda si se refresca. |
| Sellos en el front | La tarjeta de estampas está en la cuenta, en Mis pedidos, en el detalle del pedido y en la confirmación. En el listado, el pedido que sumó sello muestra la estampa al lado del total. |
| Aviso del 2x1 | Si la cantidad elegida es impar, el detalle avisa que la siguiente sale gratis. Después de agregar, el aviso sigue solo si en el carrito esa cantidad quedó impar. |

### 2.3 Hecho y no estaba en la ficha 1.0

| Qué | Dónde |
|---|---|
| Campañas separadas de las promos del menú | `/admin/campaigns`. Promociones queda con el % y el 2x1. |
| Página pública de promociones | `/promociones`, al lado de Términos. Muestra las promos vigentes (foto o %) y las campañas (sello y copa), sin el % del premio. |
| Si entran varias promos, se ve cuáles aplicarían y se aplica solo la que más descuenta | Carrito y checkout. |
| Los tests no usan la base de la aplicación | Corren contra `fastfood_test`. `npm test` la prepara antes. |

### 2.4 Sigue afuera, a propósito

Cupón, promo de monto fijo, promos que se suman entre sí, alerta de stock mínimo, recorrido en el mapa, Extensión 2, pasarela de pago real. **Combos** siguen fuera: ver §3.

---

## 3. Qué falta

### Núcleo

| Ítem | Dónde |
|---|---|
| Rol en la pantalla de administradores, y menú según el rol | HU-24 |
| Reportes: filtro por fecha y sucursal, gráficos y descarga | HU-28 |

### Segundo nivel

En este orden. Se toma del 10 al 16/11 si el núcleo está en `main`.

| Ítem | Dónde | Notas |
|---|---|---|
| Envío gratis desde un monto | HU-31 | No estaba construido. No es una promo: no compite con el descuento. |
| Adicionales marcados en cada producto | HU-30 | Hoy todo adicional se ofrece en todas las hamburguesas. |
| Dashboard con un gráfico | HU-33 | El inicio del admin es un listado, sin gráfico. |
| Código postal y provincia en las direcciones | HU-34 | El geocode ya puede devolver el CP. La dirección no lo guarda. |
| Horarios de la sucursal | HU-37 | **No estaba en la ficha 1.0.** Hoy `openingHours` es un texto libre. |
| Nosotros, contacto y mapa de sucursales | HU-35 | El pin del mapa existe para elegir un punto. Falta el mapa con todas las sucursales, y las dos páginas. |
| Reportar un problema con un pedido | HU-36 | |
| Banner de la promo también en el detalle del producto | DEV-26 | El resto del banner ya está. |

### Fuera

**Combos.** Tocan carrito, stock, promo y reportes a la vez. Si se insiste, la versión mínima es un producto de la categoría Combos, con stock propio: no descuenta los productos que lo componen.

---

## 4. Historias que siguen abiertas

**Núcleo: 10 pts** (HU-24 y HU-28). Segundo nivel: 20 pts. DEV-26 no suma.

**DoD:** funciona en frontend y backend, usable en mobile, con test de backend si cambia una regla, mergeada a `main` antes del 18/11 23:59.

### HU-24 — Rol en el admin — 2 pts

El API ya existe (`AdminRole`, 403 fuera de pedidos para `orders_viewer`). Falta la pantalla.

*Como super admin, quiero darle a otro admin un rol que solo vea pedidos, para separar quién opera de quién consulta.*

**Rutas:** `/admin/admins` (alta y edición), menú de `AdminLayout`

Criterios:

- En el alta y la edición, selector Super admin / Solo pedidos. Los 409 del API se muestran tal cual.
- Con `orders_viewer`, el menú solo muestra Pedidos (y el inicio, si no deja operar). No hay botones para cambiar estado ni cancelar. Un 403 vuelve a Pedidos.
- El listado de administradores muestra el rol.

### HU-28 — Reportes con filtros, gráficos y descarga — 8 pts

*Como administrador, quiero filtrar los reportes por fecha y sucursal, verlos en gráficos y descargarlos, para analizar las ventas fuera del sistema.*

**RF:** RF-RPT-10 a RF-RPT-15, RF-RPT-18, RF-RPT-19, RF-RPT-21  
**Rutas:** `/admin/reports`  
**API:** extender `GET /api/admin/reports/products` con `from`, `to` y `branchId`. Sumar `GET /api/admin/reports/orders` con los mismos filtros.

Hoy `/admin/reports` trae más vendidos, menos vendidos, sin stock y facturación, sin filtros y sin gráfico.

Criterios:

- `from` y `to` opcionales (`YYYY-MM-DD`, día de Argentina); `branchId` opcional. Sin filtros, todo el historial y todas las sucursales. “Sin stock” respeta la sucursal y no las fechas.
- Pedidos: por día (línea), por estado (barras), por sucursal, cancelados (cantidad y % ), tiempo promedio de entrega (de `confirmed` a `delivered`).
- Ventas por sucursal (`totalAmount`, sin cancelados).
- Top 10 clientes por cantidad de pedidos (sin cancelados, sin invitados).
- Promociones más usadas: cantidad de pedidos y descuento total por `promotionName`. El premio de sellos y el del Top 3 aparecen con el nombre guardado (`Premio Fidelidad`, `Premio Top 3`), sin el porcentaje.
- Cada listado tiene **Descargar CSV** con los filtros aplicados (separador `;`, UTF-8 con BOM).
- Cancelados no cuentan en las ventas. `pending` sí, igual que HU-22.
- Tests: un pedido de otro día queda afuera del filtro de fechas; el de otra sucursal queda afuera; el tiempo promedio se calcula con dos pedidos entregados.

**Si sobra tiempo:** RF-RPT-16 (clientes nuevos), RF-RPT-17 (inactivos), RF-RPT-20, RF-RPT-22.

### HU-30 — Adicionales elegidos por producto — 5 pts

Hoy un adicional es un producto de la categoría Adicional y se ofrece en **todas** las de Hamburguesas.

- Nuevo `ProductExtra { productId, extraId }`. La migración marca, en cada hamburguesa, todos los adicionales que hay hoy, así nada cambia el día del merge.
- En `/admin/products`, al editar: “Adicionales que se ofrecen”.
- El detalle, el carrito y el pedido usan esa relación. Un adicional no marcado → 400.
- Test: un adicional no marcado no se puede agregar.

### HU-31 — Envío gratis desde un monto — 2 pts

- Parámetro `free_delivery_min_subtotal` (0 = desactivado).
- Si el subtotal menos el descuento llega al mínimo, el envío es 0. No compite con la promo ni con el premio.
- El checkout dice “Envío gratis” o “Te faltan $X para el envío gratis”.
- Test: justo en el mínimo, gratis; un peso menos, se cobra.

### HU-33 — Dashboard con gráficos — 2 pts

- En el inicio del admin: pedidos de hoy, facturación de hoy, pedidos por estado (barras) y ventas de los últimos 7 días (línea).
- Usa el API de HU-28. Con `orders_viewer` solo se ve lo de pedidos.

### HU-34 — Código postal y provincia — 3 pts

- `Address` suma `postalCode` y `province` (opcionales; las direcciones viejas quedan vacías).
- El formulario (cuenta e invitado) pide calle y número, ciudad, provincia (las 24) y CP.
- El geocode arma la búsqueda estructurada de Nominatim y, si no encuentra, usa la búsqueda libre de hoy.
- El pin para marcar el punto sigue igual.
- Test: la query del geocode sale estructurada.

### HU-35 — Nosotros, contacto y mapa — 3 pts

- `/nosotros`: misión, visión y valores. Texto fijo.
- `/contacto`: mail, y el teléfono y el horario de cada sucursal activa. Link `mailto:`.
- `/branches`: un mapa (Leaflet, el mismo que ya usa el pin) con un marcador por sucursal activa. Al tocarlo: nombre, dirección y horario.
- Links en el pie, al lado de Términos y Promociones.

### HU-36 — Reportar un problema con un pedido — 3 pts

- `Incident { orderId, userId, reason, message, status, createdAt, resolvedAt }`. Motivos: faltó algo, pedido equivocado, llegó tarde, llegó frío, otro. Estado: abierta o resuelta.
- En el detalle, si el pedido está entregado o retirado, “Tuve un problema”. Uno por pedido.
- `/admin/incidents`: abiertas primero, link al pedido, marcar resuelta.
- Test: no se reporta el pedido de otro ni uno que no se entregó.

### HU-37 — Horarios de la sucursal — 2 pts

No estaba en la ficha 1.0. Hoy el horario es un texto (`openingHours`) que se muestra tal cual.

*Como cliente, quiero ver si la sucursal está abierta, para no pedir cuando ya cerró.*

- El admin carga días y franjas (apertura y cierre), no solo una frase.
- En sucursales, en el checkout y en el contacto se lee ese horario.
- Si está cerrada, el checkout lo avisa. No se bloquea el pedido en esta versión: es un aviso.
- El texto viejo se conserva como respaldo hasta que la sucursal tenga franjas cargadas.

### DEV-26 — Banner en el detalle del producto

El banner ya no está en el layout general. Falta, si se mantiene esta lista, mostrarlo también en `/products/:id`. En el carrito sigue apareciendo solo cuando ninguna promo se aplicó.

---

## 5. Incremento visible

### Review (19/11)

En el orden en que se construyó:

1. Rafael: dirección con provincia y CP, nosotros, contacto y el mapa.
2. Nicolas: un producto con sus adicionales.
3. Lucas: envío gratis, un reclamo sobre un pedido entregado y el banner en el detalle.
4. Celeste: reportes de esta semana y de una sucursal, gráfico y CSV.
5. Carla: un admin “solo pedidos”, el inicio con el gráfico y una sucursal con horario.
6. Recorrido corto de lo que ya está: un pedido de retiro con código `MOR…`, el medio de pago en el checkout, la tarjeta de sellos y la campaña del Top 3.

### Presentación final (27/11)

La misma demo, más ordenada, y las decisiones: sellos y Top 3 como campañas (el premio es sorpresa), el código con las letras de la sucursal, la baja que anonimiza, y qué quedó fuera (combos, pasarela, Extensión 2).

**No se demuestra:** combos, cupón, pasarela real, alertas de stock, recorrido en el mapa.

---

## 6. Páginas y APIs que todavía hay que tocar

**Cliente**

| Ruta | Uso |
|---|---|
| `/products/:id` | Banner (DEV-26) |
| `/checkout` | Envío gratis (HU-31), aviso de horario (HU-37) |
| `/account/addresses` | CP y provincia (HU-34) |
| `/branches` | Mapa (HU-35) |
| `/nosotros`, `/contacto` | HU-35 |
| `/orders/:id` | Reportar un problema (HU-36) |

**Admin**

| Ruta | Uso |
|---|---|
| `/admin/admins` | Rol (HU-24) |
| `AdminLayout` | Menú según rol (HU-24) |
| `/admin/reports` | Filtros, gráficos, CSV (HU-28) |
| `/admin` | Dashboard (HU-33) |
| `/admin/products` | Adicionales del producto (HU-30) |
| `/admin/parameters` | `free_delivery_min_subtotal` (HU-31) |
| `/admin/branches` | Franjas de horario (HU-37) |
| `/admin/incidents` | HU-36 |

**API**

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/admin/reports/products` | `from`, `to`, `branchId` |
| GET | `/api/admin/reports/orders` | Los cortes de HU-28 |
| GET | `/api/products/:id/extras` | HU-30 |
| PUT | `/api/admin/products/:id/extras` | `{ extraIds }` |
| POST | `/api/orders/:id/incident` | HU-36 |
| GET / PATCH | `/api/admin/incidents` | Listado y resolver |

Cambios de modelo que faltan: `ProductExtra`, `Address.postalCode`, `Address.province`, `Incident`, y el horario estructurado de la sucursal. El código del pedido, los sellos y el Top 3 **ya están** y no se vuelven a modelar.

---

## 7. Reparto

El desglose por días está en `Plan-reparto-Sprint-5.md`. Orden de trabajo: Rafael, Nicolas, Lucas, Celeste, Carla. Cada uno cierra sus historias enteras.

| Orden | Quién | Historias | Puntos | En `main` |
|---|---|---|---|---|
| 1 | **Rafael** | HU-34, HU-35 | 6 | mié 4/11 |
| 2 | **Nicolas** | HU-30 | 5 | vie 6/11 |
| 3 | **Lucas** | HU-31, HU-36, DEV-26 | 5 | mar 10/11 |
| 4 | **Celeste** | HU-28 | 8 | vie 13/11 |
| 5 | **Carla** | HU-24, HU-33, HU-37 | 6 | lun 16/11 |
| — | **Cristian** | Carpeta. No codea | — | mié 12/11 |

| Fecha | Qué |
|---|---|
| **05/11** | Seguimiento: lo de Rafael, y adicionales en curso |
| **12/11** | Carpeta, con lo mergeado el martes 11 a la noche |
| **16/11 noche** | Corte de features |
| **17–18/11** | Pruebas y ensayo |
| **19/11** | Review |
| **27/11** | Presentación final |

---

## 8. Definición de terminado

- [ ] HU-24 y HU-28 cumplen sus criterios. Del segundo nivel, lo que entró cumple los suyos.
- [ ] La demo de la sección 5 corre con el seed, en local y en el deploy.
- [ ] App usable en mobile (cliente y admin).
- [ ] `npm test` en verde, contra `fastfood_test`, no contra la base de la aplicación.
- [ ] Tests nuevos de HU-28 (fechas, sucursal, tiempo promedio) dentro de esa suite.
- [ ] Nada de secretos en git.
- [ ] La carpeta del 12/11 refleja esta ficha, no la 1.0.

---

## 9. Qué queda después del sprint

No hay Sprint 6. Lo que no entre va a la carpeta como trabajo futuro.

| Tema | Por qué |
|---|---|
| Combos | Tocan carrito, stock, promo y reportes a la vez |
| Pasarela real | El pago simulado alcanza para el enunciado |
| Cupón y promos que se suman | El premio de la campaña cubre el descuento personal, y no se suma con las otras |
| Alertas de stock | Opcional de la extensión |
| Recorrido en el mapa | Optativo |
| Extensión 2 | No se tomó |

Si hay que recortar: el segundo nivel, de abajo hacia arriba. No se recorta el pedido, el stock, la sucursal, las promos, los sellos ni el Top 3.

---

## 10. Riesgos

| Riesgo | Qué hacer |
|---|---|
| Rehacer sellos o el Top 3 “como decía la ficha 1.0” (sello al entregar, premio guardado para después, % publicado) | No. Ya están y la demo usa esa versión. |
| Combos “porque es rápido” | Fuera. |
| Los reportes se calculan en memoria | Agrupar en la base. |
| Un test vuelve a escribir la base real | La suite apunta a `fastfood_test`. No correr los e2e contra `fastfood`. |

---

## 11. Acta

```
Fecha: 29/10/2026
Ficha 1.1: se sacó de la planning lo que ya está construido.

Hecho y no se replanifica:
  envío por km, ABM de clientes, código (3 letras de la sucursal + 6 dígitos),
  sellos y Top 3 como campañas (premio sorpresa), baja de cuenta anonimizada,
  pago simulado en el checkout, banner en catálogo y carrito, detalle sin sesión,
  retiro diferenciado, confirmación en vivo, página pública de promociones.

Orden: Rafael (HU-34, HU-35), Nicolas (HU-30), Lucas (HU-31, HU-36, DEV-26),
  Celeste (HU-28), Carla (HU-24, HU-33, HU-37). Cada uno cierra lo suyo entero.
No se recortan el rol ni los reportes.
Fuera: combos, cupón, pasarela, alertas de stock, recorrido, Extensión 2.

Review: 19/11. Carpeta: 12/11. Final: 27/11.
```

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 29/10/2026 | Borrador para la planning: núcleo, segundo nivel y fuera |
| 1.1 | 29/10/2026 | Se sacaron las tareas ya hechas (sellos, Top 3, código, clientes, envío por km, baja, pago simulado, banner, retiro, confirmación en vivo). Se agregó el horario de la sucursal, que no estaba. El núcleo que queda es el rol en la pantalla y los reportes. |
| 1.2 | 29/10/2026 | El reparto queda en orden: Rafael, Nicolas, Lucas, Celeste, Carla. El detalle está en `Plan-reparto-Sprint-5.md`. |
