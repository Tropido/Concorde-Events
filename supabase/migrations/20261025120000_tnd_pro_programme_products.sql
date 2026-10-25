-- Owner decisions (2026-10-25):
--   * Concorde Events operates only in Tunisia: stock, prices, requests and quotes are TND only.
--   * Professionals get a loyalty programme (tiers, points, discount, benefits).
--   * Products carry detailed specs, and staff keep internal asset data (cost, supplier...).
--   * Requests capture the event context (type, venue, guests, delivery, contact preference).
-- Additive where possible; France rows are removed because the business no longer has them.

-- ---------------------------------------------------------------------------
-- 1. Tunisia / TND only
-- ---------------------------------------------------------------------------

-- Open French requests can no longer be served (no French stock any more).
update public.rental_requests set status = 'cancelled'
where country = 'FR' and status in ('submitted', 'validated', 'confirmed');

delete from public.product_prices where country <> 'TN';
delete from public.product_stock where country <> 'TN';

alter table public.product_stock add constraint product_stock_tn_only check (country = 'TN');
alter table public.product_prices add constraint product_prices_tn_only check (country = 'TN');
-- Historical French requests stay readable; every new or edited request must be Tunisian.
alter table public.rental_requests add constraint rental_requests_tn_only check (country = 'TN') not valid;
alter table public.rental_requests alter column country set default 'TN';

-- ---------------------------------------------------------------------------
-- 2. Profiles: professional context captured at signup
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column activity text check (length(activity) <= 80),
  add column city text check (length(city) <= 80),
  add column website text check (length(website) <= 200);

-- ---------------------------------------------------------------------------
-- 3. Professional programme
-- ---------------------------------------------------------------------------

-- Tier definitions. Values are provisional defaults: admins edit them in /admin/settings.
create table public.pro_tiers (
  code text primary key check (code ~ '^[a-z0-9_]{2,30}$'),
  rank int not null unique check (rank between 0 and 100),
  name_fr text not null check (length(name_fr) between 1 and 60),
  name_ar text check (length(name_ar) <= 60),
  min_points int not null default 0 check (min_points >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 50),
  benefits_fr text[] not null default '{}',
  benefits_ar text[] not null default '{}',
  color text not null default '#b08968' check (color ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz not null default now()
);

insert into public.pro_tiers (code, rank, name_fr, name_ar, min_points, discount_percent, color, benefits_fr, benefits_ar) values
  ('bronze', 1, 'Bronze', 'برونزي', 0, 0, '#b08968',
    array['Accès aux tarifs professionnels', 'Calculateur de marge', 'Devis PDF à votre nom'],
    array['الوصول إلى الأسعار المهنية', 'حاسبة الهامش', 'عروض أسعار PDF باسمكم']),
  ('argent', 2, 'Argent', 'فضي', 500, 3, '#9c8c7c',
    array['Remise fidélité de 3 %', 'Devis prioritaire sous 24 h'],
    array['خصم وفاء 3%', 'عرض سعر ذو أولوية خلال 24 ساعة']),
  ('or', 3, 'Or', 'ذهبي', 1500, 5, '#c79e7c',
    array['Remise fidélité de 5 %', 'Réservation anticipée des nouveautés', 'Chargé de compte dédié'],
    array['خصم وفاء 5%', 'حجز مسبق للقطع الجديدة', 'مسؤول حساب مخصص']),
  ('platine', 4, 'Platine', 'بلاتيني', 4000, 8, '#7f5539',
    array['Remise fidélité de 8 %', 'Repérage du lieu offert', 'Paiement à 30 jours'],
    array['خصم وفاء 8%', 'معاينة مجانية للمكان', 'الدفع خلال 30 يوما']),
  ('diamant', 5, 'Diamant', 'ماسي', 8000, 10, '#5c3d28',
    array['Remise fidélité de 10 %', 'Installation prioritaire le jour J', 'Pièces exclusives sur demande'],
    array['خصم وفاء 10%', 'أولوية التركيب يوم الحدث', 'قطع حصرية عند الطلب']),
  ('royal_elite', 6, 'Royal Elite', 'النخبة الملكية', 15000, 12, '#3d281a',
    array['Remise fidélité de 12 %', 'Ligne directe avec la direction', 'Invitations aux lancements de collection'],
    array['خصم وفاء 12%', 'خط مباشر مع الإدارة', 'دعوات لإطلاق المجموعات']);

-- One row per professional. Points only move through reward_events (audited).
create table public.pro_accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  tier_code text not null default 'bronze' references public.pro_tiers (code) on update cascade,
  -- When true, staff chose the tier by hand and points no longer move it.
  tier_locked boolean not null default false,
  points int not null default 0 check (points >= 0),
  -- Replaces the tier discount for this client when set (negotiated rate).
  custom_discount_percent numeric(5, 2) check (custom_discount_percent between 0 and 50),
  extra_benefits text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

create index pro_accounts_tier_idx on public.pro_accounts (tier_code);
create index pro_accounts_updated_by_idx on public.pro_accounts (updated_by);

create table public.reward_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.pro_accounts (profile_id) on delete cascade,
  points int not null check (points <> 0 and points between -1000000 and 1000000),
  reason text not null check (length(reason) between 1 and 200),
  request_id uuid references public.rental_requests (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index reward_events_profile_idx on public.reward_events (profile_id, created_at desc);
create index reward_events_request_idx on public.reward_events (request_id);
create index reward_events_created_by_idx on public.reward_events (created_by);
-- At most one automatic award per request.
create unique index reward_events_one_award_per_request on public.reward_events (request_id)
  where reason = 'request_completed';

-- Effective discount for a professional (custom rate wins over the tier rate).
create function private.pro_discount(p_profile uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select coalesce(a.custom_discount_percent, t.discount_percent)
     from public.pro_accounts a join public.pro_tiers t on t.code = a.tier_code
     where a.profile_id = p_profile),
    0);
$$;

-- Apply a points movement and move the tier unless staff locked it.
create function private.apply_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_points int;
begin
  update public.pro_accounts
  set points = greatest(0, points + new.points), updated_at = now()
  where profile_id = new.profile_id
  returning points into v_points;

  update public.pro_accounts a
  set tier_code = (
    select t.code from public.pro_tiers t
    where t.min_points <= v_points
    order by t.rank desc limit 1)
  where a.profile_id = new.profile_id and not a.tier_locked
    and exists (select 1 from public.pro_tiers t where t.min_points <= v_points);
  return new;
end;
$$;

create trigger apply_reward after insert on public.reward_events
  for each row execute function private.apply_reward();

create trigger reward_events_immutable before update or delete on public.reward_events
  for each row execute function private.forbid_change();

-- API callers can change tier, lock, custom discount and benefits, never the points balance.
create function private.guard_pro_account()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.profile_id <> old.profile_id then
      raise exception 'pro account owner is read-only' using errcode = '42501';
    end if;
    if new.points <> old.points then
      raise exception 'points change only through reward events' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_pro_account before update on public.pro_accounts
  for each row execute function private.guard_pro_account();

create trigger touch_pro_tiers before update on public.pro_tiers
  for each row execute function private.touch_updated_at();

-- A professional account always has a programme row (also covers existing pros).
create function private.ensure_pro_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'professional' then
    insert into public.pro_accounts (profile_id, updated_by) values (new.id, null)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger ensure_pro_account after insert or update of role on public.profiles
  for each row execute function private.ensure_pro_account();

insert into public.pro_accounts (profile_id, updated_by)
select id, null from public.profiles where role = 'professional'
on conflict (profile_id) do nothing;

-- Signup: same rules as before, plus the professional context fields.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  is_pro boolean := coalesce(meta ->> 'account_type', '') = 'professional';
begin
  insert into public.profiles (id, email, full_name, company_name, phone, vat_number, country, activity, city, website, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    left(nullif(trim(meta ->> 'full_name'), ''), 120),
    left(nullif(trim(meta ->> 'company_name'), ''), 120),
    left(nullif(trim(meta ->> 'phone'), ''), 40),
    left(nullif(trim(meta ->> 'vat_number'), ''), 40),
    'TN',
    left(nullif(trim(meta ->> 'activity'), ''), 80),
    left(nullif(trim(meta ->> 'city'), ''), 80),
    left(nullif(trim(meta ->> 'website'), ''), 200),
    case when is_pro then 'professional'::public.app_role else 'customer'::public.app_role end,
    case when is_pro then 'pending'::public.account_status else 'approved'::public.account_status end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Detailed products and staff-only asset data
-- ---------------------------------------------------------------------------

alter table public.products
  add column sku text check (length(sku) <= 40),
  add column badge text check (badge in ('new', 'bestseller', 'limited')),
  add column tone text not null default 'almond' check (tone in ('almond', 'sand', 'tan', 'copper', 'cream', 'stone')),
  add column color_hex text check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  add column finish text check (length(finish) <= 80),
  add column style text check (length(style) <= 80),
  add column weight_kg numeric(8, 2) check (weight_kg > 0),
  add column seating_capacity int check (seating_capacity between 1 and 1000),
  add column setup_minutes int check (setup_minutes between 0 and 1440),
  add column deposit_amount numeric(12, 3) check (deposit_amount >= 0),
  add column highlights_fr text[] not null default '{}',
  add column highlights_ar text[] not null default '{}',
  add column care_fr text check (length(care_fr) <= 2000),
  add column care_ar text check (length(care_ar) <= 2000);

create unique index products_sku_key on public.products (lower(sku)) where sku is not null;

create table public.product_internal (
  product_id uuid primary key references public.products (id) on delete cascade,
  purchase_cost numeric(12, 3) check (purchase_cost >= 0),
  purchase_date date,
  supplier text check (length(supplier) <= 120),
  storage_location text check (length(storage_location) <= 120),
  condition text check (condition in ('new', 'excellent', 'good', 'fair')),
  internal_notes text check (length(internal_notes) <= 2000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

create index product_internal_updated_by_idx on public.product_internal (updated_by);

create trigger touch_product_internal before update on public.product_internal
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Event context on requests
-- ---------------------------------------------------------------------------

alter table public.rental_requests
  add column event_type text check (event_type in ('wedding', 'engagement', 'birthday', 'corporate', 'gala', 'private', 'other')),
  add column event_venue text check (length(event_venue) <= 200),
  add column guest_count int check (guest_count between 1 and 100000),
  add column delivery_mode text check (delivery_mode in ('delivery', 'pickup')),
  add column preferred_contact text not null default 'whatsapp' check (preferred_contact in ('whatsapp', 'phone', 'email')),
  -- Pro discount applied to the unit prices at submission (frozen, for the record).
  add column discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 50);

-- Same status machine as before; clients still may only cancel, and the new fields are
-- protected like the other contact fields.
create or replace function private.guard_request()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_api boolean := current_user in ('authenticated', 'anon');
  is_staff boolean := private.has_role('{manager,admin}');
begin
  if new.id <> old.id or new.reference <> old.reference or new.idempotency_key <> old.idempotency_key
     or new.user_id is distinct from old.user_id or new.country <> old.country
     or new.tier <> old.tier or new.created_at <> old.created_at
     or new.discount_percent <> old.discount_percent then
    raise exception 'request identity fields are read-only' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (case old.status
      when 'submitted' then new.status in ('validated', 'rejected', 'cancelled')
      when 'validated' then new.status in ('submitted', 'confirmed', 'rejected', 'cancelled')
      when 'confirmed' then new.status in ('dispatched', 'cancelled')
      when 'dispatched' then new.status = 'completed'
      else false
    end) then
      raise exception 'invalid status transition % -> %', old.status, new.status using errcode = '42501';
    end if;
    if is_api and new.status in ('validated', 'completed') then
      raise exception 'use issue_quote / return_request for this transition' using errcode = '42501';
    end if;
    if new.status = 'confirmed'
       and (new.quote_valid_until is null or new.quote_valid_until < private.local_today(new.country)) then
      raise exception 'quote expired: issue a new quote before confirming' using errcode = '42501';
    end if;
  end if;

  if is_api and not is_staff then
    if new.status is distinct from 'cancelled' or old.status not in ('submitted', 'validated')
       or (new.customer_name, new.customer_email, new.customer_phone, new.company_name, new.notes,
           new.quote_valid_until, new.assignee_id, new.whatsapp_opened_at,
           new.contact_confirmed_at, new.contact_confirmed_by,
           new.event_type, new.event_venue, new.guest_count, new.delivery_mode, new.preferred_contact)
          is distinct from
          (old.customer_name, old.customer_email, old.customer_phone, old.company_name, old.notes,
           old.quote_valid_until, old.assignee_id, old.whatsapp_opened_at,
           old.contact_confirmed_at, old.contact_confirmed_by,
           old.event_type, old.event_venue, old.guest_count, old.delivery_mode, old.preferred_contact) then
      raise exception 'clients can only cancel their own pending request' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Public submission: always Tunisia. Approved professionals pay the pro rate minus their
-- programme discount; everyone else the retail rate. Prices never come from the payload.
create or replace function public.submit_request(payload jsonb, idem_key uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles;
  v_country public.country_code := 'TN';
  v_tier public.price_tier := 'retail';
  v_discount numeric := 0;
  v_ref text;
  v_req uuid;
  v_name text := trim(coalesce(payload ->> 'customer_name', ''));
  v_email text := lower(trim(coalesce(payload ->> 'customer_email', '')));
  v_phone text := trim(coalesce(payload ->> 'customer_phone', ''));
  v_company text := nullif(trim(coalesce(payload ->> 'company_name', '')), '');
  v_notes text := nullif(trim(coalesce(payload ->> 'notes', '')), '');
  v_event_type text := nullif(trim(coalesce(payload ->> 'event_type', '')), '');
  v_venue text := nullif(trim(coalesce(payload ->> 'event_venue', '')), '');
  v_guests_raw text := nullif(trim(coalesce(payload ->> 'guest_count', '')), '');
  v_guests int;
  v_delivery text := nullif(trim(coalesce(payload ->> 'delivery_mode', '')), '');
  v_contact text := coalesce(nullif(trim(coalesce(payload ->> 'preferred_contact', '')), ''), 'whatsapp');
  v_lines jsonb := payload -> 'lines';
  v_line jsonb;
  v_product public.products;
  v_qty int;
  v_start date;
  v_end date;
  v_owned int;
  v_price numeric;
begin
  if idem_key is null then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;

  select reference into v_ref from public.rental_requests where idempotency_key = idem_key;
  if found then
    return v_ref;
  end if;

  if v_uid is not null then
    select * into v_profile from public.profiles where id = v_uid;
    if v_profile.status in ('rejected', 'suspended') then
      raise exception 'account_inactive' using errcode = '42501';
    end if;
    if v_profile.role = 'professional' and v_profile.status = 'approved' then
      v_tier := 'pro';
      v_discount := private.pro_discount(v_uid);
    end if;
  end if;

  if length(v_name) not between 1 and 120 or length(v_phone) not between 6 and 40
     or length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or length(coalesce(v_company, '')) > 120 or length(coalesce(v_notes, '')) > 2000
     or length(coalesce(v_venue, '')) > 200
     or (v_event_type is not null and v_event_type not in ('wedding', 'engagement', 'birthday', 'corporate', 'gala', 'private', 'other'))
     or (v_delivery is not null and v_delivery not in ('delivery', 'pickup'))
     or v_contact not in ('whatsapp', 'phone', 'email')
     or (v_guests_raw is not null and v_guests_raw !~ '^[0-9]{1,6}$') then
    raise exception 'invalid_contact' using errcode = '22023';
  end if;
  v_guests := nullif(v_guests_raw, '')::int;
  if v_guests is not null and v_guests not between 1 and 100000 then
    raise exception 'invalid_contact' using errcode = '22023';
  end if;

  -- ponytail: per-email throttle only; add an IP/bot check (e.g. Vercel BotID) if spam appears.
  if (select count(*) from public.rental_requests
      where lower(customer_email) = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) not between 1 and 50 then
    raise exception 'invalid_lines' using errcode = '22023';
  end if;

  insert into public.rental_requests
    (user_id, customer_name, customer_email, customer_phone, company_name, notes, country, tier, idempotency_key,
     event_type, event_venue, guest_count, delivery_mode, preferred_contact, discount_percent)
  values (v_uid, v_name, v_email, v_phone, v_company, v_notes, v_country, v_tier, idem_key,
     v_event_type, v_venue, v_guests, v_delivery, v_contact, v_discount)
  returning id, reference into v_req, v_ref;

  for v_line in select * from jsonb_array_elements(v_lines) loop
    if coalesce(v_line ->> 'quantity', '') !~ '^[0-9]{1,5}$' then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;
    v_qty := (v_line ->> 'quantity')::int;

    begin
      v_start := (v_line ->> 'start_date')::date;
      v_end := (v_line ->> 'end_date')::date;
    exception when others then
      raise exception 'invalid_date' using errcode = '22023';
    end;
    if v_start is null or v_end is null then
      raise exception 'invalid_date' using errcode = '22023';
    end if;
    if v_end <= v_start then
      raise exception 'invalid_range' using errcode = '22023';
    end if;
    if v_start < private.local_today(v_country) then
      raise exception 'date_in_past' using errcode = '22023';
    end if;
    if v_end - v_start > 365 then
      raise exception 'range_too_long' using errcode = '22023';
    end if;

    begin
      select * into v_product from public.products
      where id = (v_line ->> 'product_id')::uuid and status = 'active';
    exception when invalid_text_representation then
      raise exception 'unknown_product' using errcode = '22023';
    end;
    if not found then
      raise exception 'unknown_product' using errcode = '22023';
    end if;
    if v_end - v_start < v_product.minimum_nights then
      raise exception 'below_minimum_nights' using errcode = '22023',
        detail = format('product=%s minimum=%s', v_product.slug, v_product.minimum_nights);
    end if;

    select quantity_owned - quantity_maintenance into v_owned
    from public.product_stock where product_id = v_product.id and country = v_country;
    if v_owned is null or v_qty < 1 or v_qty > v_owned then
      raise exception 'invalid_quantity' using errcode = '22023',
        detail = format('product=%s available=%s', v_product.slug, coalesce(v_owned, 0));
    end if;

    select amount into v_price from public.product_prices
    where product_id = v_product.id and country = v_country and tier = v_tier;
    -- A professional without a pro rate on this piece pays retail (still with the discount).
    if v_price is null and v_tier = 'pro' then
      select amount into v_price from public.product_prices
      where product_id = v_product.id and country = v_country and tier = 'retail';
    end if;
    if v_price is null then
      raise exception 'price_missing' using errcode = 'P0001',
        detail = format('product=%s tier=%s', v_product.slug, v_tier);
    end if;

    insert into public.request_lines (request_id, product_id, quantity, start_date, end_date, unit_price)
    values (v_req, v_product.id, v_qty, v_start, v_end, round(v_price * (1 - v_discount / 100), 3));
  end loop;

  return v_ref;
end;
$$;

-- Quotes are issued in TND only. The signature is kept for compatibility; any other
-- currency is refused.
create or replace function public.issue_quote(
  p_request uuid,
  p_currency public.currency_code,
  p_valid_days int default 14
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  v_lines jsonb;
  v_total numeric;
  v_revision int;
  v_quote uuid;
  v_today date;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
  end if;
  if p_currency is distinct from 'TND' then
    raise exception 'tnd_only' using errcode = '22023';
  end if;
  if p_valid_days not between 1 and 90 then
    raise exception 'invalid validity' using errcode = '22023';
  end if;

  select * into r from public.rental_requests where id = p_request for update;
  if not found then
    raise exception 'unknown_request' using errcode = '22023';
  end if;
  if r.status not in ('submitted', 'validated', 'confirmed') then
    raise exception 'cannot quote a % request', r.status using errcode = '42501';
  end if;
  if r.country <> 'TN' then
    raise exception 'tnd_only' using errcode = '22023';
  end if;

  v_today := private.local_today(r.country);

  select
    jsonb_agg(jsonb_build_object(
      'line_id', x.id,
      'product_id', x.product_id,
      'slug', x.slug,
      'title_fr', x.title_fr,
      'title_ar', x.title_ar,
      'quantity', x.quantity,
      'start_date', x.start_date,
      'end_date', x.end_date,
      'nights', x.nights,
      'source_unit_price', x.unit_price,
      'unit_price', x.unit_price,
      'line_total', x.line_total
    ) order by x.start_date, x.title_fr),
    sum(x.line_total)
  into v_lines, v_total
  from (
    select l.*, p.slug, p.title_fr, p.title_ar
    from public.request_lines l
    join public.products p on p.id = l.product_id
    where l.request_id = p_request
  ) x;

  if v_lines is null then
    raise exception 'request has no lines' using errcode = '22023';
  end if;

  select coalesce(max(revision), 0) + 1 into v_revision from public.quotes where request_id = p_request;

  insert into public.quotes (request_id, revision, issued_by, snapshot)
  values (p_request, v_revision, (select auth.uid()), jsonb_build_object(
    'reference', r.reference,
    'revision', v_revision,
    'issued_at', now(),
    'valid_until', v_today + p_valid_days,
    'country', r.country,
    'tier', r.tier,
    'discount_percent', r.discount_percent,
    'source_currency', 'TND',
    'currency', 'TND',
    'fx', null,
    'customer', jsonb_build_object(
      'name', r.customer_name, 'email', r.customer_email,
      'phone', r.customer_phone, 'company', r.company_name),
    'event', jsonb_build_object(
      'type', r.event_type, 'venue', r.event_venue, 'guests', r.guest_count,
      'delivery_mode', r.delivery_mode),
    'notes', r.notes,
    'lines', v_lines,
    'total', v_total
  ))
  returning id into v_quote;

  update public.rental_requests
  set status = case when status = 'submitted' then 'validated'::public.request_status else status end,
      quote_valid_until = v_today + p_valid_days
  where id = p_request;

  return v_quote;
end;
$$;

-- Points for professionals when a rental completes: 1 point per 10 TND (provisional rule).
create function private.award_completion_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric;
begin
  if new.status = 'completed' and old.status is distinct from 'completed'
     and new.user_id is not null and new.tier = 'pro'
     and exists (select 1 from public.pro_accounts where profile_id = new.user_id) then
    select coalesce(sum(line_total), 0) into v_total from public.request_lines where request_id = new.id;
    if floor(v_total / 10) >= 1 then
      insert into public.reward_events (profile_id, points, reason, request_id, created_by)
      values (new.user_id, floor(v_total / 10)::int, 'request_completed', new.id, null)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger award_completion_points after update of status on public.rental_requests
  for each row execute function private.award_completion_points();

-- ---------------------------------------------------------------------------
-- 6. Row level security
-- ---------------------------------------------------------------------------

alter table public.pro_tiers enable row level security;
alter table public.pro_accounts enable row level security;
alter table public.reward_events enable row level security;
alter table public.product_internal enable row level security;

create policy "pro_tiers: public read" on public.pro_tiers
  for select to anon, authenticated using (true);
create policy "pro_tiers: admin update" on public.pro_tiers
  for update to authenticated
  using ((select private.has_role('{admin}'))) with check ((select private.has_role('{admin}')));

create policy "pro_accounts: owner or staff read" on public.pro_accounts
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.has_role('{manager,admin}')));
create policy "pro_accounts: staff insert" on public.pro_accounts
  for insert to authenticated
  with check ((select private.has_role('{manager,admin}')));
create policy "pro_accounts: staff update" on public.pro_accounts
  for update to authenticated
  using ((select private.has_role('{manager,admin}'))) with check ((select private.has_role('{manager,admin}')));

create policy "reward_events: owner or staff read" on public.reward_events
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.has_role('{manager,admin}')));
create policy "reward_events: staff insert" on public.reward_events
  for insert to authenticated
  with check ((select private.has_role('{manager,admin}')) and created_by = (select auth.uid()));

create policy "product_internal: staff read" on public.product_internal
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "product_internal: staff insert" on public.product_internal
  for insert to authenticated with check ((select private.has_role('{manager,admin}')));
create policy "product_internal: staff update" on public.product_internal
  for update to authenticated
  using ((select private.has_role('{manager,admin}'))) with check ((select private.has_role('{manager,admin}')));
create policy "product_internal: staff delete" on public.product_internal
  for delete to authenticated using ((select private.has_role('{manager,admin}')));

-- ---------------------------------------------------------------------------
-- 7. Grants (fail-closed defaults from the grants migration still apply)
-- ---------------------------------------------------------------------------

grant select on public.pro_tiers to anon, authenticated;
grant update on public.pro_tiers to authenticated;
grant select, insert, update on public.pro_accounts to authenticated;
grant select, insert on public.reward_events to authenticated;
grant select, insert, update, delete on public.product_internal to authenticated;
grant all on public.pro_tiers, public.pro_accounts, public.reward_events, public.product_internal to service_role;
grant usage, select on all sequences in schema public to service_role;

grant execute on function private.pro_discount(uuid) to authenticated, service_role;
