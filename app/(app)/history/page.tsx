import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relDisplay(rel: number): string {
  if (rel === 0) return 'E'
  return rel > 0 ? `+${rel}` : `${rel}`
}

function recoveryBadgeStyles(score: number): { bg: string; text: string; border: string } {
  if (score >= 67) return { bg: 'bg-[#4ade80]/10', text: 'text-[#4ade80]', border: 'border-[#4ade80]/20' }
  if (score >= 34) return { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/20' }
  return { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' }
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: rounds } = await supabase
    .from('rounds')
    .select(
      'id, course_name, date_played, total_score, total_putts, fairways_hit, fairways_possible, gir, whoop_recovery, holes(par)'
    )
    .eq('user_id', user.id)
    .order('date_played', { ascending: false })

  const allRounds = rounds ?? []
  const scoredRounds = allRounds.filter((r) => r.total_score !== null)
  const totalRounds = allRounds.length
  const scoringAvg =
    scoredRounds.length > 0
      ? Math.round(
          (scoredRounds.reduce((s, r) => s + r.total_score, 0) / scoredRounds.length) * 10
        ) / 10
      : null
  const bestRound =
    scoredRounds.length > 0 ? Math.min(...scoredRounds.map((r) => r.total_score)) : null

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <h1 className="text-lg font-black text-white">Your History</h1>
          <Link
            href="/log-round"
            className="flex items-center gap-1 rounded-full bg-[#4ade80] px-3 py-1.5 text-xs font-black text-black hover:bg-[#22c55e] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            NEW
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Rounds" value={totalRounds} />
          <StatCard label="Avg Score" value={scoringAvg ?? '—'} />
          <StatCard label="Best" value={bestRound ?? '—'} />
        </div>

        {/* Round list */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-3 px-1">
            All Rounds
          </h3>

          {allRounds.length === 0 ? (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-12 text-center">
              <p className="text-3xl mb-3">⛳</p>
              <p className="text-sm font-bold text-white">No rounds logged yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Log your first round to start your history.
              </p>
              <Link
                href="/log-round"
                className="inline-block mt-4 rounded-full bg-[#4ade80] px-4 py-2 text-xs font-black text-black"
              >
                Log a Round
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden divide-y divide-[#2a2a2a]">
              {allRounds.map((round) => {
                const totalPar = Array.isArray(round.holes)
                  ? round.holes.reduce((sum: number, h: { par: number }) => sum + h.par, 0)
                  : null
                const scoreVsPar =
                  round.total_score !== null && totalPar ? round.total_score - totalPar : null
                const scoreColor =
                  scoreVsPar === null
                    ? 'text-white'
                    : scoreVsPar < 0
                    ? 'text-[#4ade80]'
                    : scoreVsPar > 0
                    ? 'text-red-400'
                    : 'text-gray-400'
                const badge =
                  round.whoop_recovery !== null
                    ? recoveryBadgeStyles(round.whoop_recovery)
                    : null

                return (
                  <Link
                    key={round.id}
                    href={`/history/${round.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#1e3220] active:bg-[#223527] transition-colors"
                  >
                    {/* Recovery badge */}
                    {badge ? (
                      <div
                        className={`rounded-xl border ${badge.bg} ${badge.border} px-2 py-2 text-center shrink-0 min-w-[2.75rem]`}
                      >
                        <p className={`text-[11px] font-black leading-none ${badge.text}`}>
                          {Math.round(round.whoop_recovery!)}%
                        </p>
                        <p className={`text-[8px] font-semibold mt-0.5 opacity-70 ${badge.text}`}>
                          REC
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[#2a3d2c] bg-[#1e3220] px-2 py-2 text-center shrink-0 min-w-[2.75rem]">
                        <p className="text-[11px] font-black leading-none text-gray-600">—</p>
                        <p className="text-[8px] font-semibold mt-0.5 text-gray-700">REC</p>
                      </div>
                    )}

                    {/* Course info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{round.course_name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {new Date(round.date_played).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {round.fairways_hit !== null && round.fairways_possible ? (
                          <span className="text-[10px] text-gray-600">
                            FW {round.fairways_hit}/{round.fairways_possible}
                          </span>
                        ) : null}
                        {round.gir !== null ? (
                          <span className="text-[10px] text-gray-600">GIR {round.gir}/18</span>
                        ) : null}
                        {round.total_putts !== null ? (
                          <span className="text-[10px] text-gray-600">{round.total_putts} putts</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      {round.total_score !== null ? (
                        <>
                          <p className={`text-2xl font-black leading-none ${scoreColor}`}>
                            {round.total_score}
                          </p>
                          {scoreVsPar !== null && (
                            <p className={`text-[11px] font-bold mt-0.5 ${scoreColor}`}>
                              {relDisplay(scoreVsPar)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-2xl font-black text-gray-600">—</p>
                      )}
                    </div>

                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                      className="w-3.5 h-3.5 text-gray-700 shrink-0"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
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

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-3 py-4 text-center">
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mt-1.5">
        {label}
      </p>
    </div>
  )
}
