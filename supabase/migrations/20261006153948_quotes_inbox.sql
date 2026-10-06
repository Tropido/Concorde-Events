-- Immutable quotes, the shared inbox (site / contact / WhatsApp tickets), favourites, CMS.

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.rental_requests (id) on delete restrict,
  revision int not null check (revision >= 1),
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles (id) on delete set null,
  snapshot jsonb not null,
  unique (request_id, revision)
);

create index quotes_issued_by_idx on public.quotes (issued_by);

create function private.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = '42501';
end;
$$;

create trigger quotes_immutable
  before update or delete on public.quotes
  for each row execute function private.forbid_change();

-- Staff: freeze the request into a numbered quote in the chosen document currency.
-- Everything the document shows is stored in the snapshot; later price, stock or FX
-- changes cannot alter it. Capacity is checked at commit (validated holds stock).
create function public.issue_quote(
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
  v_source public.currency_code;
  v_rate numeric;
  v_rate_source text;
  v_rate_time timestamptz;
  v_lines jsonb;
  v_total numeric;
  v_revision int;
  v_quote uuid;
  v_today date;
begin
  if not private.has_role('{manager,admin}') then
    raise exception 'staff only' using errcode = '42501';
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

  v_source := private.currency_of(r.country);
  v_today := private.local_today(r.country);
  select c.rate, c.source, c.rate_time into v_rate, v_rate_source, v_rate_time from private.current_rate() c;
  if p_currency <> v_source and v_rate is null then
    raise exception 'fx_unavailable' using errcode = 'P0001';
  end if;

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
      'unit_price', x.doc_unit,
      'line_total', x.doc_unit * x.quantity * x.nights
    ) order by x.start_date, x.title_fr),
    sum(x.doc_unit * x.quantity * x.nights)
  into v_lines, v_total
  from (
    select l.*, p.slug, p.title_fr, p.title_ar,
           private.convert(l.unit_price, v_source, p_currency, v_rate) as doc_unit
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
    'source_currency', v_source,
    'currency', p_currency,
    'fx', case when p_currency = v_source then null else jsonb_build_object(
      'rate_eur_tnd', v_rate, 'source', v_rate_source, 'rate_time', v_rate_time) end,
    'customer', jsonb_build_object(
      'name', r.customer_name, 'email', r.customer_email,
      'phone', r.customer_phone, 'company', r.company_name),
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

create type public.message_channel as enum ('site', 'contact', 'whatsapp');
create type public.message_status as enum ('open', 'in_progress', 'resolved');

-- One inbox for client messages, contact-form enquiries and manually logged WhatsApp tickets.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel public.message_channel not null,
  profile_id uuid references public.profiles (id) on delete set null,
  request_id uuid references public.rental_requests (id) on delete set null,
  name text check (length(name) <= 120),
  email text check (length(email) <= 254),
  phone text check (length(phone) <= 40),
  country public.country_code,
  subject text not null check (length(subject) between 1 and 200),
  body text not null check (length(body) between 1 and 5000),
  category text check (category in ('feedback', 'note', 'experience', 'quote_help', 'other')),
  rating int check (rating between 1 and 5),
  status public.message_status not null default 'open',
  assignee_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_profile_id_idx on public.messages (profile_id);
create index messages_request_id_idx on public.messages (request_id);
create index messages_assignee_id_idx on public.messages (assignee_id);
create index messages_status_idx on public.messages (status, created_at desc);
create index messages_email_created_idx on public.messages (lower(email), created_at);

create table public.message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (length(body) between 1 and 5000),
  -- Internal staff notes are never shown to the client.
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index message_replies_message_id_idx on public.message_replies (message_id);
create index message_replies_author_id_idx on public.message_replies (author_id);

create trigger touch_messages before update on public.messages
  for each row execute function private.touch_updated_at();

-- Public contact form. No direct table insert for anon; validated and throttled here.
create function public.submit_contact(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(payload ->> 'name', ''));
  v_email text := lower(trim(coalesce(payload ->> 'email', '')));
  v_phone text := nullif(trim(coalesce(payload ->> 'phone', '')), '');
  v_subject text := trim(coalesce(payload ->> 'subject', ''));
  v_body text := trim(coalesce(payload ->> 'body', ''));
  v_country public.country_code;
begin
  if length(v_name) not between 1 and 120 or length(v_email) > 254
     or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(coalesce(v_phone, '')) > 40
     or length(v_subject) not between 1 and 200 or length(v_body) not between 1 and 5000 then
    raise exception 'invalid_contact' using errcode = '22023';
  end if;
  if payload ->> 'country' in ('FR', 'TN') then
    v_country := (payload ->> 'country')::public.country_code;
  end if;
  -- ponytail: per-email throttle only; add an IP/bot check if spam appears.
  if (select count(*) from public.messages
      where lower(email) = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.messages (channel, profile_id, name, email, phone, country, subject, body, category)
  values ('contact', (select auth.uid()), v_name, v_email, v_phone, v_country, v_subject, v_body, 'other');
end;
$$;

create table public.favourites (
  profile_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, product_id)
);

create index favourites_product_id_idx on public.favourites (product_id);

-- Published homepage content per language. Missing keys fall back to dictionary copy.
create table public.cms_content (
  locale text primary key check (locale in ('fr', 'ar')),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

create trigger touch_cms before update on public.cms_content
  for each row execute function private.touch_updated_at();

alter table public.quotes enable row level security;
alter table public.messages enable row level security;
alter table public.message_replies enable row level security;
alter table public.favourites enable row level security;
alter table public.cms_content enable row level security;

create policy "quotes: owner or staff read" on public.quotes
  for select to authenticated
  using (
    (select private.has_role('{manager,admin}'))
    or exists (select 1 from public.rental_requests r
               where r.id = request_id and r.user_id = (select auth.uid()))
  );

create policy "messages: owner or staff read" on public.messages
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.has_role('{manager,admin}')));

create policy "messages: client sends own site message" on public.messages
  for insert to authenticated
  with check (
    channel = 'site' and profile_id = (select auth.uid()) and status = 'open' and assignee_id is null
    and (request_id is null or exists (
      select 1 from public.rental_requests r where r.id = request_id and r.user_id = (select auth.uid())))
  );

create policy "messages: staff insert" on public.messages
  for insert to authenticated
  with check ((select private.has_role('{manager,admin}')));

create policy "messages: staff update" on public.messages
  for update to authenticated
  using ((select private.has_role('{manager,admin}')))
  with check ((select private.has_role('{manager,admin}')));

create policy "replies: staff all, owner public replies" on public.message_replies
  for select to authenticated
  using (
    (select private.has_role('{manager,admin}'))
    or (not internal and exists (
      select 1 from public.messages m where m.id = message_id and m.profile_id = (select auth.uid())))
  );

create policy "replies: staff insert" on public.message_replies
  for insert to authenticated
  with check ((select private.has_role('{manager,admin}')) and author_id = (select auth.uid()));

create policy "replies: owner public reply" on public.message_replies
  for insert to authenticated
  with check (
    not internal and author_id = (select auth.uid())
    and exists (select 1 from public.messages m where m.id = message_id and m.profile_id = (select auth.uid()))
  );

create policy "favourites: owner" on public.favourites
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "cms: public read" on public.cms_content
  for select to anon, authenticated using (true);

create policy "cms: editors write" on public.cms_content
  for all to authenticated
  using ((select private.has_role('{editor,manager,admin}')))
  with check ((select private.has_role('{editor,manager,admin}')));
