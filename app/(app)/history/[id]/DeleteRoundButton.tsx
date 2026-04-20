'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteRound } from '@/app/actions/rounds'

export default function DeleteRoundButton({ roundId }: { roundId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const result = await deleteRound(roundId)
    if (result?.error) {
      setError(result.error)
      setDeleting(false)
      setConfirming(false)
      return
    }
    router.push('/history')
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-4 text-sm font-semibold text-red-400 hover:bg-red-500/10 active:scale-[0.98] transition-all"
      >
        Delete Round
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-4 space-y-3">
      <p className="text-sm font-semibold text-white text-center">Delete this round?</p>
      <p className="text-xs text-[#555] text-center">This cannot be undone.</p>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="flex-1 rounded-xl border border-[#2a3d2c] bg-[#1a2e1d] px-4 py-2.5 text-sm font-semibold text-[#999] hover:bg-[#1e3220] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Yes, Delete'}
        </button>
      </div>
    </div>
  )
}
