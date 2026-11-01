-- English as a third language (2026-11-01). French stays the source of truth: an empty
-- English field shows the French text, exactly like Arabic.

alter table public.products
  add column title_en text check (length(title_en) <= 200),
  add column description_en text check (length(description_en) <= 5000),
  add column highlights_en text[] not null default '{}',
  add column care_en text check (length(care_en) <= 2000);

alter table public.categories
  add column name_en text check (length(name_en) <= 120),
  add column description_en text check (length(description_en) <= 2000);

alter table public.pro_tiers
  add column name_en text check (length(name_en) <= 60),
  add column benefits_en text[] not null default '{}';

alter table public.cms_content drop constraint cms_content_locale_check;
alter table public.cms_content add constraint cms_content_locale_check check (locale in ('fr', 'en', 'ar'));

-- Language of emails and documents. Set from the language cookie at signup or submission.
alter table public.profiles
  add column language text not null default 'fr' check (language in ('fr', 'en', 'ar'));
alter table public.rental_requests
  add column language text not null default 'fr' check (language in ('fr', 'en', 'ar'));

update public.pro_tiers set name_en = v.name, benefits_en = v.benefits
from (values
  ('bronze', 'Bronze', array['Access to professional rates', 'Margin calculator', 'PDF quotes in your name']),
  ('argent', 'Silver', array['3% loyalty discount', 'Priority quote within 24 h']),
  ('or', 'Gold', array['5% loyalty discount', 'Early booking of new pieces', 'Dedicated account manager']),
  ('platine', 'Platinum', array['8% loyalty discount', 'Free venue scouting', '30-day payment terms']),
  ('diamant', 'Diamond', array['10% loyalty discount', 'Priority setup on the day', 'Exclusive pieces on request']),
  ('royal_elite', 'Royal Elite', array['12% loyalty discount', 'Direct line to management', 'Invitations to collection launches'])
) as v(code, name, benefits)
where pro_tiers.code = v.code;

update public.categories set name_en = v.name
from (values
  ('seating-lounges', 'Seating & lounges'),
  ('reception-chairs', 'Reception chairs'),
  ('tables-dining', 'Tables & high tables'),
  ('wedding-ceremony', 'Wedding & ceremony'),
  ('decoration', 'Decor & tableware'),
  ('lighting', 'Lighting & chandeliers'),
  ('bars-consoles', 'Bars & reception'),
  ('outdoor-luxury', 'Outdoor & lounge'),
  ('rugs-textiles', 'Rugs & textiles')
) as v(slug, name)
where categories.slug = v.slug;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  kind text := case meta ->> 'account_type' when 'professional' then 'professional' when 'customer_plus' then 'customer_plus' else 'customer' end;
  ev text := nullif(trim(coalesce(meta ->> 'event_type', '')), '');
begin
  insert into public.profiles (id, email, full_name, company_name, phone, vat_number, country, activity, city, website, event_type, language, role, status)
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
    case when ev in ('wedding', 'engagement', 'birthday', 'corporate', 'gala', 'private', 'other') then ev end,
    case when meta ->> 'language' in ('fr', 'en', 'ar') then meta ->> 'language' else 'fr' end,
    kind::public.app_role,
    (case when kind = 'customer' then 'approved' else 'pending' end)::public.account_status
  );
  return new;
end;
$$;

-- Same submission path; it now records the language of the submitter.
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
  v_language text := case when payload ->> 'language' in ('fr', 'en', 'ar') then payload ->> 'language' end;
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
     event_type, event_venue, guest_count, delivery_mode, preferred_contact, discount_percent, language)
  values (v_uid, v_name, v_email, v_phone, v_company, v_notes, v_country, v_tier, idem_key,
     v_event_type, v_venue, v_guests, v_delivery, v_contact, v_discount, coalesce(v_language, v_profile.language, 'fr'))
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
