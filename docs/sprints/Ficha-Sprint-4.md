# Ficha Sprint 4

**Proyecto:** Pedidos en casas de comidas rápidas (Mordi)  
**Versión:** 1.0  
**Actualizado:** 07/10/2026  
**Grupo:** 2 · 5 integrantes (Celeste, Carla, Lucas, Nicolas, Rafael)  
**Sprint:** 4 de 5  
**Planning:** 08/10/2026 (misma clase que el review del Sprint 3)  
**Seguimiento:** 15/10/2026  
**Medio término:** 22/10/2026 (demo estable; puede ser presencial)  
**Review:** 29/10/2026  
**Corte de tareas:** 28/10/2026 23:59 (solo cuenta lo mergeado a `main` hasta esa hora)  
**Duración:** 3 semanas  
**Extensiones:** sigue **Extensión 1** (promociones). Reportes extra, alerta de stock y Extensión 2 quedan para Sprint 5 o fuera  
**Stack:** React + Vite (front cliente y admin) · NestJS + TypeScript (back) · PostgreSQL + Prisma (datos) · JWT

**Después de este sprint queda 1:** Sprint 5 (review 19/11, carpeta 12/11, demo final 27/11).

Los IDs de esta ficha siguen los de las fichas (HU-19 cerró el Sprint 3). El backlog de `Historias-de-usuario.md` quedó con otra numeración; para este sprint manda esta ficha.

---

## 1. Objetivo del sprint

Al 22/10 (medio término) y de nuevo al 29/10 se puede demostrar, en un celular, este flujo de punta a punta **con precio promocional**:

1. Un **administrador** da de alta una promoción automática y un cupón, y los ve en el listado.
2. Un **cliente** arma un pedido y, al confirmar, el sistema **aplica una sola promoción vigente** y muestra subtotal, descuento y total.
3. El pedido guardado conserva ese descuento aunque después se edite la promoción.
4. El admin abre **reportes de productos**: más vendidos, menos vendidos, sin stock y mayor facturación, con datos de pedidos reales (también los que siguen `pending`).

Si el hilo alta de promo → confirmar con descuento → ver el importe en el pedido no cierra, el sprint no está cumplido, aunque los reportes estén.

El Sprint 3 dejó el negocio **operable con inventario y cuenta**. Este sprint deja el pedido **con precio promocional** y la primera lectura de ventas para el medio término.

---

## 2. Estado del Sprint 3 y devolución

### 2.1 Qué cerró el Sprint 3 (en `main`, no rehacer)

El frente de la ficha anterior está mergeado:

| Qué | PR |
|---|---|
| ETA fija, reserva de stock y parámetros (API) | #15 |
| Admin: stock, administradores, parámetros, pedidos | #16 |
| Recuperar contraseña | #18 |
| Sucursales disponibles y mensajes de checkout (sin stock / sin cobertura) | #19 |
| Color de Pendiente y “Agregar al carrito” (DEV-12, DEV-16) | #20 |
| Perfil del cliente (HU-14) | #22 |

HU-14 a HU-19 y DEV-12 a DEV-17 se toman como cerrados. Si el review del 08/10 marca un hueco, entra como DEV nuevo; no se reabre la historia.

### 2.2 Devolución del review (08/10)

Se completa en la planning, en el acta de la sección 11. Lo que pidan entra como **DEV-18+** (el último de la ficha anterior es DEV-17), con dueño, y se cierra en la **primera semana** (antes del 15/10). No desplaza el hilo de promociones.

| ID | Qué pidieron | Dueño | Qué hay que hacer |
|---|---|---|---|
| — | Completar el 08/10 | — | — |

---

## 3. Alcance

### Decisión que esta ficha cierra

El ABM de promociones **no alcanza**. En este sprint la promoción vigente **se aplica al confirmar** y queda en el importe (RF-ADM-05 + RF-PRM-01 + RF-PRM-02). Las reglas son las de la sección 4; no un motor genérico.

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

**Ya cubierto, no se replanifica:** repetir pedido (RF-HIS-02, Sprint 2). Al repetir **no** se copia la promo del pedido viejo: el checkout nuevo vuelve a evaluar las vigentes.

### Simplificaciones

| Tema | En Sprint 4 | Después (Sprint 5 o fuera) |
|---|---|---|
| Tipos de promo | `percent`, `fixed`, `two_for_one` | Combos (conjunto de productos a un precio) |
| Cupón | Código reutilizable mientras esté vigente | Cupón de un solo uso, tope de usos |
| Cuántas promos por pedido | **Una** | Acumulables |
| Envío gratis | No. El pedido no tiene costo de envío | Solo si algún día existe ese cargo |
| Vigencia | `active` + `startsAt` / `endsAt` opcionales | — |
| Pedidos ya confirmados | El descuento queda congelado | Cambiar una promo no recalcula |
| Reportes | Los 4 de productos, top 10, todo el historial no cancelado | RF-RPT-10 a RF-RPT-22 |
| Filtro de fechas | Entra, sobre los 3 reportes de ventas | — |
| Stock y 2x1 | Se reservan **todas** las unidades pedidas, también la que sale gratis | — |

### Fuera de alcance explícito

Combos, envío gratuito, cupón de un solo uso, promos acumulables, RF-RPT-10 a RF-RPT-22, RF-STK-05, RF-GEO-03, toda Extensión 2.  
No se reabre stock, parámetros, cuenta ni la máquina de estados salvo un DEV del review.

---

## 4. Historias de usuario

Estimación en puntos. Total del sprint: **18 pts**. DEV-18+ no suman puntos: son devolución con dueño fijo.

El sprint dura 3 semanas porque el 22/10 es un corte de demo, no porque haya más alcance. El riesgo está en el precio, no en la cantidad de pantallas.

**DoD de cada historia:** funciona en frontend y backend, usable en viewport mobile, mergeada a `main` antes del 28/10 23:59. El hilo de la sección 5 (pasos 1 a 6) tiene que estar en `main` antes del **21/10 23:59** para el medio término.

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

El 2x1 no cambia la reserva de stock: se reservan todas las unidades.

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
- Cuenta e invitado usan la misma regla.
- El detalle del pedido (cliente y admin) y el historial muestran subtotal, descuento, nombre de la promo y total.
- Editar o desactivar la promo después no cambia pedidos ya creados.
- Repetir pedido no arrastra la promo: el próximo checkout evalúa de nuevo.
- El stock se reserva por las unidades pedidas, también en un 2x1.
- Tests de backend: porcentual automático, cupón 2x1 con 2 unidades, cupón inválido (400, no crea pedido), descuento que no pasa el subtotal, promo vencida que no aplica, pedido viejo sin promo intacto.

### HU-22 — Reportes de productos — 5 pts

*Como administrador, quiero ver qué se vende, qué no se vende, qué no tiene stock y qué factura más, para decidir el menú.*

**RF:** RF-RPT-01 a RF-RPT-04  
**Rutas:** `/admin/reports`  
**API:** `GET /api/admin/reports/products?from=&to=`

Criterios:

- Una pantalla con los cuatro listados.
- Más vendidos, menos vendidos y mayor facturación: pedidos con `status != cancelled`, top 10. Cuentan también los `pending` (si no, la demo con pedidos recién confirmados sale vacía).
- Cantidad = suma de `OrderItem.quantity`. Facturación = suma de `quantity × unitPrice`. Los adicionales no se suman al producto padre ni entran en estos tres listados (queda dicho en la pantalla).
- Menos vendidos: productos con `available = true`, incluidos los que vendieron 0, de menor a mayor cantidad.
- Sin stock: producto activo en sucursal activa con `available = 0` o sin fila de stock. No usa el filtro de fechas (es el stock de ahora).
- `from` y `to` opcionales (`YYYY-MM-DD`, día de Argentina) sobre los tres de ventas. Sin filtro, todo el historial.
- Un cliente no accede.

**Total: 5+8+5 = 18 pts**

---

## 5. Incremento visible

**Medio término (22/10), demo de 5–6 min.** Tiene que estar en `main` el 21/10 a la noche:

1. Admin: `/admin/promotions` — una automática (por ejemplo 10% “Promo de la casa”) y un cupón 2x1 sobre la hamburguesa de la demo (código `2X1`).
2. Cliente: dos hamburguesas → checkout. Se ve el 10% sin escribir nada: subtotal, descuento, total.
3. El mismo checkout con código `2X1`: el descuento pasa a ser el precio de una hamburguesa. Confirmar.
4. Detalle del pedido: nombre de la promo e importes. En el admin, el mismo desglose.
5. Código inventado: no confirma y el mensaje es claro. El carrito sigue ahí.
6. Admin: `/admin/reports` — la hamburguesa aparece en más vendidos (el pedido recién creado cuenta).

**Review (29/10), se suma:**

7. Promo fija y una vencida que no aplica.
8. Menos vendidos (incluye un producto en 0) y sin stock (sucursal con disponible 0).
9. Filtro de fechas que deja afuera un pedido viejo.
10. Invitado: mismo cupón, mismo desglose.
11. Devolución del 08/10, si hubo ítems.

**No se demuestra:** combos, envío gratis, reportes de pedidos/clientes/sucursales/promos, alerta de stock mínimo, mapa, Extensión 2.

---

## 6. Páginas y APIs de este sprint

**Cliente (a tocar):**

| Ruta | Uso |
|---|---|
| `/checkout` | Cupón, cotización, subtotal / descuento / total (HU-21) |
| `/orders` | Total ya cobrado; si hay descuento, mostrarlo (HU-21) |
| `/orders/:id` | Desglose y nombre de la promo (HU-21) |

**Admin (nuevo / a tocar):**

| Ruta | Uso |
|---|---|
| `/admin/promotions` | ABM (HU-20) |
| `/admin/reports` | Cuatro listados (HU-22) |
| `/admin/orders/:id` | Desglose del descuento (HU-21) |

**API (nueva / extendida):**

| Método | Ruta | Uso |
|---|---|---|
| GET/POST | `/api/admin/promotions` | Listado y alta |
| GET/PATCH | `/api/admin/promotions/:id` | Detalle y edición (incluye desactivar) |
| DELETE | `/api/admin/promotions/:id` | Solo si ningún pedido la usó |
| POST | `/api/promotions/quote` | Body: `{ couponCode?: string, items?: [...] }`. Con JWT y sin `items`, cotiza el carrito. Con `items`, cotiza eso (invitado) |
| POST | `/api/orders`, `/api/orders/guest` | Body suma `couponCode?`. La respuesta trae `subtotal`, `discountAmount`, `promotionName`, `totalAmount` |
| GET | `/api/orders`, `/api/orders/:id`, `/api/admin/orders/:id` | Los mismos campos |
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

`promotion` es `null` cuando no hay descuento. Un cupón inválido responde 400 también en la cotización, para que el checkout pueda mostrar el error antes de confirmar.

Cambios de modelo:

- Nuevo `Promotion` (`name`, `type`, `value`, `productId` opcional, `code` único opcional, `active`, `startsAt`, `endsAt`).
- `Order` suma `subtotal`, `discountAmount` (default 0), `promotionId` opcional, `promotionName` opcional. Migración: pedidos existentes quedan sin descuento (`subtotal = totalAmount`).

Nombres en inglés (dominio canónico). UI en español.

Seed de demo: promo automática 10% vigente, y cupón `2X1` sobre el producto de la demo. Hace falta stock de ese producto en la sucursal de la demo (ya cargado en el Sprint 3).

---

## 7. Tareas y reparto (5 integrantes)

Núcleo compartido (primeros días): **Nicolas mergea primero** la migración de `Promotion` y los campos del pedido, más el JSON de la cotización y del 400. Sin eso, el checkout y el admin se pisan.

### Frente nuevo

| Dueño | Frente | Historias | Tareas concretas |
|---|---|---|---|
| **Nicolas** | Backend | HU-20 (API), HU-21 (API), HU-22 (API) | Prisma; alta/edición/baja; cotización; aplicar en `POST /orders` y guest; reportes; tests del contrato |
| **Carla** | Admin | HU-20 (UI), HU-22 (UI), desglose en el pedido admin | `/admin/promotions`, `/admin/reports`, importes en `/admin/orders/:id`. No toca `/frontend` |
| **Lucas** | Cliente (checkout) | HU-21 (UI checkout) | Cupón, cotización y desglose en `/checkout` (cuenta e invitado). Sigue siendo dueño de `ClientLayout` |
| **Celeste** | Cliente (pedido) | HU-21 (UI historial y detalle) | Desglose en `/orders` y `/orders/:id` |
| **Rafael** | Docs + datos de demo | — | Seed de las dos promos; esta ficha, RF, alcance e historias alineados; chequear el guion de la sección 5 antes del 21/10 |

Si aprieta el tiempo: no se recorta HU-21 ni los cuatro reportes. Lo primero que se simplifica es el filtro de fechas (los reportes quedan sobre todo el historial). La devolución del 08/10 no se recorta.

| Fecha | Qué |
|---|---|
| 08/10 – 14/10 | Migración de Nicolas en `main`; ABM que ya lista y crea; DEV-18+ cerrados |
| **15/10** | Seguimiento: una promo creada desde el admin y una cotización que devuelve descuento |
| 16/10 – 21/10 | Confirmar con descuento, desglose en el pedido, más vendidos con ese pedido |
| **21/10 23:59** | Corte del medio término (pasos 1 a 6 de la sección 5 en `main`) |
| **22/10** | Medio término |
| 23/10 – 27/10 | Menos vendidos, sin stock, mayor facturación, filtro de fechas, invitado, tests |
| **28/10 23:59** | Corte |
| **29/10** | Review |

Detalle de ramas (cuando exista): `docs/sprints/Plan-reparto-Sprint-4.md`.

---

## 8. Definición de terminado del sprint

- [ ] Las 3 HU (20–22) cumplen sus criterios.
- [ ] DEV-18+ del review del 08/10 resueltos en `main` (si los hubo).
- [ ] Pasos 1 a 6 de la sección 5 reproducibles en local el 21/10 (deploy si da el tiempo; no bloquea).
- [ ] El resto de la sección 5, reproducible para el 29/10.
- [ ] App usable en viewport mobile (checkout con el desglose; admin de promos y reportes usables).
- [ ] Tests de backend: porcentual automático, cupón 2x1, cupón inválido sin crear pedido, tope del descuento, promo vencida, reporte que ignora cancelados y cuenta `pending`.
- [ ] Nada de secretos en git (`.env` ignorado).
- [ ] RF, alcance e historias alineados a esta ficha (la pregunta abierta de RF-ADM-05 queda cerrada).

---

## 9. Visión de lo que queda (Sprint 5)

No sustituye la ficha del Sprint 5. Sirve para no abrir esos frentes ahora.

| Sprint | Review | Foco |
|---|---|---|
| **4** (este) | 29/10 | Promociones aplicadas (Ext. 1), reportes base de productos, demo estable el 22/10 |
| **5** | 19/11 | Reportes extra (RF-RPT-10…22, incluye tiempo promedio de entrega con `estimatedDeliveryAt` y reportes de promociones), RF-STK-05 si hay tiempo, testing, carpeta (12/11), demo final 27/11 |

Si hay que recortar en el Sprint 5: mapa, Extensión 2 y alerta de stock. **No se recorta** el flujo de pedido, el stock en checkout ni la promo aplicada una vez que este sprint la abrió.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Abrir combos, envío gratis o reportes extra “porque el enunciado los nombra” | No llega el precio promocional el 21/10 | Esos ítems están fuera. Recortar el filtro de fechas, nunca HU-21 |
| La regla de “cuál promo gana” se rediscute a mitad del sprint | Checkout y admin no cierran | Contrato de la sección 4, sin variantes |
| El 2x1 descuenta también los adicionales, o libera stock de la unidad gratis | Demo y stock no coinciden con el Sprint 3 | El descuento es solo el precio del producto. El stock reserva todo |
| Los reportes solo cuentan `delivered` | En el medio término la tabla sale vacía | Entran todos los no cancelados, `pending` incluido |
| El medio término se trata como “falta una semana” | El 22/10 no hay demo | Corte interno el 21/10 para los pasos 1 a 6 |
| Dos personas en `CheckoutPage` | Conflictos | Lucas es el único que toca `/checkout`. Celeste toca el pedido ya creado |
| Promo de seed mal apuntada (otro producto, o sin stock) | El 2x1 no se ve | Seed sobre el producto de la demo, con stock en la sucursal de la demo |
| Cupón inválido igual crea el pedido “sin descuento” | Se cobra de más sin avisar | 400 y no se crea. Hay test |

---

## 11. Acta (completar en la planning del 08/10)

```
Fecha:
Presentes:
Ficha aceptada (sí/no):
Ajustes a las HU / al contrato de promociones:
Dueños Carla / Nicolas / Lucas / Celeste / Rafael:
Ítems del review (DEV-18+):
Preguntas a docentes y respuestas:
```

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 07/10/2026 | Versión para la planning del 08/10: promociones aplicadas (una por pedido) y reportes base de productos. Medio término 22/10 como corte del hilo principal |
