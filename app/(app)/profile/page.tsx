import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { disconnectWhoop } from '@/app/actions/whoop'

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

  const [{ data: profile }, { data: whoopToken }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('whoop_tokens').select('user_id').eq('user_id', user.id).single(),
  ])

  const isWhoopConnected = !!whoopToken
  const params = await searchParams
  const justConnected = params.connected === 'true'
  const connectError = params.error

  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Golfer'

  return (
    <>
      <header className="sticky top-0 z-40 bg-green-800 px-4">
        <div className="mx-auto max-w-lg flex items-center h-14">
          <h1 className="text-lg font-bold text-white">Profile</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pt-6 space-y-5 pb-10">
        {/* User info */}
        <div className="rounded-2xl bg-white border border-gray-200 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl font-bold text-green-700">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{displayName}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>

        {/* WHOOP Integration */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Integrations
          </h3>

          {justConnected && (
            <div className="mb-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              WHOOP connected successfully!
            </div>
          )}

          {connectError && (
            <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {connectError === 'whoop_state_mismatch'
                ? 'Security check failed. Please try again.'
                : 'Failed to connect WHOOP. Please try again.'}
            </div>
          )}

          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center">
                  <span className="text-white text-xs font-bold">W</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">WHOOP</p>
                  <p className="text-xs text-gray-400">Recovery &amp; sleep tracking</p>
                </div>
              </div>

              {isWhoopConnected ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Connected
                  </span>
                  <form action={disconnectWhoop}>
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                    >
                      Disconnect
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/api/whoop/connect"
                  className="rounded-xl bg-green-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-green-800 transition-colors"
                >
                  Connect
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
