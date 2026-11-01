-- Fail closed for functions too. Postgres grants EXECUTE to PUBLIC by default, and the per-schema
-- revoke in the grants migration cannot take that away: a global default can only be changed
-- globally. Without this, every new function would be callable by anon until revoked by hand.
-- create or replace keeps a function's privileges, so the older RPCs never had the problem.

alter default privileges revoke execute on functions from public;

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prokind = 'f' and p.proowner = current_user::regrole
  loop
    execute format('revoke execute on function %s from public', f);
  end loop;
end;
$$;
