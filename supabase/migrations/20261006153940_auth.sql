-- Identity, roles and the authorization helper used by every policy.
-- Grants live in the final *_grants.sql migration.

create schema if not exists private;

create type public.app_role as enum ('customer', 'professional', 'editor', 'manager', 'admin');
create type public.account_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.country_code as enum ('FR', 'TN');
create type public.currency_code as enum ('EUR', 'TND');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (length(full_name) <= 120),
  company_name text check (length(company_name) <= 120),
  phone text check (length(phone) <= 40),
  vat_number text check (length(vat_number) <= 40),
  country public.country_code,
  role public.app_role not null default 'customer',
  status public.account_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Staff-only CRM data. Never readable by the client it describes.
create table public.client_notes (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  notes text not null default '' check (length(notes) <= 5000),
  flags text[] not null default '{}',
  level text check (length(level) <= 40),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

-- Live, non-recursive role check: reads the caller's own profile with definer rights,
-- so suspensions and role changes apply on the next query (not on token refresh).
create function private.has_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'approved'
      and p.role = any (roles)
  );
$$;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Signup metadata is user-controlled: it may only request a professional account
-- (which starts pending) and fill contact fields. It can never grant staff roles.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  is_pro boolean := coalesce(meta ->> 'account_type', '') = 'professional';
begin
  insert into public.profiles (id, email, full_name, company_name, phone, vat_number, country, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    left(nullif(trim(meta ->> 'full_name'), ''), 120),
    left(nullif(trim(meta ->> 'company_name'), ''), 120),
    left(nullif(trim(meta ->> 'phone'), ''), 40),
    left(nullif(trim(meta ->> 'vat_number'), ''), 40),
    case when meta ->> 'country' in ('FR', 'TN') then (meta ->> 'country')::public.country_code end,
    case when is_pro then 'professional'::public.app_role else 'customer'::public.app_role end,
    case when is_pro then 'pending'::public.account_status else 'approved'::public.account_status end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function private.sync_user_email();

-- API callers (role "authenticated") cannot escalate. Direct SQL (postgres) is left
-- free so the first admin can be bootstrapped from the SQL editor.
create function private.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id <> old.id or new.email <> old.email or new.created_at <> old.created_at then
      raise exception 'profile identity fields are read-only' using errcode = '42501';
    end if;
    if new.role is distinct from old.role and not private.has_role('{admin}') then
      raise exception 'only an admin can change roles' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      if not private.has_role('{manager,admin}') then
        raise exception 'only staff can change account status' using errcode = '42501';
      end if;
      if old.role in ('editor', 'manager', 'admin') and not private.has_role('{admin}') then
        raise exception 'only an admin can change a staff account status' using errcode = '42501';
      end if;
    end if;
  end if;

  if old.role = 'admin' and old.status = 'approved'
     and (new.role <> 'admin' or new.status <> 'approved')
     and not exists (
       select 1 from public.profiles
       where role = 'admin' and status = 'approved' and id <> old.id
     ) then
    raise exception 'cannot remove the last approved admin' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_profile
  before update on public.profiles
  for each row execute function private.guard_profile();

create trigger touch_client_notes
  before update on public.client_notes
  for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.client_notes enable row level security;

create policy "profiles: self or staff read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.has_role('{manager,admin}')));

create policy "profiles: self or staff update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.has_role('{manager,admin}')))
  with check (id = (select auth.uid()) or (select private.has_role('{manager,admin}')));

create policy "client_notes: staff only" on public.client_notes
  for all to authenticated
  using ((select private.has_role('{manager,admin}')))
  with check ((select private.has_role('{manager,admin}')));
