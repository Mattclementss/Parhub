-- ============================================================
-- FRIEND REQUESTS
-- ============================================================
create table public.friend_requests (
  id           uuid primary key default uuid_generate_v4(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  unique (sender_id, receiver_id)
);

alter table public.friend_requests enable row level security;

create policy "Users can send friend requests"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "Users can see their own sent and received requests"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Receivers can update request status"
  on public.friend_requests for update
  using (auth.uid() = receiver_id);

-- ============================================================
-- FRIENDSHIPS  (bidirectional — one row per direction)
-- ============================================================
create table public.friendships (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  friend_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, friend_id)
);

alter table public.friendships enable row level security;

create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = user_id);

create policy "Users can delete own friendships"
  on public.friendships for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create both friendship rows on request accept
-- ============================================================
create or replace function public.handle_accepted_friend_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friendships (user_id, friend_id)
    values (new.sender_id, new.receiver_id),
           (new.receiver_id, new.sender_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_friend_request_accepted
  after update on public.friend_requests
  for each row execute procedure public.handle_accepted_friend_request();

-- ============================================================
-- TRIGGER: delete reverse friendship row on unfriend
-- ============================================================
create or replace function public.handle_friendship_deleted()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.friendships
  where user_id = old.friend_id and friend_id = old.user_id;
  return old;
end;
$$;

create trigger on_friendship_deleted
  after delete on public.friendships
  for each row execute procedure public.handle_friendship_deleted();

-- ============================================================
-- PROFILE VISIBILITY: allow any authenticated user to read profiles
-- (needed for leaderboard name display and friend search by email)
-- ============================================================
drop policy "Users can view their own profile" on public.profiles;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- ROUNDS VISIBILITY: allow friends to view each other's rounds
-- (needed for leaderboard scoring stats)
-- ============================================================
create policy "Friends can view each other's rounds"
  on public.rounds for select
  using (
    exists (
      select 1 from public.friendships
      where user_id = auth.uid()
        and friend_id = rounds.user_id
    )
  );
