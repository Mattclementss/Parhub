-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  home_course   text,
  typical_tee_box text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- ROUNDS
-- ============================================================
create table public.rounds (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  course_name         text not null,
  course_id           text,
  date_played         date not null,
  total_score         integer,
  total_putts         integer,
  fairways_hit        integer,
  fairways_possible   integer,
  gir                 integer,
  whoop_recovery      numeric(5, 2),
  whoop_hrv           numeric(7, 2),
  whoop_sleep_hours   numeric(4, 2),
  notes               text,
  created_at          timestamptz not null default now()
);

alter table public.rounds enable row level security;

create policy "Users can view their own rounds"
  on public.rounds for select
  using (auth.uid() = user_id);

create policy "Users can insert their own rounds"
  on public.rounds for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own rounds"
  on public.rounds for update
  using (auth.uid() = user_id);

create policy "Users can delete their own rounds"
  on public.rounds for delete
  using (auth.uid() = user_id);

-- ============================================================
-- HOLES
-- ============================================================
create table public.holes (
  id           uuid primary key default uuid_generate_v4(),
  round_id     uuid not null references public.rounds(id) on delete cascade,
  hole_number  integer not null check (hole_number between 1 and 18),
  par          integer not null check (par between 3 and 5),
  yardage      integer,
  score        integer,
  putts        integer,
  fairway_hit  boolean,
  gir          boolean,
  sand_save    boolean,
  notes        text,
  unique (round_id, hole_number)
);

alter table public.holes enable row level security;

create policy "Users can view holes for their rounds"
  on public.holes for select
  using (
    exists (
      select 1 from public.rounds
      where rounds.id = holes.round_id
        and rounds.user_id = auth.uid()
    )
  );

create policy "Users can insert holes for their rounds"
  on public.holes for insert
  with check (
    exists (
      select 1 from public.rounds
      where rounds.id = holes.round_id
        and rounds.user_id = auth.uid()
    )
  );

create policy "Users can update holes for their rounds"
  on public.holes for update
  using (
    exists (
      select 1 from public.rounds
      where rounds.id = holes.round_id
        and rounds.user_id = auth.uid()
    )
  );

create policy "Users can delete holes for their rounds"
  on public.holes for delete
  using (
    exists (
      select 1 from public.rounds
      where rounds.id = holes.round_id
        and rounds.user_id = auth.uid()
    )
  );

-- ============================================================
-- WHOOP TOKENS
-- ============================================================
create table public.whoop_tokens (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null unique references public.profiles(id) on delete cascade,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

alter table public.whoop_tokens enable row level security;

create policy "Users can view their own WHOOP tokens"
  on public.whoop_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert their own WHOOP tokens"
  on public.whoop_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own WHOOP tokens"
  on public.whoop_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete their own WHOOP tokens"
  on public.whoop_tokens for delete
  using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN UP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
