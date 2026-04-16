-- ============================================================
-- RLS AUDIT — ensure every table is locked down correctly
-- ============================================================

-- ─── profiles ────────────────────────────────────────────────
-- RLS already enabled in 0001; select policy widened in 0002.
-- Already correct: authenticated users can read any profile
-- (needed for friend search + leaderboard name display).
-- Ensure insert / update / delete remain self-only.

-- Drop any duplicate policies that may exist before re-creating
drop policy if exists "Users can insert their own profile"  on public.profiles;
drop policy if exists "Users can update their own profile"  on public.profiles;

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- profiles DELETE: only via cascade (auth user deletion) — no direct delete needed.

-- ─── rounds ──────────────────────────────────────────────────
-- Existing policies in 0001 + friend-read in 0002 are correct.
-- Add explicit DELETE policy (was missing).

drop policy if exists "Users can delete their own rounds" on public.rounds;

create policy "Users can delete their own rounds"
  on public.rounds for delete
  using (auth.uid() = user_id);

-- ─── holes ───────────────────────────────────────────────────
-- All four policies present in 0001 — no changes needed.

-- ─── whoop_tokens ────────────────────────────────────────────
-- All four policies present in 0001 — no changes needed.

-- ─── friend_requests ─────────────────────────────────────────
-- Missing DELETE: senders should be able to cancel requests.

drop policy if exists "Senders can delete their own requests" on public.friend_requests;

create policy "Senders can delete their own requests"
  on public.friend_requests for delete
  using (auth.uid() = sender_id);

-- ─── friendships ─────────────────────────────────────────────
-- INSERT is handled by a SECURITY DEFINER trigger — no direct
-- user insert policy needed.  SELECT currently only shows rows
-- where user_id = auth.uid(); that is correct because the trigger
-- inserts both directions, so each user sees their own list.
-- DELETE already correct in 0002.

-- ─── insights_cache ──────────────────────────────────────────
-- 0003 has select / insert / update.  Add DELETE so the cache
-- can be invalidated by the owning user.

drop policy if exists "Users can delete own insights" on public.insights_cache;

create policy "Users can delete own insights"
  on public.insights_cache for delete
  using (auth.uid() = user_id);

-- ─── Verify RLS is ON for every table ────────────────────────
-- (These are idempotent — safe to re-run.)
alter table public.profiles         enable row level security;
alter table public.rounds           enable row level security;
alter table public.holes            enable row level security;
alter table public.whoop_tokens     enable row level security;
alter table public.friend_requests  enable row level security;
alter table public.friendships      enable row level security;
alter table public.insights_cache   enable row level security;
