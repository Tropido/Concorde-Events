-- Everything invoices depend on (2026-11-01): the company's legal identity and money rules, the
-- gapless document counters, VAT arithmetic, amounts in words and extra quote lines. All the
-- money defaults here are provisional and marked as such in PROJECT_SPEC.md.

-- ---------------------------------------------------------------------------
-- 1. Company settings (one row)
-- ---------------------------------------------------------------------------

create table public.company_settings (
  id boolean primary key default true check (id),
  legal_name text not null default '' check (length(legal_name) <= 160),
  legal_form text check (length(legal_form) <= 80),
  address text check (length(address) <= 240),
  city text check (length(city) <= 80),
  postal_code text check (length(postal_code) <= 12),
  -- Matricule fiscal. Invoices refuse to be issued while this or the legal name is empty.
  tax_id text not null default '' check (length(tax_id) <= 40),
  rne text check (length(rne) <= 40),
  phone text check (length(phone) <= 40),
  email text check (length(email) <= 254),
  bank_name text check (length(bank_name) <= 120),
  rib text check (length(rib) <= 40),
  iban text check (length(iban) <= 40),
  logo_url text check (length(logo_url) <= 1000),
  prices_include_vat boolean not null default true,
  default_vat_rate numeric(5, 2) not null default 19 check (default_vat_rate between 0 and 100),
  stamp_duty numeric(12, 3) not null default 1.000 check (stamp_duty >= 0),
  deposit_rate numeric(5, 2) not null default 50 check (deposit_rate between 0 and 100),
  deposit_deadline_hours int not null default 72 check (deposit_deadline_hours between 1 and 2160),
  invoice_due_days_deposit int not null default 0 check (invoice_due_days_deposit between 0 and 365),
  invoice_due_days_balance int not null default 7 check (invoice_due_days_balance between 0 and 365),
  legal_mentions_fr text check (length(legal_mentions_fr) <= 1000),
  legal_mentions_en text check (length(legal_mentions_en) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

insert into public.company_settings default values;

create index company_settings_updated_by_idx on public.company_settings (updated_by);

create trigger touch_company_settings before update on public.company_settings
  for each row execute function private.touch_updated_at();

alter table public.company_settings enable row level security;

create policy "company_settings: staff read" on public.company_settings
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "company_settings: admin update" on public.company_settings
  for update to authenticated
  using ((select private.has_role('{admin}'))) with check ((select private.has_role('{admin}')));

grant select, update on public.company_settings to authenticated;
grant all on public.company_settings to service_role;

create function private.company()
returns public.company_settings
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.company_settings where id;
$$;

-- What a client needs to pay: readable from the quote and tracking screens.
create function public.company_payment_info()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('legal_name', c.legal_name, 'bank_name', c.bank_name, 'rib', c.rib, 'iban', c.iban, 'phone', c.phone, 'email', c.email)
  from public.company_settings c where c.id;
$$;

create function private.assert_company_ready()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.company_settings := private.company();
begin
  if trim(c.legal_name) = '' or trim(c.tax_id) = '' then
    raise exception 'company_settings_incomplete' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Client and request fields invoices need
-- ---------------------------------------------------------------------------

alter table public.profiles add column address text check (length(address) <= 240);

alter table public.rental_requests
  add column billing_address text check (length(billing_address) <= 240),
  add column billing_tax_id text check (length(billing_tax_id) <= 40);

-- Negotiated deposit rate for one client (staff only, like the rest of client_notes).
alter table public.client_notes
  add column deposit_rate_override numeric(5, 2) check (deposit_rate_override between 0 and 100);

-- null: the default rate when the quote is issued.
alter table public.request_lines add column vat_rate numeric(5, 2) check (vat_rate between 0 and 100);

-- Livraison, Installation, Reprise, Remise, Autre: frozen into the quote when it is issued.
create table public.request_extras (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.rental_requests (id) on delete cascade,
  kind text not null check (kind in ('delivery', 'installation', 'collection', 'discount', 'other')),
  label text not null check (length(trim(label)) between 1 and 120),
  quantity int not null default 1 check (quantity between 1 and 10000),
  -- TTC when prices include VAT, HT otherwise. Only a discount is negative.
  unit_price numeric(12, 3) not null check (unit_price <> 0),
  vat_rate numeric(5, 2) not null default 19 check (vat_rate between 0 and 100),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check ((kind = 'discount') = (unit_price < 0))
);

create index request_extras_request_idx on public.request_extras (request_id);
create index request_extras_created_by_idx on public.request_extras (created_by);

alter table public.request_extras enable row level security;

create policy "request_extras: staff read" on public.request_extras
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "request_extras: staff insert" on public.request_extras
  for insert to authenticated with check ((select private.has_role('{manager,admin}')));
create policy "request_extras: staff update" on public.request_extras
  for update to authenticated
  using ((select private.has_role('{manager,admin}'))) with check ((select private.has_role('{manager,admin}')));
create policy "request_extras: staff delete" on public.request_extras
  for delete to authenticated using ((select private.has_role('{manager,admin}')));

grant select, insert, update, delete on public.request_extras to authenticated;
grant all on public.request_extras to service_role;

-- ---------------------------------------------------------------------------
-- 3. Actions that must leave a trace
-- ---------------------------------------------------------------------------

create table public.admin_audit (
  id bigint generated always as identity primary key,
  actor uuid references public.profiles (id) on delete set null,
  action text not null check (length(action) between 1 and 60),
  target_profile uuid references public.profiles (id) on delete set null,
  request_id uuid references public.rental_requests (id) on delete set null,
  channel text check (length(channel) <= 20),
  masked_destination text check (length(masked_destination) <= 120),
  reason text check (length(reason) <= 500),
  created_at timestamptz not null default now()
);

create index admin_audit_target_idx on public.admin_audit (target_profile, created_at desc);
create index admin_audit_request_idx on public.admin_audit (request_id);
create index admin_audit_actor_idx on public.admin_audit (actor);

create trigger admin_audit_immutable before update or delete on public.admin_audit
  for each row execute function private.forbid_change();

alter table public.admin_audit enable row level security;

create policy "admin_audit: staff read" on public.admin_audit
  for select to authenticated using ((select private.has_role('{manager,admin}')));

grant select on public.admin_audit to authenticated;
grant all on public.admin_audit to service_role;
grant usage, select on sequence public.admin_audit_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- 4. Gapless numbering
-- ---------------------------------------------------------------------------

create table public.document_counters (
  kind text not null check (kind in ('invoice', 'credit_note')),
  year int not null,
  last int not null default 0,
  primary key (kind, year)
);

alter table public.document_counters enable row level security;
-- No policy and no grant: only the issuing functions touch it.

-- The upsert locks the counter row until the transaction ends, so numbers come out one by one,
-- and a rolled-back issue gives its number back. Sequences would leave gaps.
create function private.next_number(p_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year int := extract(year from now() at time zone 'Africa/Tunis');
  v_last int;
begin
  insert into public.document_counters (kind, year, last) values (p_kind, v_year, 1)
  on conflict (kind, year) do update set last = public.document_counters.last + 1
  returning last into v_last;
  return case p_kind when 'credit_note' then 'AV' else 'F' end || '-' || v_year || '-' || lpad(v_last::text, 5, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. VAT arithmetic: the one place amounts are split
-- ---------------------------------------------------------------------------

-- Rounded half-up to the millime. From TTC: HT is rounded and TVA is the difference, so
-- HT + TVA is always exactly the TTC the client pays.
create function private.vat_line(p_amount numeric, p_rate numeric, p_includes boolean)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_ht numeric;
  v_ttc numeric;
begin
  if p_includes then
    v_ttc := round(p_amount, 3);
    v_ht := round(v_ttc / (1 + p_rate / 100), 3);
  else
    v_ht := round(p_amount, 3);
    v_ttc := v_ht + round(v_ht * p_rate / 100, 3);
  end if;
  return jsonb_build_object('vat_rate', p_rate, 'ht', v_ht, 'tva', v_ttc - v_ht, 'ttc', v_ttc);
end;
$$;

-- Totals of lines carrying vat_rate, ht, tva and ttc, with one row per rate.
create function private.vat_totals(p_lines jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'ht', coalesce(sum(x.ht), 0),
    'tva', coalesce(sum(x.tva), 0),
    'ttc', coalesce(sum(x.ttc), 0),
    'by_rate', coalesce(jsonb_agg(jsonb_build_object('rate', x.rate, 'ht', x.ht, 'tva', x.tva, 'ttc', x.ttc) order by x.rate), '[]'::jsonb))
  from (
    select (l ->> 'vat_rate')::numeric as rate, sum((l ->> 'ht')::numeric) as ht,
           sum((l ->> 'tva')::numeric) as tva, sum((l ->> 'ttc')::numeric) as ttc
    from jsonb_array_elements(p_lines) l
    group by 1
  ) x;
$$;

-- Rounded up to the millime, so what is received is never a fraction under the rate.
create function private.deposit_amount(p_total numeric, p_rate numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(ceil(p_total * p_rate / 100 * 1000) / 1000, 3);
$$;

-- ---------------------------------------------------------------------------
-- 6. Amounts in words, frozen into each invoice
-- ---------------------------------------------------------------------------

-- p_final: nothing follows, so "quatre-vingts" and "deux cents" take their s.
create function private.fr_below_1000(n int, p_final boolean)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  u text[] := array['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
                    'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  t text[] := array['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
  h int := n / 100;
  r int := n % 100;
  d int := r / 10;
  o int := r % 10;
  v_rest text;
  v_head text;
begin
  v_rest := case
    when r < 20 then u[r + 1]
    when d <= 6 then t[d + 1] || case when o = 1 then ' et un' when o > 0 then '-' || u[o + 1] else '' end
    when d = 7 then 'soixante' || case when o = 1 then ' et onze' else '-' || u[11 + o] end
    when d = 8 then 'quatre-vingt' || case when o > 0 then '-' || u[o + 1] when p_final then 's' else '' end
    else 'quatre-vingt-' || u[11 + o]
  end;
  if h = 0 then
    return v_rest;
  end if;
  v_head := case when h = 1 then 'cent' else u[h + 1] || ' cent' end;
  if r = 0 then
    return v_head || case when h > 1 and p_final then 's' else '' end;
  end if;
  return v_head || ' ' || v_rest;
end;
$$;

create function private.en_below_1000(n int)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  u text[] := array['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
                    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  t text[] := array['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  h int := n / 100;
  r int := n % 100;
  v_rest text;
begin
  v_rest := case when r < 20 then u[r + 1] else t[r / 10 + 1] || case when r % 10 > 0 then '-' || u[r % 10 + 1] else '' end end;
  if h = 0 then
    return v_rest;
  end if;
  return u[h + 1] || ' hundred' || case when r > 0 then ' and ' || v_rest else '' end;
end;
$$;

create function private.number_words(n bigint, p_lang text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  m int := n / 1000000;
  k int := (n % 1000000) / 1000;
  r int := n % 1000;
  v_parts text[] := '{}';
begin
  if n = 0 then
    return case p_lang when 'en' then 'zero' else 'zéro' end;
  end if;
  if p_lang = 'en' then
    if m > 0 then v_parts := v_parts || (private.en_below_1000(m) || ' million'); end if;
    if k > 0 then v_parts := v_parts || (private.en_below_1000(k) || ' thousand'); end if;
    if r > 0 then v_parts := v_parts || (case when r < 100 and (m > 0 or k > 0) then 'and ' else '' end || private.en_below_1000(r)); end if;
  else
    if m > 0 then v_parts := v_parts || (private.fr_below_1000(m, true) || ' million' || case when m > 1 then 's' else '' end); end if;
    if k = 1 then v_parts := v_parts || 'mille'::text;
    elsif k > 0 then v_parts := v_parts || (private.fr_below_1000(k, false) || ' mille'); end if;
    if r > 0 then v_parts := v_parts || private.fr_below_1000(r, true); end if;
  end if;
  return array_to_string(v_parts, ' ');
end;
$$;

-- "mille deux cent cinquante dinars et huit cent cinquante millimes"
create function private.amount_words(p_amount numeric, p_lang text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_dinars bigint := floor(p_amount);
  v_millimes bigint := round((p_amount - floor(p_amount)) * 1000);
  v_and text := case p_lang when 'en' then ' and ' else ' et ' end;
begin
  return private.number_words(v_dinars, p_lang) || ' dinar' || case when v_dinars > 1 or (v_dinars = 0 and p_lang = 'en') then 's' else '' end
    || case when v_millimes > 0
         then v_and || private.number_words(v_millimes, p_lang) || ' millime' || case when v_millimes > 1 then 's' else '' end
         else '' end;
end;
$$;

grant execute on function public.company_payment_info() to authenticated, service_role;
