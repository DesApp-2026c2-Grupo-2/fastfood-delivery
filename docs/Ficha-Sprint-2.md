# Ficha Sprint 1

**Proyecto:** Pedidos en casas de comidas rápidas  
**Equipo:** 5 integrantes  
**Sprint:** 1 de 5  
**Planning:** 20/08/2026  
**Review:** 10/09/2026  
**Corte de tareas:** 09/09/2026 23:59
**Duración:** 3 semanas  
**Porcentaje del TP en este incremento:** **40%** de las funcionalidades base del enunciado  
**Extensiones:** fuera de este sprint  
**Stack:** React + Vite (front) · NestJS + TypeScript (back) · PostgreSQL + Prisma (datos) · JWT

---

## 1. Objetivo del sprint

Al 10/09 se puede demostrar, en un celular, este flujo de punta a punta:

1. Un **administrador** inicia sesión (usuario seed) y carga categorías, productos y sucursales.
2. Un **cliente** se registra, inicia sesión, carga una dirección con ubicación geográfica, arma el carrito y **confirma un pedido**.
3. El pedido queda persistido con: cliente, sucursal, dirección, fecha/hora, detalle, importe y estado inicial.

Si ese flujo no cierra, el sprint no está cumplido, aunque haya más pantallas a medias.

---

### RF incluidos (16 / 40 = 40%)

| ID        | Requerimiento                                                  |
| --------- | -------------------------------------------------------------- |
| RF-CLI-01 | Registro de cliente                                            |
| RF-CLI-02 | Inicio de sesión de cliente                                    |
| RF-CLI-05 | Administrar direcciones                                        |
| RF-CLI-07 | Realizar un pedido nuevo                                       |
| RF-ADM-01 | Administrador inicial                                          |
| RF-ADM-02 | Inicio de sesión de administrador                              |
| RF-ADM-04 | Aplicación administrativa independiente (`/admin`)             |
| RF-BRN-01 | ABM de sucursales                                              |
| RF-CAT-01 | ABM de productos                                               |
| RF-CAT-02 | ABM de categorías                                              |
| RF-CAT-03 | Consulta del catálogo                                          |
| RF-CRT-01 | Agregar productos al carrito                                   |
| RF-CRT-02 | Cantidad, observaciones (config especiales: no en este sprint) |
| RF-CRT-03 | Cálculo del importe total                                      |
| RF-CRT-04 | Modificar el carrito                                           |
| RF-ORD-01 | Confirmación del pedido (datos mínimos + estado inicial)       |

---

## 3. Historias de usuario

### HU-01 — Registro e inicio de sesión (cliente)

_Como visitante, quiero registrarme e iniciar sesión, para usar la app como cliente._

### HU-02 — Admin inicial y backoffice

_Como administrador, quiero un usuario seed e iniciar sesión en `/admin`, para cargar el menú._

### HU-03 — ABM de categorías y productos

_Como administrador, quiero crear y editar categorías y productos, para armar el catálogo._

### HU-04 — Consultar catálogo

_Como cliente, quiero ver productos por categoría, para armar un pedido._

### HU-05 — ABM de sucursales

_Como administrador, quiero cargar sucursales con ubicación y horario, para que un pedido tenga un local de origen._

### HU-06 — Direcciones del cliente

_Como cliente, quiero cargar mis direcciones con ubicación geográfica, para indicar dónde entregar._

### HU-07 — Carrito

_Como cliente, quiero agregar, cambiar y quitar productos y ver el total, para controlar lo que voy a pagar._

### HU-08 — Confirmar pedido

_Como cliente, quiero confirmar el pedido, para que quede registrado en el sistema._

---
