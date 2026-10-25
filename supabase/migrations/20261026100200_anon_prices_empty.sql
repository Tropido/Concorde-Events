-- Visitors read no price row, but their queries must return an empty list, not an error:
-- the storefront (including already-deployed versions) loads prices for every visitor, and a
-- revoked table grant turned that into a 500. RLS keeps them out: the only select policy on
-- product_prices is for authenticated callers, so anon gets zero rows from the table and from
-- the security_invoker catalogue_prices view.
grant select on public.product_prices, public.catalogue_prices to anon;
