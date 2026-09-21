# Database setup

The API talks to MySQL/MariaDB through `mysql2` (no ORM). Both the **phpMyAdmin bundled with XAMPP** and **MySQL Workbench** are used to inspect and manage the same server.

The schema and seed are validated on **MariaDB 10.4.32** (the engine XAMPP ships) and are written to also run on MySQL 8.x. `DECIMAL` columns come back from the driver as strings, which is why the repositories convert prices and totals with `Number()`.

## 1. Only one engine can own port 3306

MySQL Server and XAMPP's MariaDB both default to `3306`, so run one at a time.

- **Using XAMPP's MariaDB (current setup):** start MySQL from the XAMPP Control Panel. The standalone `MySQL84` Windows service is set to start automatically, so it reclaims `3306` on every reboot — set it to **Manual** under `services.msc` (service properties → Startup type) so the two stop fighting over the port.
- **Using MySQL Server instead:** leave the `MySQL84` service running and never start MySQL from the XAMPP Control Panel.

## 2. phpMyAdmin

`C:\xampp\phpMyAdmin\config.inc.php` already points at `host = 127.0.0.1` with no explicit port, so it reaches whichever engine owns `3306`.

XAMPP ships with `auth_type = 'config'` and a blank `root` password, which matches a default XAMPP MariaDB and works out of the box. If you set a password on `root`, either update the file:

```php
$cfg['Servers'][$i]['auth_type'] = 'config';
$cfg['Servers'][$i]['user'] = 'root';
$cfg['Servers'][$i]['password'] = 'your-root-password';
```

or switch to cookie auth so phpMyAdmin asks you to log in:

```php
$cfg['Servers'][$i]['auth_type'] = 'cookie';
```

## 3. Create the application user

In phpMyAdmin (*User accounts → Add user account*) or MySQL Workbench, as an administrator:

```sql
CREATE USER 'elshampan'@'localhost' IDENTIFIED BY 'your-password-here';
GRANT ALL PRIVILEGES ON elshampan.* TO 'elshampan'@'localhost';
FLUSH PRIVILEGES;
```

No special authentication plugin is needed: MariaDB authenticates with `mysql_native_password` by default, and `mysql2` handles both that and MySQL 8's `caching_sha2_password`. (`mysql_native_password` no longer exists on MySQL 8.4, so do not reach for it if you switch engines.)

## 4. Import schema and seed

Run the files in this order. Both are safe to re-run: tables use `CREATE TABLE IF NOT EXISTS`, category and user rows use `INSERT IGNORE`, and product rows are skipped when a product with the same name already exists.

**phpMyAdmin:** open <http://localhost/phpmyadmin>, go to *Import*, choose `db/schema.sql`, press **Import**; repeat with `db/seed.sql`.

**MySQL Workbench:** open each file and use *Query → Execute (All or Selection)*, `schema.sql` first.

**Command line** (the `source` form avoids the `<` operator, which PowerShell does not support):

```bash
mysql -u elshampan -p --default-character-set=utf8mb4 -e "source db/schema.sql"
mysql -u elshampan -p --default-character-set=utf8mb4 -e "source db/seed.sql"
```

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
