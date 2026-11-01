-- Order pipeline (2026-11-01). Owner rule: no confirmation without a deposit.
--
--   submitted -> validated -> accepted -> confirmed -> dispatched -> returned -> completed
--
-- Exits: rejected, and cancelled from submitted, validated, accepted or confirmed. Each step
-- has one way in:
--   validated  issue_quote            accepted   accept_quote(_by_token)
--   confirmed  record_payment, or confirm_without_deposit (admin, reason, audited)
--   returned   receive_return         completed  close_inspection

-- ---------------------------------------------------------------------------
-- 1. Requests
-- ---------------------------------------------------------------------------

alter table public.rental_requests
  -- sha256 of the tracking token. The token itself only ever appears in emails.
  add column access_token_hash text unique,
  add column accepted_at timestamptz,
  add column accepted_quote_id uuid references public.quotes (id) on delete set null,
  -- The accepted quote no longer matches (dates or lines changed, or a new revision).
  add column reacceptance_required boolean not null default false,
  add column total_ttc numeric(14, 3),
  add column deposit_rate numeric(5, 2),
  add column deposit_required numeric(14, 3),
  add column deposit_due_at timestamptz,
  -- Maintained by private.recompute_payments, never by clients or staff directly.
  add column deposit_paid numeric(14, 3) not null default 0,
  add column paid_total numeric(14, 3) not null default 0,
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'deposit_due', 'deposit_paid', 'balance_due', 'paid', 'refunded')),
  add column deposit_waived_at timestamptz,
  add column deposit_waived_by uuid references public.profiles (id) on delete set null,
  add column deposit_waived_reason text check (length(deposit_waived_reason) <= 500),
  add column cancelled_reason text check (length(cancelled_reason) <= 500);

create index rental_requests_deposit_due_idx on public.rental_requests (deposit_due_at) where status = 'accepted';
create index rental_requests_accepted_quote_idx on public.rental_requests (accepted_quote_id);
create index rental_requests_waived_by_idx on public.rental_requests (deposit_waived_by);

-- ---------------------------------------------------------------------------
-- 2. Capacity: accepted holds like confirmed; returned holds until the inspection closes
-- ---------------------------------------------------------------------------

create or replace function private.holds_stock(s public.request_status, valid_until date, today date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select s in ('accepted', 'confirmed', 'dispatched', 'returned') or (s = 'validated' and valid_until >= today);
$$;

-- Equipment out or under inspection keeps blocking past its end date.
create function private.held_until(s public.request_status, end_date date, today date)
returns date
language sql
immutable
set search_path = ''
as $$
  select case when s in ('dispatched', 'returned') then greatest(end_date, today) else end_date end;
$$;

create or replace function private.units_committed(p_product uuid, p_country public.country_code, p_day date)
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
    and p_day <= private.held_until(r.status, l.end_date, private.local_today(p_country));
$$;

create or replace function private.assert_request_capacity(p_request uuid)
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
    perform private.assert_capacity(l.product_id, r.country, l.start_date,
      private.held_until(r.status, l.end_date, private.local_today(r.country)));
  end loop;
end;
$$;

create or replace function private.trg_capacity_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last date;
begin
  select max(private.held_until(r.status, l.end_date, private.local_today(r.country)))
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

create or replace function public.capacity_conflicts()
returns table (product_id uuid, country public.country_code, day date, capacity int, committed bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with holding as (
    select l.product_id, r.country, l.quantity,
           greatest(l.start_date, private.local_today(r.country)) as d0,
           private.held_until(r.status, l.end_date, private.local_today(r.country)) as d1
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

grant execute on function private.held_until(public.request_status, date, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Status machine
-- ---------------------------------------------------------------------------

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

  -- Money and acceptance only move through the functions below, for staff too.
  if is_api and (new.accepted_at, new.accepted_quote_id, new.reacceptance_required, new.total_ttc, new.deposit_rate,
                 new.deposit_required, new.deposit_due_at, new.deposit_paid, new.paid_total, new.payment_status,
                 new.deposit_waived_at, new.deposit_waived_by, new.deposit_waived_reason, new.cancelled_reason,
                 new.access_token_hash)
     is distinct from (old.accepted_at, old.accepted_quote_id, old.reacceptance_required, old.total_ttc, old.deposit_rate,
                       old.deposit_required, old.deposit_due_at, old.deposit_paid, old.paid_total, old.payment_status,
                       old.deposit_waived_at, old.deposit_waived_by, old.deposit_waived_reason, old.cancelled_reason,
                       old.access_token_hash) then
    raise exception 'order fields are read-only' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (case old.status
      when 'submitted' then new.status in ('validated', 'rejected', 'cancelled')
      when 'validated' then new.status in ('submitted', 'accepted', 'rejected', 'cancelled')
      when 'accepted' then new.status in ('confirmed', 'cancelled')
      when 'confirmed' then new.status in ('accepted', 'dispatched', 'cancelled')
      when 'dispatched' then new.status = 'returned'
      when 'returned' then new.status = 'completed'
      else false
    end) then
      raise exception 'invalid status transition % -> %', old.status, new.status using errcode = '42501';
    end if;
    if is_api and new.status in ('validated', 'accepted', 'confirmed', 'returned', 'completed') then
      raise exception 'use the dedicated function for this transition' using errcode = '42501';
    end if;
    if is_api and new.status = 'cancelled' and old.status in ('accepted', 'confirmed') then
      raise exception 'use cancel_order for this transition' using errcode = '42501';
    end if;
    if new.status = 'dispatched' and new.reacceptance_required then
      raise exception 'reacceptance_required' using errcode = '42501';
    end if;
  end if;

  if is_api and not is_staff then
    if new.status is distinct from 'cancelled' or old.status not in ('submitted', 'validated')
       or (new.customer_name, new.customer_email, new.customer_phone, new.company_name, new.notes,
           new.quote_valid_until, new.assignee_id, new.whatsapp_opened_at,
           new.contact_confirmed_at, new.contact_confirmed_by,
           new.event_type, new.event_venue, new.guest_count, new.delivery_mode, new.preferred_contact,
           new.language, new.billing_address, new.billing_tax_id)
          is distinct from
          (old.customer_name, old.customer_email, old.customer_phone, old.company_name, old.notes,
           old.quote_valid_until, old.assignee_id, old.whatsapp_opened_at,
           old.contact_confirmed_at, old.contact_confirmed_by,
           old.event_type, old.event_venue, old.guest_count, old.delivery_mode, old.preferred_contact,
           old.language, old.billing_address, old.billing_tax_id) then
      raise exception 'clients can only cancel their own pending request' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Quotes: extra lines and VAT frozen in the snapshot
-- ---------------------------------------------------------------------------

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
  c public.company_settings := private.company();
  v_lines jsonb;
  v_extras jsonb;
  v_totals jsonb;
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
  if r.status not in ('submitted', 'validated', 'accepted', 'confirmed') then
    raise exception 'cannot quote a % request', r.status using errcode = '42501';
  end if;
  if r.country <> 'TN' then
    raise exception 'tnd_only' using errcode = '22023';
  end if;

  v_today := private.local_today(r.country);

  select jsonb_agg(
    jsonb_build_object(
      'line_id', x.id,
      'product_id', x.product_id,
      'slug', x.slug,
      'title_fr', x.title_fr,
      'title_en', x.title_en,
      'title_ar', x.title_ar,
      'quantity', x.quantity,
      'start_date', x.start_date,
      'end_date', x.end_date,
      'nights', x.nights,
      'source_unit_price', x.unit_price,
      'unit_price', x.unit_price,
      'line_total', x.line_total
    ) || private.vat_line(x.line_total, coalesce(x.vat_rate, c.default_vat_rate), c.prices_include_vat)
    order by x.start_date, x.title_fr)
  into v_lines
  from (
    select l.*, p.slug, p.title_fr, p.title_en, p.title_ar
    from public.request_lines l
    join public.products p on p.id = l.product_id
    where l.request_id = p_request
  ) x;

  if v_lines is null then
    raise exception 'request has no lines' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object('extra_id', e.id, 'kind', e.kind, 'label', e.label, 'quantity', e.quantity,
                       'unit_price', e.unit_price, 'line_total', round(e.quantity * e.unit_price, 3))
    || private.vat_line(round(e.quantity * e.unit_price, 3), e.vat_rate, c.prices_include_vat)
    order by e.created_at), '[]'::jsonb)
  into v_extras
  from public.request_extras e
  where e.request_id = p_request;

  v_totals := private.vat_totals(v_lines || v_extras);
  if (v_totals ->> 'ttc')::numeric < 0 then
    raise exception 'invalid_total' using errcode = '22023';
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
    'extras', v_extras,
    'totals', v_totals,
    'prices_include_vat', c.prices_include_vat,
    'total', v_totals -> 'ttc'
  ))
  returning id into v_quote;

  -- Anything issued after an acceptance must be accepted again before delivery.
  update public.rental_requests
  set status = case when status = 'submitted' then 'validated'::public.request_status else status end,
      quote_valid_until = v_today + p_valid_days,
      reacceptance_required = status in ('accepted', 'confirmed')
  where id = p_request;

  return v_quote;
end;
$$;

-- Dates change on a live order: it keeps its stock and its payments, but needs a new quote
-- revision and a new acceptance. Definer rights: the flag is read-only for API callers.
create or replace function public.reschedule_request(p_request uuid, p_lines jsonb)
returns void
language plpgsql
security definer
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
  if not found or r.status not in ('submitted', 'validated', 'accepted', 'confirmed') then
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
  elsif r.status in ('accepted', 'confirmed') then
    update public.rental_requests set reacceptance_required = true where id = p_request;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Quote acceptance
-- ---------------------------------------------------------------------------

create table public.quote_acceptances (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.rental_requests (id) on delete restrict,
  quote_id uuid not null unique references public.quotes (id) on delete restrict,
  revision int not null,
  signer_name text not null check (length(trim(signer_name)) between 2 and 120),
  channel text not null check (channel in ('online', 'whatsapp', 'phone', 'in_person')),
  -- Null for a guest using their tracking link.
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz not null default now(),
  user_agent text check (length(user_agent) <= 300),
  -- The rental conditions accepted: sha256 of the published text, and when it was published.
  terms_hash text not null,
  terms_published_at timestamptz
);

create index quote_acceptances_request_idx on public.quote_acceptances (request_id);
create index quote_acceptances_accepted_by_idx on public.quote_acceptances (accepted_by);

create trigger quote_acceptances_immutable before update or delete on public.quote_acceptances
  for each row execute function private.forbid_change();

alter table public.quote_acceptances enable row level security;

create policy "quote_acceptances: owner or staff read" on public.quote_acceptances
  for select to authenticated
  using (
    (select private.has_role('{manager,admin}'))
    or exists (select 1 from public.rental_requests r where r.id = request_id and r.user_id = (select auth.uid()))
  );

grant select on public.quote_acceptances to authenticated;
grant all on public.quote_acceptances to service_role;

-- The client's negotiated rate wins over the global one; a live order keeps its rate.
create function private.deposit_rate_for(r public.rental_requests)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_override numeric;
begin
  if r.deposit_rate is not null then
    return r.deposit_rate;
  end if;
  select deposit_rate_override into v_override from public.client_notes where profile_id = r.user_id;
  return coalesce(v_override, (private.company()).deposit_rate);
end;
$$;

-- TTC of deposit invoices still standing (credit notes taken off).
create function private.invoiced_deposits(p_request uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v numeric;
begin
  select coalesce(sum(case when type = 'deposit' then ttc when type = 'credit_note' then -ttc end), 0) into v
  from public.invoices where request_id = p_request;
  return v;
end;
$$;

-- What the client owes in all: the final invoice once it exists, until then the accepted total
-- plus the stamp duty of invoices already issued.
create function private.amount_owed(p_request uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_issued numeric;
  v_stamps numeric;
  v_total numeric;
begin
  select coalesce(sum(case when type = 'credit_note' then -total_due else total_due end), 0),
         coalesce(sum(case when type = 'credit_note' then 0 else stamp end), 0)
  into v_issued, v_stamps
  from public.invoices where request_id = p_request;
  if exists (select 1 from public.invoices where request_id = p_request and type = 'final') then
    return v_issued;
  end if;
  select coalesce(total_ttc, 0) into v_total from public.rental_requests where id = p_request;
  return v_total + v_stamps;
end;
$$;

create function private.do_accept_quote(
  p_request uuid, p_quote uuid, p_signer text, p_terms boolean, p_channel text, p_user_agent text, p_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  q public.quotes;
  c public.company_settings := private.company();
  v_lang text;
  v_terms text;
  v_terms_at timestamptz;
  v_total numeric;
  v_rate numeric;
  v_required numeric;
  v_top_up numeric;
  v_due timestamptz;
  v_invoice uuid;
  v_status public.request_status;
begin
  select * into r from public.rental_requests where id = p_request for update;
  if not found then
    raise exception 'unknown_request' using errcode = '22023';
  end if;
  if not (r.status = 'validated' or (r.status in ('accepted', 'confirmed') and r.reacceptance_required)) then
    raise exception 'cannot accept a % request', r.status using errcode = '42501';
  end if;
  select * into q from public.quotes where request_id = p_request order by revision desc limit 1;
  if q.id is distinct from p_quote then
    raise exception 'quote_superseded' using errcode = '42501';
  end if;
  if (q.snapshot ->> 'valid_until')::date < private.local_today(r.country) then
    raise exception 'quote expired: issue a new quote' using errcode = '42501';
  end if;
  if p_terms is not true or length(trim(coalesce(p_signer, ''))) not between 2 and 120 then
    raise exception 'terms_required' using errcode = '22023';
  end if;
  perform private.assert_company_ready();

  select coalesce(p.language, r.language) into v_lang from (select 1) x left join public.profiles p on p.id = r.user_id;
  select content ->> 'terms', updated_at into v_terms, v_terms_at from public.cms_content where locale = v_lang;
  if coalesce(v_terms, '') = '' then
    select content ->> 'terms', updated_at into v_terms, v_terms_at from public.cms_content where locale = 'fr';
  end if;

  insert into public.quote_acceptances (request_id, quote_id, revision, signer_name, channel, accepted_by, user_agent, terms_hash, terms_published_at)
  values (p_request, q.id, q.revision, trim(p_signer), p_channel, p_by, left(p_user_agent, 300),
          encode(sha256(convert_to(coalesce(v_terms, ''), 'UTF8')), 'hex'), v_terms_at);

  v_total := (q.snapshot ->> 'total')::numeric;
  v_rate := private.deposit_rate_for(r);
  v_required := private.deposit_amount(v_total, v_rate);
  v_due := case when r.deposit_paid < v_required then now() + make_interval(hours => c.deposit_deadline_hours) else r.deposit_due_at end;

  -- A later acceptance only asks for what the new total adds.
  v_status := case
    when r.deposit_paid >= v_required or r.deposit_waived_at is not null then 'confirmed'::public.request_status
    else 'accepted'::public.request_status
  end;
  update public.rental_requests
  set status = case when status = 'validated' then 'accepted'::public.request_status else status end,
      accepted_at = now(), accepted_quote_id = q.id, reacceptance_required = false, total_ttc = v_total,
      deposit_rate = v_rate, deposit_required = v_required, deposit_due_at = v_due
  where id = p_request;
  update public.rental_requests set status = v_status where id = p_request and status <> v_status;

  v_top_up := v_required - private.invoiced_deposits(p_request);
  if v_top_up > 0 then
    v_invoice := private.issue_deposit_invoice(p_request, q.id, v_top_up, v_due);
  end if;
  perform private.recompute_payments(p_request);

  return jsonb_build_object('status', v_status, 'confirmed', v_status = 'confirmed', 'quote_id', q.id, 'invoice_id', v_invoice,
    'deposit_required', v_required, 'deposit_due_at', v_due);
end;
$$;

-- Signed-in owner ("online"), or staff recording an agreement made by WhatsApp, phone or in person.
create function public.accept_quote(
  p_request uuid, p_quote_id uuid, p_signer_name text, p_accepted_terms boolean, p_channel text, p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
begin
  select user_id into v_owner from public.rental_requests where id = p_request;
  if p_channel = 'online' then
    if v_uid is null or v_owner is distinct from v_uid or not private.is_active() then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif p_channel in ('whatsapp', 'phone', 'in_person') then
    if not private.has_role('{manager,admin}') then
      raise exception 'staff only' using errcode = '42501';
    end if;
  else
    raise exception 'invalid_channel' using errcode = '22023';
  end if;
  return private.do_accept_quote(p_request, p_quote_id, p_signer_name, p_accepted_terms, p_channel, p_user_agent, v_uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Payments
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.rental_requests (id) on delete restrict,
  invoice_id uuid,
  kind text not null check (kind in ('deposit', 'balance', 'caution_held', 'caution_refund', 'caution_retained', 'refund')),
  method text not null check (method in ('virement', 'especes', 'cheque', 'd17', 'flouci', 'konnect', 'carte', 'autre')),
  amount numeric(12, 3) not null check (amount > 0),
  received_at timestamptz not null default now(),
  reference text check (length(reference) <= 80),
  proof_path text check (length(proof_path) <= 300),
  note text check (length(note) <= 1000),
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  void_reason text check (length(void_reason) <= 500),
  check ((voided_at is null) = (void_reason is null))
);

create index payments_request_idx on public.payments (request_id);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_recorded_by_idx on public.payments (recorded_by);
create index payments_voided_by_idx on public.payments (voided_by);

-- A payment is a fact: amounts never change and nothing is deleted. Corrections void it.
create function private.guard_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payments rows are immutable' using errcode = '42501';
  end if;
  if (to_jsonb(new) - array['voided_at', 'voided_by', 'void_reason']) <> (to_jsonb(old) - array['voided_at', 'voided_by', 'void_reason']) then
    raise exception 'payments rows are immutable' using errcode = '42501';
  end if;
  if old.voided_at is not null then
    raise exception 'payment already voided' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_payment before update or delete on public.payments
  for each row execute function private.guard_payment();

alter table public.payments enable row level security;

-- Staff only: clients read their payments through my_request_view / track_request, which leave
-- out the internal note and proof path.
create policy "payments: staff read" on public.payments
  for select to authenticated using ((select private.has_role('{manager,admin}')));

grant select on public.payments to authenticated;
grant all on public.payments to service_role;

-- The single place paid_total, deposit_paid and payment_status are written.
create function private.recompute_payments(p_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  v_paid numeric;
  v_deposit numeric;
  v_refunded boolean;
  v_status text;
begin
  select * into r from public.rental_requests where id = p_request;
  select
    coalesce(sum(amount) filter (where kind in ('deposit', 'balance', 'caution_retained')), 0)
      - coalesce(sum(amount) filter (where kind = 'refund'), 0),
    coalesce(sum(amount) filter (where kind = 'deposit'), 0),
    coalesce(bool_or(kind = 'refund'), false)
  into v_paid, v_deposit, v_refunded
  from public.payments where request_id = p_request and voided_at is null;

  v_status := case
    when v_refunded and v_paid <= 0 then 'refunded'
    when exists (select 1 from public.invoices where request_id = p_request and type = 'final')
      then case when private.amount_owed(p_request) - v_paid <= 0 then 'paid' else 'balance_due' end
    when r.accepted_at is null then 'unpaid'
    when v_deposit >= coalesce(r.deposit_required, 0) then 'deposit_paid'
    else 'deposit_due'
  end;

  update public.rental_requests set paid_total = v_paid, deposit_paid = v_deposit, payment_status = v_status where id = p_request;
end;
$$;

-- Manager or admin (refunds: admin only). Over-payment is allowed and reported as a credit.
-- Reaching the deposit moves an accepted order to confirmed in the same transaction.
create function public.record_payment(
  p_request uuid,
  p_kind text,
  p_method text,
  p_amount numeric,
  p_received_at timestamptz default null,
  p_reference text default null,
  p_proof_path text default null,
  p_note text default null,
  p_invoice uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  v_id uuid;
  v_invoice uuid := p_invoice;
  v_held numeric;
  v_confirmed boolean := false;
  v_owed numeric;
  v_before text;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
  end if;
  if p_kind = 'refund' and not private.has_role('{admin}') then
    raise exception 'refunds are for admins' using errcode = '42501';
  end if;
  if p_kind not in ('deposit', 'balance', 'caution_held', 'caution_refund', 'refund') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 3) then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  select * into r from public.rental_requests where id = p_request for update;
  if not found then
    raise exception 'unknown_request' using errcode = '22023';
  end if;
  v_before := r.payment_status;
  if p_kind in ('deposit', 'balance', 'caution_held')
     and r.status not in ('accepted', 'confirmed', 'dispatched', 'returned', 'completed') then
    raise exception 'quote_not_accepted' using errcode = '42501';
  end if;

  if p_kind = 'caution_refund' then
    select coalesce(sum(case when kind = 'caution_held' then amount else -amount end), 0) into v_held
    from public.payments
    where request_id = p_request and voided_at is null and kind in ('caution_held', 'caution_refund', 'caution_retained');
    if p_amount > v_held then
      raise exception 'invalid_amount' using errcode = '22023';
    end if;
  end if;
  if p_kind = 'refund' and p_amount > r.paid_total then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  if v_invoice is null and p_kind in ('deposit', 'balance') then
    select id into v_invoice from public.invoices
    where request_id = p_request and type = case p_kind when 'deposit' then 'deposit' else 'final' end
    order by issued_at desc limit 1;
  end if;

  insert into public.payments (request_id, invoice_id, kind, method, amount, received_at, reference, proof_path, note, recorded_by)
  values (p_request, v_invoice, p_kind, p_method, p_amount, coalesce(p_received_at, now()), nullif(trim(p_reference), ''),
          nullif(p_proof_path, ''), nullif(trim(p_note), ''), (select auth.uid()))
  returning id into v_id;

  perform private.recompute_payments(p_request);
  select * into r from public.rental_requests where id = p_request;

  if r.status = 'accepted' and not r.reacceptance_required and r.deposit_paid >= coalesce(r.deposit_required, 0) then
    update public.rental_requests set status = 'confirmed' where id = p_request;
    v_confirmed := true;
  end if;

  v_owed := private.amount_owed(p_request);
  return jsonb_build_object('payment_id', v_id, 'confirmed', v_confirmed, 'payment_status', r.payment_status,
    'paid_in_full', r.payment_status = 'paid' and v_before <> 'paid',
    'remaining', greatest(0, v_owed - r.paid_total), 'overpaid', greatest(0, r.paid_total - v_owed));
end;
$$;

-- Admin only, with a reason. An order that loses its deposit goes back to waiting for it.
create function public.void_payment(p_payment uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
  r public.rental_requests;
begin
  if not private.has_role('{admin}') then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  select * into p from public.payments where id = p_payment;
  if not found then
    raise exception 'unknown_payment' using errcode = '22023';
  end if;
  perform 1 from public.rental_requests where id = p.request_id for update;
  update public.payments set voided_at = now(), voided_by = (select auth.uid()), void_reason = trim(p_reason) where id = p_payment;
  perform private.recompute_payments(p.request_id);
  select * into r from public.rental_requests where id = p.request_id;
  if r.status = 'confirmed' and r.deposit_waived_at is null and r.deposit_paid < coalesce(r.deposit_required, 0) then
    update public.rental_requests set status = 'accepted' where id = r.id;
  end if;
end;
$$;

-- Admin decision to go ahead without the deposit. Audited.
create function public.confirm_without_deposit(p_request uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
begin
  if not private.has_role('{admin}') then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  select * into r from public.rental_requests where id = p_request for update;
  if not found or r.status <> 'accepted' or r.reacceptance_required then
    raise exception 'invalid status transition % -> confirmed', coalesce(r.status::text, 'unknown') using errcode = '42501';
  end if;
  update public.rental_requests
  set status = 'confirmed', deposit_waived_at = now(), deposit_waived_by = (select auth.uid()), deposit_waived_reason = trim(p_reason)
  where id = p_request;
  insert into public.admin_audit (actor, action, target_profile, request_id, reason)
  values ((select auth.uid()), 'confirm_without_deposit', r.user_id, p_request, trim(p_reason));
end;
$$;

-- Cancels an accepted or confirmed order. With a deposit invoice, staff choose how much to
-- credit (0 keeps it all, per the rental conditions); the refund itself is a payment.
create function public.cancel_order(p_request uuid, p_reason text, p_credit numeric default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  v_invoiced numeric;
  v_note uuid;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  select * into r from public.rental_requests where id = p_request for update;
  if not found or r.status not in ('accepted', 'confirmed') then
    raise exception 'invalid status transition % -> cancelled', coalesce(r.status::text, 'unknown') using errcode = '42501';
  end if;
  v_invoiced := private.invoiced_deposits(p_request);
  if coalesce(p_credit, 0) < 0 or coalesce(p_credit, 0) > v_invoiced or p_credit <> round(p_credit, 3) then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  update public.rental_requests set status = 'cancelled', cancelled_reason = trim(p_reason) where id = p_request;
  if coalesce(p_credit, 0) > 0 then
    v_note := private.issue_credit_note(p_request, p_credit, trim(p_reason));
  end if;
  perform private.recompute_payments(p_request);
  return jsonb_build_object('credit_note_id', v_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. What clients see: one view for /account and for the guest tracking link
-- ---------------------------------------------------------------------------

create table private.rate_limits (
  key text not null,
  at timestamptz not null default now()
);
create index rate_limits_key_idx on private.rate_limits (key, at);

-- True when the action may go ahead; records the attempt.
create function private.hit_limit(p_key text, p_max int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.rate_limits where key = p_key and at < now() - p_window;
  if (select count(*) from private.rate_limits where key = p_key) >= p_max then
    return false;
  end if;
  insert into private.rate_limits (key) values (p_key);
  return true;
end;
$$;

-- Unknown, malformed and rate-limited tokens all look the same: no request.
create function private.request_by_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  v_id uuid;
begin
  if length(coalesce(p_token, '')) not between 32 and 128 or not private.hit_limit('token:' || v_hash, 60, interval '1 minute') then
    return null;
  end if;
  select id into v_id from public.rental_requests where access_token_hash = v_hash;
  return v_id;
end;
$$;

create function private.client_view(p_request uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  q public.quotes;
  v_can_accept boolean;
  v_rate numeric;
  v_total numeric;
begin
  select * into r from public.rental_requests where id = p_request;
  select * into q from public.quotes where request_id = p_request order by revision desc limit 1;
  v_total := coalesce((q.snapshot ->> 'total')::numeric, r.total_ttc);
  v_rate := private.deposit_rate_for(r);
  v_can_accept := q.id is not null
    and (r.status = 'validated' or (r.status in ('accepted', 'confirmed') and r.reacceptance_required))
    and (q.snapshot ->> 'valid_until')::date >= private.local_today(r.country);
  return jsonb_build_object(
    'id', r.id, 'reference', r.reference, 'status', r.status, 'created_at', r.created_at,
    'customer_name', r.customer_name, 'event_type', r.event_type, 'event_venue', r.event_venue, 'guest_count', r.guest_count,
    'delivery_mode', r.delivery_mode, 'user_id', r.user_id,
    'payment_status', r.payment_status, 'total_ttc', v_total, 'paid_total', r.paid_total, 'owed', private.amount_owed(p_request),
    'deposit', jsonb_build_object('rate', v_rate, 'required', coalesce(r.deposit_required, private.deposit_amount(coalesce(v_total, 0), v_rate)),
      'paid', r.deposit_paid, 'due_at', r.deposit_due_at, 'deadline_hours', (private.company()).deposit_deadline_hours),
    'quote', case when q.id is null then null else jsonb_build_object('id', q.id, 'revision', q.revision, 'snapshot', q.snapshot) end,
    'quote_valid_until', r.quote_valid_until, 'can_accept', v_can_accept, 'reacceptance_required', r.reacceptance_required,
    'lines', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'title_fr', p.title_fr, 'title_en', p.title_en, 'title_ar', p.title_ar, 'quantity', l.quantity,
        'start_date', l.start_date, 'end_date', l.end_date, 'nights', l.nights, 'logistics_status', l.logistics_status) order by l.start_date, p.title_fr), '[]'::jsonb)
      from public.request_lines l join public.products p on p.id = l.product_id where l.request_id = p_request),
    'invoices', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'type', i.type, 'number', i.number, 'issued_at', i.issued_at, 'due_at', i.due_at, 'ttc', i.ttc, 'total_due', i.total_due
      ) order by i.issued_at), '[]'::jsonb) from public.invoices i where i.request_id = p_request),
    'payments', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', x.id, 'kind', x.kind, 'method', x.method, 'amount', x.amount, 'received_at', x.received_at, 'reference', x.reference
      ) order by x.received_at), '[]'::jsonb) from public.payments x where x.request_id = p_request and x.voided_at is null),
    'inspection', private.inspection_view(p_request),
    'company', public.company_payment_info()
  );
end;
$$;

create function public.my_request_view(p_request uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.rental_requests where id = p_request;
  if not found or (v_owner is distinct from (select auth.uid()) and not private.has_role('{manager,admin}')) then
    return null;
  end if;
  return private.client_view(p_request);
end;
$$;

-- The guest tracking link. Same answer for a wrong token and a rate-limited one.
create function public.track_request(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := private.request_by_token(p_token);
begin
  return case when v_id is null then null else private.client_view(v_id) end;
end;
$$;

create function public.accept_quote_by_token(
  p_token text, p_quote_id uuid, p_signer_name text, p_accepted_terms boolean, p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := private.request_by_token(p_token);
begin
  if v_id is null then
    raise exception 'not_found' using errcode = '42501';
  end if;
  return private.do_accept_quote(v_id, p_quote_id, p_signer_name, p_accepted_terms, 'online', p_user_agent, null);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Storage and grants
-- ---------------------------------------------------------------------------

-- Private: staff upload proofs; documents are written and streamed by the server only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs', 'payment-proofs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "payment proofs: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and (select private.has_role('{manager,admin}')));
create policy "payment proofs: staff insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (select private.has_role('{manager,admin}')));

grant execute on function public.accept_quote(uuid, uuid, text, boolean, text, text) to authenticated, service_role;
grant execute on function public.record_payment(uuid, text, text, numeric, timestamptz, text, text, text, uuid) to authenticated, service_role;
grant execute on function public.void_payment(uuid, text) to authenticated, service_role;
grant execute on function public.confirm_without_deposit(uuid, text) to authenticated, service_role;
grant execute on function public.cancel_order(uuid, text, numeric) to authenticated, service_role;
grant execute on function public.my_request_view(uuid) to authenticated, service_role;
grant execute on function public.track_request(text) to anon, authenticated, service_role;
grant execute on function public.accept_quote_by_token(text, uuid, text, boolean, text) to anon, authenticated, service_role;
