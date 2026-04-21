-- ============================================================
-- Extended WHOOP fields on rounds
-- ============================================================
alter table public.rounds
  add column if not exists whoop_resting_hr        integer,
  add column if not exists whoop_rem_hours         numeric,
  add column if not exists whoop_deep_sleep_hours  numeric,
  add column if not exists whoop_sleep_performance numeric,
  add column if not exists whoop_sleep_disturbances integer,
  add column if not exists whoop_sleep_efficiency  numeric,
  add column if not exists whoop_strain_yesterday  numeric;
