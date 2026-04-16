'use client'

import { useActionState, useEffect, useRef } from 'react'
import { updateProfile } from '@/app/actions/profile'

const TEE_OPTIONS = ['White', 'Blue', 'Black', 'Gold', 'Red'] as const

const TEE_DOT: Record<string, string> = {
  Black: 'bg-gray-900 border border-gray-600',
  Blue: 'bg-blue-500',
  White: 'bg-white border border-gray-400',
  Gold: 'bg-yellow-400',
  Red: 'bg-red-500',
}

interface Props {
  fullName: string | null
  homeCourse: string | null
  typicalTeeBox: string | null
  handicapIndex: number | null
  calculatedHandicap: number | null
}

export default function EditProfileForm({
  fullName,
  homeCourse,
  typicalTeeBox,
  handicapIndex,
  calculatedHandicap,
}: Props) {
  const [state, action, pending] = useActionState(updateProfile, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  // Auto-dismiss success after 3s
  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(() => formRef.current?.closest('section')?.querySelector('[data-success]')?.remove(), 3000)
      return () => clearTimeout(t)
    }
  }, [state])

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state?.success && (
        <div data-success className="rounded-xl bg-[#1a3d1a] border border-[#2a5a2a] px-4 py-3 text-sm font-semibold text-[#4ade80]">
          Profile saved ✓
        </div>
      )}
      {state?.error && (
        <div className="rounded-xl bg-[#3d1010] border border-[#5a2020] px-4 py-3 text-sm text-[#f87171]">
          {state.error}
        </div>
      )}

      <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden divide-y divide-[#2a3d2c]">
        {/* Display name */}
        <div className="px-4 py-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-1.5">
            Display Name
          </label>
          <input
            name="full_name"
            type="text"
            defaultValue={fullName ?? ''}
            placeholder="Your name"
            className="w-full bg-transparent text-sm font-semibold text-white placeholder-[#555] focus:outline-none"
          />
        </div>

        {/* Home course */}
        <div className="px-4 py-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-1.5">
            Home Course
          </label>
          <input
            name="home_course"
            type="text"
            defaultValue={homeCourse ?? ''}
            placeholder="e.g. Pebble Beach Golf Links"
            className="w-full bg-transparent text-sm font-semibold text-white placeholder-[#555] focus:outline-none"
          />
        </div>

        {/* Handicap */}
        <div className="px-4 py-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-1.5">
            Handicap Index
            {calculatedHandicap !== null && (
              <span className="ml-2 normal-case text-[#4ade80]">
                (calculated: ~{calculatedHandicap})
              </span>
            )}
          </label>
          <input
            name="handicap_index"
            type="number"
            step="0.1"
            min="0"
            max="54"
            defaultValue={handicapIndex ?? calculatedHandicap ?? ''}
            placeholder={calculatedHandicap !== null ? `~${calculatedHandicap}` : 'e.g. 14.2'}
            className="w-full bg-transparent text-sm font-semibold text-white placeholder-[#555] focus:outline-none"
          />
        </div>
      </div>

      {/* Tee box */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
          Typical Tee Box
        </p>
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden divide-y divide-[#2a3d2c]">
          {TEE_OPTIONS.map((tee) => (
            <label
              key={tee}
              className="flex items-center justify-between px-4 py-3.5 active:bg-[#1e3220] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full shrink-0 ${TEE_DOT[tee] ?? 'bg-gray-400'}`} />
                <span className="text-sm font-semibold text-white">{tee}</span>
              </div>
              <input
                type="radio"
                name="typical_tee_box"
                value={tee}
                defaultChecked={typicalTeeBox === tee}
                className="w-4 h-4 accent-[#4ade80]"
              />
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[#4ade80] px-4 py-4 text-sm font-black text-black hover:bg-[#22c55e] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : 'Save Profile'}
      </button>
    </form>
  )
}
