# elshampan-api

Backend and API for **El Shampán**, a liquor store. Express 5 over `mysql2` with raw SQL (no ORM).

## Requirements

- Node.js 20 or newer
- MySQL Server 8.x **or** MariaDB 10.4 (the engine shipped with XAMPP)
- A database created from `db/schema.sql` — see [`db/README.md`](db/README.md)

## Getting started

```bash
npm install --include=dev        # --include=dev matters if npm is configured with omit=dev
cp .env.example .env             # then fill in DB_USER / DB_PASSWORD
npm run dev                      # nodemon, restarts on change
```

Import the schema and seed data first (see [`db/README.md`](db/README.md)), then check that everything is wired up:

```bash
curl http://localhost:3000/api/health
# { "status": "ok", "db": "up" }
```

`db: "down"` means the API cannot reach the database — usually MySQL is not running.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API with nodemon |
| `npm start` | Starts the API once |
| `npm test` | Unit tests only; no database needed |
| `npm run lint` | ESLint over the whole project |

### Integration tests

A second suite executes real SQL against a throwaway `elshampan_test` database, which it recreates on every run:

```powershell
$env:RUN_DB_TESTS="1"; npm test        # PowerShell
set RUN_DB_TESTS=1 && npm test         # cmd
```

Without `RUN_DB_TESTS=1` those tests are skipped and `npm test` stays database-free. It never touches the `elshampan` database.

## Endpoints

Everything lives under `/api`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | `200 { status, db }`, or `503` when the database is unreachable |
| POST | `/auth/register` | — | Creates an account, returns the user and a token |
| POST | `/auth/login` | — | Returns the user and a token |
| POST | `/auth/logout` | Bearer | Revokes the current token. `204` |
| GET | `/auth/me` | Bearer | Returns the current user |
| PATCH | `/auth/me` | Bearer | Updates `name` and `phone` |
| GET | `/categories` | — | All categories |
| GET | `/products` | — | Product list. Optional `category`, `search` and `limit` (max 100) |
| GET | `/products/:id` | — | One product |
| POST | `/orders` | Bearer (optional) | Creates an order. Without a token it is stored as a guest order |
| GET | `/orders` | Bearer | Order history of the authenticated user |
| GET | `/orders/:id` | Bearer | One order, only if it belongs to the user |

### Authentication

`POST /auth/register` and `POST /auth/login` return an opaque token:

```json
{
  "user": { "id": 1, "name": "Cliente Demo", "email": "demo@elshampan.com", "phone": "8888-8888" },
  "token": "a1b2c3…"
}
```

Send it on every protected request as `Authorization: Bearer <token>`. Only a SHA-256 hash of the token is stored, and it stays valid for `SESSION_TTL_DAYS` days unless `POST /auth/logout` revokes it.

The seed creates the demo account `demo@elshampan.com` / `Demo1234`, the same one shown in the mobile app.

### Example

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@elshampan.com","password":"Demo1234"}' | jq -r .token)

curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customer_name": "Juan Pérez",
    "customer_phone": "8888-8888",
    "address": "Barrio Central, casa 4",
    "items": [{ "product_id": 1, "quantity": 2 }]
  }'
```

Prices and stock are always read from the database, never from the request body, and the order is written in a single transaction that locks the product rows:

```json
{
  "id": 1,
  "code": "ESH-000001",
  "status": "pendiente",
  "total": 5500,
  "items": [{ "product_id": 1, "product_name": "Johnnie Walker Black Label", "quantity": 2, "unit_price": 2750, "subtotal": 5500 }]
}
```

### Errors

Every failure answers with a JSON body shaped `{ "message": "…" }` and the message is always in Spanish.

| Status | Meaning |
|---|---|
| 400 | Validation failed, or a value is out of range for its column |
| 401 | Missing, unknown or revoked token; wrong credentials |
| 404 | Unknown route, product or order |
| 409 | The resource already exists (duplicate email), or a stock/lock conflict |
| 413 | Request body larger than 1 MB |
| 429 | Too many login or register attempts from the same IP |
| 503 | The database is unreachable |

## Configuration

All settings come from `.env` (see `.env.example`):

| Variable | Default | Notes |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | |
| `LOG_LEVEL` | `info` | Set to `silent` to turn request logging off |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `root` / — / `elshampan` | |
| `SESSION_TTL_DAYS` | `7` | Session lifetime |
| `CORS_ORIGINS` | `*` | Comma separated allowlist, or `*` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | Throttle window for login and register |
| `AUTH_RATE_LIMIT_LIMIT` | `20` | Attempts allowed per window and IP |

## Project layout

```
src/
  app.js            express app factory (middleware, routers, error handling)
  server.js         process entry point: startup check, listen, graceful shutdown
  config/env.js     environment variables in one place
  db/pool.js        mysql2 connection pool
  middleware/       auth, error mapping, rate limit, request log
  repositories/     SQL; one module per table
  services/         business rules (auth, orders)
  routes/           express routers
  utils/            shared httpError, validation and token helpers
db/
  schema.sql        tables, indexes and constraints
  seed.sql          demo catalog and account
  migrations/       one-off upgrades for existing installations
tests/              unit tests (fake pool) and integration tests (real MariaDB)
```
