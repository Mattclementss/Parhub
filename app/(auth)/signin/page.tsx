'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signIn } from '@/app/actions/auth'

export default function SignInPage() {
  const [state, action, pending] = useActionState(signIn, undefined)

  return (
    <div className="bg-[#1a2e1d] rounded-2xl border border-[#2a3d2c] p-6">
      <h2 className="text-xl font-black text-white mb-6">Sign in</h2>

      {state?.error && (
        <div className="mb-4 rounded-xl bg-[#3d1010] border border-[#5a2020] px-4 py-3 text-sm text-[#f87171]">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-[#999] mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-[#2a3d2c] bg-[#111f13] px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#4ade80]/50 focus:outline-none focus:ring-1 focus:ring-[#4ade80]/30"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-[#999] mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-[#2a3d2c] bg-[#111f13] px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#4ade80]/50 focus:outline-none focus:ring-1 focus:ring-[#4ade80]/30"
            placeholder="Your password"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[#4ade80] px-4 py-3 text-sm font-black text-black hover:bg-[#22c55e] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[#555]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-bold text-[#4ade80] hover:text-white transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  )
}
