-- One row per email to send (2026-11-01). Emails go out after the database transaction commits,
-- so a mail failure can never undo a business action: it stays visible here, and retryable.

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.rental_requests (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  kind text not null check (length(kind) <= 40),
  to_address text not null check (length(to_address) <= 254),
  lang text not null check (lang in ('fr', 'en', 'ar')),
  subject text not null default '' check (length(subject) <= 300),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_id text check (length(provider_id) <= 120),
  error text check (length(error) <= 1000),
  attempts int not null default 0,
  last_attempt_at timestamptz,
  -- A failed send is tried again later, so the same step never mails a client twice.
  dedupe_key text not null unique check (length(dedupe_key) <= 200),
  -- What the template needs to render again. Never holds a tracking token or a reset link.
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_events_request_idx on public.email_events (request_id, created_at desc);
create index email_events_profile_idx on public.email_events (profile_id);
create index email_events_retry_idx on public.email_events (status, created_at) where status in ('queued', 'failed');

alter table public.email_events enable row level security;

-- Staff read the timeline; every write goes through the server with the service key.
create policy "email_events: staff read" on public.email_events
  for select to authenticated using ((select private.has_role('{manager,admin}')));

grant select on public.email_events to authenticated;
grant all on public.email_events to service_role;
