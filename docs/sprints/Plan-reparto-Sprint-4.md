# Plan de reparto — Sprint 4

**Proyecto:** Mordi (pedidos en casas de comidas rápidas)  
**Versión:** 1.1  
**Actualizado:** 12/10/2026  
**Equipo:** Carla, Nicolas, Lucas, Celeste, Rafael. Cristian lleva la carpeta.  
**Sprint:** 4 de 5  
**Medio término:** 22/10/2026 (presencial)  
**Review:** 29/10/2026  
**Corte de este reparto:** martes 20/10 a la noche. El miércoles 21 solo se ensaya. El jueves 22 es la presentación: no se mergea nada nuevo.

Cada frente dura **dos días** y se mergea al terminar el segundo. El sábado 17 y el domingo 18 cuentan. Nicolas, Carla y Lucas tienen un segundo bloque (lunes 19 y martes 20) solo para la promo. Rafael, Celeste y Cristian tienen un solo bloque. No queda trabajo de código después del martes 20.

Nicolas va primero: sin su API, Lucas no puede armar el checkout. Carla y Rafael trabajan los mismos dos días porque una está en el admin y el otro en el cliente.

La ficha (contrato de sucursal, promo y reportes) es `Ficha-Sprint-4.md`. Este plan solo dice quién hace qué y en qué dos días.

---

## 1. Calendario

| Días | Quién | Al final del segundo día está en `main` |
|---|---|---|
| **mar 13 y mié 14** | **Nicolas** | API de retiro o domicilio, sucursal elegida y geocode de hasta 5 direcciones. Con tests. |
| **jue 15 y vie 16** | **Carla** | Carteles que se van, borrar un admin en la demo, mapa al editar una sucursal. El jueves 15 a la mañana es la clase: ese día trabaja a la tarde. |
| **jue 15 y vie 16** | **Rafael** | Todas las sucursales, y el mapa para confirmar la dirección del cliente. Misma salvedad del jueves. |
| **sáb 17 y dom 18** | **Lucas** | Checkout: retiro o domicilio, elegir sucursal, botón deshabilitado si no hay cobertura, carteles del cliente. |
| **sáb 17 y dom 18** | **Celeste** | Los cuatro reportes de productos (API y pantalla). En paralelo con Lucas: ella no toca el checkout. |
| **lun 19 y mar 20** | **Nicolas, Carla y Lucas** | Promo porcentual automática. Ver sección 4. |
| **lun 19 y mar 20** | **Cristian** | Borrador del PDF único. No toca código. |
| **mié 21** | Lucas, Nicolas y Rafael | Ensayo. No es un día de feature. |
| **jue 22** | Lucas, Nicolas y Rafael | Presentación. |

---

## 2. Qué hace cada uno en sus dos días

### Nicolas — mar 13 y mié 14

Rama: `feat/nicolas-retiro-sucursal`

- [ ] `Order.fulfillment` (`delivery` / `pickup`). Pedidos viejos quedan `delivery`. En retiro, `addressId` vacío.
- [ ] `POST /api/orders` y `POST /api/orders/guest` reciben `fulfillment` y `branchId`. El servidor ya no elige la más cercana.
- [ ] Domicilio: la sucursal tiene que estar activa y dentro del radio. Retiro: activa, sin dirección. Si no, 400 y no se crea el pedido.
- [ ] Listado para el checkout con `canFulfill` (stock de todo el carrito), distancia y si entra en el radio. Primero las que pueden cumplir el pedido.
- [ ] Geocode: hasta 5 candidatos (DEV-20). Sigue siendo Nominatim, Argentina.
- [ ] Tests: retiro sin dirección, domicilio fuera del radio, sin stock en la sucursal elegida.
- [ ] Merge a `main` el **miércoles 14 a la noche**.

**No toca:** pantallas. La promo no entra en estos dos días.

### Carla — jue 15 y vie 16

Rama: `fix/carla-devolucion-admin`  
No toca `/frontend`.

- [ ] **DEV-18** — Avisos de éxito del admin se van a los 4 segundos. El de stock (“Se actualizaron X productos”) es el primero. Los de error se quedan.
- [ ] **DEV-19** — En la demo se crea un admin y se lo borra. El inicial sigue sin poder borrarse. El aviso entra en DEV-18.
- [ ] **DEV-21** — Mapa chico (Leaflet + OpenStreetMap) en alta y edición de sucursal. El pin es lat/lng. Buscar dirección mueve el pin; mover el pin guarda las coordenadas.
- [ ] Usa los candidatos nuevos del geocode. Si Nicolas no llegó a mergear el 14, el mapa igual deja mover el pin a mano.

### Rafael — jue 15 y vie 16

Rama: `feat/rafael-sucursales-mapa`  
No toca `/checkout` ni el admin.

- [ ] **DEV-22** — `/branches`: “Las que me cubren” y **todas** las activas. Las inactivas no aparecen.
- [ ] **DEV-23** — Mismo mapa en el alta y la edición de dirección, y en la dirección del invitado. Se guarda el pin.
- [ ] Si no hay candidatos de dirección, el mensaje es claro y el pin se puede mover igual.

### Lucas — sáb 17 y dom 18

Rama: `feat/lucas-checkout-sucursal`  
Es el único que toca `/checkout` y `ClientLayout`.

- [ ] **HU-23** — Primero pregunta retiro o domicilio.
- [ ] Domicilio: lista solo las de adentro del radio y pide dirección. Retiro: todas las activas, sin dirección.
- [ ] Primero las que tienen stock de todo el carrito. El cliente elige. Si hay una sola, viene marcada.
- [ ] **DEV-24** — Si elige domicilio y no hay ninguna en rango, “Confirmar pedido” queda deshabilitado y se lee por qué.
- [ ] **DEV-18** — Carteles de éxito del cliente se van a los 4 segundos.
- [ ] Merge el **domingo 18 a la noche**.

**No toca:** el cupón ni el desglose de promo. Eso es el lunes 19 y el martes 20, y solo si el API ya descuenta.

### Celeste — sáb 17 y dom 18

Rama: `feat/celeste-reportes`  
Estos dos días puede tocar `backend` **solo** en reportes. No abre el checkout ni las promos.

- [ ] **HU-22** — `GET /api/admin/reports/products` y `/admin/reports`.
- [ ] Más vendidos, menos vendidos, sin stock y mayor facturación, como dice la ficha.
- [ ] Un pedido cancelado no suma. Uno `pending` sí. Test de eso.
- [ ] El filtro de fechas entra si el domingo sobra. Si no, los cuatro listados quedan sobre todo el historial.
- [ ] Merge el **domingo 18 a la noche**.

### Cristian — lun 19 y mar 20

No tiene rama de código.

- [ ] Un solo PDF con los documentos de la carpeta, exportados desde los `.docx` que ya están.
- [ ] Índice y portada. El domingo 18 ya están el checkout y los reportes: entran en el PDF. La promo entra si el martes 20 a la noche está mergeada; si no, queda “en curso”.
- [ ] El cierre del PDF sigue siendo el 12/11. Estos dos días son el borrador.

---

## 3. Miércoles 21: ensayo, no features

Lucas, Nicolas y Rafael. Unas horas, no un tercer día de desarrollo.

Slides, en este orden: qué extensión se tomó, decisiones que ya están (dos apps, stock, radio, hora fija), decisión nueva (el cliente elige sucursal), demo, qué queda.

Demo de ese ensayo, y el del jueves 22:

1. Cartel de stock que se va. Crear un admin y borrarlo.
2. Sucursal con el pin en el mapa.
3. Todas las sucursales, y una dirección con el pin.
4. Checkout en domicilio, con dos sucursales y el stock primero. Después el mismo carrito en retiro.
5. Un reporte (más vendidos) y la promo porcentual, si el martes 20 quedaron en `main`. Si no, no se improvisan el miércoles.

---

## 4. Promo — lun 19 y mar 20

Es lo único del enunciado que no entra en los dos días de arriba sin sacar la devolución. Esos dos días cierran **una** promo, no el contrato completo de la ficha.

| Quién | Esos dos días | Rama |
|---|---|---|
| **Nicolas** | `Promotion` porcentual, vigente, sin código. Se aplica al confirmar. Guarda subtotal, descuento y nombre. Test del porcentual. | `feat/nicolas-promo` |
| **Carla** | Alta mínima en `/admin/promotions`: nombre, porcentaje, activa. Sin 2x1 ni cupón. | `feat/carla-promo` |
| **Lucas** | Si el API ya manda descuento, el checkout muestra subtotal, descuento y total. No hay campo de cupón. | sobre `feat/lucas-checkout-sucursal` o una rama corta desde `main` |

El **lunes 19 a la noche** Nicolas tiene que tener el API en `main`. Carla y Lucas usan el martes 20. Si el lunes a la noche no hay API, el martes no se improvisa el 2x1: el jueves se presenta sin promo. No se pasa nada al viernes 23.

DEV-25 (mail para recuperar la clave) no entra en ningún bloque.

---

## 5. Cómo no pisarse

1. Cada uno en **su rama**. A `main` se mergea al cerrar el segundo día.
2. **Lucas es el único en `/checkout`.** Rafael no entra ahí.
3. **Carla no entra a `/frontend`.**
4. **Celeste, en sus dos días, solo toca reportes.**
5. Pull de `main` al empezar el día.

```bash
git checkout main
git pull
git checkout -b feat/<nombre>-<frente>
```

---

## 6. Si un bloque no cierra

| Si pasa esto | Qué se hace |
|---|---|
| El 14 a la noche no está el API de Nicolas | Lucas no abre el checkout el sábado. El sábado se termina el API y Lucas tiene solo el domingo. Se avisa el miércoles 14. |
| El mapa de Carla o Rafael no entra el 16 | El checkout del fin de semana sigue igual. El jueves se muestra el pin a mano y se dice que el mapa sigue. |
| El domingo 18 el checkout no elige sucursal | El lunes 19 no se agregan pantallas de sucursal. La promo del lunes y martes sigue, sobre el checkout que haya. |
| El domingo 18 no están los cuatro reportes | El jueves se muestra el que esté (más vendidos alcanza). Celeste no se corre al lunes: ese día es de la promo. |
| El lunes 19 no está el API de la promo | El martes no se apura un 2x1. El jueves se presenta sin promo. |

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.1 | 12/10/2026 | Todo el reparto termina el martes 20. El sábado 17 y el domingo 18 cuentan: ahí van el checkout y los reportes. La promo es el lunes 19 y el martes 20 |
| 1.0 | 12/10/2026 | Reparto del Sprint 4: dos días por persona, Nicolas primero, promo porcentual el 27 y 28 |
