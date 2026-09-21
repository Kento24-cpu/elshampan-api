# Database setup

The API runs on **MySQL Server** (`mysql2`, no ORM). **MySQL Workbench** and the **phpMyAdmin bundled with XAMPP** are both used to inspect and manage the same server.

## 1. Decide which server owns port 3306

MySQL Server and XAMPP's MariaDB both default to port `3306`, so only one can listen there.

- **Option A (recommended):** keep MySQL Server on `3306` and never start MySQL from the XAMPP Control Panel. Use XAMPP only for Apache/phpMyAdmin.
- **Option B:** keep both running by moving XAMPP's MariaDB to `3307`. Edit `C:\xampp\mysql\bin\my.ini`, set `port=3307` under `[mysqld]`, and restart MySQL from the XAMPP Control Panel.

## 2. Point phpMyAdmin at MySQL Server

Edit `C:\xampp\phpMyAdmin\config.inc.php`:

```php
$cfg['Servers'][1]['host'] = '127.0.0.1';
$cfg['Servers'][1]['port'] = '3306';
$cfg['Servers'][1]['auth_type'] = 'cookie';
```

Use `auth_type = 'config'` with explicit `user` / `password` if you prefer not to log in every time. With Option B, add a second `$cfg['Servers'][2]` block on port `3307` to browse MariaDB.

## 3. Create the application user

In MySQL Workbench or phpMyAdmin, as an administrator:

```sql
CREATE USER 'elshampan'@'localhost' IDENTIFIED BY 'your-password-here';
GRANT ALL PRIVILEGES ON elshampan.* TO 'elshampan'@'localhost';
FLUSH PRIVILEGES;
```

If phpMyAdmin cannot authenticate with that user (PHP built against an older `mysqlnd`), recreate it with `IDENTIFIED WITH mysql_native_password BY 'your-password-here'`. The API itself supports the default `caching_sha2_password`.

## 4. Import schema and seed

Pick whichever tool you prefer — all three run the same files, in this order:

**MySQL Workbench:** open `db/schema.sql`, execute it (*Query → Execute All*), then do the same with `db/seed.sql`.

**phpMyAdmin:** *Import → Choose file*, select `db/schema.sql`, **Import**; repeat with `db/seed.sql`.

**Command line:**

```bash
mysql -u elshampan -p --default-character-set=utf8mb4 < db/schema.sql
mysql -u elshampan -p --default-character-set=utf8mb4 < db/seed.sql
```

Both files are safe to re-run: tables use `CREATE TABLE IF NOT EXISTS` and rows are skipped when they already exist.

## 5. Verify

```sql
USE elshampan;
SELECT COUNT(*) FROM categories;  -- 7
SELECT COUNT(*) FROM products;    -- 17
SELECT COUNT(*) FROM users;       -- 1 (demo account)
```

## 6. Configure the API

Copy `.env.example` to `.env` and fill in the credentials created in step 3:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=elshampan
DB_PASSWORD=your-password-here
DB_NAME=elshampan
SESSION_TTL_DAYS=7
```

`.env` is gitignored — never commit it.

## 7. Upgrading an existing database

Fresh installs already get everything from `db/schema.sql`. An installation created before the hardening work needs the one-off scripts in `db/migrations/`, run once and in order:

```bash
mysql -u elshampan -p --default-character-set=utf8mb4 -e "source db/migrations/001_harden_sessions_and_indexes.sql"
```

`001` stores a hash of the session token instead of the token itself, so it **deletes every existing session** — everyone has to log in again. It also adds the composite indexes and the defensive `CHECK` constraints.

## Demo account

The seed creates `demo@elshampan.com` / `Demo1234`, matching the credentials shown in the mobile app.

## Schema overview

| Table | Purpose |
|---|---|
| `categories` | Product categories (`name` is unique and matches `product.category` in the API response) |
| `products` | Catalog, with `category_id` foreign key and `reviews_count` |
| `users` | Accounts, `password_hash` holds a bcrypt hash |
| `sessions` | Opaque bearer tokens (`token`, `expires_at`) issued by the auth endpoints |
| `orders` | Orders, `user_id` is `NULL` for guest checkout, `code` is assigned after insert |
| `order_items` | Order lines with a price/name snapshot of the product at purchase time |

## Server settings worth checking

- **Run MySQL in strict mode.** XAMPP's MariaDB ships with `sql_mode = NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION`, so an over-long string is **silently truncated** instead of rejected. The API validates every field length before writing, but strict mode is still the right default for the database itself. Add this under `[mysqld]` in `C:\xampp\mysql\bin\my.ini` and restart MySQL from the XAMPP Control Panel:

  ```ini
  sql_mode=STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
  ```

- **Time zone.** `sessions.expires_at` is written by Node and compared against the server's `NOW()`, which assumes the API and the database run on the same machine. Deploying them apart means standardising on UTC.

## Integration tests

`npm test` needs no database. A second suite runs real SQL against a throwaway `elshampan_test` database that it drops and recreates on every run, so it never touches `elshampan`:

```powershell
$env:RUN_DB_TESTS="1"; npm test
```

The account in `.env` needs rights on that database. Create it once as an administrator:

```sql
CREATE DATABASE IF NOT EXISTS elshampan_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON elshampan_test.* TO 'elshampan'@'localhost';
FLUSH PRIVILEGES;
```
