-- Medication profile fields on bag stock (strength / dose / pack)
alter table public.stock_items
  add column if not exists strength text,
  add column if not exists dose_unit text,
  add column if not exists stock_unit text,
  add column if not exists pack_size numeric;
