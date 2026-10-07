# Supuestos y decisiones de negocio

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Versión:** 1.0  
**Actualizado:** 07/10/2026  
**Estado:** decisiones vigentes al cierre del Sprint 3. Las de promociones y reportes ya están cerradas para el Sprint 4, pero todavía no están construidas.  
**Documentos relacionados:** `Alcance-funcional.md`, `Requerimientos-funcionales.md`, `docs/sprints/Ficha-Sprint-4.md`

El enunciado deja varias reglas al grupo. Esta lista es la que usa el sistema. Si una decisión cambia, se actualiza acá y en el alcance.

---

## 1. Producto y aplicaciones

| # | Decisión | Valor vigente |
|---|---|---|
| D1 | Extensión | **Extensión 1** (stock, promociones, reportes extra). La Extensión 2 no es compromiso. |
| D2 | Aplicaciones | Dos SPAs: cliente en `/frontend` y administración en `/backend/admin`. Misma API (`/backend`) y misma base PostgreSQL. |
| D3 | Idioma | Documentación y textos de pantalla en español. Código, tablas, JSON y URLs en inglés. |
| D4 | Moneda y zona | Precios en pesos (ARS), sin símbolo obligatorio en la API. Fechas en ISO-8601. El filtro de reportes del Sprint 4 va a usar el día de Argentina. |
| D5 | Mapa | Fuera del producto. No hay recorrido ni navegación. |

## 2. Identidad y sesión

| # | Decisión | Valor vigente |
|---|---|---|
| D6 | Roles | `customer` y `admin`. Un cliente no entra al admin ni a `/api/admin/*`. |
| D7 | Sesión | JWT en `Authorization: Bearer`. Dura lo que diga `JWT_EXPIRES_IN` (7 días por defecto). Si falta, venció o el usuario ya no existe, la API responde 401. El rol se lee de la base, no del token. |
| D8 | Administrador inicial | Seed `admin@rapido.local`. No se puede borrar ni cambiarle el email. Sí se le puede cambiar la contraseña. |
| D9 | Más administradores | Un admin puede crear, editar y borrar otros. El email no se repite entre clientes y admins. |
| D10 | Datos del cliente | El nombre se edita. El email es de solo lectura. La contraseña se cambia con la actual y la nueva. |
| D11 | Recuperar contraseña | Solo clientes. Token de 30 minutos, de un solo uso; se guarda el hash. Pedir otro invalida el anterior. Sin SMTP: en modo demo la API devuelve el token. Un email inexistente o de admin recibe la misma respuesta genérica. El correo real queda como mejora. |
| D12 | Visitante | Puede ver el catálogo, armar un carrito en el navegador y confirmar un pedido invitado. Eso no reemplaza registro, sesión ni direcciones de cuenta. Al iniciar sesión o registrarse, el carrito invitado se pasa a la cuenta. Los pedidos de invitado no aparecen en el historial. |

## 3. Catálogo, carrito y configuraciones

| # | Decisión | Valor vigente |
|---|---|---|
| D13 | Producto no disponible | `available = false` no se lista ni se puede pedir. Tampoco un adicional que dejó de estar disponible. |
| D14 | Categoría con productos | No se borra (409). |
| D15 | Imagen | URL o archivo subido por el admin (jpeg, png, webp, gif). |
| D16 | Configuraciones | Solo **adicionales de hamburguesa**. Un adicional es un producto de la categoría Adicional y se ofrece en los de Hamburguesas, por slug de categoría. No hay tamaños, sabores ni “quitar ingredientes”. Las observaciones de texto siguen existiendo y no son un adicional. |
| D17 | Línea del carrito | Única por producto + adicionales. La misma hamburguesa con otros adicionales es otra línea. Los adicionales de una línea no se editan: se quita y se vuelve a agregar. |
| D18 | Importe | `(precio del producto + suma de adicionales) × cantidad`. Al confirmar se congelan el precio del producto y el nombre y precio de cada adicional. |
| D19 | Carrito autenticado | Uno por cliente, en el backend. Sobrevive recargar. |

## 4. Sucursales, cobertura y direcciones

| # | Decisión | Valor vigente |
|---|---|---|
| D20 | Datos de la sucursal | Nombre, dirección, latitud, longitud, horario, teléfono y activa/inactiva. |
| D21 | Asignación | Sucursal **activa más cercana dentro del radio** de cobertura. Distancia Haversine. Si ninguna llega, no se crea el pedido (`OUT_OF_COVERAGE`). |
| D22 | Radio | Parámetro `coverage_radius_km`, 5 km por defecto, editable entre 0,1 y 100. Cambiarlo no mueve pedidos ya confirmados. |
| D23 | Horario | Se guarda y se muestra. **No** se usa para asignar ni para impedir el pedido. |
| D24 | Desempate | No hay. Si dos sucursales quedaran a la misma distancia, gana la que el cálculo devuelva primero. No se mira la cantidad de pedidos pendientes. |
| D25 | Sucursal inactiva | No se asigna y no aparece en “sucursales disponibles”. |
| D26 | Sucursales disponibles | El cliente las ve en `/branches`, de la más cercana a la más lejana, para una dirección guardada o para lat/lng (también sin sesión). La primera es la que se asigna al confirmar. |
| D27 | Dirección del cliente | Texto, alias opcional, latitud y longitud. La ubicación puede salir del dispositivo o cargarse a mano. Cada cliente solo ve las suyas. |
| D28 | Dirección de sucursal | El admin puede geocodificar el texto con Nominatim (OpenStreetMap), limitado a Argentina. Si no hay resultado, carga lat/lng a mano. No es Google Places ni un mapa. |

## 5. Pedido, estados y tiempo

| # | Decisión | Valor vigente |
|---|---|---|
| D29 | Estado inicial | `pending` al confirmar. |
| D30 | Máquina | `pending → confirmed → preparing → ready → on_the_way → delivered`. `cancelled` solo desde `pending` o `confirmed`. No se salta estados. `delivered` y `cancelled` son finales. |
| D31 | Quién cambia el estado | El administrador avanza la máquina. El cliente y el administrador pueden cancelar en los estados permitidos. |
| D32 | Historial de estados | Cada cambio guarda estado, fecha y hora, y quién lo hizo cuando hay un usuario. |
| D33 | Hora estimada | Se calcula **una vez** al confirmar y se guarda. No se recalcula en cada consulta ni si después cambian los parámetros. |
| D34 | Fórmula | `preparación base + (unidades × minutos por ítem) + ceil(distancia km / km por minuto)`. Valores por defecto: 15 min, 3 min, 0,5 km/min (unos 30 km/h). |
| D35 | Demora | Si el pedido sigue abierto y ya pasó la hora: minutos de atraso. Si se entregó tarde: diferencia entre la entrega y la hora estimada. Si se canceló, no hay demora. |
| D36 | Repetir | Copia los ítems al carrito. No clona el pedido ni reserva stock. Si el carrito ya tiene productos, se **suman**. Un producto que ya no está disponible se omite. |
| D37 | Tiempo real | El seguimiento puede refrescarse con Pusher cuando cambia el estado. No es la notificación por correo de la Extensión 2. |

## 6. Stock (Extensión 1, ya en uso)

| # | Decisión | Valor vigente |
|---|---|---|
| D38 | Unidad | Cantidad entera por sucursal y producto. El admin edita solo lo disponible (0 a 1.000.000). Lo reservado lo mueve el sistema. |
| D39 | Sin fila | Cuenta como 0 en esa sucursal. Un producto puede tener stock en un local y nada en otro. |
| D40 | Al confirmar | Si no alcanza (producto o adicional), 409 `OUT_OF_STOCK`, no se crea el pedido y el carrito queda. Si alcanza: disponible baja y reservado sube. |
| D41 | Al cancelar | En `pending` o `confirmed`, la reserva vuelve a disponible. |
| D42 | Al entregar | La reserva se descuenta y no vuelve a disponible. |
| D43 | Pedidos anteriores al stock | No reservaron. Cancelarlos o entregarlos no toca el stock. |
| D44 | Concurrencia | Si dos clientes piden la última unidad, uno confirma y el otro recibe 409. |
| D45 | Alerta de mínimo | No está. Queda para el Sprint 5 si hay tiempo. |

## 7. Promociones y reportes (cerradas, todavía no construidas)

El Sprint 4 las va a implementar así. Hoy el importe del pedido es solo el subtotal.

| # | Decisión | Valor para el Sprint 4 |
|---|---|---|
| D46 | Aplicación | El ABM no alcanza: una promoción vigente se aplica al confirmar y queda en el importe. |
| D47 | Tipos | Porcentual, monto fijo o 2x1 de un producto. Sin combos y sin envío gratis (el pedido no tiene costo de envío). |
| D48 | Cupón | Código reutilizable mientras esté vigente. No es de un solo uso. |
| D49 | Cuántas | Una por pedido. Si el cliente manda un cupón válido, gana ese. Si no, gana la automática que más descuenta. |
| D50 | Congelada | El pedido guarda subtotal, descuento y el nombre de la promo. Editarla después no recalcula. Repetir no arrastra la promo vieja. |
| D51 | 2x1 y stock | Se reservan todas las unidades pedidas, también la que sale gratis. Los adicionales de esas unidades se cobran. |
| D52 | Reportes base | Más vendidos, menos vendidos, sin stock y mayor facturación. Cuentan los pedidos no cancelados, incluidos los `pending`. Los adicionales no entran en esos listados de productos. |
| D53 | Reportes extra | Pedidos, clientes, sucursales y promociones: Sprint 5. |

## 8. Qué se propuso al principio y no se hizo

En el análisis del 20/08 había variantes que el grupo descartó. Quedan escritas para no reabrirlas sin una decisión nueva.

| Propuesta inicial | Qué quedó |
|---|---|
| Desempate de sucursal por menor cantidad de pedidos abiertos | No se usa (D24). |
| No dejar pedir si la sucursal está cerrada según el horario | El horario solo se muestra (D23). |
| Quitar ingredientes, extras genéricos y tamaños | Solo adicionales de hamburguesa (D16). |
| Una sola SPA con rutas `/admin` | Dos aplicaciones (D2). |
| Correo real para recuperar la contraseña | Token demostrable (D11). |
| Estados editables desde el admin | Se listan; la máquina no se edita (D30). |

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 07/10/2026 | Primera versión de carpeta, con las reglas en uso al cierre del Sprint 3 y las de promociones ya cerradas para el Sprint 4 |
