-- Invoices with TVA (2026-11-01). A deposit invoice is issued when a quote is accepted, a credit
-- note when an order is cancelled after one, a final invoice when the inspection closes.
-- Everything an invoice shows is frozen in its snapshot.
--
-- Since 1 January 2026 VAT-registered businesses must issue electronic invoices through Tunisia
-- TradeNet (TTN). There is no TTN integration: staff submit through their own TTN access and
-- record the outcome in ttn_status and ttn_reference.

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.rental_requests (id) on delete restrict,
  type text not null check (type in ('deposit', 'final', 'credit_note')),
  number text not null unique,
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  language text not null check (language in ('fr', 'en')),
  snapshot jsonb not null,
  -- This document's own amounts, for accounting: a final invoice leaves out what deposit
  -- invoices already billed, so a month's totals never count anything twice.
  ht numeric(14, 3) not null,
  tva numeric(14, 3) not null,
  ttc numeric(14, 3) not null,
  stamp numeric(12, 3) not null default 0,
  total_due numeric(14, 3) not null,
  pdf_path text,
  pdf_sha256 text,
  ttn_status text not null default 'not_sent' check (ttn_status in ('not_sent', 'sent', 'accepted', 'rejected')),
  ttn_reference text check (length(ttn_reference) <= 120),
  cancels_invoice_id uuid references public.invoices (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  check ((type = 'credit_note') = (cancels_invoice_id is not null))
);

create index invoices_request_idx on public.invoices (request_id);
create index invoices_issued_idx on public.invoices (issued_at desc);
create index invoices_cancels_idx on public.invoices (cancels_invoice_id);
create index invoices_created_by_idx on public.invoices (created_by);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  position int not null,
  label text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(14, 3),
  discount_percent numeric(5, 2),
  vat_rate numeric(5, 2),
  ht numeric(14, 3) not null,
  tva numeric(14, 3) not null,
  ttc numeric(14, 3) not null,
  unique (invoice_id, position)
);

alter table public.payments
  add constraint payments_invoice_fk foreign key (invoice_id) references public.invoices (id) on delete restrict;

-- An issued invoice never changes: only its TTN follow-up, and its PDF once.
create function private.guard_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'invoices rows are immutable' using errcode = '42501';
  end if;
  if (to_jsonb(new) - array['ttn_status', 'ttn_reference', 'pdf_path', 'pdf_sha256'])
     <> (to_jsonb(old) - array['ttn_status', 'ttn_reference', 'pdf_path', 'pdf_sha256']) then
    raise exception 'invoices rows are immutable' using errcode = '42501';
  end if;
  if (old.pdf_path is not null and new.pdf_path is distinct from old.pdf_path)
     or (old.pdf_sha256 is not null and new.pdf_sha256 is distinct from old.pdf_sha256) then
    raise exception 'an issued PDF never changes' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_invoice before update or delete on public.invoices
  for each row execute function private.guard_invoice();

create trigger invoice_lines_immutable before update or delete on public.invoice_lines
  for each row execute function private.forbid_change();

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

create policy "invoices: owner or staff read" on public.invoices
  for select to authenticated
  using (
    (select private.has_role('{manager,admin}'))
    or exists (select 1 from public.rental_requests r where r.id = request_id and r.user_id = (select auth.uid()))
  );
create policy "invoices: staff ttn update" on public.invoices
  for update to authenticated
  using ((select private.has_role('{manager,admin}'))) with check ((select private.has_role('{manager,admin}')));

create policy "invoice_lines: owner or staff read" on public.invoice_lines
  for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));

grant select on public.invoices, public.invoice_lines to authenticated;
grant update (ttn_status, ttn_reference) on public.invoices to authenticated;
grant all on public.invoices, public.invoice_lines to service_role;

create function private.invoice_seller(c public.company_settings)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'legal_name', c.legal_name, 'legal_form', c.legal_form, 'address', c.address, 'city', c.city, 'postal_code', c.postal_code,
    'tax_id', c.tax_id, 'rne', c.rne, 'phone', c.phone, 'email', c.email, 'bank_name', c.bank_name, 'rib', c.rib, 'iban', c.iban);
$$;

create function private.invoice_buyer(r public.rental_requests)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = r.user_id;
  return jsonb_build_object(
    'name', r.customer_name, 'company', r.company_name, 'email', r.customer_email, 'phone', r.customer_phone,
    'address', coalesce(r.billing_address, p.address, p.city, r.event_venue),
    'tax_id', coalesce(r.billing_tax_id, p.vat_number));
end;
$$;

-- Arabic clients get French: the invoice is a legal document.
create function private.invoice_language(r public.rental_requests)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v text;
begin
  select language into v from public.profiles where id = r.user_id;
  return case when coalesce(v, r.language) = 'en' then 'en' else 'fr' end;
end;
$$;

-- Splits a TTC amount across VAT rates in the proportions of `by_rate`. The largest share comes
-- last and takes what rounding left, so the parts add up exactly.
create function private.split_by_rate(p_amount numeric, p_by_rate jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_base numeric;
  v_left numeric := p_amount;
  v_rows jsonb := '[]'::jsonb;
  v_row jsonb;
  v_part numeric;
  v_i int := 0;
begin
  select sum((x ->> 'ttc')::numeric) into v_base from jsonb_array_elements(p_by_rate) x;
  for v_row in select x from jsonb_array_elements(p_by_rate) x order by (x ->> 'ttc')::numeric, (x ->> 'rate')::numeric loop
    v_i := v_i + 1;
    v_part := case when v_i = jsonb_array_length(p_by_rate) then v_left else round(p_amount * (v_row ->> 'ttc')::numeric / v_base, 3) end;
    v_left := v_left - v_part;
    v_rows := v_rows || (jsonb_build_object('rate', (v_row ->> 'rate')::numeric) || (private.vat_line(v_part, (v_row ->> 'rate')::numeric, true) - 'vat_rate'));
  end loop;
  return v_rows;
end;
$$;

-- Common to all three documents: number, snapshot, lines.
create function private.write_invoice(
  r public.rental_requests,
  p_type text,
  p_lines jsonb,
  p_by_rate jsonb,
  p_own jsonb,
  p_stamp numeric,
  p_due timestamptz,
  p_extra jsonb default '{}'::jsonb,
  p_cancels uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.company_settings := private.company();
  v_lang text := private.invoice_language(r);
  v_number text := private.next_number(case p_type when 'credit_note' then 'credit_note' else 'invoice' end);
  v_due numeric := (p_own ->> 'ttc')::numeric + p_stamp;
  v_id uuid;
begin
  insert into public.invoices (request_id, type, number, due_at, language, ht, tva, ttc, stamp, total_due, cancels_invoice_id, created_by, snapshot)
  values (r.id, p_type, v_number, p_due, v_lang, (p_own ->> 'ht')::numeric, (p_own ->> 'tva')::numeric, (p_own ->> 'ttc')::numeric,
    p_stamp, v_due, p_cancels, (select auth.uid()),
    jsonb_build_object(
      'type', p_type, 'number', v_number, 'language', v_lang, 'issued_at', now(), 'due_at', p_due,
      'reference', r.reference, 'seller', private.invoice_seller(c), 'buyer', private.invoice_buyer(r),
      'event', jsonb_build_object('type', r.event_type, 'venue', r.event_venue, 'guests', r.guest_count),
      'lines', p_lines, 'by_rate', p_by_rate, 'own_by_rate', p_by_rate,
      'totals', jsonb_build_object('ht', p_own -> 'ht', 'tva', p_own -> 'tva', 'ttc', p_own -> 'ttc', 'stamp', p_stamp, 'total_due', v_due),
      'amount_words', private.amount_words(v_due, v_lang),
      'legal_mentions', case v_lang when 'en' then coalesce(c.legal_mentions_en, c.legal_mentions_fr) else c.legal_mentions_fr end,
      'payment_terms', jsonb_build_object('due_at', p_due, 'bank_name', c.bank_name, 'rib', c.rib, 'iban', c.iban)
    ) || p_extra)
  returning id into v_id;

  insert into public.invoice_lines (invoice_id, position, label, quantity, unit_price, discount_percent, vat_rate, ht, tva, ttc)
  select v_id, ord::int,
    coalesce(l ->> ('label_' || v_lang), l ->> 'label_fr', l ->> 'label'),
    coalesce((l ->> 'quantity')::numeric, 1), (l ->> 'unit_price')::numeric, (l ->> 'discount_percent')::numeric,
    (l ->> 'vat_rate')::numeric, (l ->> 'ht')::numeric, (l ->> 'tva')::numeric, (l ->> 'ttc')::numeric
  from jsonb_array_elements(p_lines) with ordinality as t(l, ord);

  return v_id;
end;
$$;

-- "Acompte de 50 % sur devis CE-2026-00012 R1": one line, VAT split like the quote.
create function private.issue_deposit_invoice(p_request uuid, p_quote uuid, p_amount numeric, p_due timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  q public.quotes;
  c public.company_settings := private.company();
  v_by_rate jsonb;
  v_own jsonb;
  v_rate text;
begin
  perform private.assert_company_ready();
  select * into r from public.rental_requests where id = p_request;
  select * into q from public.quotes where id = p_quote;
  v_by_rate := private.split_by_rate(p_amount,
    coalesce(q.snapshot #> '{totals,by_rate}', jsonb_build_array(jsonb_build_object('rate', c.default_vat_rate, 'ttc', q.snapshot -> 'total'))));
  v_own := private.vat_totals((select jsonb_agg(x || jsonb_build_object('vat_rate', x -> 'rate')) from jsonb_array_elements(v_by_rate) x));
  v_rate := trim(trailing '.' from trim(trailing '0' from r.deposit_rate::text));
  return private.write_invoice(r, 'deposit',
    jsonb_build_array(jsonb_build_object(
      'label_fr', format('Acompte de %s %% sur devis %s R%s', v_rate, r.reference, q.revision),
      'label_en', format('%s%% deposit on quote %s R%s', v_rate, r.reference, q.revision),
      'quantity', 1, 'unit_price', p_amount, 'vat_rate', case when jsonb_array_length(v_by_rate) = 1 then v_by_rate #> '{0,rate}' end,
      'ht', v_own -> 'ht', 'tva', v_own -> 'tva', 'ttc', v_own -> 'ttc')),
    v_by_rate, v_own, c.stamp_duty, p_due,
    jsonb_build_object('quote', jsonb_build_object('id', q.id, 'revision', q.revision)));
end;
$$;

-- "Avoir": credits part or all of the deposit invoices when an order is cancelled.
create function private.issue_credit_note(p_request uuid, p_amount numeric, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rental_requests;
  d public.invoices;
  v_by_rate jsonb;
  v_own jsonb;
begin
  perform private.assert_company_ready();
  select * into r from public.rental_requests where id = p_request;
  select * into d from public.invoices where request_id = p_request and type = 'deposit' order by issued_at desc limit 1;
  v_by_rate := private.split_by_rate(p_amount, d.snapshot -> 'by_rate');
  v_own := private.vat_totals((select jsonb_agg(x || jsonb_build_object('vat_rate', x -> 'rate')) from jsonb_array_elements(v_by_rate) x));
  return private.write_invoice(r, 'credit_note',
    jsonb_build_array(jsonb_build_object(
      'label_fr', format('Avoir sur facture %s', d.number), 'label_en', format('Credit note for invoice %s', d.number),
      'quantity', 1, 'unit_price', p_amount, 'vat_rate', case when jsonb_array_length(v_by_rate) = 1 then v_by_rate #> '{0,rate}' end,
      'ht', v_own -> 'ht', 'tva', v_own -> 'tva', 'ttc', v_own -> 'ttc')),
    v_by_rate, v_own, 0, null,
    jsonb_build_object('reason', p_reason, 'cancels', d.number), d.id);
end;
$$;

-- The accountant's CSV reads the frozen VAT table of each document.
create view public.invoice_rates with (security_invoker = true) as
select i.id as invoice_id, (x ->> 'rate')::numeric as rate, (x ->> 'ht')::numeric as ht, (x ->> 'tva')::numeric as tva, (x ->> 'ttc')::numeric as ttc
from public.invoices i, jsonb_array_elements(i.snapshot -> 'own_by_rate') x;

grant select on public.invoice_rates to authenticated;
