# Database setup

The API runs on **MySQL Server** (`mysql2`, no ORM). **MySQL Workbench** and the **phpMyAdmin bundled with XAMPP** are both used to inspect and manage the same server.

> Verified on this machine: the `MySQL84` service owns port `3306`, XAMPP's MariaDB is stopped, and XAMPP runs PHP 8.2 with `mysqlnd`, which supports MySQL's default `caching_sha2_password` authentication.

## 1. Decide which server owns port 3306

MySQL Server and XAMPP's MariaDB both default to port `3306`, so only one can listen there.

- **Option A (recommended, and the current state):** keep MySQL Server on `3306` and never start MySQL from the XAMPP Control Panel. Use XAMPP only for Apache/phpMyAdmin.
- **Option B:** keep both running by moving XAMPP's MariaDB to `3307`. Edit `C:\xampp\mysql\bin\my.ini`, set `port=3307` under `[mysqld]`, and restart MySQL from the XAMPP Control Panel.

## 2. Point phpMyAdmin at MySQL Server

`C:\xampp\phpMyAdmin\config.inc.php` already uses `host = 127.0.0.1` and no explicit port, so it defaults to `3306` and talks to MySQL Server. Only the credentials need fixing: the file ships with `auth_type = 'config'` and a blank `root` password, which MySQL rejects.

Pick one:

```php
// Log in with your own MySQL credentials on every visit
$cfg['Servers'][$i]['auth_type'] = 'cookie';
```

```php
// Or keep auto-login with a real administrative account
$cfg['Servers'][$i]['auth_type'] = 'config';
$cfg['Servers'][$i]['user'] = 'root';
$cfg['Servers'][$i]['password'] = 'your-root-password';
```

With Option B, add a second `$cfg['Servers'][2]` block on port `3307` to browse MariaDB.

## 3. Create the application user

In MySQL Workbench or phpMyAdmin, as an administrator:

```sql
CREATE USER 'elshampan'@'localhost' IDENTIFIED BY 'your-password-here';
GRANT ALL PRIVILEGES ON elshampan.* TO 'elshampan'@'localhost';
FLUSH PRIVILEGES;
```

The account uses MySQL's default `caching_sha2_password`, which both `mysql2` and phpMyAdmin handle here. Note that `IDENTIFIED WITH mysql_native_password` is **not** an option on MySQL 8.4 — the plugin was removed in that release.

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
