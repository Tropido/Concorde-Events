-- Catalogue cleanup (owner request 2026-10-25). Data only and idempotent: rows are matched
-- by slug, so this does nothing on a database that never held the prototype catalogue.
--
-- * The English demo pieces (stock photos, not Concorde inventory) are retired.
-- * Pieces whose only photo was a cropped screenshot are retired until real photos are
--   uploaded from /admin/inventory (one click to reactivate). Nothing is deleted.
-- * Categories get French names (primary) and Arabic names.

update public.products set status = 'retired', featured = false
where slug in (
  'kasaya-curved-sofa', 'prasaja-teak-armchair', 'ganesha-banquet-dining-table',
  'radiant-alabaster-floor-lamp', 'breeze-fluted-marble-bar-console', 'eden-sun-lounge-bed',
  'vase', 'lampe', 'coiffeuse', 'table-basse-ronde', 'pouff-cuir'
);

-- Drop screenshot crops and unrelated stock photos from every product.
update public.products
set images = coalesce((
  select array_agg(img order by ord)
  from unnest(images) with ordinality as u(img, ord)
  where img not like '/products/%' and img not like 'https://images.unsplash.com/%'
), '{}')
where exists (
  select 1 from unnest(images) img
  where img like '/products/%' or img like 'https://images.unsplash.com/%'
);

update public.categories set name_fr = 'Assises & salons', name_ar = 'المقاعد والصالونات', image_url = null
where slug = 'seating-lounges';
update public.categories set name_fr = 'Tables', name_ar = 'الطاولات', image_url = null
where slug = 'tables-dining';
update public.categories set name_fr = 'Luminaires', name_ar = 'الإنارة', image_url = null
where slug = 'lighting';
update public.categories set name_fr = 'Bars & consoles', name_ar = 'البارات والكونسولات', image_url = null
where slug = 'bars-consoles';
update public.categories set name_fr = 'Extérieur', name_ar = 'الأثاث الخارجي', image_url = null
where slug = 'outdoor-luxury';

insert into public.categories (slug, name_fr, name_ar, display_order)
values ('decoration', 'Décoration & art de la table', 'الديكور وفن المائدة', 5)
on conflict (slug) do nothing;

update public.products
set category_id = (select id from public.categories where slug = 'decoration'),
    tone = 'cream'
where slug in ('pack-de-bougie', 'miroir-dore', 'vase');
