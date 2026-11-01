-- Client labels for the "Suivi interne" panel (2026-11-01): staff create their own, on top of
-- the six former flags. Clients never see them.

-- What makes two names the same: case, accents and extra spaces don't count.
create function private.tag_key(label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    lower(translate(trim(label),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ',
      'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuyy')),
    '\s+', '-', 'g');
$$;

create table public.client_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_fr text not null check (length(trim(label_fr)) between 1 and 40),
  label_en text check (length(trim(label_en)) between 1 and 40),
  label_ar text check (length(trim(label_ar)) between 1 and 40),
  color text not null default 'sand'
    check (color in ('almond', 'sand', 'tan', 'copper', 'cream', 'stone', 'ok', 'warn', 'bad')),
  is_system boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  -- Archived tags leave the pickers but stay, greyed, on the clients that have them.
  archived_at timestamptz
);

create unique index client_tags_label_key on public.client_tags (private.tag_key(label_fr));
create index client_tags_created_by_idx on public.client_tags (created_by);

create table public.client_tag_links (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tag_id uuid not null references public.client_tags (id) on delete restrict,
  added_by uuid references public.profiles (id) on delete set null default auth.uid(),
  added_at timestamptz not null default now(),
  primary key (profile_id, tag_id)
);

create index client_tag_links_tag_idx on public.client_tag_links (tag_id);
create index client_tag_links_added_by_idx on public.client_tag_links (added_by);

-- The slug is derived; API callers can't choose it, nor touch system or authorship fields.
-- Archiving is for admins (RLS already limits renames to the creator or an admin).
create function private.guard_client_tag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.slug := private.tag_key(new.label_fr);
      new.is_system := false;
      new.archived_at := null;
      new.created_by := (select auth.uid());
    else
      if new.slug <> old.slug or new.is_system <> old.is_system
         or new.created_by is distinct from old.created_by or new.created_at <> old.created_at then
        raise exception 'tag identity fields are read-only' using errcode = '42501';
      end if;
      if new.archived_at is distinct from old.archived_at and not private.has_role('{admin}') then
        raise exception 'only an admin can archive a tag' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_client_tag
  before insert or update on public.client_tags
  for each row execute function private.guard_client_tag();

insert into public.client_tags (slug, label_fr, label_en, label_ar, color, is_system, created_by) values
  ('vip', 'VIP', 'VIP', 'كبار الشخصيات', 'copper', true, null),
  ('big_account', 'Grand compte', 'Key account', 'حساب كبير', 'tan', true, null),
  ('reliable_payer', 'Paiement fiable', 'Reliable payer', 'دفع موثوق', 'ok', true, null),
  ('watch', 'À surveiller', 'Keep an eye on', 'للمتابعة', 'warn', true, null),
  ('new_partner', 'Nouveau partenaire', 'New partner', 'شريك جديد', 'sand', true, null),
  ('dispute_resolved', 'Litige résolu', 'Dispute resolved', 'نزاع محلول', 'stone', true, null);

-- Existing flags become links. Anything outside the six (none from the UI) keeps its text as a tag.
insert into public.client_tags (slug, label_fr, created_by)
select distinct private.tag_key(left(f, 40)), trim(left(f, 40)), null::uuid
from public.client_notes n, unnest(n.flags) f
where trim(f) <> ''
  and not exists (select 1 from public.client_tags t where t.slug = f or private.tag_key(t.label_fr) = private.tag_key(left(f, 40)))
on conflict do nothing;

insert into public.client_tag_links (profile_id, tag_id, added_by)
select distinct n.profile_id, t.id, null::uuid
from public.client_notes n
cross join lateral unnest(n.flags) f
join public.client_tags t on t.slug = f or private.tag_key(t.label_fr) = private.tag_key(left(f, 40))
on conflict do nothing;

-- Deprecated, not dropped: the version deployed on main still selects it. Remove it in a later
-- migration once this code is live.
comment on column public.client_notes.flags is 'Deprecated: replaced by client_tags and client_tag_links.';

alter table public.client_tags enable row level security;
alter table public.client_tag_links enable row level security;

create policy "client_tags: staff read" on public.client_tags
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "client_tags: staff create" on public.client_tags
  for insert to authenticated with check ((select private.has_role('{manager,admin}')));
create policy "client_tags: creator or admin update" on public.client_tags
  for update to authenticated
  using ((select private.has_role('{admin}')) or (created_by = (select auth.uid()) and (select private.has_role('{manager}'))))
  with check ((select private.has_role('{admin}')) or (created_by = (select auth.uid()) and (select private.has_role('{manager}'))));

create policy "client_tag_links: staff read" on public.client_tag_links
  for select to authenticated using ((select private.has_role('{manager,admin}')));
create policy "client_tag_links: staff add" on public.client_tag_links
  for insert to authenticated with check ((select private.has_role('{manager,admin}')));
create policy "client_tag_links: staff remove" on public.client_tag_links
  for delete to authenticated using ((select private.has_role('{manager,admin}')));

grant select, insert, update on public.client_tags to authenticated;
grant select, insert, delete on public.client_tag_links to authenticated;
grant all on public.client_tags, public.client_tag_links to service_role;
grant execute on function private.tag_key(text) to authenticated, service_role;
