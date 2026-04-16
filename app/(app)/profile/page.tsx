import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { disconnectWhoop } from '@/app/actions/whoop'
import { acceptFriendRequest, declineFriendRequest, removeFriend } from '@/app/actions/friends'
import FriendInviteForm from '@/app/(app)/friends/FriendInviteForm'
import EditProfileForm from './EditProfileForm'
import DeleteAccountButton from './DeleteAccountButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

function memberSince(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [
    { data: profile },
    { data: whoopToken },
    { data: roundsData },
    { data: incoming },
    { data: outgoing },
    { data: friends },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, home_course, typical_tee_box, handicap_index, created_at')
      .eq('id', user.id)
      .single(),
    supabase.from('whoop_tokens').select('user_id').eq('user_id', user.id).single(),
    supabase
      .from('rounds')
      .select('total_score, date_played')
      .eq('user_id', user.id)
      .not('total_score', 'is', null)
      .order('date_played', { ascending: false })
      .limit(30),
    supabase
      .from('friend_requests')
      .select('id, created_at, sender:sender_id(id, full_name, email)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('friend_requests')
      .select('id, created_at, receiver:receiver_id(id, full_name, email)')
      .eq('sender_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('friendships')
      .select('friend_id, profiles:friend_id(id, full_name, email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const isWhoopConnected = !!whoopToken
  const params = await searchParams
  const justConnected = params.connected === 'true'
  const connectError = params.error

  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Golfer'
  const avatarLetters = initials(profile?.full_name ?? null, user.email ?? 'G')

  // Stats
  const allScores = (roundsData ?? []).map((r) => r.total_score as number)
  const totalRounds = allScores.length
  const scoringAvg = totalRounds > 0
    ? Math.round((allScores.reduce((s, n) => s + n, 0) / totalRounds) * 10) / 10
    : null
  const bestRound = totalRounds > 0 ? Math.min(...allScores) : null

  // Calculated handicap: average of best 8 of last 20 scores minus 72
  const last20 = allScores.slice(0, 20)
  const sorted8 = last20.slice().sort((a, b) => a - b).slice(0, 8)
  const calculatedHandicap = sorted8.length >= 3
    ? Math.round((sorted8.reduce((s, n) => s + n, 0) / sorted8.length - 72) * 10) / 10
    : null

  const incomingList = (incoming ?? []) as unknown as Array<{
    id: string
    sender: { id: string; full_name: string | null; email: string }
  }>
  const outgoingList = (outgoing ?? []) as unknown as Array<{
    id: string
    receiver: { id: string; full_name: string | null; email: string }
  }>
  const friendList = (friends ?? []) as unknown as Array<{
    friend_id: string
    profiles: { id: string; full_name: string | null; email: string }
  }>

  return (
    <>
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4 pt-safe">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <h1 className="text-lg font-black text-white">Profile</h1>
          <form action={signOut}>
            <button type="submit" className="text-[11px] text-[#555] hover:text-[#999] transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 space-y-6 pb-10">

        {/* ── PROFILE HEADER ── */}
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-5 py-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1a3d1a] border-2 border-[#2a5a2a] flex items-center justify-center text-2xl font-black text-[#4ade80] shrink-0">
            {avatarLetters}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-white truncate leading-tight">{displayName}</p>
            <p className="text-xs text-[#555] truncate mt-0.5">{user.email}</p>
            {profile?.created_at && (
              <p className="text-[10px] text-[#555] mt-1 uppercase tracking-[1px]">
                Member since {memberSince(profile.created_at)}
              </p>
            )}
          </div>
        </div>

        {/* ── STATS SUMMARY ── */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
            Stats
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Rounds" value={totalRounds > 0 ? String(totalRounds) : '—'} />
            <StatTile label="Avg Score" value={scoringAvg !== null ? String(scoringAvg) : '—'} />
            <StatTile label="Best Round" value={bestRound !== null ? String(bestRound) : '—'} />
          </div>
        </section>

        {/* ── EDIT PROFILE ── */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
            Edit Profile
          </h3>
          <EditProfileForm
            fullName={profile?.full_name ?? null}
            homeCourse={profile?.home_course ?? null}
            typicalTeeBox={profile?.typical_tee_box ?? null}
            handicapIndex={profile?.handicap_index ?? null}
            calculatedHandicap={calculatedHandicap}
          />
        </section>

        {/* ── WHOOP ── */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
            Integrations
          </h3>

          {justConnected && (
            <div className="mb-3 rounded-xl bg-[#1a3d1a] border border-[#2a5a2a] px-4 py-3 text-sm text-[#4ade80]">
              WHOOP connected successfully!
            </div>
          )}
          {connectError && (
            <div className="mb-3 rounded-xl bg-[#3d1010] border border-[#5a2020] px-4 py-3 text-sm text-[#f87171]">
              {connectError === 'whoop_state_mismatch'
                ? 'Security check failed. Please try again.'
                : 'Failed to connect WHOOP. Please try again.'}
            </div>
          )}

          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c]">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#111f13] border border-[#2a3d2c] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-black">W</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">WHOOP</p>
                  <p className="text-xs text-[#555]">Recovery &amp; sleep</p>
                </div>
              </div>
              {isWhoopConnected ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#4ade80]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                    Connected
                  </span>
                  <form action={disconnectWhoop}>
                    <button type="submit" className="text-xs font-medium text-[#f87171] hover:text-red-400 transition-colors">
                      Disconnect
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/api/whoop/connect"
                  className="rounded-xl bg-[#4ade80] px-3.5 py-2 text-xs font-black text-black hover:bg-[#22c55e] transition-colors"
                >
                  Connect
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── FRIENDS ── */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] px-1">
            Friends {friendList.length > 0 ? `(${friendList.length})` : ''}
          </h3>

          <FriendInviteForm />

          {incomingList.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
                Requests ({incomingList.length})
              </p>
              <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
                {incomingList.map((req) => (
                  <div key={req.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">
                        {req.sender.full_name ?? req.sender.email}
                      </p>
                      <p className="text-xs text-[#555] truncate">{req.sender.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <form action={async () => { 'use server'; await acceptFriendRequest(req.id) }}>
                        <button type="submit" className="rounded-xl bg-[#4ade80] px-3 py-1.5 text-xs font-black text-black hover:bg-[#22c55e] transition-colors">
                          Accept
                        </button>
                      </form>
                      <form action={async () => { 'use server'; await declineFriendRequest(req.id) }}>
                        <button type="submit" className="rounded-xl border border-[#2a3d2c] bg-[#111f13] px-3 py-1.5 text-xs font-semibold text-[#999] hover:bg-[#1e3220] transition-colors">
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outgoingList.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">Sent</p>
              <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
                {outgoingList.map((req) => (
                  <div key={req.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">
                        {req.receiver.full_name ?? req.receiver.email}
                      </p>
                      <p className="text-xs text-[#555] truncate">{req.receiver.email}</p>
                    </div>
                    <span className="text-xs font-bold text-[#fbbf24] bg-[#3d3010] border border-[#5a4a20] rounded-full px-2.5 py-1 shrink-0">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {friendList.length === 0 ? (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-10 text-center">
              <p className="text-2xl mb-2">🤝</p>
              <p className="text-sm font-bold text-white">No friends yet</p>
              <p className="text-xs text-[#555] mt-1">Invite friends to compare scores.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
              {friendList.map(({ friend_id, profiles: p }) => (
                <div key={friend_id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <Link href={`/leaderboard/${friend_id}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-[#1a3d1a] flex items-center justify-center text-sm font-black text-[#4ade80] shrink-0">
                      {initials(p.full_name, p.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.full_name ?? p.email}</p>
                      <p className="text-xs text-[#555] truncate">{p.email}</p>
                    </div>
                  </Link>
                  <form action={async () => { 'use server'; await removeFriend(friend_id) }}>
                    <button type="submit" className="text-xs text-[#555] hover:text-[#f87171] transition-colors shrink-0">
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── ACCOUNT ── */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
            Account
          </h3>
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
            <form action={signOut}>
              <button
                type="submit"
                className="w-full px-4 py-4 flex items-center justify-between text-sm font-semibold text-white hover:bg-[#1e3220] active:bg-[#223527] transition-colors text-left"
              >
                Sign out
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#555]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </form>
            <DeleteAccountButton />
          </div>
        </section>

      </main>
    </>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-3 py-4 text-center">
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-[1px] text-[#555] mt-1.5">{label}</p>
    </div>
  )
}
