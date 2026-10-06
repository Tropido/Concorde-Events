-- Rental requests, their lines, the status machine and the capacity invariant.

create type public.request_status as enum (
  'submitted', 'validated', 'confirmed', 'dispatched', 'completed', 'cancelled', 'rejected'
);

create sequence public.request_ref_seq;

create table public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('CE-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.request_ref_seq')::text, 5, '0')),
  user_id uuid references public.profiles (id) on delete set null,
  customer_name text not null check (length(customer_name) between 1 and 120),
  customer_email text not null check (length(customer_email) <= 254 and customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone text not null check (length(customer_phone) between 6 and 40),
  company_name text check (length(company_name) <= 120),
  notes text check (length(notes) <= 2000),
  country public.country_code not null,
  tier public.price_tier not null,
  status public.request_status not null default 'submitted',
  quote_valid_until date,
  idempotency_key uuid not null unique,
  assignee_id uuid references public.profiles (id) on delete set null,
  -- Reported by the client's browser when the wa.me link is clicked: not proof of delivery.
  whatsapp_opened_at timestamptz,
  -- Set by staff once they have actually spoken to the client.
  contact_confirmed_at timestamptz,
  contact_confirmed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rental_requests_user_id_idx on public.rental_requests (user_id);
create index rental_requests_status_idx on public.rental_requests (status);
create index rental_requests_email_created_idx on public.rental_requests (lower(customer_email), created_at);
create index rental_requests_assignee_idx on public.rental_requests (assignee_id);
create index rental_requests_contact_by_idx on public.rental_requests (contact_confirmed_by);

-- Each line keeps its own period. Nights and totals are derived, never stored by clients.
create table public.request_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.rental_requests (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity int not null check (quantity between 1 and 10000),
  start_date date not null,
  end_date date not null,
  unit_price numeric(12, 3) not null check (unit_price >= 0),
  nights int generated always as (end_date - start_date) stored,
  line_total numeric(16, 3) generated always as (unit_price * quantity * (end_date - start_date)) stored,
  check (end_date > start_date),
  check (end_date - start_date <= 365)
);

create index request_lines_request_id_idx on public.request_lines (request_id);
create index request_lines_product_dates_idx on public.request_lines (product_id, start_date, end_date);

-- Which requests consume physical stock (owner decision: from quote validation).
create function private.holds_stock(s public.request_status, valid_until date, today date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select s in ('confirmed', 'dispatched') or (s = 'validated' and valid_until >= today);
$$;

-- Units committed for one product/country/day. Dispatched lines stay out until returned
-- (late returns keep blocking). The end date itself is occupied (return day blocked).
create function private.units_committed(p_product uuid, p_country public.country_code, p_day date)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(l.quantity), 0)
  from public.request_lines l
  join public.rental_requests r on r.id = l.request_id
  where l.product_id = p_product
    and r.country = p_country
    and private.holds_stock(r.status, r.quote_valid_until, private.local_today(p_country))
    and p_day >= l.start_date
    and p_day <= case when r.status = 'dispatched'
                      then greatest(l.end_date, private.local_today(p_country))
                      else l.end_date end;
$$;

-- Raises if any day in [p_from, p_to] would be oversold. One advisory lock per country
-- serialises concurrent commits; VOLATILE so the query after the lock sees fresh data.
-- ponytail: one lock per country; switch to per-product locks if confirmations ever contend.
create function private.assert_capacity(p_product uuid, p_country public.country_code, p_from date, p_to date)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_day date;
  v_capacity int;
  v_used bigint;
begin
  perform pg_advisory_xact_lock(hashtext('cap:' || p_country::text));

  select s.quantity_owned - s.quantity_maintenance into v_capacity
  from public.product_stock s
  where s.product_id = p_product and s.country = p_country;
  v_capacity := coalesce(v_capacity, 0);

  for v_day in
    select g::date from generate_series(
      greatest(p_from, private.local_today(p_country))::timestamp, p_to::timestamp, interval '1 day'
    ) g
  loop
    v_used := private.units_committed(p_product, p_country, v_day);
    if v_used > v_capacity then
      raise exception 'capacity_exceeded'
        using errcode = 'P0001',
              detail = format('product=%s country=%s day=%s capacity=%s requested=%s',
                              p_product, p_country, v_day, v_capacity, v_used);
    end if;
  end loop;
end;
$$;

-- Re-check every line of a request that currently holds stock.
create function private.assert_request_capacity(p_request uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  l public.request_lines;
begin
  select * into r from public.rental_requests where id = p_request;
  if not found or not private.holds_stock(r.status, r.quote_valid_until, private.local_today(r.country)) then
    return;
  end if;
  for l in select * from public.request_lines where request_id = p_request loop
    perform private.assert_capacity(
      l.product_id, r.country, l.start_date,
      case when r.status = 'dispatched' then greatest(l.end_date, private.local_today(r.country)) else l.end_date end
    );
  end loop;
end;
$$;

create function private.trg_capacity_line()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_request_capacity(new.request_id);
  return null;
end;
$$;

create function private.trg_capacity_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_request_capacity(new.id);
  return null;
end;
$$;

create function private.trg_capacity_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last date;
begin
  select max(case when r.status = 'dispatched'
                  then greatest(l.end_date, private.local_today(r.country)) else l.end_date end)
  into v_last
  from public.request_lines l
  join public.rental_requests r on r.id = l.request_id
  where l.product_id = new.product_id and r.country = new.country
    and private.holds_stock(r.status, r.quote_valid_until, private.local_today(r.country));
  if v_last is not null then
    perform private.assert_capacity(new.product_id, new.country, private.local_today(new.country), v_last);
  end if;
  return null;
end;
$$;

-- Deferred to commit so multi-row writes (submit, reschedule) are checked once, complete.
create constraint trigger capacity_on_lines
  after insert or update of start_date, end_date, quantity, product_id on public.request_lines
  deferrable initially deferred
  for each row execute function private.trg_capacity_line();

create constraint trigger capacity_on_requests
  after update of status, quote_valid_until on public.rental_requests
  deferrable initially deferred
  for each row execute function private.trg_capacity_request();

-- Reducing usable stock by editing "owned" is refused if it would oversell.
-- Damage (maintenance increase) is a fact and always recorded; conflicts surface in admin.
create constraint trigger capacity_on_stock
  after update of quantity_owned on public.product_stock
  deferrable initially deferred
  for each row
  when (new.quantity_owned < old.quantity_owned and new.quantity_maintenance = old.quantity_maintenance)
  execute function private.trg_capacity_stock();

-- Status machine + field protection for API callers.
create function private.guard_request()
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
     or new.tier <> old.tier or new.created_at <> old.created_at then
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
    -- Validation and completion carry side effects (quote snapshot, damage records).
    if is_api and new.status in ('validated', 'completed') then
      raise exception 'use issue_quote / return_request for this transition' using errcode = '42501';
    end if;
    if new.status = 'confirmed'
       and (new.quote_valid_until is null or new.quote_valid_until < private.local_today(new.country)) then
      raise exception 'quote expired: issue a new quote before confirming' using errcode = '42501';
    end if;
  end if;

  -- Clients may only cancel their own submitted/validated request, nothing else.
  if is_api and not is_staff then
    if new.status is distinct from 'cancelled' or old.status not in ('submitted', 'validated')
       or (new.customer_name, new.customer_email, new.customer_phone, new.company_name, new.notes,
           new.quote_valid_until, new.assignee_id, new.whatsapp_opened_at,
           new.contact_confirmed_at, new.contact_confirmed_by)
          is distinct from
          (old.customer_name, old.customer_email, old.customer_phone, old.company_name, old.notes,
           old.quote_valid_until, old.assignee_id, old.whatsapp_opened_at,
           old.contact_confirmed_at, old.contact_confirmed_by) then
      raise exception 'clients can only cancel their own pending request' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_request
  before update on public.rental_requests
  for each row execute function private.guard_request();

-- Lines are frozen once the request is closed; only staff edit them (via reschedule).
create function private.guard_line()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.request_status;
begin
  select status into v_status from public.rental_requests where id = coalesce(new.request_id, old.request_id);
  if v_status in ('dispatched', 'completed', 'cancelled', 'rejected') then
    raise exception 'lines of a % request cannot change', v_status using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.request_id <> old.request_id or new.product_id <> old.product_id
                           or new.unit_price <> old.unit_price) then
    raise exception 'line request, product and price are read-only' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_line
  before update or delete on public.request_lines
  for each row execute function private.guard_line();

-- Public submission path for guests and signed-in users. Identity, tier, prices and
-- status come from the database, never from the payload.
create function public.submit_request(payload jsonb, idem_key uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles;
  v_country public.country_code;
  v_tier public.price_tier := 'retail';
  v_ref text;
  v_req uuid;
  v_name text := trim(coalesce(payload ->> 'customer_name', ''));
  v_email text := lower(trim(coalesce(payload ->> 'customer_email', '')));
  v_phone text := trim(coalesce(payload ->> 'customer_phone', ''));
  v_company text := nullif(trim(coalesce(payload ->> 'company_name', '')), '');
  v_notes text := nullif(trim(coalesce(payload ->> 'notes', '')), '');
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

  if payload ->> 'country' not in ('FR', 'TN') then
    raise exception 'invalid_country' using errcode = '22023';
  end if;
  v_country := (payload ->> 'country')::public.country_code;

  if v_uid is not null then
    select * into v_profile from public.profiles where id = v_uid;
    if v_profile.status in ('rejected', 'suspended') then
      raise exception 'account_inactive' using errcode = '42501';
    end if;
    if v_profile.role = 'professional' and v_profile.status = 'approved' then
      v_tier := 'pro';
    end if;
  end if;

  if length(v_name) not between 1 and 120 or length(v_phone) not between 6 and 40
     or length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or length(coalesce(v_company, '')) > 120 or length(coalesce(v_notes, '')) > 2000 then
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
    (user_id, customer_name, customer_email, customer_phone, company_name, notes, country, tier, idempotency_key)
  values (v_uid, v_name, v_email, v_phone, v_company, v_notes, v_country, v_tier, idem_key)
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
    if v_price is null then
      raise exception 'price_missing' using errcode = 'P0001',
        detail = format('product=%s tier=%s country=%s', v_product.slug, v_tier, v_country);
    end if;

    insert into public.request_lines (request_id, product_id, quantity, start_date, end_date, unit_price)
    values (v_req, v_product.id, v_qty, v_start, v_end, v_price);
  end loop;

  return v_ref;
end;
$$;

-- The browser reports that the client clicked the WhatsApp link. Only the submitter
-- knows the idempotency key, so nobody else can set it.
create function public.mark_whatsapp_opened(idem_key uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.rental_requests
  set whatsapp_opened_at = coalesce(whatsapp_opened_at, now())
  where idempotency_key = idem_key;
$$;

-- Staff: move line dates. A validated quote no longer matches, so it returns to
-- "submitted" and must be re-issued; capacity is re-checked at commit.
create function public.reschedule_request(p_request uuid, p_lines jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.rental_requests;
  v_line jsonb;
  v_start date;
  v_end date;
  v_min int;
  v_rows int;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
  end if;
  select * into r from public.rental_requests where id = p_request for update;
  if not found or r.status not in ('submitted', 'validated', 'confirmed') then
    raise exception 'request cannot be rescheduled' using errcode = '42501';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'invalid_lines' using errcode = '22023';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_start := (v_line ->> 'start_date')::date;
    v_end := (v_line ->> 'end_date')::date;
    if v_start is null or v_end is null or v_end <= v_start then
      raise exception 'invalid_range' using errcode = '22023';
    end if;
    if v_start < private.local_today(r.country) then
      raise exception 'date_in_past' using errcode = '22023';
    end if;
    select p.minimum_nights into v_min
    from public.request_lines l join public.products p on p.id = l.product_id
    where l.id = (v_line ->> 'id')::uuid and l.request_id = p_request;
    if v_min is null then
      raise exception 'unknown_line' using errcode = '22023';
    end if;
    if v_end - v_start < v_min then
      raise exception 'below_minimum_nights' using errcode = '22023';
    end if;

    update public.request_lines set start_date = v_start, end_date = v_end
    where id = (v_line ->> 'id')::uuid and request_id = p_request;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'unknown_line' using errcode = '22023';
    end if;
  end loop;

  if r.status = 'validated' then
    update public.rental_requests set status = 'submitted', quote_valid_until = null where id = p_request;
  end if;
end;
$$;

-- Staff: close a dispatched rental. Idempotent: a second call on a completed request
-- does nothing. Damaged units move to maintenance; owned stock never increases here.
create function public.return_request(p_request uuid, p_damaged jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  v_item jsonb;
  l public.request_lines;
  v_qty int;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
  end if;
  select * into r from public.rental_requests where id = p_request for update;
  if not found then
    raise exception 'unknown_request' using errcode = '22023';
  end if;
  if r.status = 'completed' then
    return;
  end if;
  if r.status <> 'dispatched' then
    raise exception 'only dispatched rentals can be returned' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_damaged, '[]'::jsonb)) <> 'array'
     or (select count(*) from jsonb_array_elements(coalesce(p_damaged, '[]'::jsonb)))
        <> (select count(distinct e ->> 'line_id') from jsonb_array_elements(coalesce(p_damaged, '[]'::jsonb)) e) then
    raise exception 'duplicate_or_invalid_lines' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_damaged, '[]'::jsonb)) loop
    select * into l from public.request_lines
    where id = (v_item ->> 'line_id')::uuid and request_id = p_request;
    if not found then
      raise exception 'unknown_line' using errcode = '22023';
    end if;
    if coalesce(v_item ->> 'quantity', '') !~ '^[0-9]{1,5}$' then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty > l.quantity then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;
    if v_qty > 0 then
      update public.product_stock
      set quantity_maintenance = quantity_maintenance + v_qty
      where product_id = l.product_id and country = r.country;
    end if;
  end loop;

  update public.rental_requests set status = 'completed' where id = p_request;
end;
$$;

-- Public: per-day availability for one product, with no information about who booked.
create function public.product_availability(p_product uuid, p_country public.country_code, p_from date, p_to date)
returns table (day date, available int)
language sql
stable
security definer
set search_path = ''
as $$
  select g::date,
         greatest(0, coalesce(s.quantity_owned - s.quantity_maintenance, 0)
                     - private.units_committed(p_product, p_country, g::date))::int
  from generate_series(p_from::timestamp, least(p_to, p_from + 400)::timestamp, interval '1 day') g
  join public.products p on p.id = p_product and p.status = 'active'
  left join public.product_stock s on s.product_id = p_product and s.country = p_country
  where p_to >= p_from;
$$;

-- Staff overview: future days where commitments exceed usable stock (e.g. after damage).
create function public.capacity_conflicts()
returns table (product_id uuid, country public.country_code, day date, capacity int, committed bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with holding as (
    select l.product_id, r.country, l.quantity,
           greatest(l.start_date, private.local_today(r.country)) as d0,
           case when r.status = 'dispatched'
                then greatest(l.end_date, private.local_today(r.country)) else l.end_date end as d1
    from public.request_lines l
    join public.rental_requests r on r.id = l.request_id
    where private.holds_stock(r.status, r.quote_valid_until, private.local_today(r.country))
      and (select private.has_role('{manager,admin}'))
  ),
  days as (
    select h.product_id, h.country, g::date as day, sum(h.quantity) as committed
    from holding h, generate_series(h.d0::timestamp, h.d1::timestamp, interval '1 day') g
    where h.d0 <= h.d1
    group by 1, 2, 3
  )
  select d.product_id, d.country, d.day, (s.quantity_owned - s.quantity_maintenance)::int, d.committed
  from days d
  join public.product_stock s on s.product_id = d.product_id and s.country = d.country
  where d.committed > s.quantity_owned - s.quantity_maintenance
  order by d.day, d.product_id;
$$;

alter table public.rental_requests enable row level security;
alter table public.request_lines enable row level security;

create policy "requests: owner or staff read" on public.rental_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('{manager,admin}')));

create policy "requests: owner cancel or staff update" on public.rental_requests
  for update to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('{manager,admin}')))
  with check (user_id = (select auth.uid()) or (select private.has_role('{manager,admin}')));

create policy "lines: owner or staff read" on public.request_lines
  for select to authenticated
  using (exists (
    select 1 from public.rental_requests r
    where r.id = request_id
      and (r.user_id = (select auth.uid()) or (select private.has_role('{manager,admin}')))
  ));

create policy "lines: staff update" on public.request_lines
  for update to authenticated
  using ((select private.has_role('{manager,admin}')))
  with check ((select private.has_role('{manager,admin}')));
