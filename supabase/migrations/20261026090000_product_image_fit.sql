-- How a product photo sits on its tile. 'contain' (default): a cut-out shown whole, staged on
-- the tile tone; 'cover': a lifestyle or ambiance photo that fills the tile. Additive.
alter table public.products
  add column image_fit text not null default 'contain' check (image_fit in ('contain', 'cover'));
