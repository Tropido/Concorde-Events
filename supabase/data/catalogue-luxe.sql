-- Rent for Events: provisional luxury catalogue for the TEST project only.
-- NOT a migration: production must never receive placeholder data. Apply with
--   npm run db:catalogue
-- which refuses any database other than TEST_PROJECT_REF. Idempotent by slug: running it
-- again updates the same rows. Prices, stock and photos are provisional (see
-- product_internal.internal_notes), to be confirmed by Fatma. Photos: verified Unsplash
-- images (free Unsplash License), temporary.
-- One statement (data-modifying CTEs): atomic, and "supabase db query" runs a single command.

-- Categories (existing slugs renamed, three new ones).
with cats as (
insert into public.categories (slug, name_fr, name_ar, display_order) values
  ('seating-lounges', 'Salons & assises', 'الصالونات والمقاعد', 1),
  ('reception-chairs', 'Chaises de réception', 'كراسي الاستقبال', 2),
  ('tables-dining', 'Tables & mange-debout', 'الطاولات وطاولات الوقوف', 3),
  ('wedding-ceremony', 'Mariage & cérémonie', 'الزفاف والمراسم', 4),
  ('decoration', 'Décoration & art de la table', 'الديكور وفن المائدة', 5),
  ('lighting', 'Éclairage & lustres', 'الإنارة والثريات', 6),
  ('bars-consoles', 'Bars & réception', 'البارات والاستقبال', 7),
  ('outdoor-luxury', 'Extérieur & lounge', 'الفضاء الخارجي واللاونج', 8),
  ('rugs-textiles', 'Tapis & textiles', 'الزرابي والمنسوجات', 9)
on conflict (slug) do update set name_fr = excluded.name_fr, name_ar = excluded.name_ar, display_order = excluded.display_order
returning id, slug
),

-- Pieces.
prods as (
insert into public.products (
  slug, category_id, sku, title_fr, title_ar, description_fr, description_ar, badge, tone, color, color_hex,
  material, finish, style, width, height, depth, dimension_unit, weight_kg, seating_capacity, setup_minutes,
  deposit_amount, highlights_fr, highlights_ar, care_fr, care_ar, tags, minimum_nights, featured, status, images, image_fit
)
select v.slug, c.id, v.sku, v.title_fr, v.title_ar, v.description_fr, v.description_ar, v.badge, v.tone, v.color, v.color_hex,
  v.material, v.finish, v.style, v.width, v.height, v.depth, v.dimension_unit, v.weight_kg, v.seating_capacity, v.setup_minutes,
  v.deposit_amount, v.highlights_fr, v.highlights_ar, v.care_fr, v.care_ar, v.tags, 1, v.featured, 'active', v.images, v.image_fit
from (values
  ('fauteuil-boucle-ivoire', 'seating-lounges', 'R4E-SAL-001', 'Fauteuil bouclé ivoire', 'كرسي بوكليه عاجي', 'Fauteuil rond tapissé de bouclé de laine ivoire, assise basse et enveloppante. Pour un coin salon ou un espace photo.', 'كرسي دائري مكسو بقماش بوكليه صوفي عاجي، بجلسة منخفضة ومريحة. مناسب لركن الجلوس أو لمساحة التصوير.', 'new', 'cream', 'Ivoire', '#efe7dc', 'Bouclé de laine, structure en bois', 'Bouclé', 'Contemporain', 85, 78, 80, 'cm', 28, 1, 5, 150, array['Bouclé de laine', 'Assise basse et profonde']::text[], array['قماش بوكليه صوفي', 'جلسة منخفضة وعميقة']::text[], 'Brosser doucement. Ne pas exposer à la pluie.', 'يُنظَّف بفرشاة ناعمة. لا يُعرَّض للمطر.', array['Contemporain', 'Ivoire']::text[], true, array['https://images.unsplash.com/photo-1684165610413-2401399e0e59?auto=format&w=1600&q=80']::text[], 'contain'),
  ('fauteuil-louis-xvi-dore', 'seating-lounges', 'R4E-SAL-002', 'Fauteuil Louis XVI doré', 'كرسي لويس السادس عشر مذهّب', 'Fauteuil en hêtre sculpté et doré à la feuille, assise et dossier en velours. Pour une table d''honneur ou un salon d''accueil.', 'كرسي من خشب الزان المنحوت والمذهّب، بمقعد وظهر من المخمل. لطاولة الشرف أو لصالون الاستقبال.', 'bestseller', 'sand', 'Or et vieux rose', '#c9a35b', 'Hêtre sculpté, feuille d''or, velours', 'Doré à la feuille', 'Louis XVI', 64, 98, 60, 'cm', 12, 1, 5, 150, array['Dorure à la feuille', 'Velours vieux rose']::text[], array['تذهيب بورق الذهب', 'مخمل وردي عتيق']::text[], 'Manipuler par la structure, jamais par les accoudoirs.', 'يُحمل من الهيكل وليس من مسندي الذراعين.', array['Louis XVI', 'Or et vieux rose']::text[], true, array['https://images.unsplash.com/photo-1773848947027-fd001ceba694?auto=format&w=1600&q=80']::text[], 'cover'),
  ('banquette-capitonnee-velours-noir', 'seating-lounges', 'R4E-SAL-003', 'Banquette capitonnée en velours noir', 'أريكة مخملية سوداء منجّدة', 'Banquette trois places en velours noir capitonné, pieds en noyer. Pour un salon lounge ou un espace VIP.', 'أريكة بثلاثة مقاعد من المخمل الأسود المنجّد، بأرجل من خشب الجوز. لصالون اللاونج أو لمساحة كبار الضيوف.', null, 'stone', 'Noir', '#1f1b1a', 'Velours, pieds en noyer', 'Capitonné', 'Années 50', 210, 80, 90, 'cm', 55, 3, 15, 400, array['Trois places', 'Capitonnage boutonné']::text[], array['ثلاثة مقاعد', 'تنجيد بالأزرار']::text[], 'Dépoussiérer à la brosse douce dans le sens du velours.', 'يُنفض الغبار بفرشاة ناعمة في اتجاه المخمل.', array['Années 50', 'Noir']::text[], false, array['https://images.unsplash.com/photo-1782512175859-02bde5592785?auto=format&w=1600&q=80']::text[], 'cover'),
  ('canape-louis-xv-turquoise', 'seating-lounges', 'R4E-SAL-004', 'Canapé Louis XV turquoise', 'كنبة لويس الخامس عشر فيروزية', 'Canapé deux places à cadre laqué blanc et velours turquoise. Une pièce de caractère pour un salon des mariés ou un photocall.', 'كنبة بمقعدين بإطار مطلي بالأبيض ومخمل فيروزي. قطعة مميزة لصالون العروسين أو لركن التصوير.', 'limited', 'almond', 'Turquoise', '#2fb1b0', 'Velours, bois laqué', 'Laqué blanc', 'Louis XV', 150, 95, 70, 'cm', 40, 2, 15, 500, array['Cadre laqué blanc', 'Deux places']::text[], array['إطار مطلي بالأبيض', 'مقعدان']::text[], 'Éviter le soleil direct prolongé sur le velours.', 'يُتجنّب تعريض المخمل لأشعة الشمس المباشرة لمدة طويلة.', array['Louis XV', 'Turquoise']::text[], false, array['https://images.unsplash.com/photo-1771316210386-39662a3b28fe?auto=format&w=1600&q=80']::text[], 'cover'),
  ('chaise-chiavari-doree', 'reception-chairs', 'R4E-CHA-001', 'Chaise Chiavari dorée', 'كرسي شيافاري مذهّب', 'La chaise de réception classique, dorée, livrée avec sa galette d''assise. Pour les tables de mariage et de gala.', 'كرسي الاستقبال الكلاسيكي، مذهّب ومع وسادة الجلوس. لطاولات الأعراس والحفلات.', 'bestseller', 'tan', 'Or', '#c9a35b', 'Résine, galette en tissu', 'Doré', 'Chiavari', 40, 92, 42, 'cm', 3.5, 1, 1, null, array['Galette d''assise incluse', 'Légère et empilable']::text[], array['وسادة الجلوس مشمولة', 'خفيف وقابل للتكديس']::text[], 'Empiler par dix au maximum, galettes retirées.', 'يُكدَّس عشرة كراسٍ كحد أقصى بعد نزع الوسائد.', array['Chiavari', 'Or']::text[], true, array['https://images.unsplash.com/photo-1768851142314-c4ebf49ad45b?auto=format&w=1600&q=80']::text[], 'cover'),
  ('chaise-napoleon-transparente', 'reception-chairs', 'R4E-CHA-002', 'Chaise Napoléon transparente', 'كرسي نابليون شفاف', 'Chaise Napoléon III en polycarbonate transparent, galette blanche. Discrète en cérémonie comme en dîner.', 'كرسي نابليون الثالث من البوليكربونات الشفاف مع وسادة بيضاء. أنيق في المراسم وفي العشاء.', null, 'stone', 'Transparent', '#e3e8ea', 'Polycarbonate, galette blanche', 'Transparent', 'Napoléon III', 40, 92, 45, 'cm', 4, 1, 1, null, array['Usage intérieur et extérieur', 'Galette blanche incluse']::text[], array['للداخل وللخارج', 'وسادة بيضاء مشمولة']::text[], 'Nettoyer au chiffon microfibre, sans produit abrasif.', 'يُنظَّف بقطعة من الألياف الدقيقة دون مواد كاشطة.', array['Napoléon III', 'Transparent']::text[], false, array['https://images.unsplash.com/photo-1772127822533-470d1a0245d2?auto=format&w=1600&q=80']::text[], 'cover'),
  ('chaise-cross-back-bois', 'reception-chairs', 'R4E-CHA-003', 'Chaise cross-back en bois', 'كرسي خشبي بظهر متقاطع', 'Chaise en chêne au dossier croisé et assise cannée. Pour les tables champêtres et les dîners en extérieur.', 'كرسي من خشب البلوط بظهر متقاطع ومقعد من القصب. للطاولات الريفية والعشاء في الهواء الطلق.', null, 'tan', 'Chêne naturel', '#b08968', 'Chêne massif, assise cannée', 'Huilé', 'Bohème', 46, 88, 50, 'cm', 5, 1, 1, null, array['Chêne massif', 'Assise cannée']::text[], array['بلوط صلب', 'مقعد من القصب']::text[], 'Ne pas laisser sous la pluie.', 'لا يُترك تحت المطر.', array['Bohème', 'Chêne naturel']::text[], false, array['https://images.unsplash.com/photo-1758810743122-39cea73cee34?auto=format&w=1600&q=80']::text[], 'cover'),
  ('chaise-medaillon-doree', 'reception-chairs', 'R4E-CHA-004', 'Chaise médaillon dorée', 'كرسي ميدالية مذهّب', 'Chaise à dossier médaillon, structure dorée et assise capitonnée blanche. Pour la table des mariés et les tables d''honneur.', 'كرسي بظهر بيضوي، بهيكل مذهّب ومقعد أبيض منجّد. لطاولة العروسين وطاولات الشرف.', null, 'sand', 'Or et blanc', '#d4af37', 'Métal doré, assise capitonnée', 'Doré', 'Louis XVI', 48, 98, 50, 'cm', 6, 1, 1, null, array['Dossier médaillon', 'Assise capitonnée']::text[], array['ظهر بيضوي', 'مقعد منجّد']::text[], 'Essuyer la dorure à sec.', 'يُمسح التذهيب بقطعة جافة.', array['Louis XVI', 'Or et blanc']::text[], false, array['https://images.unsplash.com/photo-1769230361357-8278572302d2?auto=format&w=1600&q=80']::text[], 'cover'),
  ('table-banquet-chene', 'tables-dining', 'R4E-TAB-001', 'Table de banquet en chêne', 'طاولة مأدبة من البلوط', 'Longue table en chêne massif pour dix convives, sans nappe. Se met bout à bout pour les grandes tablées.', 'طاولة طويلة من البلوط الصلب لعشرة أشخاص، دون مفرش. توضع جنبًا إلى جنب للموائد الكبيرة.', null, 'tan', 'Chêne', '#a47148', 'Chêne massif', 'Huilé', 'Campagne chic', 240, 76, 100, 'cm', 70, 10, 15, 200, array['Dix convives', 'Se met bout à bout']::text[], array['عشرة أشخاص', 'تُوصل ببعضها']::text[], 'Protéger des liquides chauds avec des sous-plats.', 'تُحمى من السوائل الساخنة بقواعد الأطباق.', array['Campagne chic', 'Chêne']::text[], true, array['https://images.unsplash.com/photo-1696805966408-5f92fdb79ae7?auto=format&w=1600&q=80']::text[], 'cover'),
  ('table-ronde-reception', 'tables-dining', 'R4E-TAB-002', 'Table ronde de réception', 'طاولة استقبال دائرية', 'Table ronde de 180 cm pour dix convives, livrée avec nappe blanche jusqu''au sol.', 'طاولة دائرية بقطر 180 سم لعشرة أشخاص، مع مفرش أبيض طويل حتى الأرض.', null, 'cream', 'Blanc', '#f4efe6', 'Bois, nappe en satin polyester', 'Nappée', 'Classique', 180, 76, 180, 'cm', 30, 10, 10, null, array['Nappe incluse', 'Dix convives']::text[], array['المفرش مشمول', 'عشرة أشخاص']::text[], 'Nappe lavée et repassée après chaque location.', 'يُغسل المفرش ويُكوى بعد كل كراء.', array['Classique', 'Blanc']::text[], false, array['https://images.unsplash.com/photo-1769230361493-f1f365a99878?auto=format&w=1600&q=80']::text[], 'cover'),
  ('table-honneur-pailletee', 'tables-dining', 'R4E-TAB-003', 'Table d''honneur pailletée', 'طاولة شرف لامعة', 'Table d''honneur de 2,40 m habillée d''une nappe pailletée champagne. Pour les mariés ou la table principale.', 'طاولة شرف بطول 2,40 م مكسوّة بمفرش لامع بلون الشمبانيا. للعروسين أو للطاولة الرئيسية.', null, 'almond', 'Champagne', '#e6d3b3', 'Bois, nappe pailletée', 'Paillettes', 'Glamour', 240, 76, 80, 'cm', 45, 6, 30, 300, array['Nappe pailletée incluse', 'Six convives']::text[], array['المفرش اللامع مشمول', 'ستة أشخاص']::text[], 'Ne pas plier la nappe pailletée : elle se roule.', 'لا يُطوى المفرش اللامع بل يُلفّ.', array['Glamour', 'Champagne']::text[], false, array['https://images.unsplash.com/photo-1773370812364-7d0e882e0b4f?auto=format&w=1600&q=80']::text[], 'cover'),
  ('tables-gigognes-marbre', 'tables-dining', 'R4E-TAB-004', 'Tables gigognes marbre et laiton', 'طاولتان متداخلتان من الرخام والنحاس', 'Deux tables basses rondes à plateau en marbre blanc et piètement laiton. Pour un coin salon ou un espace cocktail.', 'طاولتان منخفضتان دائريتان بسطح من الرخام الأبيض وقاعدة نحاسية. لركن الجلوس أو لفضاء الكوكتيل.', null, 'stone', 'Blanc et laiton', '#e8e2d9', 'Marbre, acier laitonné', 'Poli', 'Art déco', 80, 45, 80, 'cm', 25, null, 5, 150, array['Lot de deux', 'Plateau en marbre']::text[], array['طاولتان', 'سطح من الرخام']::text[], 'Le marbre craint les acides (citron, vin) : essuyer aussitôt.', 'الرخام يتأثر بالأحماض (الليمون، العصير): يُمسح فورًا.', array['Art déco', 'Blanc et laiton']::text[], false, array['https://images.unsplash.com/photo-1643558544531-bff73bbffc28?auto=format&w=1600&q=80']::text[], 'cover'),
  ('kosha-florale-rouge', 'wedding-ceremony', 'R4E-MAR-001', 'Kosha florale rouge et blanche', 'كوشة بالورود الحمراء والبيضاء', 'Kosha complète : estrade, fond drapé, arches florales rouge et blanc et salon des mariés. Montée et démontée par notre équipe.', 'كوشة كاملة: منصة وخلفية مكسوّة وأقواس من الورود الحمراء والبيضاء وصالون العروسين. يركّبها فريقنا ويفكّكها.', 'limited', 'copper', 'Rouge et blanc', '#a8323e', 'Structure, fleurs artificielles, tentures', 'Florale', 'Tunisien traditionnel', 8, 4, 3, 'm', null, 2, 240, 2500, array['Montage par notre équipe', 'Salon des mariés inclus', 'Estrade 8 × 3 m']::text[], array['التركيب من فريقنا', 'صالون العروسين مشمول', 'منصة 8 × 3 م']::text[], 'Prévoir l''accès à la salle quatre heures avant l''événement.', 'يجب توفير الدخول إلى القاعة قبل أربع ساعات من المناسبة.', array['Tunisien traditionnel', 'Rouge et blanc']::text[], true, array['https://images.unsplash.com/photo-1745573674471-e057af420757?auto=format&w=1600&q=80']::text[], 'cover'),
  ('kosha-blanche-et-or', 'wedding-ceremony', 'R4E-MAR-002', 'Kosha blanche et or', 'كوشة بيضاء وذهبية', 'Kosha aux tons blanc et or : estrade, cadres floraux, voilages et canapé des mariés. Montée et démontée par notre équipe.', 'كوشة بالأبيض والذهبي: منصة وأطر من الورود وستائر وأريكة العروسين. يركّبها فريقنا ويفكّكها.', null, 'cream', 'Blanc et or', '#e9dcc0', 'Structure, fleurs artificielles, voilages', 'Florale', 'Classique', 7, 3.5, 3, 'm', null, 2, 240, 2500, array['Montage par notre équipe', 'Canapé des mariés inclus']::text[], array['التركيب من فريقنا', 'أريكة العروسين مشمولة']::text[], 'Prévoir l''accès à la salle quatre heures avant l''événement.', 'يجب توفير الدخول إلى القاعة قبل أربع ساعات من المناسبة.', array['Classique', 'Blanc et or']::text[], false, array['https://images.unsplash.com/photo-1786125493218-f9933f67a0f1?auto=format&w=1600&q=80']::text[], 'cover'),
  ('trone-des-maries', 'wedding-ceremony', 'R4E-MAR-003', 'Trône des mariés (paire)', 'عرش العروسين (زوج)', 'Deux fauteuils trônes baroques en bois sculpté blanc et doré, assise capitonnée. Pour la kosha ou la séance photo.', 'كرسيّا عرش باروكيان من الخشب المنحوت بالأبيض والذهبي، بمقعد منجّد. للكوشة أو لجلسة التصوير.', null, 'almond', 'Blanc et or', '#f3ead8', 'Bois sculpté, simili cuir capitonné', 'Laqué et doré', 'Baroque', 90, 150, 80, 'cm', 35, 2, 20, 800, array['Vendus par paire', 'Bois sculpté']::text[], array['يُكرى زوجًا', 'خشب منحوت']::text[], 'Porter à deux, par l''assise.', 'يُحمل من شخصين ومن المقعد.', array['Baroque', 'Blanc et or']::text[], false, array['https://images.unsplash.com/photo-1750277128108-9de704ae8225?auto=format&w=1600&q=80']::text[], 'cover'),
  ('arche-ceremonie-drapee', 'wedding-ceremony', 'R4E-MAR-004', 'Arche de cérémonie drapée', 'قوس مراسم مكسوّ بالستائر', 'Arche en bois habillée de voilages blancs, pour une cérémonie laïque en plein air ou en salle.', 'قوس خشبي مكسوّ بستائر بيضاء، لمراسم في الهواء الطلق أو داخل القاعة.', null, 'stone', 'Blanc', '#f2efe9', 'Bois, voilages', 'Drapé', 'Bohème chic', 200, 240, 60, 'cm', 30, null, 45, 300, array['Voilages inclus', 'Intérieur et extérieur']::text[], array['الستائر مشمولة', 'للداخل وللخارج']::text[], 'Lester les pieds en extérieur venté.', 'تُثبَّت القاعدة بأثقال في الأماكن المكشوفة للريح.', array['Bohème chic', 'Blanc']::text[], false, array['https://images.unsplash.com/photo-1700304096367-dae5ae5e5401?auto=format&w=1600&q=80']::text[], 'cover'),
  ('candelabre-dore-cinq-branches', 'decoration', 'R4E-DEC-001', 'Candélabre doré à cinq branches', 'شمعدان مذهّب بخمسة أذرع', 'Candélabre en métal doré à cinq bougies, pour les centres de table et les buffets.', 'شمعدان من المعدن المذهّب لخمس شموع، لوسط الطاولات وللبوفيه.', null, 'sand', 'Or', '#c9a35b', 'Métal doré', 'Doré', 'Baroque', 35, 55, 35, 'cm', 2.5, null, 2, 50, array['Cinq bougies', 'Bougies non fournies']::text[], array['خمس شموع', 'الشموع غير مشمولة']::text[], 'Utiliser des bougies anti-coulures.', 'تُستعمل شموع لا تسيل.', array['Baroque', 'Or']::text[], false, array['https://images.unsplash.com/photo-1624807608383-f2a56171d781?auto=format&w=1600&q=80']::text[], 'cover'),
  ('sous-assiette-perlee-doree', 'decoration', 'R4E-DEC-002', 'Sous-assiette perlée dorée', 'صحن تقديم بحافة لؤلؤية ذهبية', 'Sous-assiette en verre à bord perlé doré, sous l''assiette de chaque convive.', 'صحن تقديم من الزجاج بحافة لؤلؤية ذهبية، يوضع تحت صحن كل ضيف.', null, 'tan', 'Doré', '#c8a55a', 'Verre, liseré perlé doré', 'Perlé', 'Glamour', 33, 2, 33, 'cm', 0.4, null, null, null, array['Diamètre 33 cm', 'Lavée avant chaque location']::text[], array['قطر 33 سم', 'تُغسل قبل كل كراء']::text[], 'Ne pas passer au micro-ondes.', 'لا يوضع في الميكروويف.', array['Glamour', 'Doré']::text[], false, array['https://images.unsplash.com/photo-1784450441834-3302c946ad4a?auto=format&w=1600&q=80']::text[], 'cover'),
  ('lustre-cristal', 'lighting', 'R4E-ECL-001', 'Lustre en cristal', 'ثريا من الكريستال', 'Lustre à pampilles de cristal et douze lumières, suspendu au-dessus d''une table d''honneur ou d''une piste de danse.', 'ثريا بقطع الكريستال واثني عشر مصباحًا، تُعلَّق فوق طاولة الشرف أو حلبة الرقص.', null, 'stone', 'Cristal et laiton', '#d8c9a8', 'Cristal, laiton', 'Poli', 'Classique', 80, 100, 80, 'cm', 18, null, 60, 600, array['Douze lumières', 'Accrochage par notre équipe']::text[], array['اثنا عشر مصباحًا', 'التعليق من فريقنا']::text[], 'Accrochage sur point d''ancrage validé par le lieu.', 'يُعلَّق على نقطة تثبيت يوافق عليها المكان.', array['Classique', 'Cristal et laiton']::text[], true, array['https://images.unsplash.com/photo-1476886188504-fd741bfc8e8a?auto=format&w=1600&q=80']::text[], 'cover'),
  ('lampe-albatre', 'lighting', 'R4E-ECL-002', 'Lampe en albâtre', 'مصباح من المرمر', 'Lampe à pied balustre en albâtre blanc et abat-jour en lin, pour les consoles, l''accueil et les coins salon.', 'مصباح بقاعدة من المرمر الأبيض وغطاء من الكتان، للطاولات الجانبية والاستقبال وأركان الجلوس.', null, 'cream', 'Blanc albâtre', '#efe9e1', 'Albâtre, abat-jour en lin', 'Poli', 'Néoclassique', 40, 70, 40, 'cm', 6, null, 5, 100, array['Ampoule LED fournie', 'Abat-jour en lin']::text[], array['مصباح LED مشمول', 'غطاء من الكتان']::text[], 'L''albâtre est fragile : transporter debout, calé.', 'المرمر هش: يُنقل واقفًا ومثبّتًا.', array['Néoclassique', 'Blanc albâtre']::text[], false, array['https://images.unsplash.com/photo-1655151410095-f0c245a5859b?auto=format&w=1600&q=80']::text[], 'cover'),
  ('guirlande-guinguette', 'lighting', 'R4E-ECL-003', 'Guirlande guinguette (10 m)', 'سلسلة إنارة (10 م)', 'Guirlande de dix mètres à grosses ampoules LED ambrées, pour les terrasses, jardins et tentes.', 'سلسلة إنارة بطول عشرة أمتار بمصابيح LED كبيرة بلون عنبري، للشرفات والحدائق والخيام.', null, 'copper', 'Ambre', '#e0a050', 'Câble, ampoules LED', 'Ambré', 'Guinguette', 1000, 12, 6, 'cm', null, null, 20, null, array['Usage extérieur', 'Raccordable bout à bout']::text[], array['للاستعمال الخارجي', 'تُوصل ببعضها']::text[], 'Prévoir une prise protégée à moins de 10 m.', 'يجب توفير مقبس محمي على بعد أقل من 10 م.', array['Guinguette', 'Ambre']::text[], false, array['https://images.unsplash.com/photo-1694726361295-6a188bc577b3?auto=format&w=1600&q=80']::text[], 'cover'),
  ('bar-marbre-retroeclaire', 'bars-consoles', 'R4E-BAR-001', 'Bar en marbre rétroéclairé', 'بار رخامي بإضاءة خلفية', 'Bar de 2,40 m à façade effet marbre et éclairage LED intégré, pour le cocktail ou le service des boissons.', 'بار بطول 2,40 م بواجهة بمظهر الرخام وإضاءة LED مدمجة، للكوكتيل أو لتقديم المشروبات.', null, 'stone', 'Marbre blanc', '#ece8e1', 'Façade effet marbre, LED', 'Rétroéclairé', 'Contemporain', 240, 110, 60, 'cm', 180, null, 60, 800, array['Éclairage LED intégré', 'Montage par notre équipe']::text[], array['إضاءة LED مدمجة', 'التركيب من فريقنا']::text[], 'Prévoir une prise à proximité.', 'يجب توفير مقبس كهربائي قريب.', array['Contemporain', 'Marbre blanc']::text[], false, array['https://images.unsplash.com/photo-1768405942823-a8ff0aecdcef?auto=format&w=1600&q=80']::text[], 'cover'),
  ('comptoir-reception-sculpte', 'bars-consoles', 'R4E-BAR-002', 'Comptoir de réception sculpté', 'منضدة استقبال منحوتة', 'Comptoir crème à façade sculptée, pour l''accueil des invités, le vestiaire ou un bar à desserts.', 'منضدة بلون كريمي بواجهة منحوتة، لاستقبال الضيوف أو للمعاطف أو لركن الحلويات.', null, 'cream', 'Crème', '#efe4d3', 'Bois laqué sculpté', 'Laqué', 'Art déco', 200, 105, 60, 'cm', 70, null, 30, 300, array['Façade sculptée', 'Plateau de service']::text[], array['واجهة منحوتة', 'سطح للتقديم']::text[], 'Nettoyer au chiffon humide, sans solvant.', 'يُنظَّف بقطعة مبلّلة دون مذيبات.', array['Art déco', 'Crème']::text[], false, array['https://images.unsplash.com/photo-1763873993447-1d0be71a96d9?auto=format&w=1600&q=80']::text[], 'cover'),
  ('etagere-bar-doree', 'bars-consoles', 'R4E-BAR-003', 'Étagère de bar dorée', 'رف بار مذهّب', 'Étagère dorée à trois niveaux pour présenter verres et bouteilles derrière le bar.', 'رف مذهّب بثلاثة مستويات لعرض الكؤوس والقوارير خلف البار.', null, 'sand', 'Or', '#c9a35b', 'Métal doré, verre', 'Doré', 'Art déco', 180, 200, 45, 'cm', 40, null, 20, 200, array['Trois niveaux', 'Étagères en verre']::text[], array['ثلاثة مستويات', 'رفوف زجاجية']::text[], 'Retirer la verrerie avant tout déplacement.', 'تُنزع الكؤوس قبل أي نقل.', array['Art déco', 'Or']::text[], false, '{}'::text[], 'cover'),
  ('salon-jardin-rotin', 'outdoor-luxury', 'R4E-EXT-001', 'Salon de jardin en rotin', 'طقم جلوس خارجي من الخيزران', 'Ensemble en rotin et métal : une table et six fauteuils, pour un espace lounge en terrasse ou au jardin.', 'طقم من الخيزران والمعدن: طاولة وستة كراسٍ، لفضاء لاونج على الشرفة أو في الحديقة.', null, 'tan', 'Rotin naturel', '#b8935e', 'Rotin, métal', 'Naturel', 'Bohème', 200, 80, 200, 'cm', null, 6, 20, 300, array['Table et six fauteuils', 'Usage extérieur']::text[], array['طاولة وستة كراسٍ', 'للاستعمال الخارجي']::text[], 'Rentrer les coussins en cas de pluie.', 'تُدخَل الوسائد عند المطر.', array['Bohème', 'Rotin naturel']::text[], false, array['https://images.unsplash.com/photo-1585894711506-e492159d7fbc?auto=format&w=1600&q=80']::text[], 'cover'),
  ('parasol-frange', 'outdoor-luxury', 'R4E-EXT-002', 'Parasol frangé', 'مظلة بأهداب', 'Parasol écru de 2,50 m à franges, mât en bois et pied lesté, pour les cocktails en plein air.', 'مظلة بلون طبيعي بقطر 2,50 م بأهداب، بعمود خشبي وقاعدة مثقّلة، للكوكتيل في الهواء الطلق.', null, 'cream', 'Écru', '#efe6d4', 'Toile de coton, mât en bois', 'Frangé', 'Riviera', 250, 250, 250, 'cm', 12, null, 10, 80, array['Pied lesté inclus', 'Diamètre 2,50 m']::text[], array['قاعدة مثقّلة مشمولة', 'قطر 2,50 م']::text[], 'Fermer le parasol au-delà de 30 km/h de vent.', 'تُغلق المظلة إذا تجاوزت سرعة الرياح 30 كم/س.', array['Riviera', 'Écru']::text[], false, array['https://images.unsplash.com/photo-1707187165214-837ea1e2e06b?auto=format&w=1600&q=80']::text[], 'cover'),
  ('lit-de-jour-baldaquin', 'outdoor-luxury', 'R4E-EXT-003', 'Lit de jour à baldaquin', 'سرير استرخاء بمظلة', 'Lit de jour en teck à baldaquin et voilages, matelas et coussins inclus. Pour un espace détente au bord de la piscine.', 'سرير استرخاء من خشب الساج بمظلة وستائر، مع المرتبة والوسائد. لمساحة استرخاء بجانب المسبح.', null, 'almond', 'Blanc et teck', '#e8dfd2', 'Teck, matelas, voilages', 'Naturel', 'Riviera', 200, 230, 140, 'cm', null, 2, 60, 500, array['Matelas et coussins inclus', 'Montage par notre équipe']::text[], array['المرتبة والوسائد مشمولة', 'التركيب من فريقنا']::text[], 'Rentrer le matelas la nuit.', 'تُدخَل المرتبة ليلًا.', array['Riviera', 'Blanc et teck']::text[], false, array['https://images.unsplash.com/photo-1765910639954-27ae0c260586?auto=format&w=1600&q=80']::text[], 'cover'),
  ('fauteuil-rotin', 'outdoor-luxury', 'R4E-EXT-004', 'Fauteuil en rotin', 'كرسي من الخيزران', 'Fauteuil en rotin tressé avec coussins en lin, pour compléter un salon lounge en intérieur ou en extérieur.', 'كرسي من الخيزران المضفور بوسائد من الكتان، لإكمال صالون لاونج في الداخل أو في الخارج.', null, 'tan', 'Rotin naturel', '#b8935e', 'Rotin tressé, coussins en lin', 'Naturel', 'Bohème', 70, 80, 70, 'cm', 8, 1, 2, null, array['Coussins en lin', 'Léger']::text[], array['وسائد من الكتان', 'خفيف']::text[], 'Éviter l''eau stagnante sur le rotin.', 'يُتجنّب بقاء الماء على الخيزران.', array['Bohème', 'Rotin naturel']::text[], false, array['https://images.unsplash.com/photo-1617325721270-06dce2689456?auto=format&w=1600&q=80']::text[], 'cover'),
  ('tapis-berbere', 'rugs-textiles', 'R4E-TAP-001', 'Tapis berbère', 'زربية أمازيغية', 'Tapis tissé en laine aux motifs berbères rouge et ocre, 3 × 2 m. Pour un salon oriental ou un espace lounge.', 'زربية منسوجة من الصوف بزخارف أمازيغية حمراء ومغرية، 3 × 2 م. لصالون شرقي أو فضاء لاونج.', null, 'copper', 'Rouge et ocre', '#9c3b2b', 'Laine tissée', 'Tissé main', 'Berbère', 300, 1, 200, 'cm', 9, null, 5, 150, array['3 × 2 m', 'Laine tissée']::text[], array['3 × 2 م', 'صوف منسوج']::text[], 'Aspirer sans brosse rotative.', 'يُنظَّف بالمكنسة دون فرشاة دوّارة.', array['Berbère', 'Rouge et ocre']::text[], false, array['https://images.unsplash.com/photo-1723136240443-0ddeda3284eb?auto=format&w=1600&q=80']::text[], 'cover'),
  ('tapis-rond-jute', 'rugs-textiles', 'R4E-TAP-002', 'Tapis rond en jute', 'زربية دائرية من الجوت', 'Tapis rond de 2 m en jute naturelle à bordure festonnée blanche, sous une table ronde ou un coin salon.', 'زربية دائرية بقطر 2 م من الجوت الطبيعي بحافة بيضاء مموّجة، تحت طاولة دائرية أو في ركن الجلوس.', null, 'sand', 'Naturel et blanc', '#d6bf94', 'Jute, bordure coton', 'Tressé', 'Bohème', 200, 1, 200, 'cm', 6, null, 2, null, array['Diamètre 2 m', 'Bordure festonnée']::text[], array['قطر 2 م', 'حافة مموّجة']::text[], 'Tenir au sec : la jute marque à l''eau.', 'يُحفظ جافًا: الجوت يتأثر بالماء.', array['Bohème', 'Naturel et blanc']::text[], false, array['https://images.unsplash.com/photo-1762758889413-64d717f81b0d?auto=format&w=1600&q=80']::text[], 'cover'),
  ('coussins-brodes', 'rugs-textiles', 'R4E-TAP-003', 'Coussins brodés (lot de 4)', 'وسائد مطرّزة (4 قطع)', 'Quatre coussins en coton brodé aux motifs floraux, pour habiller banquettes, salons et lits de jour.', 'أربع وسائد من القطن المطرّز بزخارف نباتية، لتزيين الأرائك والصالونات وأسرّة الاسترخاء.', null, 'sand', 'Multicolore', '#c48a4a', 'Coton brodé', 'Brodé', 'Oriental', 45, 12, 45, 'cm', 2, null, null, null, array['Lot de quatre', 'Housses lavées après chaque location']::text[], array['أربع قطع', 'تُغسل الأغطية بعد كل كراء']::text[], 'Housses lavables à 30 °C.', 'الأغطية قابلة للغسل على 30 درجة.', array['Oriental', 'Multicolore']::text[], false, array['https://images.unsplash.com/photo-1785064038559-10e0ad8036de?auto=format&w=1600&q=80']::text[], 'cover')
) as v(slug, cat, sku, title_fr, title_ar, description_fr, description_ar, badge, tone, color, color_hex,
  material, finish, style, width, height, depth, dimension_unit, weight_kg, seating_capacity, setup_minutes,
  deposit_amount, highlights_fr, highlights_ar, care_fr, care_ar, tags, featured, images, image_fit)
join cats c on c.slug = v.cat
on conflict (slug) do update set
  category_id = excluded.category_id, sku = excluded.sku, title_fr = excluded.title_fr, title_ar = excluded.title_ar,
  description_fr = excluded.description_fr, description_ar = excluded.description_ar, badge = excluded.badge, tone = excluded.tone,
  color = excluded.color, color_hex = excluded.color_hex, material = excluded.material, finish = excluded.finish, style = excluded.style,
  width = excluded.width, height = excluded.height, depth = excluded.depth, dimension_unit = excluded.dimension_unit,
  weight_kg = excluded.weight_kg, seating_capacity = excluded.seating_capacity, setup_minutes = excluded.setup_minutes,
  deposit_amount = excluded.deposit_amount, highlights_fr = excluded.highlights_fr, highlights_ar = excluded.highlights_ar,
  care_fr = excluded.care_fr, care_ar = excluded.care_ar, tags = excluded.tags, featured = excluded.featured,
  status = 'active', images = excluded.images, image_fit = excluded.image_fit
returning id, slug
),

-- Tunisian stock, TND retail and pro prices (pro about 15-20 % under retail).
stock as (
insert into public.product_stock (product_id, country, quantity_owned)
select p.id, 'TN', v.qty from (values
  ('fauteuil-boucle-ivoire', 8),
  ('fauteuil-louis-xvi-dore', 12),
  ('banquette-capitonnee-velours-noir', 4),
  ('canape-louis-xv-turquoise', 2),
  ('chaise-chiavari-doree', 300),
  ('chaise-napoleon-transparente', 200),
  ('chaise-cross-back-bois', 150),
  ('chaise-medaillon-doree', 60),
  ('table-banquet-chene', 10),
  ('table-ronde-reception', 40),
  ('table-honneur-pailletee', 3),
  ('tables-gigognes-marbre', 8),
  ('kosha-florale-rouge', 1),
  ('kosha-blanche-et-or', 1),
  ('trone-des-maries', 3),
  ('arche-ceremonie-drapee', 4),
  ('candelabre-dore-cinq-branches', 40),
  ('sous-assiette-perlee-doree', 500),
  ('lustre-cristal', 4),
  ('lampe-albatre', 12),
  ('guirlande-guinguette', 50),
  ('bar-marbre-retroeclaire', 2),
  ('comptoir-reception-sculpte', 3),
  ('etagere-bar-doree', 3),
  ('salon-jardin-rotin', 4),
  ('parasol-frange', 12),
  ('lit-de-jour-baldaquin', 2),
  ('fauteuil-rotin', 16),
  ('tapis-berbere', 10),
  ('tapis-rond-jute', 12),
  ('coussins-brodes', 40)
) as v(slug, qty) join prods p on p.slug = v.slug
on conflict (product_id, country) do update set quantity_owned = excluded.quantity_owned
returning 1
),
prices as (
insert into public.product_prices (product_id, country, tier, amount)
select p.id, 'TN', v.tier::public.price_tier, v.amount from (values
  ('fauteuil-boucle-ivoire', 'retail', 85),
  ('fauteuil-boucle-ivoire', 'pro', 70),
  ('fauteuil-louis-xvi-dore', 'retail', 95),
  ('fauteuil-louis-xvi-dore', 'pro', 79),
  ('banquette-capitonnee-velours-noir', 'retail', 190),
  ('banquette-capitonnee-velours-noir', 'pro', 158),
  ('canape-louis-xv-turquoise', 'retail', 240),
  ('canape-louis-xv-turquoise', 'pro', 199),
  ('chaise-chiavari-doree', 'retail', 9),
  ('chaise-chiavari-doree', 'pro', 7.5),
  ('chaise-napoleon-transparente', 'retail', 12),
  ('chaise-napoleon-transparente', 'pro', 10),
  ('chaise-cross-back-bois', 'retail', 11),
  ('chaise-cross-back-bois', 'pro', 9),
  ('chaise-medaillon-doree', 'retail', 22),
  ('chaise-medaillon-doree', 'pro', 18),
  ('table-banquet-chene', 'retail', 120),
  ('table-banquet-chene', 'pro', 99),
  ('table-ronde-reception', 'retail', 45),
  ('table-ronde-reception', 'pro', 37),
  ('table-honneur-pailletee', 'retail', 260),
  ('table-honneur-pailletee', 'pro', 215),
  ('tables-gigognes-marbre', 'retail', 70),
  ('tables-gigognes-marbre', 'pro', 58),
  ('kosha-florale-rouge', 'retail', 1500),
  ('kosha-florale-rouge', 'pro', 1250),
  ('kosha-blanche-et-or', 'retail', 1350),
  ('kosha-blanche-et-or', 'pro', 1120),
  ('trone-des-maries', 'retail', 450),
  ('trone-des-maries', 'pro', 375),
  ('arche-ceremonie-drapee', 'retail', 220),
  ('arche-ceremonie-drapee', 'pro', 183),
  ('candelabre-dore-cinq-branches', 'retail', 28),
  ('candelabre-dore-cinq-branches', 'pro', 23),
  ('sous-assiette-perlee-doree', 'retail', 3),
  ('sous-assiette-perlee-doree', 'pro', 2.5),
  ('lustre-cristal', 'retail', 220),
  ('lustre-cristal', 'pro', 183),
  ('lampe-albatre', 'retail', 45),
  ('lampe-albatre', 'pro', 37),
  ('guirlande-guinguette', 'retail', 25),
  ('guirlande-guinguette', 'pro', 20),
  ('bar-marbre-retroeclaire', 'retail', 420),
  ('bar-marbre-retroeclaire', 'pro', 350),
  ('comptoir-reception-sculpte', 'retail', 190),
  ('comptoir-reception-sculpte', 'pro', 158),
  ('etagere-bar-doree', 'retail', 120),
  ('etagere-bar-doree', 'pro', 99),
  ('salon-jardin-rotin', 'retail', 260),
  ('salon-jardin-rotin', 'pro', 215),
  ('parasol-frange', 'retail', 55),
  ('parasol-frange', 'pro', 45),
  ('lit-de-jour-baldaquin', 'retail', 280),
  ('lit-de-jour-baldaquin', 'pro', 232),
  ('fauteuil-rotin', 'retail', 40),
  ('fauteuil-rotin', 'pro', 33),
  ('tapis-berbere', 'retail', 70),
  ('tapis-berbere', 'pro', 58),
  ('tapis-rond-jute', 'retail', 40),
  ('tapis-rond-jute', 'pro', 33),
  ('coussins-brodes', 'retail', 20),
  ('coussins-brodes', 'pro', 16)
) as v(slug, tier, amount) join prods p on p.slug = v.slug
on conflict (product_id, country, tier) do update set amount = excluded.amount
returning 1
),

-- Staff-only notes: everything here is provisional.
notes as (
insert into public.product_internal (product_id, internal_notes)
select p.id, v.notes from (values
  ('fauteuil-boucle-ivoire', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('fauteuil-louis-xvi-dore', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('banquette-capitonnee-velours-noir', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('canape-louis-xv-turquoise', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('chaise-chiavari-doree', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('chaise-napoleon-transparente', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('chaise-cross-back-bois', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('chaise-medaillon-doree', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('table-banquet-chene', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('table-ronde-reception', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('table-honneur-pailletee', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('tables-gigognes-marbre', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('kosha-florale-rouge', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('kosha-blanche-et-or', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('trone-des-maries', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('arche-ceremonie-drapee', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('candelabre-dore-cinq-branches', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('sous-assiette-perlee-doree', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('lustre-cristal', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('lampe-albatre', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('guirlande-guinguette', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('bar-marbre-retroeclaire', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('comptoir-reception-sculpte', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('etagere-bar-doree', 'Prix et stock provisoires, à valider par Fatma.'),
  ('salon-jardin-rotin', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('parasol-frange', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('lit-de-jour-baldaquin', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('fauteuil-rotin', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('tapis-berbere', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('tapis-rond-jute', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.'),
  ('coussins-brodes', 'Prix et stock provisoires, à valider par Fatma. Photo temporaire Unsplash, à remplacer.')
) as v(slug, notes) join prods p on p.slug = v.slug
on conflict (product_id) do update set internal_notes = excluded.internal_notes
returning 1
)
select (select count(*) from prods) as pieces, (select count(*) from prices) as prices,
  (select count(*) from stock) as stock_rows, (select count(*) from notes) as notes;
