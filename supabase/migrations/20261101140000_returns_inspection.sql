-- Returns inspected line by line (2026-11-01). Two steps after delivery:
--   receive_return     the equipment is back: quantities received, status returned
--   close_inspection   every unit sorted, stock moved, fees and caution settled, final invoice
-- Stock keeps being held until the inspection closes.

alter table public.request_lines
  add column logistics_status text not null default 'reserved'
    check (logistics_status in ('reserved', 'delivered', 'under_inspection', 'inspected')),
  add column received_qty int check (received_qty >= 0);

alter table public.rental_requests
  add column received_at timestamptz,
  add column received_by uuid references public.profiles (id) on delete set null;

create index rental_requests_received_by_idx on public.rental_requests (received_by);

-- Staff only, which is why they live here and not on the publicly readable products table.
alter table public.product_internal
  add column repair_fee numeric(12, 3) check (repair_fee >= 0),
  add column replacement_value numeric(12, 3) check (replacement_value >= 0);

-- Lines stay frozen once out; their logistics status is what changes. It only moves through the
-- functions below.
create or replace function private.guard_line()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.request_status;
begin
  select status into v_status from public.rental_requests where id = coalesce(new.request_id, old.request_id);
  if v_status in ('dispatched', 'returned', 'completed', 'cancelled', 'rejected')
     and (tg_op = 'DELETE' or new.quantity <> old.quantity or new.start_date <> old.start_date or new.end_date <> old.end_date) then
    raise exception 'lines of a % request cannot change', v_status using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.request_id <> old.request_id or new.product_id <> old.product_id
                           or new.unit_price <> old.unit_price) then
    raise exception 'line request, product and price are read-only' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and current_user in ('authenticated', 'anon')
     and (new.logistics_status, new.received_qty) is distinct from (old.logistics_status, old.received_qty) then
    raise exception 'line logistics are read-only' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

update public.request_lines l
set logistics_status = case r.status when 'dispatched' then 'delivered' else 'inspected' end
from public.rental_requests r
where r.id = l.request_id and r.status in ('dispatched', 'completed');

-- Delivery is a plain status change: the lines follow it.
create function private.lines_delivered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.request_lines set logistics_status = 'delivered' where request_id = new.id;
  return null;
end;
$$;

create trigger lines_delivered after update of status on public.rental_requests
  for each row when (new.status = 'dispatched' and old.status is distinct from 'dispatched')
  execute function private.lines_delivered();

-- ---------------------------------------------------------------------------
-- 1. Every stock change leaves a trace
-- ---------------------------------------------------------------------------

create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete restrict,
  delta_owned int not null default 0,
  delta_maintenance int not null default 0,
  reason text not null check (reason in ('touch_up', 'to_repair', 'to_write_off', 'lost', 'found', 'repaired', 'written_off')),
  request_id uuid references public.rental_requests (id) on delete set null,
  note text check (length(note) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_request_idx on public.stock_movements (request_id);
create index stock_movements_created_by_idx on public.stock_movements (created_by);

create trigger stock_movements_immutable before update or delete on public.stock_movements
  for each row execute function private.forbid_change();

-- Lost units are a fact, like damage: they are recorded even when they leave a future booking
-- short, and the conflict then shows on the overview.
create or replace function private.trg_capacity_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last date;
begin
  if current_setting('app.stock_fact', true) = '1' then
    return null;
  end if;
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

-- Equipment that is back is back: reception can't be refused because a booking elsewhere is short.
create or replace function private.trg_capacity_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'returned' then
    perform private.assert_request_capacity(new.id);
  end if;
  return null;
end;
$$;

create function private.move_stock(p_product uuid, p_owned int, p_maintenance int, p_reason text, p_request uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.stock_fact', '1', true);
  if p_owned <> 0 or p_maintenance <> 0 then
    update public.product_stock
    set quantity_owned = quantity_owned + p_owned,
        quantity_maintenance = greatest(0, least(quantity_maintenance + p_maintenance, quantity_owned + p_owned))
    where product_id = p_product and country = 'TN';
  end if;
  insert into public.stock_movements (product_id, delta_owned, delta_maintenance, reason, request_id, note, created_by)
  values (p_product, p_owned, p_maintenance, p_reason, p_request, p_note, (select auth.uid()));
end;
$$;

-- Repaired units return to service; written-off units leave the owned stock too.
create function public.resolve_maintenance(p_product uuid, p_qty int, p_outcome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_held int;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
  end if;
  select quantity_maintenance into v_held from public.product_stock where product_id = p_product and country = 'TN' for update;
  if p_qty is null or p_qty < 1 or p_qty > coalesce(v_held, 0) or p_outcome not in ('repaired', 'written_off') then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  perform private.move_stock(p_product, case p_outcome when 'written_off' then -p_qty else 0 end, -p_qty, p_outcome, null, null);
end;
$$;

-- A missing piece turned up after all.
create function public.record_found(p_product uuid, p_qty int, p_request uuid default null, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('{admin}') then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_qty is null or p_qty < 1 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  perform private.move_stock(p_product, p_qty, 0, 'found', p_request, left(p_note, 300));
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Reception
-- ---------------------------------------------------------------------------

create function public.receive_return(p_request uuid, p_lines jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  v_item jsonb;
  v_qty int;
  v_rows int;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
  end if;
  select * into r from public.rental_requests where id = p_request for update;
  if not found then
    raise exception 'unknown_request' using errcode = '22023';
  end if;
  if r.status <> 'dispatched' then
    raise exception 'invalid status transition % -> returned', r.status using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_lines, '[]'::jsonb)) <> 'array'
     or (select count(*) from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)))
        <> (select count(distinct e ->> 'line_id') from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) e) then
    raise exception 'duplicate_or_invalid_lines' using errcode = '22023';
  end if;

  -- A line that isn't mentioned came back whole.
  update public.request_lines set received_qty = quantity, logistics_status = 'under_inspection' where request_id = p_request;
  for v_item in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    if coalesce(v_item ->> 'received', '') !~ '^[0-9]{1,5}$' then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;
    v_qty := (v_item ->> 'received')::int;
    update public.request_lines set received_qty = v_qty
    where id = (v_item ->> 'line_id')::uuid and request_id = p_request and v_qty <= quantity;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'invalid_quantity' using errcode = '22023';
    end if;
  end loop;

  update public.rental_requests set status = 'returned', received_at = now(), received_by = (select auth.uid()) where id = p_request;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Inspection
-- ---------------------------------------------------------------------------

create table public.return_inspections (
  request_id uuid primary key references public.rental_requests (id) on delete restrict,
  closed_at timestamptz not null default now(),
  closed_by uuid references public.profiles (id) on delete set null,
  caution_outcome text not null check (caution_outcome in ('refund', 'retain', 'none')),
  caution_refunded numeric(12, 3) not null default 0,
  caution_retained numeric(12, 3) not null default 0,
  total_fees numeric(14, 3) not null default 0
);

create index return_inspections_closed_by_idx on public.return_inspections (closed_by);

create table public.return_inspection_lines (
  line_id uuid primary key references public.request_lines (id) on delete restrict,
  -- Deferred: the header is written last, once its totals are known, and never changes after.
  request_id uuid not null references public.return_inspections (request_id) on delete restrict deferrable initially deferred,
  sent int not null,
  received int not null,
  ok int not null default 0 check (ok >= 0),
  minor int not null default 0 check (minor >= 0),
  damaged int not null default 0 check (damaged >= 0),
  broken int not null default 0 check (broken >= 0),
  missing int not null default 0 check (missing >= 0),
  fee numeric(12, 3) not null default 0 check (fee >= 0),
  fee_reason text check (length(fee_reason) <= 300),
  -- Internal: never shown to the client.
  note text check (length(note) <= 1000),
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 6),
  photos_visible boolean not null default false,
  check (ok + minor + damaged + broken + missing = sent)
);

create index return_inspection_lines_request_idx on public.return_inspection_lines (request_id);

create trigger return_inspections_immutable before update or delete on public.return_inspections
  for each row execute function private.forbid_change();
create trigger return_inspection_lines_immutable before update or delete on public.return_inspection_lines
  for each row execute function private.forbid_change();

-- Work in progress, so an inspection can be left and picked up again.
create table public.inspection_drafts (
  request_id uuid primary key references public.rental_requests (id) on delete cascade,
  draft jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create index inspection_drafts_updated_by_idx on public.inspection_drafts (updated_by);

create trigger touch_inspection_drafts before update on public.inspection_drafts
  for each row execute function private.touch_updated_at();

-- Every rental line and extra from the accepted quote, plus damage fees, minus what deposit
-- invoices already billed. Quotes from before invoicing carry no VAT, so it is worked out here.
create function private.issue_final_invoice(p_request uuid, p_fees jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  q public.quotes;
  c public.company_settings := private.company();
  v_includes boolean;
  v_lines jsonb;
  v_gross jsonb;
  v_own_rates jsonb;
  v_own jsonb;
  v_deductions jsonb;
  v_deposits numeric;
  v_retained numeric;
  v_issued numeric;
  v_due numeric;
begin
  perform private.assert_company_ready();
  select * into r from public.rental_requests where id = p_request;
  select * into q from public.quotes where id = r.accepted_quote_id;
  if not found then
    select * into q from public.quotes where request_id = p_request order by revision desc limit 1;
  end if;
  v_includes := coalesce((q.snapshot ->> 'prices_include_vat')::boolean, c.prices_include_vat);

  select coalesce(jsonb_agg(
    jsonb_build_object('label_fr', x.l ->> 'title_fr', 'label_en', coalesce(x.l ->> 'title_en', x.l ->> 'title_fr'), 'quantity', x.l -> 'quantity', 'nights', x.l -> 'nights',
      'unit_price', x.l -> 'unit_price', 'discount_percent', nullif(coalesce((q.snapshot ->> 'discount_percent')::numeric, 0), 0))
    || case when x.l ? 'vat_rate' then jsonb_build_object('vat_rate', x.l -> 'vat_rate', 'ht', x.l -> 'ht', 'tva', x.l -> 'tva', 'ttc', x.l -> 'ttc')
            else private.vat_line((x.l ->> 'line_total')::numeric, c.default_vat_rate, v_includes) end
    order by x.ord), '[]'::jsonb)
  into v_lines
  from jsonb_array_elements(q.snapshot -> 'lines') with ordinality as x(l, ord);

  v_lines := v_lines || coalesce((
    select jsonb_agg(jsonb_build_object('label_fr', e ->> 'label', 'label_en', e ->> 'label', 'quantity', e -> 'quantity', 'unit_price', e -> 'unit_price',
      'vat_rate', e -> 'vat_rate', 'ht', e -> 'ht', 'tva', e -> 'tva', 'ttc', e -> 'ttc'))
    from jsonb_array_elements(q.snapshot -> 'extras') e), '[]'::jsonb);

  -- Damage fees are what the client pays, so always TTC.
  v_lines := v_lines || coalesce((
    select jsonb_agg(jsonb_build_object(
      'label_fr', format('Remise en état : %s (%s)', f ->> 'title_fr', f ->> 'reason'),
      'label_en', format('Repair: %s (%s)', coalesce(f ->> 'title_en', f ->> 'title_fr'), f ->> 'reason'), 'quantity', 1, 'unit_price', f -> 'fee')
      || private.vat_line((f ->> 'fee')::numeric, c.default_vat_rate, true))
    from jsonb_array_elements(p_fees) f), '[]'::jsonb);

  v_gross := private.vat_totals(v_lines);

  select coalesce(jsonb_agg(jsonb_build_object('number', d.number, 'ttc', d.ttc) order by d.issued_at), '[]'::jsonb),
         coalesce(sum(d.total_due), 0)
  into v_deductions, v_deposits
  from public.invoices d where d.request_id = p_request and d.type = 'deposit';

  -- This invoice's own amounts per rate: the full amounts, less what deposit invoices billed.
  select coalesce(jsonb_agg(jsonb_build_object('rate', g.rate, 'vat_rate', g.rate, 'ht', g.ht - g.dht, 'tva', g.tva - g.dtva, 'ttc', g.ttc - g.dttc) order by g.rate), '[]'::jsonb)
  into v_own_rates
  from (
    select coalesce(a.rate, b.rate) as rate, coalesce(a.ht, 0) as ht, coalesce(a.tva, 0) as tva, coalesce(a.ttc, 0) as ttc,
           coalesce(b.ht, 0) as dht, coalesce(b.tva, 0) as dtva, coalesce(b.ttc, 0) as dttc
    from (
      select (x ->> 'rate')::numeric as rate, (x ->> 'ht')::numeric as ht, (x ->> 'tva')::numeric as tva, (x ->> 'ttc')::numeric as ttc
      from jsonb_array_elements(v_gross -> 'by_rate') x
    ) a
    full join (
      select (x ->> 'rate')::numeric as rate, sum((x ->> 'ht')::numeric) as ht, sum((x ->> 'tva')::numeric) as tva, sum((x ->> 'ttc')::numeric) as ttc
      from public.invoices d, jsonb_array_elements(d.snapshot -> 'by_rate') x
      where d.request_id = p_request and d.type = 'deposit'
      group by 1
    ) b on a.rate = b.rate
  ) g;
  v_own := private.vat_totals(v_own_rates);

  select coalesce(sum(amount), 0) into v_retained from public.payments where request_id = p_request and voided_at is null and kind = 'caution_retained';
  select coalesce(sum(case when type = 'credit_note' then -total_due else total_due end), 0) into v_issued from public.invoices where request_id = p_request;
  v_due := (v_own ->> 'ttc')::numeric + c.stamp_duty;

  return private.write_invoice(r, 'final', v_lines, v_gross -> 'by_rate', v_own, c.stamp_duty,
    now() + make_interval(days => c.invoice_due_days_balance),
    jsonb_build_object(
      'quote', jsonb_build_object('id', q.id, 'revision', q.revision),
      'gross', jsonb_build_object('ht', v_gross -> 'ht', 'tva', v_gross -> 'tva', 'ttc', v_gross -> 'ttc'),
      'deductions', v_deductions,
      'own_by_rate', v_own_rates,
      -- Received beyond the deposit invoices above; negative when part of those is still unpaid.
      'paid', r.paid_total - v_retained - v_deposits,
      'caution_retained', v_retained,
      'net_to_pay', v_issued + v_due - r.paid_total));
end;
$$;

create function public.close_inspection(p_request uuid, p_lines jsonb, p_caution jsonb default '{"outcome": "none"}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  l record;
  v_item jsonb;
  v_ok int; v_minor int; v_damaged int; v_broken int; v_missing int;
  v_fee numeric;
  v_reason text;
  v_total_fees numeric := 0;
  v_fees jsonb := '[]'::jsonb;
  v_photos text[];
  v_outcome text := coalesce(p_caution ->> 'outcome', 'none');
  v_held numeric;
  v_method text;
  v_retained numeric := 0;
  v_refunded numeric := 0;
  v_invoice uuid;
  v_status text;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
  end if;
  select * into r from public.rental_requests where id = p_request for update;
  if not found then
    raise exception 'unknown_request' using errcode = '22023';
  end if;
  if r.status <> 'returned' then
    raise exception 'invalid status transition % -> completed', r.status using errcode = '42501';
  end if;
  perform private.assert_company_ready();
  if jsonb_typeof(p_lines) <> 'array'
     or (select count(*) from jsonb_array_elements(p_lines)) <> (select count(distinct e ->> 'line_id') from jsonb_array_elements(p_lines) e)
     or jsonb_array_length(p_lines) <> (select count(*) from public.request_lines where request_id = p_request) then
    raise exception 'inspection_sum_mismatch' using errcode = '22023';
  end if;
  if v_outcome not in ('refund', 'retain', 'none') then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  for l in
    select rl.id, rl.product_id, rl.quantity, coalesce(rl.received_qty, rl.quantity) as received, p.title_fr, p.title_en
    from public.request_lines rl join public.products p on p.id = rl.product_id
    where rl.request_id = p_request
  loop
    select e into v_item from jsonb_array_elements(p_lines) e where e ->> 'line_id' = l.id::text;
    if not found then
      raise exception 'inspection_sum_mismatch' using errcode = '22023';
    end if;
    begin
      v_ok := coalesce((v_item ->> 'ok')::int, 0);
      v_minor := coalesce((v_item ->> 'minor')::int, 0);
      v_damaged := coalesce((v_item ->> 'damaged')::int, 0);
      v_broken := coalesce((v_item ->> 'broken')::int, 0);
      v_missing := coalesce((v_item ->> 'missing')::int, 0);
      v_fee := coalesce((v_item ->> 'fee')::numeric, 0);
    exception when others then
      raise exception 'inspection_sum_mismatch' using errcode = '22023';
    end;
    -- What didn't come back can't be anything but missing.
    if least(v_ok, v_minor, v_damaged, v_broken, v_missing) < 0
       or v_ok + v_minor + v_damaged + v_broken + v_missing <> l.quantity
       or v_missing < l.quantity - l.received then
      raise exception 'inspection_sum_mismatch' using errcode = '22023';
    end if;
    v_reason := nullif(trim(coalesce(v_item ->> 'fee_reason', '')), '');
    if v_fee < 0 or v_fee <> round(v_fee, 3) or (v_fee > 0 and v_reason is null) then
      raise exception 'invalid_amount' using errcode = '22023';
    end if;
    v_photos := array(select jsonb_array_elements_text(coalesce(v_item -> 'photos', '[]'::jsonb)));

    insert into public.return_inspection_lines
      (line_id, request_id, sent, received, ok, minor, damaged, broken, missing, fee, fee_reason, note, photo_paths, photos_visible)
    values (l.id, p_request, l.quantity, l.received, v_ok, v_minor, v_damaged, v_broken, v_missing, v_fee, v_reason,
            nullif(trim(coalesce(v_item ->> 'note', '')), ''), v_photos, coalesce((v_item ->> 'photos_visible')::boolean, false));

    update public.request_lines set logistics_status = 'inspected' where id = l.id;

    if v_minor > 0 then
      perform private.move_stock(l.product_id, 0, 0, 'touch_up', p_request, format('Retouche : %s unité(s)', v_minor));
    end if;
    if v_damaged > 0 then
      perform private.move_stock(l.product_id, 0, v_damaged, 'to_repair', p_request, null);
    end if;
    if v_broken > 0 then
      perform private.move_stock(l.product_id, 0, v_broken, 'to_write_off', p_request, null);
    end if;
    if v_missing > 0 then
      perform private.move_stock(l.product_id, -v_missing, 0, 'lost', p_request, null);
    end if;

    if v_fee > 0 then
      v_total_fees := v_total_fees + v_fee;
      v_fees := v_fees || jsonb_build_object('title_fr', l.title_fr, 'title_en', l.title_en, 'fee', v_fee, 'reason', v_reason);
    end if;
  end loop;

  -- The caution: refunded, or kept to settle damage fees and the rest refunded. A held caution
  -- must be decided here; it never stays in limbo after the file is closed.
  select coalesce(sum(case when kind = 'caution_held' then amount else -amount end), 0) into v_held
  from public.payments where request_id = p_request and voided_at is null and kind in ('caution_held', 'caution_refund', 'caution_retained');
  select method into v_method from public.payments
  where request_id = p_request and voided_at is null and kind = 'caution_held' order by received_at desc limit 1;

  if v_outcome = 'none' and v_held > 0 then
    raise exception 'caution_unresolved' using errcode = '22023';
  end if;
  if v_outcome = 'refund' and v_held = 0 then
    v_outcome := 'none';
  end if;
  if v_outcome = 'retain' then
    v_retained := coalesce((p_caution ->> 'amount')::numeric, 0);
    if v_retained <= 0 or v_retained > v_held or v_retained > v_total_fees or v_retained <> round(v_retained, 3) then
      raise exception 'invalid_amount' using errcode = '22023';
    end if;
    insert into public.payments (request_id, kind, method, amount, recorded_by) values (p_request, 'caution_retained', v_method, v_retained, (select auth.uid()));
  end if;
  v_refunded := case when v_outcome = 'none' then 0 else v_held - v_retained end;
  if v_refunded > 0 then
    insert into public.payments (request_id, kind, method, amount, recorded_by) values (p_request, 'caution_refund', v_method, v_refunded, (select auth.uid()));
  end if;
  perform private.recompute_payments(p_request);

  insert into public.return_inspections (request_id, closed_by, caution_outcome, total_fees, caution_retained, caution_refunded)
  values (p_request, (select auth.uid()), v_outcome, v_total_fees, v_retained, v_refunded);

  v_invoice := private.issue_final_invoice(p_request, v_fees);
  delete from public.inspection_drafts where request_id = p_request;
  update public.rental_requests set status = 'completed' where id = p_request;
  perform private.recompute_payments(p_request);

  select payment_status into v_status from public.rental_requests where id = p_request;
  return jsonb_build_object('invoice_id', v_invoice, 'total_fees', v_total_fees, 'caution_retained', v_retained, 'caution_refunded', v_refunded,
    'payment_status', v_status, 'net_to_pay', private.amount_owed(p_request) - (select paid_total from public.rental_requests where id = p_request));
end;
$$;

-- What the client sees of an inspection: no internal notes, photos only if staff ticked them.
create function private.inspection_view(p_request uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'closed_at', i.closed_at, 'caution_outcome', i.caution_outcome, 'caution_retained', i.caution_retained, 'caution_refunded', i.caution_refunded, 'total_fees', i.total_fees,
    'lines', (select coalesce(jsonb_agg(jsonb_build_object(
        'line_id', x.line_id, 'title_fr', p.title_fr, 'title_en', p.title_en, 'title_ar', p.title_ar, 'sent', x.sent, 'received', x.received, 'ok', x.ok, 'minor', x.minor,
        'damaged', x.damaged, 'broken', x.broken, 'missing', x.missing, 'fee', x.fee, 'fee_reason', x.fee_reason,
        'photos', case when x.photos_visible then to_jsonb(x.photo_paths) else '[]'::jsonb end
      ) order by p.title_fr), '[]'::jsonb)
      from public.return_inspection_lines x
      join public.request_lines l on l.id = x.line_id
      join public.products p on p.id = l.product_id
      where x.request_id = i.request_id))
  from public.return_inspections i
  where i.request_id = p_request;
$$;

-- ---------------------------------------------------------------------------
-- 4. Points: earned once a rental is both completed and paid, whichever comes last
-- ---------------------------------------------------------------------------

drop trigger award_completion_points on public.rental_requests;

create or replace function private.award_completion_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric;
begin
  if new.status = 'completed' and new.payment_status = 'paid'
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

create trigger award_completion_points after update of status, payment_status on public.rental_requests
  for each row execute function private.award_completion_points();

-- ---------------------------------------------------------------------------
-- 5. The old one-step return is gone: returned and completed have their own functions
-- ---------------------------------------------------------------------------

drop function public.return_request(uuid, jsonb);

-- ---------------------------------------------------------------------------
-- 6. Row level security, storage, grants
-- ---------------------------------------------------------------------------

alter table public.stock_movements enable row level security;
alter table public.return_inspections enable row level security;
alter table public.return_inspection_lines enable row level security;
alter table public.inspection_drafts enable row level security;

-- Staff only: clients read their inspection through my_request_view / track_request.
create policy "stock_movements: staff read" on public.stock_movements
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "return_inspections: staff read" on public.return_inspections
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "return_inspection_lines: staff read" on public.return_inspection_lines
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "inspection_drafts: staff read" on public.inspection_drafts
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "inspection_drafts: staff insert" on public.inspection_drafts
  for insert to authenticated with check ((select private.has_role('{manager,admin}')));
create policy "inspection_drafts: staff update" on public.inspection_drafts
  for update to authenticated
  using ((select private.has_role('{manager,admin}'))) with check ((select private.has_role('{manager,admin}')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-photos', 'inspection-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "inspection photos: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'inspection-photos' and (select private.has_role('{manager,admin}')));
create policy "inspection photos: staff insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inspection-photos' and (select private.has_role('{manager,admin}')));

grant select on public.stock_movements, public.return_inspections, public.return_inspection_lines to authenticated;
grant select, insert, update on public.inspection_drafts to authenticated;
grant all on public.stock_movements, public.return_inspections, public.return_inspection_lines, public.inspection_drafts to service_role;
grant usage, select on sequence public.stock_movements_id_seq to service_role;

grant execute on function public.receive_return(uuid, jsonb) to authenticated, service_role;
grant execute on function public.close_inspection(uuid, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.resolve_maintenance(uuid, int, text) to authenticated, service_role;
grant execute on function public.record_found(uuid, int, uuid, text) to authenticated, service_role;
