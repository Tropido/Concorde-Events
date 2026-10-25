-- DEV/TEST FIXTURES ONLY (used by the PGlite tests and `db:push -- --include-seed` on the TEST project).
-- Prices and stock are placeholders, not approved commercial data. Never apply to production.
-- Real catalogue pieces are entered by staff in /admin/inventory.

insert into public.categories (id, slug, name_fr, image_url, display_order) values
  ('57773760-f8ef-4f31-8e39-8f2e7176c3df', 'seating-lounges', 'Seating & Lounges', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80', 0),
  ('1d8d86b8-ad5b-44b8-8925-ffd4b1832b87', 'tables-dining', 'Tables & Dining', 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80', 1),
  ('c7ebe3bc-9c5f-4895-8cf5-350fd47f19b6', 'lighting', 'Architectural Lighting', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', 2),
  ('82453ebf-77c6-4c4c-8d32-460270f3e939', 'bars-consoles', 'Bars & Reception Consoles', 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80', 3),
  ('6349adb1-ff3c-4948-8bac-22f3ea9b7f20', 'outdoor-luxury', 'Outdoor Luxury', 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80', 4);

insert into public.products (id, slug, category_id, title_fr, description_fr, width, height, depth, dimension_unit, color, material, tags, minimum_nights, featured, images) values
  ('75625c52-94b5-41c9-8753-15dbd31c7671', 'kasaya-curved-sofa', '57773760-f8ef-4f31-8e39-8f2e7176c3df', 'The Kasaya Curved Sofa', 'An architectural masterpiece in ivory bouclé. Designed with organic fluid curves to serve as the focal point for gala VIP lounges and high-fashion product launches.', 240, 78, 95, 'cm', 'Ivory White', 'Textured Bouclé Fabric & Solid Teak Frame', array['Sofa', 'Bouclé', 'Curved', 'VIP Lounge', 'Featured']::text[], 1, true, array['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('0793f820-c508-4ed3-836f-5ec524ba7a9d', 'prasaja-teak-armchair', '57773760-f8ef-4f31-8e39-8f2e7176c3df', 'Prasaja Teak Armchair', 'Crafted from Indonesian plantation teak with hand-woven cane webbing details. Provides understated luxury for wedding ceremonies and editorial photoshoots.', 72, 82, 75, 'cm', 'Natural Teak & Linen', 'Solid Teak & Natural Cane', array['Armchair', 'Teak', 'Natural', 'Minimalist']::text[], 1, true, array['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('6f773dd6-7908-4b49-88eb-36fed4e909e0', 'ganesha-banquet-dining-table', '1d8d86b8-ad5b-44b8-8925-ffd4b1832b87', 'Ganesha Banquet Dining Table', 'A 10-seater solid teak banquet table with rounded oval contours. Designed for intimate luxury dinners, wine tastings, and high-profile wedding banquets.', 300, 76, 110, 'cm', 'Warm Honey Teak', 'Reclaimed Teak Wood', array['Dining Table', 'Teak', 'Banquet', 'Large']::text[], 1, true, array['https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('7221fdf1-215d-43e9-8aac-9a9666a114d8', 'radiant-alabaster-floor-lamp', 'c7ebe3bc-9c5f-4895-8cf5-350fd47f19b6', 'Radiant Alabaster Floor Lamp', 'Hand-sculpted Spanish alabaster column emitting a warm, diffused ambient glow. Wireless battery powered option available for outdoor cocktail areas.', 32, 165, 32, 'cm', 'Warm Alabaster & Aged Brass', 'Alabaster Stone & Brushed Brass', array['Lighting', 'Floor Lamp', 'Alabaster', 'Brass']::text[], 1, false, array['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('0b7bd17c-9e85-4815-8dbc-1604aa8de808', 'breeze-fluted-marble-bar-console', '82453ebf-77c6-4c4c-8d32-460270f3e939', 'Breeze Fluted Marble Bar Console', 'Modular fluted travertine bar module with integrated champagne buckets and soft LED under-counter illumination.', 200, 110, 75, 'cm', 'Travertine Beige', 'Natural Travertine Marble & Stainless Steel', array['Bar Console', 'Marble', 'Modular', 'Reception']::text[], 1, true, array['https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('957c5b8a-ba86-4570-8806-4ed76a7f532c', 'eden-sun-lounge-bed', '6349adb1-ff3c-4948-8bac-22f3ea9b7f20', 'Eden Sun Lounge Bed', 'Double-wide weather-resistant teak lounge bed with quick-dry foam cushions in Mediterranean Sand.', 180, 45, 200, 'cm', 'Sand Cushion & Raw Teak', 'Weather teak & Sunbrella fabric', array['Outdoor', 'Lounge Bed', 'Teak', 'Poolside']::text[], 1, false, array['https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('2308f321-bc76-4d9f-8d47-351d1383ba12', 'vase', 'c7ebe3bc-9c5f-4895-8cf5-350fd47f19b6', 'Vase', 'Ensemble sculptural de 3 vases organiques en céramique brute texturée sable. Formes asymétriques douces créant une ambiance zen et minérale pour les centres de table et buffets.', 35, 45, 30, 'cm', 'Sable Minéral Naturel', 'Céramique Grès Artisanal', array['Vase', 'Céramique', 'Art de la Table', 'New']::text[], 1, true, array['https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('0e2817fd-daaf-4f04-8e8f-0ffe307c63b0', 'lampe', 'c7ebe3bc-9c5f-4895-8cf5-350fd47f19b6', 'Lampe', 'Lampe d''appoint au charme artisanal avec socle en travertin texturé, bague de laiton satiné et abat-jour conique plissé en lin ivoire. Éclairage feutré tamisé.', 32, 55, 32, 'cm', 'Pierre Beige & Lin Cassé', 'Travertin Poreux & Lin Plissé', array['Lampe', 'Luminaire', 'Table', 'New']::text[], 1, true, array['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('cbf1190e-d4fd-49d2-848b-dd29804cf2f3', 'coiffeuse', '82453ebf-77c6-4c4c-8d32-460270f3e939', 'Coiffeuse', 'Commode et console coiffeuse 4 tiroirs en noyer américain à rainures cannelées architecturales. Poignées fines en laiton patiné. Idéal pour loges VIP, suites nuptiales et photocalls.', 110, 95, 52, 'cm', 'Noyer Foncé & Bronze', 'Noyer Massif & Poignées Laiton', array['Coiffeuse', 'Commode', 'Noyer', 'Cannelé', 'New']::text[], 1, true, array['https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('b5d8ad28-7b26-439d-8a6f-f01d2c3bac43', 'table-basse-ronde', '1d8d86b8-ad5b-44b8-8925-ffd4b1832b87', 'Table basse ronde', 'Table basse sculpturale circulaire au plateau épais en travertin romain mat, reposant sur trois colonnes trapues en chêne massif brossé. Chef-d''œuvre de simplicité organique.', 105, 42, 105, 'cm', 'Travertin Crème & Chêne Brun', 'Travertin Naturel & Chêne Massif', array['Table Basse', 'Travertin', 'Ronde', 'Salons', 'New']::text[], 1, true, array['https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('0dae15f2-7ddd-4c65-8143-f83e9d9204da', 'pouff-cuir', '57773760-f8ef-4f31-8e39-8f2e7176c3df', 'Pouff cuir', 'Fauteuil bas pivotant et pouff d''assise généreuse en bouclé écru cocon avec cerclage inférieur et détails en cuir cognac et noyer. Confort enveloppant et rotation fluide 360°.', 85, 75, 85, 'cm', 'Écru & Cognac', 'Tissu Bouclé Laine & Cuir Végétal', array['Pouff', 'Fauteuil', 'Bouclé', 'Cuir', 'Rotatif', 'New']::text[], 1, true, array['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80']::text[]),
  ('f95a7af0-487a-4bf8-8f25-9dcfedb21317', 'pack-de-bougie', 'c7ebe3bc-9c5f-4895-8cf5-350fd47f19b6', 'Pack de Bougies Sculptées', 'Set de bougies artistiques sculptées à la cire d''abeille naturelle, parfum ambre et figue noire. Apporte une lueur intimiste et un raffinement olfactif à vos tables.', 25, 30, 25, 'cm', 'Cire Végétale Ivoire', 'Cire d''Abeille & Mèche Coton', array['Bougies', 'Art de la Table', 'Ambiance', 'New']::text[], 1, false, array['https://cdn.converty.shop/images/83261b1b39130cdb40d8455909fe8d9fe9f6eba469074f43c690767d95a1ecb5_lg.webp']::text[]),
  ('980ad66f-95b0-48cd-8aad-6de2ecaed2c7', 'miroir-dore', '82453ebf-77c6-4c4c-8d32-460270f3e939', 'Miroir Doré d''Époque', 'Grand miroir d''apparat au cadre sculpté à la feuille d''or patinée style Haussmannien. Parfait pour les vestiaires, photocalls et zones d''accueil luxueuses.', 90, 180, 8, 'cm', 'Or Vieilli Patiné', 'Bois Sculpté & Feuille d''Or', array['Miroir', 'Vintage', 'Décoration', 'Photocall', 'New']::text[], 1, false, array['https://cdn.converty.shop/images/7dad31fa58d8f31c86d4b235d6f25aebc564d74f4ec49bce6fd769aad0ccb382_lg.webp']::text[]);

insert into public.product_stock (product_id, country, quantity_owned) values
  ('75625c52-94b5-41c9-8753-15dbd31c7671', 'TN', 12),
  ('0793f820-c508-4ed3-836f-5ec524ba7a9d', 'TN', 45),
  ('6f773dd6-7908-4b49-88eb-36fed4e909e0', 'TN', 18),
  ('7221fdf1-215d-43e9-8aac-9a9666a114d8', 'TN', 30),
  ('0b7bd17c-9e85-4815-8dbc-1604aa8de808', 'TN', 8),
  ('957c5b8a-ba86-4570-8806-4ed76a7f532c', 'TN', 16),
  ('2308f321-bc76-4d9f-8d47-351d1383ba12', 'TN', 60),
  ('0e2817fd-daaf-4f04-8e8f-0ffe307c63b0', 'TN', 42),
  ('cbf1190e-d4fd-49d2-848b-dd29804cf2f3', 'TN', 15),
  ('b5d8ad28-7b26-439d-8a6f-f01d2c3bac43', 'TN', 25),
  ('0dae15f2-7ddd-4c65-8143-f83e9d9204da', 'TN', 38),
  ('f95a7af0-487a-4bf8-8f25-9dcfedb21317', 'TN', 50),
  ('980ad66f-95b0-48cd-8aad-6de2ecaed2c7', 'TN', 12);

insert into public.product_prices (product_id, country, tier, amount) values
  ('75625c52-94b5-41c9-8753-15dbd31c7671', 'TN', 'retail', 1150),
  ('75625c52-94b5-41c9-8753-15dbd31c7671', 'TN', 'pro', 920),
  ('0793f820-c508-4ed3-836f-5ec524ba7a9d', 'TN', 'retail', 310),
  ('0793f820-c508-4ed3-836f-5ec524ba7a9d', 'TN', 'pro', 245),
  ('6f773dd6-7908-4b49-88eb-36fed4e909e0', 'TN', 'retail', 920),
  ('6f773dd6-7908-4b49-88eb-36fed4e909e0', 'TN', 'pro', 720),
  ('7221fdf1-215d-43e9-8aac-9a9666a114d8', 'TN', 'retail', 280),
  ('7221fdf1-215d-43e9-8aac-9a9666a114d8', 'TN', 'pro', 215),
  ('0b7bd17c-9e85-4815-8dbc-1604aa8de808', 'TN', 'retail', 1480),
  ('0b7bd17c-9e85-4815-8dbc-1604aa8de808', 'TN', 'pro', 1180),
  ('957c5b8a-ba86-4570-8806-4ed76a7f532c', 'TN', 'retail', 590),
  ('957c5b8a-ba86-4570-8806-4ed76a7f532c', 'TN', 'pro', 460),
  ('2308f321-bc76-4d9f-8d47-351d1383ba12', 'TN', 'retail', 55),
  ('2308f321-bc76-4d9f-8d47-351d1383ba12', 'TN', 'pro', 45),
  ('0e2817fd-daaf-4f04-8e8f-0ffe307c63b0', 'TN', 'retail', 55),
  ('0e2817fd-daaf-4f04-8e8f-0ffe307c63b0', 'TN', 'pro', 42),
  ('cbf1190e-d4fd-49d2-848b-dd29804cf2f3', 'TN', 'retail', 45),
  ('cbf1190e-d4fd-49d2-848b-dd29804cf2f3', 'TN', 'pro', 38),
  ('b5d8ad28-7b26-439d-8a6f-f01d2c3bac43', 'TN', 'retail', 89),
  ('b5d8ad28-7b26-439d-8a6f-f01d2c3bac43', 'TN', 'pro', 72),
  ('0dae15f2-7ddd-4c65-8143-f83e9d9204da', 'TN', 'retail', 45),
  ('0dae15f2-7ddd-4c65-8143-f83e9d9204da', 'TN', 'pro', 36),
  ('f95a7af0-487a-4bf8-8f25-9dcfedb21317', 'TN', 'retail', 55),
  ('f95a7af0-487a-4bf8-8f25-9dcfedb21317', 'TN', 'pro', 45),
  ('980ad66f-95b0-48cd-8aad-6de2ecaed2c7', 'TN', 'retail', 49),
  ('980ad66f-95b0-48cd-8aad-6de2ecaed2c7', 'TN', 'pro', 40);

