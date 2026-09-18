INSERT INTO categories (id, name, image) VALUES
  (1, 'Whisky', 'https://walmartni.vtexassets.com/arquivos/ids/385300-150-auto?aspect=true&height=auto&v=638491486049800000&width=150'),
  (2, 'Ron', 'https://walmartni.vtexassets.com/arquivos/ids/742409/ron-flor-de-cana-7-anos-gran-reserva-375-ml-0026964824735.jpg?v=639082416916430000'),
  (3, 'Vodka', 'https://walmartni.vtexassets.com/arquivos/ids/536743/3405_01.jpg?v=638687529751000000'),
  (4, 'Tequila', 'https://walmartni.vtexassets.com/arquivos/ids/359026/Tequila-Jose-Cuervo-Tradicional-750ml-1-25470.jpg?v=638423784096470000'),
  (5, 'Vinos', 'https://walmartni.vtexassets.com/arquivos/ids/337348/Vino-Tinto-Suave-Santa-Carolina-Reserva-750-1-24811.jpg?v=638415566896500000'),
  (6, 'Cervezas', 'https://walmartni.vtexassets.com/arquivos/ids/752423/cerveza-corona-botella-6-pack-2130-ml-7503024460681.webp?v=639129253451530000'),
  (7, 'Seltzers', 'https://walmartni.vtexassets.com/arquivos/ids/327232/Bebida-Seltzer-Spark-Sabor-Lim-n-6Pack-Lata-350ml-1-26816.jpg?v=638377655492530000')
ON DUPLICATE KEY UPDATE name = VALUES(name), image = VALUES(image);

INSERT INTO products (id, category_id, name, brand, country, volume, price, old_price, stock, badge, image, rating, reviews, description) VALUES
  (1, 1, 'Johnnie Walker Black Label', 'Johnnie Walker', 'Escocia', '750 ml', 2750, 2990, 12, 'PREMIUM', 'https://walmartni.vtexassets.com/arquivos/ids/385300-150-auto?aspect=true&height=auto&v=638491486049800000&width=150', 4.9, 124, 'Whisky escocés de 12 años, reconocido por su perfil profundo, suave y equilibrado.'),
  (2, 1, 'Johnnie Walker Red Label', 'Johnnie Walker', 'Escocia', '750 ml', 1400, NULL, 15, 'POPULAR', 'https://walmartni.vtexassets.com/arquivos/ids/503548/5047_01.jpg?v=638660752409130000', 4.8, 96, 'Blended Scotch Whisky de carácter intenso, ideal para disfrutar solo o en mezclas.'),
  (3, 1, 'Jack Daniel''s Tennessee', 'Jack Daniel''s', 'Estados Unidos', '750 ml', 1910, NULL, 9, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/451109/1890_01.jpg?v=638608853495600000', 4.8, 88, 'Tennessee whiskey clásico, con notas suaves de vainilla, caramelo y roble.'),
  (4, 2, 'Flor de Caña 7 Años', 'Flor de Caña', 'Nicaragua', '375 ml', 296, NULL, 20, 'NICARAGUA', 'https://walmartni.vtexassets.com/arquivos/ids/742409/ron-flor-de-cana-7-anos-gran-reserva-375-ml-0026964824735.jpg?v=639082416916430000', 4.9, 110, 'Ron nicaragüense añejado durante 7 años, de perfil suave y elegante.'),
  (5, 2, 'Flor de Caña 4 Años', 'Flor de Caña', 'Nicaragua', '375 ml', 188, NULL, 24, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/652393/597_01.jpg?v=638841765154430000', 4.8, 73, 'Ron nicaragüense ligero y versátil, perfecto para cócteles y mezclas.'),
  (6, 2, 'Ron Plata Especial', 'Ron Plata', 'Nicaragua', '1 L', 249, NULL, 18, 'OFERTA', 'https://walmartni.vtexassets.com/arquivos/ids/652408/598_01.jpg?v=638841765262670000', 4.7, 67, 'Ron blanco añejo de perfil suave y práctico para coctelería.'),
  (7, 3, 'Finlandia Vodka', 'Finlandia', 'Finlandia', '1 L', 935, NULL, 10, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/530956/5255_01.jpg?v=638678528448200000', 4.8, 54, 'Vodka finlandés limpio y refrescante, ideal para tragos y mezclas.'),
  (8, 3, 'Smirnoff No.21', 'Smirnoff', 'Reino Unido', '750 ml', 930, NULL, 14, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/536743/3405_01.jpg?v=638687529751000000', 4.7, 82, 'Vodka clásico de sabor limpio y versátil para coctelería.'),
  (9, 4, 'José Cuervo Tradicional', 'José Cuervo', 'México', '750 ml', 2050, NULL, 8, 'TOP', 'https://walmartni.vtexassets.com/arquivos/ids/359026/Tequila-Jose-Cuervo-Tradicional-750ml-1-25470.jpg?v=638423784096470000', 4.8, 91, 'Tequila mexicano de perfil tradicional, elaborado para disfrutar solo o en cócteles.'),
  (10, 4, 'El Jimador Reposado', 'El Jimador', 'México', '750 ml', 990, NULL, 11, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/538822/28686_01.jpg?v=638687797724470000', 4.7, 63, 'Tequila reposado con notas de agave y madera, ideal para reuniones.'),
  (11, 5, 'Santa Carolina Reserva', 'Santa Carolina', 'Chile', '750 ml', 457, NULL, 17, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/337348/Vino-Tinto-Suave-Santa-Carolina-Reserva-750-1-24811.jpg?v=638415566896500000', 4.6, 52, 'Vino chileno de estilo suave y equilibrado para acompañar comidas y celebraciones.'),
  (12, 5, 'Frontera Merlot', 'Frontera', 'Chile', '750 ml', 379, NULL, 19, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/735083/vino-tinto-frontera-de-merlot-750-ml-7804320706009.jpg?v=639064350639900000', 4.5, 44, 'Vino tinto chileno de uva Merlot, frutal y fácil de acompañar.'),
  (13, 6, 'Corona Extra 6 Pack', 'Corona', 'México', '6 x 355 ml', 348, NULL, 30, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/752423/cerveza-corona-botella-6-pack-2130-ml-7503024460681.webp?v=639129253451530000', 4.7, 48, 'Cerveza lager mexicana en presentación de 6 unidades.'),
  (14, 6, 'Toña 4 Pack', 'Toña', 'Nicaragua', '4 x 355 ml', 180, NULL, 32, 'LOCAL', 'https://walmartni.vtexassets.com/arquivos/ids/659823/2486_01.jpg?v=638859510397030000', 4.8, 115, 'Cerveza nicaragüense de estilo lager, presentada en paquete de 4 unidades.'),
  (15, 6, 'Victoria 6 Pack', 'Victoria', 'Nicaragua', '6 x 355 ml', 241, NULL, 25, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/683221/2464_01.jpg?v=638914866324070000', 4.7, 84, 'Cerveza lager nicaragüense en paquete de 6 unidades.'),
  (16, 7, 'Spark Limón 6 Pack', 'Spark', 'Nicaragua', '6 x 350 ml', 197, NULL, 22, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/327232/Bebida-Seltzer-Spark-Sabor-Lim-n-6Pack-Lata-350ml-1-26816.jpg?v=638377655492530000', 4.6, 38, 'Bebida seltzer sabor limón en presentación de 6 latas.'),
  (17, 1, 'Jack Daniel''s Apple', 'Jack Daniel''s', 'Estados Unidos', '750 ml', 1750, NULL, 7, NULL, 'https://walmartni.vtexassets.com/arquivos/ids/729530/whiskey-jack-daniels-apple-750-ml-0082184004371.jpg?v=639052128096370000', 4.8, 59, 'Tennessee whiskey combinado con notas de manzana verde para un perfil fresco y aromático.')
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  brand = VALUES(brand),
  country = VALUES(country),
  volume = VALUES(volume),
  price = VALUES(price),
  old_price = VALUES(old_price),
  stock = VALUES(stock),
  badge = VALUES(badge),
  image = VALUES(image),
  rating = VALUES(rating),
  reviews = VALUES(reviews),
  description = VALUES(description);
