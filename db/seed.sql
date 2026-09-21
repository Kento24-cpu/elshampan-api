-- El Shampan - seed data
-- Run after schema.sql. Safe to re-run: existing rows are skipped.
-- Product catalog mirrors the mobile app mock data (names and prices).

USE elshampan;

INSERT IGNORE INTO categories (name, image) VALUES
  ('Whisky',    'https://walmartni.vtexassets.com/arquivos/ids/385300-150-auto?aspect=true&height=auto&v=638491486049800000&width=150'),
  ('Ron',       'https://walmartni.vtexassets.com/arquivos/ids/742409/ron-flor-de-cana-7-anos-gran-reserva-375-ml-0026964824735.jpg?v=639082416916430000'),
  ('Vodka',     'https://walmartni.vtexassets.com/arquivos/ids/536743/3405_01.jpg?v=638687529751000000'),
  ('Tequila',   'https://walmartni.vtexassets.com/arquivos/ids/359026/Tequila-Jose-Cuervo-Tradicional-750ml-1-25470.jpg?v=638423784096470000'),
  ('Vinos',     'https://walmartni.vtexassets.com/arquivos/ids/337348/Vino-Tinto-Suave-Santa-Carolina-Reserva-750-1-24811.jpg?v=638415566896500000'),
  ('Cervezas',  'https://walmartni.vtexassets.com/arquivos/ids/752423/cerveza-corona-botella-6-pack-2130-ml-7503024460681.webp?v=639129253451530000'),
  ('Seltzers',  'https://walmartni.vtexassets.com/arquivos/ids/327232/Bebida-Seltzer-Spark-Sabor-Lim-n-6Pack-Lata-350ml-1-26816.jpg?v=638377655492530000');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Johnnie Walker Black Label', 'Johnnie Walker', 'Escocia', (SELECT id FROM categories WHERE name = 'Whisky'), '750 ml', 2750.00, 2990.00, 12, 'PREMIUM', 'https://walmartni.vtexassets.com/arquivos/ids/385300-150-auto?aspect=true&height=auto&v=638491486049800000&width=150', 4.9, 124, 'Whisky escocés de 12 años, reconocido por su perfil profundo, suave y equilibrado.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Johnnie Walker Black Label');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Johnnie Walker Red Label', 'Johnnie Walker', 'Escocia', (SELECT id FROM categories WHERE name = 'Whisky'), '750 ml', 1400.00, NULL, 15, 'POPULAR', 'https://walmartni.vtexassets.com/arquivos/ids/503548/5047_01.jpg?v=638660752409130000', 4.8, 96, 'Blended Scotch Whisky de carácter intenso, ideal para disfrutar solo o en mezclas.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Johnnie Walker Red Label');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Jack Daniel''s Tennessee', 'Jack Daniel''s', 'Estados Unidos', (SELECT id FROM categories WHERE name = 'Whisky'), '750 ml', 1910.00, NULL, 9, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/451109/1890_01.jpg?v=638608853495600000', 4.8, 88, 'Tennessee whiskey clásico, con notas suaves de vainilla, caramelo y roble.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Jack Daniel''s Tennessee');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Flor de Caña 7 Años', 'Flor de Caña', 'Nicaragua', (SELECT id FROM categories WHERE name = 'Ron'), '375 ml', 296.00, NULL, 20, 'NICARAGUA', 'https://walmartni.vtexassets.com/arquivos/ids/742409/ron-flor-de-cana-7-anos-gran-reserva-375-ml-0026964824735.jpg?v=639082416916430000', 4.9, 110, 'Ron nicaragüense añejado durante 7 años, de perfil suave y elegante.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Flor de Caña 7 Años');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Flor de Caña 4 Años', 'Flor de Caña', 'Nicaragua', (SELECT id FROM categories WHERE name = 'Ron'), '375 ml', 188.00, NULL, 24, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/652393/597_01.jpg?v=638841765154430000', 4.8, 73, 'Ron nicaragüense ligero y versátil, perfecto para cócteles y mezclas.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Flor de Caña 4 Años');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Ron Plata Especial', 'Ron Plata', 'Nicaragua', (SELECT id FROM categories WHERE name = 'Ron'), '1 L', 249.00, NULL, 18, 'OFERTA', 'https://walmartni.vtexassets.com/arquivos/ids/652408/598_01.jpg?v=638841765262670000', 4.7, 67, 'Ron blanco añejo de perfil suave y práctico para coctelería.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Ron Plata Especial');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Finlandia Vodka', 'Finlandia', 'Finlandia', (SELECT id FROM categories WHERE name = 'Vodka'), '1 L', 935.00, NULL, 10, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/530956/5255_01.jpg?v=638678528448200000', 4.8, 54, 'Vodka finlandés limpio y refrescante, ideal para tragos y mezclas.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Finlandia Vodka');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Smirnoff No.21', 'Smirnoff', 'Reino Unido', (SELECT id FROM categories WHERE name = 'Vodka'), '750 ml', 930.00, NULL, 14, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/536743/3405_01.jpg?v=638687529751000000', 4.7, 82, 'Vodka clásico de sabor limpio y versátil para coctelería.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Smirnoff No.21');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'José Cuervo Tradicional', 'José Cuervo', 'México', (SELECT id FROM categories WHERE name = 'Tequila'), '750 ml', 2050.00, NULL, 8, 'TOP', 'https://walmartni.vtexassets.com/arquivos/ids/359026/Tequila-Jose-Cuervo-Tradicional-750ml-1-25470.jpg?v=638423784096470000', 4.8, 91, 'Tequila mexicano de perfil tradicional, elaborado para disfrutar solo o en cócteles.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'José Cuervo Tradicional');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'El Jimador Reposado', 'El Jimador', 'México', (SELECT id FROM categories WHERE name = 'Tequila'), '750 ml', 990.00, NULL, 11, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/538822/28686_01.jpg?v=638687797724470000', 4.7, 63, 'Tequila reposado con notas de agave y madera, ideal para reuniones.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'El Jimador Reposado');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Santa Carolina Reserva', 'Santa Carolina', 'Chile', (SELECT id FROM categories WHERE name = 'Vinos'), '750 ml', 457.00, NULL, 17, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/337348/Vino-Tinto-Suave-Santa-Carolina-Reserva-750-1-24811.jpg?v=638415566896500000', 4.6, 52, 'Vino chileno de estilo suave y equilibrado para acompañar comidas y celebraciones.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Santa Carolina Reserva');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Frontera Merlot', 'Frontera', 'Chile', (SELECT id FROM categories WHERE name = 'Vinos'), '750 ml', 379.00, NULL, 19, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/735083/vino-tinto-frontera-de-merlot-750-ml-7804320706009.jpg?v=639064350639900000', 4.5, 44, 'Vino tinto chileno de uva Merlot, frutal y fácil de acompañar.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Frontera Merlot');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Corona Extra 6 Pack', 'Corona', 'México', (SELECT id FROM categories WHERE name = 'Cervezas'), '6 x 355 ml', 348.00, NULL, 30, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/752423/cerveza-corona-botella-6-pack-2130-ml-7503024460681.webp?v=639129253451530000', 4.7, 48, 'Cerveza lager mexicana en presentación de 6 unidades.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Corona Extra 6 Pack');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Toña 4 Pack', 'Toña', 'Nicaragua', (SELECT id FROM categories WHERE name = 'Cervezas'), '4 x 355 ml', 180.00, NULL, 32, 'LOCAL', 'https://walmartni.vtexassets.com/arquivos/ids/659823/2486_01.jpg?v=638859510397030000', 4.8, 115, 'Cerveza nicaragüense de estilo lager, presentada en paquete de 4 unidades.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Toña 4 Pack');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Victoria 6 Pack', 'Victoria', 'Nicaragua', (SELECT id FROM categories WHERE name = 'Cervezas'), '6 x 355 ml', 241.00, NULL, 25, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/683221/2464_01.jpg?v=638914866324070000', 4.7, 84, 'Cerveza lager nicaragüense en paquete de 6 unidades.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Victoria 6 Pack');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Spark Limón 6 Pack', 'Spark', 'Nicaragua', (SELECT id FROM categories WHERE name = 'Seltzers'), '6 x 350 ml', 197.00, NULL, 22, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/327232/Bebida-Seltzer-Spark-Sabor-Lim-n-6Pack-Lata-350ml-1-26816.jpg?v=638377655492530000', 4.6, 38, 'Bebida seltzer sabor limón en presentación de 6 latas.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Spark Limón 6 Pack');

INSERT INTO products (name, brand, country, category_id, volume, price, old_price, stock, badge, image, rating, reviews_count, description)
SELECT 'Jack Daniel''s Apple', 'Jack Daniel''s', 'Estados Unidos', (SELECT id FROM categories WHERE name = 'Whisky'), '750 ml', 1750.00, NULL, 7, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/729530/whiskey-jack-daniels-apple-750-ml-0082184004371.jpg?v=639052128096370000', 4.8, 59, 'Tennessee whiskey combinado con notas de manzana verde para un perfil fresco y aromático.'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Jack Daniel''s Apple');

INSERT IGNORE INTO users (name, email, phone, password_hash) VALUES
  ('Cliente Demo', 'demo@elshampan.com', '8888-8888', '$2b$10$oPJb8ZuWr/pnbLIumt1kHOhjhS6X/Z57rH1nbkcO.koB2sndrp3/i');
