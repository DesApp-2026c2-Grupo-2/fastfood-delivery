# Testing y automatización

**Proyecto:** Mordi — Pedidos en casas de comidas rápidas  
**Versión:** 1.0  
**Actualizado:** 07/10/2026  
**Estado:** al cierre del Sprint 3 hay tests de backend del flujo de pedido, del stock y de la cuenta. No hay tests de frontend ni un pipeline que los corra en cada pull request.

---

## 1. Cómo se corren

Hace falta PostgreSQL (el de `docker compose` en la raíz) y el `.env` del backend.

```bash
cd backend
npm test
```

Eso ejecuta Jest con `backend/test/jest-e2e.json`, un archivo por vez (`--runInBand`). El patrón es `test/**/*.test.ts`. No hace falta levantar `npm run start:dev`: los de integración arrancan la aplicación Nest en el propio test.

Los de punta a punta usan la base real. Conviene correrlos sobre una base de desarrollo, no sobre la de producción.

## 2. Qué está automatizado

### Integración (API contra la base)

| Archivo | Qué cubre | Historias |
|---|---|---|
| `sprint1.e2e.test.ts` | Login y confirmar pedido, con cuenta y como invitado | HU-01, HU-08 |
| `auth-token.e2e.test.ts` | Emisión del JWT, `/api/auth/me` y rutas protegidas (401 / rol) | HU-01, HU-02 |
| `extras.e2e.test.ts` | Adicionales en el detalle, en el carrito y al confirmar (cuenta e invitado) | HU-07 |
| `orders-lifecycle.e2e.test.ts` | Historial, seguimiento, hora estimada, demora, cambio de estado, cancelar y repetir | HU-09 a HU-13 |
| `account.e2e.test.ts` | Perfil, recuperar contraseña y ABM de administradores | HU-14, HU-15, HU-16 |
| `stock.e2e.test.ts` | Carga de stock, reserva al confirmar, 409 sin stock, liberar al cancelar, descontar al entregar | HU-17, HU-18 |
| `parameters-branches.e2e.test.ts` | Parámetros, sucursales dentro del radio, asignación al confirmar y catálogo de estados | HU-19 |
| `address-alias.e2e.test.ts` | Alias de una dirección | HU-06 |

### Sin base (funciones puras)

| Archivo | Qué cubre |
|---|---|
| `geocode.test.ts` | Armado de la consulta a Nominatim y el redondeo de coordenadas |
| `admin-rules.test.ts` | Ajuste masivo de stock (sumar, restar, poner en 0, tope) y los textos de demora del admin |

Esos dos no reemplazan una prueba de punta a punta: fijan reglas que la pantalla usa.

## 3. Qué se considera cubierto por un test

El criterio del grupo, desde el Sprint 3, es que el hilo de negocio tenga al menos el caso feliz y el caso que no debe crear el pedido:

- Confirmar con stock y dentro del radio.
- Sin stock (`OUT_OF_STOCK`) y sin cobertura.
- Liberar al cancelar y descontar al entregar.
- Hora estimada fija y demora (a tiempo, demorado, entregado tarde).
- Reset de contraseña: token válido, y token vencido o ya usado.
- Un cliente no opera rutas de admin.

La definición de terminada de cada historia sigue pidiendo, además, probar la pantalla en el celular. Eso hoy es manual, en el review.

## 4. Qué no está automatizado

| Hueco | Notas |
|---|---|
| Frontend cliente y admin | No hay tests de componentes ni de páginas. |
| Integración continua | No hay un workflow que corra `npm test` al abrir un pull request. |
| Geocodificación en vivo | El test no llama a Nominatim. Prueba la URL y el manejo de “no encontrada”. |
| Pusher | El refresco en tiempo real se ve en la demo, no en Jest. |
| Promociones y reportes | Entran en el Sprint 4. La ficha ya pide tests de porcentual, cupón 2x1, cupón inválido, descuento que no pasa el subtotal y promo vencida. |
| Carga y concurrencia | El caso de dos clientes pidiendo la última unidad está en la regla de negocio; no hay un test que los dispare en paralelo. |

## 5. Qué sigue

En el Sprint 4, los tests nuevos van junto con HU-20 a HU-22, en el mismo comando `npm test`. No se abre una suite de frontend hasta que el precio promocional esté estable.

Un pipeline en el repositorio queda como mejora del Sprint 5, junto con el cierre de la carpeta. Hasta entonces, quien mergea corre `npm test` en local antes de integrar.

## Historial

| Versión | Fecha | Qué cambió |
|---|---|---|
| 1.0 | 07/10/2026 | Inventario de tests al cierre del Sprint 3 y huecos que quedan |
