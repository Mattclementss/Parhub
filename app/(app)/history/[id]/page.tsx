import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function relDisplay(rel: number): string {
  if (rel === 0) return 'E'
  return rel > 0 ? `+${rel}` : `${rel}`
}

function relColor(rel: number): string {
  if (rel <= -2) return 'text-yellow-400'
  if (rel === -1) return 'text-[#4ade80]'
  if (rel === 0) return 'text-[#555]'
  if (rel === 1) return 'text-orange-400'
  return 'text-red-400'
}

function recoveryColor(score: number | null): string {
  if (score === null) return 'text-[#555]'
  if (score >= 67) return 'text-[#4ade80]'
  if (score >= 34) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreChipClass(score: number | null, par: number): string {
  if (score === null) return ''
  const rel = score - par
  if (rel <= -2) return 'bg-yellow-400 text-black rounded-full'
  if (rel === -1) return 'bg-[#4ade80] text-black rounded-full'
  if (rel === 0) return 'text-[#555]'
  if (rel === 1) return 'bg-orange-500 text-white rounded'
  return 'bg-red-500 text-white rounded'
}

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: round } = await supabase
    .from('rounds')
    .select(
      'id, course_name, date_played, total_score, total_putts, fairways_hit, fairways_possible, gir, whoop_recovery, whoop_hrv, whoop_sleep_hours, notes'
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!round) notFound()

  const { data: holes } = await supabase
    .from('holes')
    .select('hole_number, par, yardage, score, putts, fairway_hit, gir')
    .eq('round_id', id)
    .order('hole_number', { ascending: true })

  const holeRows = holes ?? []
  const totalPar = holeRows.reduce((sum, h) => sum + h.par, 0)
  const scoreVsPar =
    round.total_score !== null && totalPar > 0 ? round.total_score - totalPar : null

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center gap-3 h-14">
          <Link href="/history" className="text-[#4ade80] hover:text-white shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">
              {round.course_name}
            </p>
            <p className="text-[#555] text-xs">
              {new Date(round.date_played).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-5 space-y-5">
        {/* Score hero */}
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-1">
              Final Score
            </p>
            <p className="text-6xl font-black text-white leading-none">
              {round.total_score ?? '—'}
            </p>
          </div>
          {scoreVsPar !== null && (
            <div className="text-right">
              <p className={`text-4xl font-black leading-none ${relColor(scoreVsPar)}`}>
                {relDisplay(scoreVsPar)}
              </p>
              <p className="text-xs text-[#555] mt-1">vs par {totalPar}</p>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Putts" value={round.total_putts ?? '—'} />
          <StatCard
            label="Fairways"
            value={
              round.fairways_hit !== null && round.fairways_possible
                ? `${round.fairways_hit}/${round.fairways_possible}`
                : '—'
            }
          />
          <StatCard label="GIR" value={round.gir !== null ? `${round.gir}/18` : '—'} />
        </div>

        {/* WHOOP data */}
        {(round.whoop_recovery !== null ||
          round.whoop_hrv !== null ||
          round.whoop_sleep_hours !== null) && (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
              WHOOP — Day of Round
            </h3>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-[#2a3d2c]">
                <div className="flex flex-col items-center py-3">
                  <span className={`text-lg font-bold leading-none ${recoveryColor(round.whoop_recovery)}`}>
                    {round.whoop_recovery !== null
                      ? `${Math.round(round.whoop_recovery)}%`
                      : '—'}
                  </span>
                  <span className="text-xs text-[#555] mt-1">Recovery</span>
                </div>
                <div className="flex flex-col items-center py-3">
                  <span className="text-lg font-bold text-white leading-none">
                    {round.whoop_hrv !== null ? `${round.whoop_hrv}ms` : '—'}
                  </span>
                  <span className="text-xs text-[#555] mt-1">HRV</span>
                </div>
                <div className="flex flex-col items-center py-3">
                  <span className="text-lg font-bold text-white leading-none">
                    {round.whoop_sleep_hours !== null ? `${round.whoop_sleep_hours}h` : '—'}
                  </span>
                  <span className="text-xs text-[#555] mt-1">Sleep</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Hole-by-hole table */}
        {holeRows.length > 0 && (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
              Scorecard
            </h3>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-7 border-b border-[#2a3d2c] bg-[#111f13] px-3 py-2">
                {['Hole', 'Par', 'Yds', 'Score', 'Putts', 'FIR', 'GIR'].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-[#555] text-center">
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#2a3d2c]">
                {holeRows.map((h) => {
                  const chipClass = scoreChipClass(h.score, h.par)
                  const isStyled = h.score !== null && h.score - h.par !== 0
                  return (
                    <div key={h.hole_number} className="grid grid-cols-7 px-3 py-2 items-center">
                      <span className="text-xs font-bold text-[#999] text-center">
                        {h.hole_number}
                      </span>
                      <span className="text-xs text-[#555] text-center">{h.par}</span>
                      <span className="text-xs text-[#555] text-center">
                        {h.yardage ?? '—'}
                      </span>
                      <div className="flex justify-center">
                        {h.score !== null ? (
                          <span
                            className={`${isStyled ? 'w-7 h-7 flex items-center justify-center text-xs font-bold' : 'text-sm font-medium text-center text-[#999]'} ${chipClass}`}
                          >
                            {h.score}
                          </span>
                        ) : (
                          <span className="text-xs text-[#555]">—</span>
                        )}
                      </div>
                      <span className="text-xs text-[#555] text-center">
                        {h.putts ?? '—'}
                      </span>
                      <span className="text-center">
                        {h.par === 3 ? (
                          <span className="text-[#555] text-xs">—</span>
                        ) : h.fairway_hit === true ? (
                          <span className="text-[#4ade80] text-xs">✓</span>
                        ) : h.fairway_hit === false ? (
                          <span className="text-[#555] text-xs">✗</span>
                        ) : (
                          <span className="text-[#555] text-xs">—</span>
                        )}
                      </span>
                      <span className="text-center">
                        {h.gir === true ? (
                          <span className="text-[#4ade80] text-xs">✓</span>
                        ) : h.gir === false ? (
                          <span className="text-[#555] text-xs">✗</span>
                        ) : (
                          <span className="text-[#555] text-xs">—</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-7 border-t border-[#2a3d2c] bg-[#111f13] px-3 py-2 items-center">
                <span className="text-xs font-bold text-[#999] text-center col-span-2">
                  Total
                </span>
                <span />
                <span className="text-xs font-bold text-white text-center">
                  {round.total_score ?? '—'}
                </span>
                <span className="text-xs font-bold text-white text-center">
                  {round.total_putts ?? '—'}
                </span>
                <span className="text-xs font-bold text-white text-center">
                  {round.fairways_hit ?? '—'}
                </span>
                <span className="text-xs font-bold text-white text-center">
                  {round.gir ?? '—'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Notes */}
        {round.notes && (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
              Notes
            </h3>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-3">
              <p className="text-sm text-[#999] leading-relaxed">{round.notes}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-3 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mt-1">{label}</p>
    </div>
  )
}
