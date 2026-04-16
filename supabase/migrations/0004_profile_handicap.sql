-- Add handicap_index to profiles
alter table public.profiles
  add column if not exists handicap_index numeric(4, 1);
