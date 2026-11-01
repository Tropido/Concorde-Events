-- Landing page (2026-11-01): category icons and tones, and the bucket for site photos such as
-- the hero banner (the hero_image CMS field holds its public URL).

alter table public.categories
  -- Lucide icon name. The allowlist mirrors lib/category-icons.tsx.
  add column icon text not null default 'Sparkles' check (icon in (
    'Sofa', 'Armchair', 'Lamp', 'LampCeiling', 'LampFloor', 'Flower2', 'Wine', 'Martini', 'GlassWater',
    'UtensilsCrossed', 'Sparkles', 'Crown', 'TreePalm', 'Tent', 'Square', 'Rows3', 'Gem', 'Flame', 'Heart', 'Cake')),
  add column tone text not null default 'sand' check (tone in ('almond', 'sand', 'tan', 'copper', 'cream', 'stone'));

update public.categories set icon = v.icon, tone = v.tone
from (values
  ('seating-lounges', 'Sofa', 'almond'),
  ('reception-chairs', 'Armchair', 'sand'),
  ('tables-dining', 'UtensilsCrossed', 'cream'),
  ('wedding-ceremony', 'Heart', 'tan'),
  ('decoration', 'Flower2', 'stone'),
  ('lighting', 'LampCeiling', 'copper'),
  ('bars-consoles', 'Martini', 'tan'),
  ('outdoor-luxury', 'TreePalm', 'sand'),
  ('rugs-textiles', 'Rows3', 'almond')
) as v(slug, icon, tone)
where categories.slug = v.slug;

-- Site photos: public CDN read, CMS roles write, raster formats only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "site images: editors read" on storage.objects
  for select to authenticated
  using (bucket_id = 'site-images' and (select private.has_role('{editor,manager,admin}')));
create policy "site images: editors insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-images' and (select private.has_role('{editor,manager,admin}')));
create policy "site images: editors update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-images' and (select private.has_role('{editor,manager,admin}')))
  with check (bucket_id = 'site-images' and (select private.has_role('{editor,manager,admin}')));
create policy "site images: editors delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-images' and (select private.has_role('{editor,manager,admin}')));
