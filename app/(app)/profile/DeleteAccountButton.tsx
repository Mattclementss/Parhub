'use client'

import { deleteAccount } from '@/app/actions/profile'

export default function DeleteAccountButton() {
  async function handleDelete() {
    if (!confirm('Delete your account? All rounds and data will be permanently removed. This cannot be undone.')) return
    await deleteAccount()
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="w-full px-4 py-4 flex items-center justify-between text-sm font-semibold text-[#f87171] hover:bg-[#3d1010] active:bg-[#3d1010] transition-colors text-left"
    >
      Delete Account
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#f87171]/50">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  )
}
