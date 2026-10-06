-- Catalogue, per-country stock and prices, FX and the single conversion function.

create type public.price_tier as enum ('retail', 'pro');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_fr text not null check (length(name_fr) between 1 and 120),
  name_ar text check (length(name_ar) <= 120),
  description_fr text check (length(description_fr) <= 2000),
  description_ar text check (length(description_ar) <= 2000),
  image_url text check (length(image_url) <= 1000),
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  category_id uuid references public.categories (id) on delete set null,
  title_fr text not null check (length(title_fr) between 1 and 200),
  title_ar text check (length(title_ar) <= 200),
  description_fr text not null default '' check (length(description_fr) <= 5000),
  description_ar text check (length(description_ar) <= 5000),
  width numeric(8, 2) check (width > 0),
  height numeric(8, 2) check (height > 0),
  depth numeric(8, 2) check (depth > 0),
  dimension_unit text not null default 'cm' check (dimension_unit in ('cm', 'm')),
  color text check (length(color) <= 80),
  material text check (length(material) <= 80),
  tags text[] not null default '{}',
  minimum_nights int not null default 1 check (minimum_nights between 1 and 365),
  featured boolean not null default false,
  status text not null default 'active' check (status in ('active', 'retired')),
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);

-- Physical stock per country. Maintenance units are owned but unavailable.
create table public.product_stock (
  product_id uuid not null references public.products (id) on delete cascade,
  country public.country_code not null,
  quantity_owned int not null default 0 check (quantity_owned >= 0),
  quantity_maintenance int not null default 0 check (quantity_maintenance >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, country),
  check (quantity_maintenance <= quantity_owned)
);

-- Fixed source prices per night: TND for Tunisia, EUR for France.
-- Separate rows per tier because RLS protects rows, not columns.
create table public.product_prices (
  product_id uuid not null references public.products (id) on delete cascade,
  country public.country_code not null,
  tier public.price_tier not null,
  amount numeric(12, 3) not null check (amount > 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, country, tier),
  check (country = 'TN' or amount = round(amount, 2))
);

create function private.currency_of(c public.country_code)
returns public.currency_code
language sql
immutable
set search_path = ''
as $$
  select case c when 'TN' then 'TND'::public.currency_code else 'EUR'::public.currency_code end;
$$;

-- Business-local "today" (Supabase runs in UTC).
create function private.local_today(c public.country_code)
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone case c when 'TN' then 'Africa/Tunis' else 'Europe/Paris' end)::date;
$$;

-- 1 EUR = rate_eur_tnd TND.
create table public.fx_rates (
  id bigint generated always as identity primary key,
  rate_eur_tnd numeric(12, 6) not null check (rate_eur_tnd between 1 and 10),
  source text not null check (source in ('provider', 'manual')),
  provider_time timestamptz not null,
  effective_until timestamptz,
  note text check (length(note) <= 500),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check ((source = 'manual') = (effective_until is not null))
);

create index fx_rates_lookup_idx on public.fx_rates (source, provider_time desc);

-- Effective rate: an unexpired manual override wins, else the newest provider rate
-- published within 72 hours (provisional staleness policy), else no rate.
create function private.current_rate()
returns table (rate numeric, source text, rate_time timestamptz)
language sql
stable
set search_path = ''
as $$
  select rate_eur_tnd, source, provider_time
  from public.fx_rates
  where (source = 'manual' and effective_until > now())
     or (source = 'provider' and provider_time > now() - interval '72 hours')
  order by (source = 'manual') desc, provider_time desc, id desc
  limit 1;
$$;

-- The only currency conversion in the system. EUR->TND multiplies, TND->EUR divides,
-- rounded to the target currency's minor unit (EUR 2, TND 3). Null when no rate.
create function private.convert(
  amount numeric,
  from_cur public.currency_code,
  to_cur public.currency_code,
  rate numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when from_cur = to_cur then amount
    when rate is null or rate <= 0 then null
    when from_cur = 'EUR' then round(amount * rate, 3)
    else round(amount / rate, 2)
  end;
$$;

create view public.catalogue_prices
with (security_invoker = true) as
select
  p.product_id,
  p.country,
  p.tier,
  p.amount,
  private.currency_of(p.country) as currency,
  private.convert(p.amount, private.currency_of(p.country), 'EUR', r.rate) as amount_eur,
  private.convert(p.amount, private.currency_of(p.country), 'TND', r.rate) as amount_tnd,
  r.rate,
  r.source as rate_source,
  r.rate_time
from public.product_prices p
left join lateral private.current_rate() r on true;

-- The effective rate (same rule as conversions), for display and admin screens.
create view public.current_fx
with (security_invoker = true) as
select rate, source, rate_time from private.current_rate();

create trigger touch_products before update on public.products
  for each row execute function private.touch_updated_at();
create trigger touch_product_stock before update on public.product_stock
  for each row execute function private.touch_updated_at();
create trigger touch_product_prices before update on public.product_prices
  for each row execute function private.touch_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_stock enable row level security;
alter table public.product_prices enable row level security;
alter table public.fx_rates enable row level security;

create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: staff write" on public.categories
  for all to authenticated
  using ((select private.has_role('{manager,admin}')))
  with check ((select private.has_role('{manager,admin}')));

create policy "products: public read active" on public.products
  for select to anon, authenticated
  using (status = 'active' or (select private.has_role('{manager,admin}')));
create policy "products: staff write" on public.products
  for all to authenticated
  using ((select private.has_role('{manager,admin}')))
  with check ((select private.has_role('{manager,admin}')));

create policy "stock: public read" on public.product_stock
  for select to anon, authenticated using (true);
create policy "stock: staff write" on public.product_stock
  for all to authenticated
  using ((select private.has_role('{manager,admin}')))
  with check ((select private.has_role('{manager,admin}')));

create policy "prices: retail public, pro for approved pros and staff" on public.product_prices
  for select to anon, authenticated
  using (tier = 'retail' or (select private.has_role('{professional,manager,admin}')));
create policy "prices: admin write" on public.product_prices
  for all to authenticated
  using ((select private.has_role('{admin}')))
  with check ((select private.has_role('{admin}')));

create policy "fx: public read" on public.fx_rates
  for select to anon, authenticated using (true);
create policy "fx: admin insert" on public.fx_rates
  for insert to authenticated
  with check ((select private.has_role('{admin}')) and created_by = (select auth.uid()));

-- Product photos: public CDN read, staff-only writes, raster formats only (no SVG).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "product images: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select private.has_role('{manager,admin}')));
create policy "product images: staff insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select private.has_role('{manager,admin}')));
create policy "product images: staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select private.has_role('{manager,admin}')))
  with check (bucket_id = 'product-images' and (select private.has_role('{manager,admin}')));
create policy "product images: staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select private.has_role('{manager,admin}')));
