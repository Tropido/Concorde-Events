-- Every Data API privilege in one place. Start from nothing, then grant exactly what
-- each role needs; RLS policies (earlier migrations) then decide which rows.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Fail closed: objects created by later migrations need explicit grants too.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to anon, authenticated, service_role;

-- Public catalogue.
grant select on public.categories, public.products, public.product_stock,
  public.product_prices, public.fx_rates, public.cms_content to anon, authenticated;
grant select on public.catalogue_prices, public.current_fx to anon, authenticated;

-- Signed-in users (rows limited by RLS).
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.client_notes to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_prices to authenticated;
grant insert, update on public.product_stock to authenticated; -- no delete: see private.guard_stock
grant insert on public.fx_rates to authenticated;
grant select, update on public.rental_requests to authenticated;
grant select, update on public.request_lines to authenticated;
grant select on public.quotes to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert on public.message_replies to authenticated;
grant select, insert, delete on public.favourites to authenticated;
grant insert, update on public.cms_content to authenticated;

-- Server-only key (FX cron, tests). Bypasses RLS; never shipped to browsers.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Helpers evaluated inside policies, views and invoker functions.
grant execute on function private.has_role(public.app_role[]) to anon, authenticated, service_role;
grant execute on function private.is_active() to authenticated, service_role;
grant execute on function private.currency_of(public.country_code) to anon, authenticated, service_role;
grant execute on function private.current_rate() to anon, authenticated, service_role;
grant execute on function private.convert(numeric, public.currency_code, public.currency_code, numeric)
  to anon, authenticated, service_role;
grant execute on function private.local_today(public.country_code) to authenticated, service_role;
grant execute on function private.holds_stock(public.request_status, date, date) to authenticated, service_role;

-- RPCs.
grant execute on function public.submit_request(jsonb, uuid) to anon, authenticated, service_role;
grant execute on function public.mark_whatsapp_opened(uuid) to anon, authenticated, service_role;
grant execute on function public.submit_contact(jsonb) to anon, authenticated, service_role;
grant execute on function public.product_availability(uuid, public.country_code, date, date)
  to anon, authenticated, service_role;
grant execute on function public.issue_quote(uuid, public.currency_code, int) to authenticated, service_role;
grant execute on function public.reschedule_request(uuid, jsonb) to authenticated, service_role;
grant execute on function public.return_request(uuid, jsonb) to authenticated, service_role;
grant execute on function public.capacity_conflicts() to authenticated, service_role;
