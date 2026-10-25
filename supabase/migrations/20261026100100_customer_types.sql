-- Three customer types (owner decisions, 2026-10-26):
--   * customer       "Particulier": no prices anywhere; active once the email is confirmed.
--   * customer_plus  "Particulier+": sees the public (retail) prices; approved by staff.
--   * professional   unchanged: pro prices and programme; approved by staff.
-- Visitors are treated like a Particulier. Requests are still priced on the server for every
-- type (submit_request / issue_quote read prices with definer rights) and an issued quote
-- always shows its amounts: the quote is how a Particulier learns the price.

-- ---------------------------------------------------------------------------
-- 1. Who reads retail prices
-- ---------------------------------------------------------------------------

-- Pending professionals keep seeing retail (they pay it until approved), like before.
create function private.can_see_retail(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and (
        (p.role = 'customer_plus' and p.status = 'approved')
        or (p.role = 'professional' and p.status in ('pending', 'approved'))
        or (p.role in ('editor', 'manager', 'admin') and p.status = 'approved')
      )
  );
$$;
grant execute on function private.can_see_retail(uuid) to authenticated, service_role;

drop policy "prices: retail public, pro for approved pros and staff" on public.product_prices;
create policy "prices: retail for Particulier+, pros and staff; pro for approved pros and staff" on public.product_prices
  for select to authenticated
  using (
    (tier = 'retail' and (select private.can_see_retail((select auth.uid()))))
    or (select private.has_role('{professional,manager,admin}'))
  );

-- Visitors read no price row any more. catalogue_prices is security_invoker, so it already
-- follows the policy above for signed-in callers; anon loses it with the table.
revoke select on public.product_prices, public.catalogue_prices from anon;
comment on view public.catalogue_prices is
  'Price rows with legacy FX columns. security_invoker: same visibility as product_prices (retail for Particulier+, pros and staff; pro for approved pros and staff).';

-- ---------------------------------------------------------------------------
-- 2. Signup: three self-service types, the event type a Particulier+ gives
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column event_type text check (event_type in ('wedding', 'engagement', 'birthday', 'corporate', 'gala', 'private', 'other'));

-- Metadata is user-controlled: it may only choose among the three customer types (anything
-- else, staff roles included, becomes a Particulier). Particulier+ and Professionnel wait for
-- staff approval; a Particulier is active once the email is confirmed.
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
  insert into public.profiles (id, email, full_name, company_name, phone, vat_number, country, activity, city, website, event_type, role, status)
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
    kind::public.app_role,
    (case when kind = 'customer' then 'approved' else 'pending' end)::public.account_status
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Existing accounts: every approved customer already saw prices
-- ---------------------------------------------------------------------------

update public.profiles set role = 'customer_plus' where role = 'customer' and status = 'approved';
