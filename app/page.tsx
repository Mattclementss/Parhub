import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import BottomNav from '@/app/components/BottomNav'
import { getWhoopData } from '@/lib/whoop/client'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, course_name, date_played, total_score, gir, total_putts, fairways_hit, fairways_possible')
    .eq('user_id', user.id)
    .order('date_played', { ascending: false })
    .limit(5)

  const displayName =
    profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Golfer'

  const lastRound = rounds?.[0] ?? null
  const recentRounds = rounds?.slice(1) ?? []

  // Check if user has WHOOP connected before fetching (avoid unnecessary auth errors)
  const { data: whoopToken } = await supabase
    .from('whoop_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  const whoopData = whoopToken ? await getWhoopData(user.id).catch(() => null) : null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-green-800 px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl">⛳</span>
            <span className="text-lg font-bold tracking-tight text-white">ParHub</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-green-200 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6 space-y-5">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {greeting()}, {displayName}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">Ready to hit the course?</p>
        </div>

        {/* Log Round CTA */}
        <Link
          href="/log-round"
          className="flex items-center justify-center gap-3 w-full rounded-2xl bg-green-700 px-6 py-4 text-base font-bold text-white shadow-md shadow-green-700/25 hover:bg-green-800 active:scale-[0.98] transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className="w-5 h-5 shrink-0"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Log a Round
        </Link>

        {/* WHOOP Today */}
        {whoopToken ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              Today&apos;s Recovery
            </h3>
            {whoopData ? (
              <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <WhoopCell
                    label="Recovery"
                    value={whoopData.recoveryScore !== null ? `${whoopData.recoveryScore}%` : '—'}
                    color={recoveryColor(whoopData.recoveryScore)}
                  />
                  <WhoopCell
                    label="HRV"
                    value={whoopData.hrv !== null ? `${whoopData.hrv}ms` : '—'}
                  />
                  <WhoopCell
                    label="Sleep"
                    value={whoopData.sleepHours !== null ? `${whoopData.sleepHours}h` : '—'}
                  />
                </div>
                {whoopData.sleepPerformance !== null && (
                  <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Sleep performance</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {whoopData.sleepPerformance}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 text-center">
                <p className="text-sm text-gray-400">No recovery data yet today</p>
              </div>
            )}
          </section>
        ) : (
          <Link
            href="/api/whoop/connect"
            className="flex items-center justify-between gap-3 w-full rounded-2xl bg-white border border-gray-200 px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">W</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Connect WHOOP</p>
                <p className="text-xs text-gray-400">See recovery &amp; sleep on your dashboard</p>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-400 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {/* Last Round */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Last Round
          </h3>
          {lastRound ? (
            <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{lastRound.course_name}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {new Date(lastRound.date_played).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {lastRound.total_score !== null && (
                    <div className="text-right shrink-0">
                      <p className="text-3xl font-bold text-green-700 leading-none">
                        {lastRound.total_score}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">score</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <StatCell label="Putts" value={lastRound.total_putts ?? '—'} />
                <StatCell
                  label="GIR"
                  value={lastRound.gir !== null ? `${lastRound.gir}/18` : '—'}
                />
                <StatCell
                  label="FIR"
                  value={
                    lastRound.fairways_hit !== null && lastRound.fairways_possible
                      ? `${lastRound.fairways_hit}/${lastRound.fairways_possible}`
                      : '—'
                  }
                />
              </div>
            </div>
          ) : (
            <EmptyCard
              icon="🏌️"
              message="No rounds logged yet"
              sub="Log your first round to see your stats here."
            />
          )}
        </section>

        {/* Recent Rounds */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Recent Rounds
            </h3>
            {recentRounds.length > 0 && (
              <Link
                href="/history"
                className="text-xs font-medium text-green-700 hover:text-green-800"
              >
                See all
              </Link>
            )}
          </div>

          {recentRounds.length > 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {recentRounds.map((round) => (
                <div key={round.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {round.course_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(round.date_played).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {round.total_score !== null && (
                    <span className="text-lg font-bold text-green-700 shrink-0 ml-3">
                      {round.total_score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard
              icon="📋"
              message="No recent rounds"
              sub="Your round history will appear here."
            />
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

function recoveryColor(score: number | null): string {
  if (score === null) return 'text-gray-900'
  if (score >= 67) return 'text-green-600'
  if (score >= 34) return 'text-yellow-500'
  return 'text-red-500'
}

function WhoopCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center py-3">
      <span className={`text-lg font-bold ${color ?? 'text-gray-900'}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center py-3">
      <span className="text-lg font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  )
}

function EmptyCard({ icon, message, sub }: { icon: string; message: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-8 text-center">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-sm font-medium text-gray-700">{message}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
