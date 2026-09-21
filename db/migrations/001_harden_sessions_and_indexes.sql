-- Migration 001 - harden sessions and tune indexes
-- Run once, in order, against an existing installation.
-- Fresh installs already get all of this from db/schema.sql.
--
-- Sessions now store the SHA-256 hash of the bearer token instead of the token
-- itself, so a database dump can no longer be replayed as a live session. Rows
-- written before this migration hold raw tokens that can never match a hash, so
-- they are deleted: every client has to log in again.

USE elshampan;

ALTER TABLE sessions
  MODIFY token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;

DELETE FROM sessions;

-- Serve `WHERE user_id = ? ORDER BY created_at DESC, id DESC` with one index.
ALTER TABLE orders
  ADD KEY idx_orders_user_created (user_id, created_at, id);

ALTER TABLE orders
  DROP INDEX idx_orders_user,
  DROP INDEX idx_orders_created;

-- Avoid the filesort on `WHERE order_id IN (...) ORDER BY id`.
ALTER TABLE order_items
  ADD KEY idx_order_items_order_by_id (order_id, id);

ALTER TABLE order_items
  DROP INDEX idx_order_items_order;

-- A leading-% LIKE cannot use this index, it only costs writes.
ALTER TABLE products
  DROP INDEX idx_products_name;

ALTER TABLE products
  ADD CONSTRAINT chk_products_rating CHECK (rating BETWEEN 0 AND 5);

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_total CHECK (total >= 0);

ALTER TABLE order_items
  ADD CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0),
  ADD CONSTRAINT chk_order_items_subtotal CHECK (subtotal >= 0);
