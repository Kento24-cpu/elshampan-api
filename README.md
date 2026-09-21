# El Shampán API

Backend de la tienda de licores sellados **El Shampán**: API REST en Node.js + Express sobre MySQL/MariaDB, consumida por la app Expo/React Native de [`Kento24-cpu/elshampan`](https://github.com/Kento24-cpu/elshampan).

## Stack

- Node.js 20+ con JavaScript ESM
- Express 5 y `mysql2` (SQL directo con consultas parametrizadas, sin ORM)
- `bcryptjs` para contraseñas y `jsonwebtoken` para sesiones (JWT HS256, 7 días)
- Tests con `node:test` y `fetch` (sin dependencias adicionales)

## Requisitos

- Node.js 20 o superior
- MySQL 8 o MariaDB 10.6+ en `localhost` (en este equipo MariaDB corre en el puerto `3307`)
- Usuario de base de datos con permisos sobre `elshampan` y `elshampan_test`

## Puesta en marcha

```bash
cp .env.example .env
npm install            # si tu entorno define NODE_ENV=production usa: npm install --include=dev
npm run db:setup       # crea la base, el esquema, las semillas y el usuario demo
npm run dev            # API en http://0.0.0.0:3000
```

Todas las rutas viven bajo `/api`. Desde un teléfono en la misma red se accede como `http://IP-DE-TU-PC:3000/api`.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la API con recarga automática (nodemon) |
| `npm start` | Levanta la API sin recarga |
| `npm run db:setup` | Crea la base, aplica `src/db/schema.sql` y `src/db/seed.sql`, y crea el usuario demo |
| `npm run db:reset` | Igual que `db:setup` pero **borra** la base primero |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm test` | Recrea `elshampan_test` y corre la suite completa |

## Endpoints

| Método | Ruta | Auth | Entrada | Respuesta |
|---|---|---|---|---|
| GET | `/api/health` | no | — | `{ "status": "ok", "db": "up" }` (503 si la base no responde) |
| POST | `/api/auth/register` | no | `{ name, email, password, phone? }` | `201 { token, user }` |
| POST | `/api/auth/login` | no | `{ email, password }` | `200 { token, user }` |
| GET | `/api/auth/me` | sí | — | `{ id, name, email, phone }` |
| PATCH | `/api/auth/me` | sí | `{ name?, phone? }` | usuario actualizado |
| GET | `/api/categories` | no | — | `[ { id, name, image } ]` |
| GET | `/api/products` | no | `category?`, `q?`, `limit?`, `offset?` | `[ producto ]` |
| GET | `/api/products/:id` | no | — | producto · 404 si no existe |
| POST | `/api/orders` | opcional | `{ customer_name, customer_phone, address, notes?, items: [ { product_id, quantity } ] }` | `201 pedido` · 409 sin stock |
| GET | `/api/orders` | sí | `limit?`, `offset?` | `[ pedido ]` del usuario |
| GET | `/api/orders/:id` | sí | — | pedido propio · 404 si es de otro |

Convenciones: los `id` viajan como string, los precios como enteros en córdobas, las listas son arrays simples (`limit` 50, máximo 200; `offset` 0, máximo 10000) y los errores siempre son `{ "message": "..." }`.

`POST /api/orders` acepta invitados (sin token) y asocia el pedido al usuario cuando se envía `Authorization: Bearer <token>`; el total y el stock se calculan dentro de una transacción con precios de la base de datos.

## Datos de ejemplo

- 7 categorías y 17 productos tomados del catálogo de la app (`src/db/seed.sql`)
- Usuario demo: **demo@elshampan.com** / **Demo1234**

## Notas del entorno local

- En este equipo el MySQL de Windows ocupa el `3306` dentro de WSL (networking espejado), por eso MariaDB local escucha en `3307` y `.env` apunta ahí.
- El servidor escucha en `0.0.0.0` para que el teléfono o el emulador puedan alcanzarlo.
- No hay configuraciones de producción: es un backend pensado para la demo local.
