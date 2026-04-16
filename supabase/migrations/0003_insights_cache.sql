-- ============================================================
-- INSIGHTS CACHE
-- One row per user, upserted after each AI generation
-- ============================================================
create table public.insights_cache (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null unique references public.profiles(id) on delete cascade,
  weekly_summary        text,
  pre_round_prediction  text,
  pattern_alert         text,
  recommended_tee_time  text,
  generated_at          timestamptz not null default now()
);

alter table public.insights_cache enable row level security;

create policy "Users can view own insights"
  on public.insights_cache for select
  using (auth.uid() = user_id);

create policy "Users can insert own insights"
  on public.insights_cache for insert
  with check (auth.uid() = user_id);

create policy "Users can update own insights"
  on public.insights_cache for update
  using (auth.uid() = user_id);
