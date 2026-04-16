import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { disconnectWhoop } from '@/app/actions/whoop'
import { acceptFriendRequest, declineFriendRequest, removeFriend } from '@/app/actions/friends'
import FriendInviteForm from '@/app/(app)/friends/FriendInviteForm'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const [
    { data: profile },
    { data: whoopToken },
    { data: incoming },
    { data: outgoing },
    { data: friends },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('whoop_tokens').select('user_id').eq('user_id', user.id).single(),
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
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <h1 className="text-lg font-black text-white">Profile</h1>
          <form action={signOut}>
            <button type="submit" className="text-[11px] text-[#555] hover:text-[#999] transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 space-y-5 pb-10">

        {/* User card */}
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1a3d1a] flex items-center justify-center text-xl font-black text-[#4ade80] shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-black text-white truncate">{displayName}</p>
            <p className="text-sm text-[#555] truncate">{user.email}</p>
          </div>
        </div>

        {/* WHOOP Integration */}
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

          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#111f13] border border-[#2a3d2c] flex items-center justify-center">
                  <span className="text-white text-xs font-black">W</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">WHOOP</p>
                  <p className="text-xs text-[#555]">Recovery &amp; sleep tracking</p>
                </div>
              </div>

              {isWhoopConnected ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-bold text-[#4ade80]">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
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

        {/* Friends section */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] px-1">
            Friends {friendList.length > 0 ? `(${friendList.length})` : ''}
          </h3>

          {/* Add a friend */}
          <FriendInviteForm />

          {/* Incoming requests */}
          {incomingList.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
                Requests ({incomingList.length})
              </p>
              <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
                {incomingList.map((req) => (
                  <div key={req.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {req.sender.full_name ?? req.sender.email}
                      </p>
                      <p className="text-xs text-[#555] mt-0.5 truncate">{req.sender.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <form action={async () => { 'use server'; await acceptFriendRequest(req.id) }}>
                        <button type="submit" className="rounded-xl bg-[#4ade80] px-3.5 py-2 text-xs font-black text-black hover:bg-[#22c55e] transition-colors">
                          Accept
                        </button>
                      </form>
                      <form action={async () => { 'use server'; await declineFriendRequest(req.id) }}>
                        <button type="submit" className="rounded-xl border border-[#2a3d2c] bg-[#111f13] px-3.5 py-2 text-xs font-semibold text-[#999] hover:bg-[#1e3220] transition-colors">
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing pending */}
          {outgoingList.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
                Sent
              </p>
              <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
                {outgoingList.map((req) => (
                  <div key={req.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {req.receiver.full_name ?? req.receiver.email}
                      </p>
                      <p className="text-xs text-[#555] mt-0.5 truncate">{req.receiver.email}</p>
                    </div>
                    <span className="text-xs font-bold text-[#fbbf24] bg-[#3d3010] border border-[#5a4a20] rounded-full px-2.5 py-1 shrink-0">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends list */}
          {friendList.length === 0 ? (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-10 text-center">
              <p className="text-2xl mb-2">🤝</p>
              <p className="text-sm font-bold text-white">No friends yet</p>
              <p className="text-xs text-[#555] mt-1">
                Add friends above to compare scores on the leaderboard.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
              {friendList.map(({ friend_id, profiles: p }) => (
                <div key={friend_id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <Link
                    href={`/leaderboard/${friend_id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1a3d1a] flex items-center justify-center text-sm font-black text-[#4ade80] shrink-0">
                      {(p.full_name ?? p.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {p.full_name ?? p.email}
                      </p>
                      <p className="text-xs text-[#555] mt-0.5 truncate">{p.email}</p>
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

      </main>
    </>
  )
}
