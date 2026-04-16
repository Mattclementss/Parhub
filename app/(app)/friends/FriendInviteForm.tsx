'use client'

import { useActionState } from 'react'
import { sendFriendRequest, FriendRequestState } from '@/app/actions/friends'

const initial: FriendRequestState = {}

export default function FriendInviteForm() {
  const [state, action, pending] = useActionState(sendFriendRequest, initial)

  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          placeholder="Friend's email address"
          required
          className="flex-1 rounded-2xl border border-[#2a3d2c] bg-[#1a2e1d] px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#4ade80]/50 focus:outline-none focus:ring-1 focus:ring-[#4ade80]/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-bold text-black hover:bg-[#22c55e] active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? '…' : 'Add'}
        </button>
      </div>

      {state.error && (
        <p className="text-sm text-red-400 px-1">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-[#4ade80] font-medium px-1">{state.success}</p>
      )}
      {state.notFound && (
        <div className="rounded-xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-3">
          <p className="text-sm font-medium text-white">No ParHub account found for</p>
          <p className="text-sm text-[#999] mt-0.5">{state.email}</p>
          <p className="text-xs text-[#555] mt-2">
            Invite them to join ParHub and add you as a friend.
          </p>
        </div>
      )}
    </form>
  )
}
