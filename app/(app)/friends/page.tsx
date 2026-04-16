import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { acceptFriendRequest, declineFriendRequest, removeFriend } from '@/app/actions/friends'
import FriendInviteForm from './FriendInviteForm'

export default async function FriendsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: incoming }, { data: outgoing }, { data: friends }] = await Promise.all([
    // Pending requests sent TO me
    supabase
      .from('friend_requests')
      .select('id, created_at, sender:sender_id(id, full_name, email)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

    // Pending requests I sent
    supabase
      .from('friend_requests')
      .select('id, created_at, receiver:receiver_id(id, full_name, email)')
      .eq('sender_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

    // Current friends with their stats
    supabase
      .from('friendships')
      .select('friend_id, profiles:friend_id(id, full_name, email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const incomingList = (incoming ?? []) as unknown as Array<{
    id: string
    created_at: string
    sender: { id: string; full_name: string | null; email: string }
  }>

  const outgoingList = (outgoing ?? []) as unknown as Array<{
    id: string
    created_at: string
    receiver: { id: string; full_name: string | null; email: string }
  }>

  const friendList = (friends ?? []) as unknown as Array<{
    friend_id: string
    profiles: { id: string; full_name: string | null; email: string }
  }>

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#1e1e1e] px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <h1 className="text-lg font-black text-white">Friends</h1>
          {incomingList.length > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {incomingList.length}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">
        {/* Add a friend */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Add a Friend
          </h3>
          <FriendInviteForm />
        </section>

        {/* Incoming requests */}
        {incomingList.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              Requests ({incomingList.length})
            </h3>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
              {incomingList.map((req) => (
                <div key={req.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {req.sender.full_name ?? req.sender.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{req.sender.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form
                      action={async () => {
                        'use server'
                        await acceptFriendRequest(req.id)
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-xl bg-[#4ade80] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#22c55e] transition-colors"
                      >
                        Accept
                      </button>
                    </form>
                    <form
                      action={async () => {
                        'use server'
                        await declineFriendRequest(req.id)
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-xl border border-[#2a3d2c] bg-[#1a2e1d] px-3.5 py-2 text-xs font-semibold text-[#999] hover:bg-[#1e3220] transition-colors"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Outgoing pending requests */}
        {outgoingList.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              Sent
            </h3>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
              {outgoingList.map((req) => (
                <div key={req.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {req.receiver.full_name ?? req.receiver.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{req.receiver.email}</p>
                  </div>
                  <span className="text-xs font-medium text-[#fbbf24] bg-[#3d3010] border border-[#5a4a20] rounded-full px-2.5 py-1 shrink-0">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Friends{friendList.length > 0 ? ` (${friendList.length})` : ''}
          </h3>
          {friendList.length === 0 ? (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-10 text-center">
              <p className="text-2xl mb-2">🤝</p>
              <p className="text-sm font-medium text-gray-700">No friends yet</p>
              <p className="text-xs text-gray-400 mt-1">
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
                    <div className="w-9 h-9 rounded-full bg-[#1a3d1a] flex items-center justify-center text-sm font-bold text-[#4ade80] shrink-0">
                      {(p.full_name ?? p.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {p.full_name ?? p.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{p.email}</p>
                    </div>
                  </Link>
                  <form
                    action={async () => {
                      'use server'
                      await removeFriend(friend_id)
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
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
