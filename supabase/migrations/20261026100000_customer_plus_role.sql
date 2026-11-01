-- Particulier+ (owner decision 2026-10-26). A new enum value cannot be used in the
-- transaction that adds it, so it gets its own migration; 20261026100100 uses it.
alter type public.app_role add value if not exists 'customer_plus' after 'customer';
