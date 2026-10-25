-- Advisor cleanup (no change in who can do what):
-- * staff "write" policies were FOR ALL, so they also applied to SELECT and overlapped the
--   public read policies; split them into insert/update/delete only;
-- * the two INSERT policies on messages/replies are merged into one each;
-- * index the audit foreign keys.

-- categories, products, product_stock (operations staff)
drop policy "categories: staff write" on public.categories;
create policy "categories: staff insert" on public.categories for insert to authenticated
  with check ((select private.has_role('{manager,admin}')));
create policy "categories: staff update" on public.categories for update to authenticated
  using ((select private.has_role('{manager,admin}'))) with check ((select private.has_role('{manager,admin}')));
create policy "categories: staff delete" on public.categories for delete to authenticated
  using ((select private.has_role('{manager,admin}')));

drop policy "products: staff write" on public.products;
create policy "products: staff insert" on public.products for insert to authenticated
  with check ((select private.has_role('{manager,admin}')));
create policy "products: staff update" on public.products for update to authenticated
  using ((select private.has_role('{manager,admin}'))) with check ((select private.has_role('{manager,admin}')));
create policy "products: staff delete" on public.products for delete to authenticated
  using ((select private.has_role('{manager,admin}')));

drop policy "stock: staff write" on public.product_stock;
create policy "stock: staff insert" on public.product_stock for insert to authenticated
  with check ((select private.has_role('{manager,admin}')));
create policy "stock: staff update" on public.product_stock for update to authenticated
  using ((select private.has_role('{manager,admin}'))) with check ((select private.has_role('{manager,admin}')));

-- product_prices (admins only)
drop policy "prices: admin write" on public.product_prices;
create policy "prices: admin insert" on public.product_prices for insert to authenticated
  with check ((select private.has_role('{admin}')));
create policy "prices: admin update" on public.product_prices for update to authenticated
  using ((select private.has_role('{admin}'))) with check ((select private.has_role('{admin}')));
create policy "prices: admin delete" on public.product_prices for delete to authenticated
  using ((select private.has_role('{admin}')));

-- cms_content (editors and above)
drop policy "cms: editors write" on public.cms_content;
create policy "cms: editors insert" on public.cms_content for insert to authenticated
  with check ((select private.has_role('{editor,manager,admin}')));
create policy "cms: editors update" on public.cms_content for update to authenticated
  using ((select private.has_role('{editor,manager,admin}'))) with check ((select private.has_role('{editor,manager,admin}')));

-- messages: one INSERT policy (staff anything, clients their own site message while active)
drop policy "messages: client sends own site message" on public.messages;
drop policy "messages: staff insert" on public.messages;
create policy "messages: insert" on public.messages for insert to authenticated
  with check (
    (select private.has_role('{manager,admin}'))
    or (
      channel = 'site' and profile_id = (select auth.uid()) and status = 'open' and assignee_id is null
      and (select private.is_active())
      and (request_id is null or exists (
        select 1 from public.rental_requests r where r.id = request_id and r.user_id = (select auth.uid())))
    )
  );

-- message_replies: one INSERT policy (staff incl. internal notes, owners public replies)
drop policy "replies: owner public reply" on public.message_replies;
drop policy "replies: staff insert" on public.message_replies;
create policy "replies: insert" on public.message_replies for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (select private.has_role('{manager,admin}'))
      or (not internal and (select private.is_active())
          and exists (select 1 from public.messages m where m.id = message_id and m.profile_id = (select auth.uid())))
    )
  );

create index client_notes_updated_by_idx on public.client_notes (updated_by);
create index cms_content_updated_by_idx on public.cms_content (updated_by);
create index fx_rates_created_by_idx on public.fx_rates (created_by);
