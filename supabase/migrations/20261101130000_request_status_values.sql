-- Alone: a new enum value can't be used in the transaction that adds it.
--   accepted  the client accepted the quote, the deposit is awaited
--   returned  the equipment is back and under inspection
alter type public.request_status add value if not exists 'accepted' after 'validated';
alter type public.request_status add value if not exists 'returned' after 'dispatched';
