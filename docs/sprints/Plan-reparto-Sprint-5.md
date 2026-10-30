# Plan de reparto — Sprint 5

**Proyecto:** Mordi (pedidos en casas de comidas rápidas)  
**Versión:** 1.1  
**Actualizado:** 29/10/2026  
**Equipo, en el orden en que se trabaja:** Rafael, Nicolas, Lucas, Celeste, Carla. Cristian lleva la carpeta y no codea.  
**Sprint:** 5 de 5  
**Seguimiento:** jueves 05/11/2026  
**Carpeta:** miércoles 12/11/2026  
**Corte de features:** lunes 16/11 a la noche  
**Ensayo:** martes 17 y miércoles 18. El miércoles no se mergea.  
**Review:** jueves 19/11/2026  
**Presentación final:** viernes 27/11/2026  

El contrato de cada historia está en `Ficha-Sprint-5.md`. Este plan dice quién la cierra. Lo ya hecho (sellos, Top 3, código del pedido, clientes, envío por km, baja de cuenta, pago simulado, banner en catálogo y carrito) no se reparte.

Se trabaja **en este orden: Rafael, Nicolas, Lucas, Celeste, Carla.** Cada uno arranca dos días después del anterior y cierra sus historias de punta a punta (API, pantalla y test). No se parten entre dos personas.

Puntos abiertos: **30**. DEV-26 no suma.

---

## 1. Quién cierra qué

| Orden | Quién | Historias | Puntos | Arranca | Deja en `main` |
|---|---|---|---|---|---|
| 1 | **Rafael** | HU-34 Código postal y provincia. HU-35 Nosotros, contacto y mapa | 6 | vie 30/10 | mié 4/11 |
| 2 | **Nicolas** | HU-30 Adicionales por producto | 5 | lun 2/11 | vie 6/11 |
| 3 | **Lucas** | HU-31 Envío gratis. HU-36 Reportar un problema. DEV-26 Banner en el detalle | 5 | mié 4/11 | mar 10/11 |
| 4 | **Celeste** | HU-28 Reportes: filtro, gráficos y CSV | 8 | vie 6/11 | vie 13/11 |
| 5 | **Carla** | HU-24 Rol en el admin. HU-33 Dashboard. HU-37 Horarios de la sucursal | 6 | lun 9/11 | lun 16/11 |
| — | **Cristian** | Carpeta. No codea | — | lun 9/11 | mié 12/11 |

Ramas: `feat/rafael-direccion-mapa`, `feat/nicolas-adicionales`, `feat/lucas-checkout-incidencia`, `feat/celeste-reportes`, `feat/carla-admin-cierre`.

Si hay que recortar, se corta de abajo hacia arriba: primero DEV-26, después HU-36, HU-35, HU-37, HU-34, HU-33, HU-31 y al final HU-30. HU-24 y HU-28 no se recortan.

---

## 2. Reglas

1. El que sigue **no abre `schema.prisma`** hasta que la migración del anterior está en `main`. Orden de migraciones: Rafael (HU-34) el lunes 2, Nicolas (HU-30) el martes 3, Lucas (HU-36) el viernes 6, Carla (HU-37) el miércoles 11. Celeste no migra nada.
2. Cada uno cierra lo suyo en el cliente y en el admin. Carla entra al checkout solo para el aviso de sucursal cerrada. Lucas entra al admin solo para `/admin/incidents`.
3. Los tests corren contra `fastfood_test` (`npm test` en `/backend`). Nadie corre la suite contra la base de la aplicación ni contra Neon.
4. El dashboard de Carla usa el endpoint de Celeste. Si el viernes 13 ese endpoint no está, Carla deja HU-33 para el final y no arma un API paralelo.

---

## 3. Calendario

| Días | Quién trabaja | Qué se tiene que poder mostrar |
|---|---|---|
| **vie 30/10 → mié 4/11** | **Rafael** | Dirección con provincia y CP. Nosotros, contacto y el mapa de sucursales. Migración en `main` el **lunes 2 a la noche**. |
| **lun 2 → vie 6/11** | **Nicolas** | Adicionales marcados en el producto. La migración, el **martes 3**, cuando la de Rafael ya entró. |
| **mié 4 → mar 10/11** | **Lucas** | Envío gratis, reclamo de un pedido y el banner en el detalle. La migración de incidencias, el **viernes 6**, cuando la de Nicolas ya entró. |
| **jue 5/11** | Seguimiento | Se muestra lo de Rafael y cómo va Nicolas. Lucas recién arrancó. No se promete el rol ni los reportes: esos van después. |
| **vie 6 → vie 13/11** | **Celeste** | Reportes con filtro, gráficos y CSV. El **miércoles 11** deja `GET /api/admin/reports/orders` aunque el gráfico entre el viernes. |
| **lun 9 → lun 16/11** | **Carla** | Primero el rol (no depende de nadie). Después los horarios, cuando la migración de Lucas ya está. El dashboard, cuando está el endpoint de Celeste. |
| **mar 11/11 noche** | — | Lo que esté en `main` entra a la carpeta. Ahí tienen que estar Rafael, Nicolas y Lucas. Celeste entra si ya mergeó. |
| **mié 12/11** | **Cristian** | PDF. |
| **lun 16/11 noche** | Carla | Corte. Lo que no está en `main` no se demuestra el jueves 19. |
| **mar 17 y mié 18** | Todos | Ensayo. |
| **jue 19/11** | Todos | Review. |
| **vie 27/11** | Todos | Presentación final. La misma demo. |

---

## 4. Qué hace cada uno

### Rafael — primero

Rama: `feat/rafael-direccion-mapa`

**HU-34**

- [ ] `postalCode` y `province` en `Address`. Las direcciones viejas quedan vacías.
- [ ] Migración en `main` el **lunes 2 a la noche**.
- [ ] El formulario de la cuenta y el del invitado piden calle y número, ciudad, provincia (las 24) y CP.
- [ ] El geocode busca estructurado y, si no encuentra, usa la búsqueda libre de hoy. El pin sigue igual.
- [ ] Test: la query del geocode sale estructurada.

**HU-35**

- [ ] `/nosotros`: misión, visión y valores. Texto fijo.
- [ ] `/contacto`: mail, teléfono y horario de cada sucursal activa. Link `mailto:`. El horario es el texto de hoy; si más adelante hay franjas, se muestran esas.
- [ ] `/branches`: mapa con un marcador por sucursal activa. Al tocarlo, nombre, dirección y horario.
- [ ] Links en el pie, al lado de Términos y Promociones.
- [ ] Merge de las dos historias el **miércoles 4 a la noche**.

### Nicolas — segundo

Rama: `feat/nicolas-adicionales`  
No abre `schema.prisma` hasta el martes 3.

**HU-30**

- [ ] `ProductExtra { productId, extraId }`. La migración marca, en cada hamburguesa, los adicionales que hay hoy.
- [ ] En `/admin/products`, “Adicionales que se ofrecen”.
- [ ] El detalle, el carrito y el pedido usan esa relación. Un adicional no marcado responde 400.
- [ ] Test de ese 400, contra `fastfood_test`.
- [ ] Merge el **viernes 6 a la noche**.

### Lucas — tercero

Rama: `feat/lucas-checkout-incidencia`  
Arranca el miércoles 4 por el envío gratis y el banner, que no tocan el schema. La migración de incidencias espera al viernes 6.

**HU-31**

- [ ] Parámetro `free_delivery_min_subtotal` (0 = desactivado).
- [ ] Si el subtotal menos el descuento llega al mínimo, el envío es 0. No compite con la promo ni con el premio.
- [ ] El checkout dice “Envío gratis” o “Te faltan $X para el envío gratis”.
- [ ] Test: justo en el mínimo es gratis; un peso menos, se cobra.

**DEV-26**

- [ ] El banner de la promo también en `/products/:id`. En el carrito sigue solo cuando ninguna promo se aplicó.

**HU-36**

- [ ] Modelo `Incident`. Uno por pedido. Motivos y estados como dice la ficha.
- [ ] `POST /api/orders/:id/incident`. `GET` y `PATCH /api/admin/incidents`.
- [ ] En el detalle del cliente, si el pedido está entregado o retirado, “Tuve un problema”.
- [ ] `/admin/incidents`: abiertas primero, link al pedido, marcar resuelta.
- [ ] Test: no se reporta el pedido de otro ni uno que no se entregó.
- [ ] Merge de las tres el **martes 10 a la noche**.

### Celeste — cuarta

Rama: `feat/celeste-reportes`  
No toca `schema.prisma`. En el admin solo `/admin/reports`. En el backend solo `backend/src/reports`.

**HU-28**

- [ ] `from`, `to` y `branchId` en `GET /api/admin/reports/products`. Sin filtros, todo el historial. “Sin stock” usa la sucursal y no las fechas.
- [ ] `GET /api/admin/reports/orders` con los mismos filtros. **Contrato en `main` el miércoles 11**, para el dashboard de Carla.
- [ ] Pedidos por día, por estado, por sucursal, cancelados (cantidad y %) y tiempo promedio de `confirmed` a `delivered`.
- [ ] Ventas por sucursal. Top 10 clientes (sin cancelados, sin invitados). Promos más usadas, con `Premio Fidelidad` y `Premio Top 3` sin el porcentaje.
- [ ] Gráficos en `/admin/reports` y **Descargar CSV** (`;`, UTF-8 con BOM) con los filtros puestos.
- [ ] Un cancelado no suma. Un `pending` sí.
- [ ] Tests en `fastfood_test`: otro día queda afuera, otra sucursal queda afuera, el promedio sale de dos pedidos entregados.
- [ ] Merge el **viernes 13 a la noche**.
- [ ] Si eso ya está y sobra tiempo: RF-RPT-16, RF-RPT-17, RF-RPT-20 y RF-RPT-22.

### Carla — quinta

Rama: `feat/carla-admin-cierre`  
Arranca el lunes 9 por el rol, que no depende de nadie.

**HU-24**, lunes 9 y martes 10:

- [ ] Selector Super admin / Solo pedidos en el alta y la edición. El 409 del API se muestra tal cual.
- [ ] El listado muestra el rol.
- [ ] Con `orders_viewer` el menú solo deja Pedidos. No hay botones para cambiar el estado ni cancelar. Un 403 vuelve a Pedidos.

**HU-37**, desde el miércoles 11 (la migración de Lucas ya tiene que estar en `main`):

- [ ] Días y franjas (apertura y cierre) en el alta y la edición de sucursal. El texto `openingHours` queda hasta que esa sucursal tenga franjas.
- [ ] El API devuelve las franjas y si ahora está abierta.
- [ ] Si está cerrada, el checkout lo avisa. No bloquea el pedido. Es el único cambio de Carla en el checkout.

**HU-33**, cuando `GET /api/admin/reports/orders` está en `main`:

- [ ] Inicio del admin: pedidos de hoy, facturación de hoy, pedidos por estado (barras) y ventas de los últimos 7 días (línea).
- [ ] Con `orders_viewer` se ve lo de pedidos y no el resto.
- [ ] Si el viernes 13 el endpoint no está, el dashboard no entra. No se arma otro API.
- [ ] Merge de lo que haya cerrado el **lunes 16 a la noche**.

### Cristian

- [ ] Un solo PDF, con índice y portada.
- [ ] El miércoles 12 entra lo que esté en `main` el martes 11 a la noche.
- [ ] Cita la ficha 1.2. No documenta sellos ni el código del pedido como si faltaran.

---

## 5. Qué se ensaya el 19/11

En el orden en que se hizo:

1. Rafael: una dirección con provincia y CP, nosotros, contacto y el mapa.
2. Nicolas: un producto con adicionales marcados, y otro que no los ofrece.
3. Lucas: envío gratis en el checkout, un reclamo sobre un pedido entregado, el banner en el detalle.
4. Celeste: reportes de esta semana y de una sucursal, el gráfico y el CSV.
5. Carla: un admin “solo pedidos”, el inicio con el gráfico y una sucursal con horario. Si el dashboard no entró, se muestra el rol y el horario.
6. Recorrido corto de lo que ya estaba: un pedido de retiro con código `MOR…`, el medio de pago y la tarjeta de sellos.

No se demuestra un combo, un cupón ni un pago real. Lo que no esté en `main` el lunes 16 no se improvisa el martes 17.

---

## 6. Si algo se atrasa

| Qué pasó | Qué se hace |
|---|---|
| El lunes 2 Rafael no mergeó la migración | Nicolas sigue con la pantalla de productos y no abre `schema.prisma`. La suya pasa al día siguiente de ese merge. Lucas, igual, espera la de Nicolas. |
| El viernes 6 Nicolas no mergeó | Lucas no abre la migración de incidencias. Sigue con envío gratis y el banner. |
| El miércoles 11 no está el endpoint de Celeste | Carla hace el rol y los horarios. El dashboard queda último y, si no entra el lunes 16, se corta. |
| El lunes 16 sobra una historia | Queda en la carpeta como trabajo futuro. No hay Sprint 6. |

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 29/10/2026 | Reparto de las historias abiertas |
| 1.1 | 29/10/2026 | El equipo trabaja en orden: Rafael, Nicolas, Lucas, Celeste, Carla. Cada uno cierra sus historias enteras |
