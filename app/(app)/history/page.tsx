import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function relDisplay(rel: number): string {
  if (rel === 0) return 'E'
  return rel > 0 ? `+${rel}` : `${rel}`
}

function relColor(rel: number): string {
  if (rel <= -2) return 'text-yellow-500'
  if (rel === -1) return 'text-green-600'
  if (rel === 0) return 'text-gray-500'
  if (rel === 1) return 'text-orange-500'
  return 'text-red-500'
}

function recoveryColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 67) return 'text-green-600'
  if (score >= 34) return 'text-yellow-500'
  return 'text-red-500'
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  // Fetch rounds with hole par values so we can compute score vs par
  const { data: rounds } = await supabase
    .from('rounds')
    .select(
      'id, course_name, date_played, total_score, total_putts, fairways_hit, fairways_possible, gir, whoop_recovery, holes(par)'
    )
    .eq('user_id', user.id)
    .order('date_played', { ascending: false })

  const allRounds = rounds ?? []

  // Season summary calculations
  const scoredRounds = allRounds.filter((r) => r.total_score !== null)
  const totalRounds = allRounds.length
  const scoringAvg =
    scoredRounds.length > 0
      ? Math.round(
          (scoredRounds.reduce((sum, r) => sum + r.total_score, 0) / scoredRounds.length) * 10
        ) / 10
      : null
  const bestRound =
    scoredRounds.length > 0 ? Math.min(...scoredRounds.map((r) => r.total_score)) : null
  const puttRounds = allRounds.filter((r) => r.total_putts !== null)
  const avgPutts =
    puttRounds.length > 0
      ? Math.round(
          (puttRounds.reduce((sum, r) => sum + r.total_putts, 0) / puttRounds.length) * 10
        ) / 10
      : null

  return (
    <>
      <header className="sticky top-0 z-40 bg-green-800 px-4">
        <div className="mx-auto max-w-lg flex items-center h-14">
          <h1 className="text-lg font-bold text-white">History</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">
        {/* Season summary */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            Season Summary
          </h3>
          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              <SummaryCell label="Rounds" value={totalRounds} />
              <SummaryCell label="Avg Score" value={scoringAvg ?? '—'} />
              <SummaryCell label="Best" value={bestRound ?? '—'} />
              <SummaryCell label="Avg Putts" value={avgPutts ?? '—'} />
            </div>
          </div>
        </section>

        {/* Round list */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
            All Rounds
          </h3>

          {allRounds.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 px-4 py-12 text-center">
              <p className="text-3xl mb-2">🏌️</p>
              <p className="text-sm font-medium text-gray-700">No rounds logged yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Log your first round to see your history here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {allRounds.map((round) => {
                const totalPar = Array.isArray(round.holes)
                  ? round.holes.reduce((sum: number, h: { par: number }) => sum + h.par, 0)
                  : null
                const scoreVsPar =
                  round.total_score !== null && totalPar ? round.total_score - totalPar : null

                return (
                  <Link
                    key={round.id}
                    href={`/history/${round.id}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    {/* Left: course + date + stats */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {round.course_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(round.date_played).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {round.fairways_hit !== null && round.fairways_possible ? (
                          <span className="text-[11px] text-gray-400">
                            FIR {round.fairways_hit}/{round.fairways_possible}
                          </span>
                        ) : null}
                        {round.gir !== null ? (
                          <span className="text-[11px] text-gray-400">GIR {round.gir}/18</span>
                        ) : null}
                        {round.total_putts !== null ? (
                          <span className="text-[11px] text-gray-400">
                            {round.total_putts} putts
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Right: WHOOP recovery + score */}
                    <div className="flex items-center gap-4 shrink-0 ml-3">
                      {round.whoop_recovery !== null && (
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-xs font-bold ${recoveryColor(round.whoop_recovery)}`}
                          >
                            {Math.round(round.whoop_recovery)}%
                          </span>
                          <span className="text-[9px] text-gray-400 mt-0.5">recovery</span>
                        </div>
                      )}
                      {round.total_score !== null && (
                        <div className="flex flex-col items-center min-w-[2.5rem]">
                          <span className="text-xl font-black text-gray-900 leading-none">
                            {round.total_score}
                          </span>
                          {scoreVsPar !== null && (
                            <span className={`text-[11px] font-semibold mt-0.5 ${relColor(scoreVsPar)}`}>
                              {relDisplay(scoreVsPar)}
                            </span>
                          )}
                        </div>
                      )}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="w-4 h-4 text-gray-300 shrink-0"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

function SummaryCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center py-4">
      <span className="text-lg font-black text-gray-900 leading-none">{value}</span>
      <span className="text-[10px] text-gray-400 mt-1 text-center leading-tight">{label}</span>
    </div>
  )
}
