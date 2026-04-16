import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AIInsightsSection from './AIInsightsSection'

// ─── Stat helpers ─────────────────────────────────────────────────────────────

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
}

function pearsonR(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 3) return null
  const xm = xs.reduce((s, x) => s + x, 0) / n
  const ym = ys.reduce((s, y) => s + y, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - xm) * (ys[i] - ym), 0)
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - xm) ** 2, 0) *
    ys.reduce((s, y) => s + (y - ym) ** 2, 0)
  )
  return den === 0 ? null : num / den
}

function linReg(
  xs: number[],
  ys: number[]
): { slope: number; intercept: number; r2: number } | null {
  const n = xs.length
  if (n < 3) return null
  const sumX = xs.reduce((s, x) => s + x, 0)
  const sumY = ys.reduce((s, y) => s + y, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumX2 = xs.reduce((s, x) => s + x ** 2, 0)
  const denom = n * sumX2 - sumX ** 2
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const ym = sumY / n
  const ssTot = ys.reduce((s, y) => s + (y - ym) ** 2, 0)
  const ssRes = xs.reduce((s, x, i) => s + (ys[i] - (slope * x + intercept)) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot)
  return { slope, intercept, r2 }
}

// ─── SVG chart constants ──────────────────────────────────────────────────────

const CL = 44
const CT = 12
const CR = 330
const CB = 188
const CW = CR - CL
const CH = CB - CT

function svgX(recovery: number): number {
  return CL + (recovery / 100) * CW
}

function svgY(score: number, minScore: number, scoreRange: number): number {
  if (scoreRange === 0) return CT + CH / 2
  return CT + CH - ((score - minScore) / scoreRange) * CH
}

function dotFill(recovery: number): string {
  if (recovery >= 67) return '#4ade80'
  if (recovery >= 34) return '#fbbf24'
  return '#f87171'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: rawRounds }, { data: cachedInsights }] = await Promise.all([
    supabase
      .from('rounds')
      .select('total_score, whoop_recovery, whoop_hrv, whoop_sleep_hours')
      .eq('user_id', user.id)
      .not('total_score', 'is', null)
      .order('date_played', { ascending: false }),
    supabase
      .from('insights_cache')
      .select('weekly_summary, pre_round_prediction, pattern_alert, recommended_tee_time, generated_at')
      .eq('user_id', user.id)
      .single(),
  ])

  const allRounds = (rawRounds ?? []) as Array<{
    total_score: number
    whoop_recovery: number | null
    whoop_hrv: number | null
    whoop_sleep_hours: number | null
  }>

  const totalRounds = allRounds.length

  const CACHE_TTL_MS = 6 * 60 * 60 * 1000
  const cachedInsightsForClient =
    cachedInsights &&
    Date.now() - new Date(cachedInsights.generated_at).getTime() < CACHE_TTL_MS
      ? {
          weeklySummary: cachedInsights.weekly_summary ?? '',
          preRoundPrediction: cachedInsights.pre_round_prediction ?? '',
          patternAlert: cachedInsights.pattern_alert ?? null,
          recommendedTeeTime: cachedInsights.recommended_tee_time ?? null,
          generatedAt: cachedInsights.generated_at,
          fromCache: true,
        }
      : null

  // ── Empty / preview state ─────────────────────────────────────────────────
  if (totalRounds < 5) {
    const needed = 5 - totalRounds
    return (
      <div className="min-h-screen bg-[#0d1a0f]">
        <PageHeader />
        <main className="mx-auto max-w-lg px-4 pt-6 pb-10">
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-5 py-10 text-center">
            <p className="text-4xl mb-3">📊</p>
            <h2 className="text-lg font-bold text-white mb-1">Performance Dashboard</h2>
            <p className="text-sm text-[#555] mb-5 max-w-xs mx-auto">
              {totalRounds === 0
                ? 'Log your first round to start building your performance profile.'
                : `You've logged ${totalRounds} round${totalRounds > 1 ? 's' : ''}. ${needed} more to unlock your dashboard.`}
            </p>
            <div className="flex items-center justify-center gap-2.5 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < totalRounds ? 'bg-[#4ade80]' : 'bg-[#2a3d2c]'}`}
                />
              ))}
            </div>
            <p className="text-xs text-[#555] leading-relaxed max-w-xs mx-auto">
              Once unlocked: recovery vs score analysis, scatter plot, personal insights, and
              your biometric consistency score.
            </p>
          </div>

          {totalRounds > 0 && (
            <div className="mt-5 space-y-3 pointer-events-none select-none" aria-hidden>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] px-1">
                Preview
              </p>
              <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden blur-sm opacity-40">
                <div className="px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3">
                    Recovery vs Score
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-[#1a3d1a] p-3 text-center">
                      <p className="text-xl font-bold text-[#4ade80]">—</p>
                      <p className="text-[9px] text-[#555] mt-0.5">Green days</p>
                    </div>
                    <div className="rounded-xl bg-[#3d3010] p-3 text-center">
                      <p className="text-xl font-bold text-[#fbbf24]">—</p>
                      <p className="text-[9px] text-[#555] mt-0.5">Yellow days</p>
                    </div>
                    <div className="rounded-xl bg-[#3d1010] p-3 text-center">
                      <p className="text-xl font-bold text-[#f87171]">—</p>
                      <p className="text-[9px] text-[#555] mt-0.5">Red days</p>
                    </div>
                  </div>
                </div>
                <div className="h-32 bg-[#111f13] mx-4 mb-4 rounded-xl" />
              </div>
              <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] blur-sm opacity-40 h-28" />
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── Data preparation ──────────────────────────────────────────────────────
  const whoopRounds = allRounds.filter((r) => r.whoop_recovery !== null) as Array<{
    total_score: number
    whoop_recovery: number
    whoop_hrv: number | null
    whoop_sleep_hours: number | null
  }>

  const greenScores = whoopRounds.filter((r) => r.whoop_recovery >= 67).map((r) => r.total_score)
  const yellowScores = whoopRounds
    .filter((r) => r.whoop_recovery >= 34 && r.whoop_recovery < 67)
    .map((r) => r.total_score)
  const redScores = whoopRounds.filter((r) => r.whoop_recovery < 34).map((r) => r.total_score)

  const scatter = whoopRounds.map((r) => ({ x: r.whoop_recovery, y: r.total_score }))
  const regression =
    scatter.length >= 3
      ? linReg(scatter.map((p) => p.x), scatter.map((p) => p.y))
      : null

  const scatterScores = scatter.map((p) => p.y)
  const rawMin = Math.min(...scatterScores)
  const rawMax = Math.max(...scatterScores)
  const pad = Math.max(2, Math.round((rawMax - rawMin) * 0.1))
  const minScore = rawMin - pad
  const maxScore = rawMax + pad
  const scoreRange = maxScore - minScore

  const yTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round(rawMin + ((rawMax - rawMin) * i) / 4)
  )

  let trendLine: { x1: number; y1: number; x2: number; y2: number } | null = null
  if (regression) {
    const { slope, intercept } = regression
    const xMin = Math.min(...scatter.map((p) => p.x))
    const xMax = Math.max(...scatter.map((p) => p.x))
    trendLine = {
      x1: svgX(xMin),
      y1: Math.max(CT, Math.min(CB, svgY(slope * xMin + intercept, minScore, scoreRange))),
      x2: svgX(xMax),
      y2: Math.max(CT, Math.min(CB, svgY(slope * xMax + intercept, minScore, scoreRange))),
    }
  }

  // ── Personal insights ─────────────────────────────────────────────────────
  const buckets: Record<string, number[]> = {}
  for (let b = 0; b <= 90; b += 10) buckets[`${b}–${b + 10}%`] = []
  whoopRounds.forEach((r) => {
    const b = Math.min(Math.floor(r.whoop_recovery / 10) * 10, 90)
    buckets[`${b}–${b + 10}%`].push(r.total_score)
  })
  let optimalRange: { label: string; avgScore: number } | null = null
  for (const [label, scores] of Object.entries(buckets)) {
    if (scores.length >= 2) {
      const a = avg(scores)!
      if (!optimalRange || a < optimalRange.avgScore) optimalRange = { label, avgScore: a }
    }
  }

  const metrics: Array<{ name: string; r: number }> = []
  if (whoopRounds.length >= 3) {
    const r = pearsonR(whoopRounds.map((r) => r.whoop_recovery), whoopRounds.map((r) => r.total_score))
    if (r !== null) metrics.push({ name: 'Recovery score', r })
  }
  const hrvRounds = whoopRounds.filter((r) => r.whoop_hrv !== null) as typeof whoopRounds & { whoop_hrv: number }[]
  if (hrvRounds.length >= 3) {
    const r = pearsonR(hrvRounds.map((r) => Number(r.whoop_hrv)), hrvRounds.map((r) => r.total_score))
    if (r !== null) metrics.push({ name: 'HRV', r })
  }
  const sleepRounds = whoopRounds.filter((r) => r.whoop_sleep_hours !== null)
  if (sleepRounds.length >= 3) {
    const r = pearsonR(sleepRounds.map((r) => Number(r.whoop_sleep_hours)), sleepRounds.map((r) => r.total_score))
    if (r !== null) metrics.push({ name: 'Sleep hours', r })
  }
  const bestMetric =
    metrics.length > 0
      ? metrics.reduce((best, m) => (Math.abs(m.r) > Math.abs(best.r) ? m : best))
      : null

  const sleep8Plus = allRounds.filter((r) => r.whoop_sleep_hours !== null && Number(r.whoop_sleep_hours) >= 8).map((r) => r.total_score)
  const sleep6to8 = allRounds.filter((r) => r.whoop_sleep_hours !== null && Number(r.whoop_sleep_hours) >= 6 && Number(r.whoop_sleep_hours) < 8).map((r) => r.total_score)
  const sleepUnder6 = allRounds.filter((r) => r.whoop_sleep_hours !== null && Number(r.whoop_sleep_hours) < 6).map((r) => r.total_score)
  const hasSleepData = sleep8Plus.length + sleep6to8.length + sleepUnder6.length >= 3

  const consistencyPct = regression !== null ? Math.round(regression.r2 * 100) : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d1a0f]">
      <PageHeader />

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">

        {/* AI Insights */}
        <AIInsightsSection cached={cachedInsightsForClient} />

        {/* Zone averages */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
            Recovery vs Score
          </h3>
          {whoopRounds.length === 0 ? (
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-6 text-center">
              <p className="text-sm text-[#555]">
                Connect WHOOP and log rounds with recovery data to see zone averages.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <ZoneCard zone="green" scores={greenScores} range="67–100%" />
              <ZoneCard zone="yellow" scores={yellowScores} range="34–66%" />
              <ZoneCard zone="red" scores={redScores} range="0–33%" />
            </div>
          )}
        </section>

        {/* Scatter plot */}
        {scatter.length >= 3 ? (
          <section>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555]">
                Recovery Scatter Plot
              </h3>
              {regression && (
                <span className="text-[10px] text-[#555]">R² = {regression.r2.toFixed(2)}</span>
              )}
            </div>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-1 pt-3 pb-2">
              <svg viewBox={`0 0 340 ${CB + 22}`} width="100%" aria-label="WHOOP recovery vs golf score scatter plot">
                <rect x={CL} y={CT} width={CW} height={CH} fill="#111f13" rx="3" />

                {[0, 25, 50, 75, 100].map((v) => {
                  const x = svgX(v)
                  return (
                    <g key={v}>
                      <line x1={x} y1={CT} x2={x} y2={CB} stroke="#2a3d2c" strokeWidth="0.5" strokeDasharray="3,3" />
                      <text x={x} y={CB + 11} textAnchor="middle" fontSize="8" fill="#555">{v}</text>
                    </g>
                  )
                })}

                {yTicks.map((v) => {
                  const y = svgY(v, minScore, scoreRange)
                  return (
                    <g key={v}>
                      <line x1={CL} y1={y} x2={CR} y2={y} stroke="#2a3d2c" strokeWidth="0.5" strokeDasharray="3,3" />
                      <text x={CL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#555">{v}</text>
                    </g>
                  )
                })}

                <line x1={CL} y1={CT} x2={CL} y2={CB} stroke="#2a3d2c" strokeWidth="1" />
                <line x1={CL} y1={CB} x2={CR} y2={CB} stroke="#2a3d2c" strokeWidth="1" />

                {trendLine && (
                  <line
                    x1={trendLine.x1} y1={trendLine.y1}
                    x2={trendLine.x2} y2={trendLine.y2}
                    stroke="#4ade80" strokeWidth="1.5"
                    strokeDasharray="5,4" opacity="0.35"
                  />
                )}

                {scatter.map((p, i) => (
                  <circle
                    key={i}
                    cx={svgX(p.x)}
                    cy={svgY(p.y, minScore, scoreRange)}
                    r="4.5"
                    fill={dotFill(p.x)}
                    fillOpacity="0.82"
                    stroke="#0d1a0f"
                    strokeWidth="1"
                  />
                ))}

                <text x={(CL + CR) / 2} y={CB + 21} textAnchor="middle" fontSize="8" fill="#555">
                  Recovery Score
                </text>
                <text x={9} y={(CT + CB) / 2} textAnchor="middle" fontSize="8" fill="#555"
                  transform={`rotate(-90,9,${(CT + CB) / 2})`}>
                  Score
                </text>
              </svg>

              <div className="flex items-center justify-center gap-4 pb-1">
                {[
                  { label: '67–100%', color: 'bg-[#4ade80]' },
                  { label: '34–66%', color: 'bg-[#fbbf24]' },
                  { label: '0–33%', color: 'bg-[#f87171]' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-[9px] text-[#555]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : whoopRounds.length > 0 ? (
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-5 text-center">
            <p className="text-sm font-medium text-[#999]">Recovery Scatter Plot</p>
            <p className="text-xs text-[#555] mt-1">
              {Math.max(0, 3 - whoopRounds.length)} more round
              {3 - whoopRounds.length !== 1 ? 's' : ''} with WHOOP data needed.
            </p>
          </div>
        ) : null}

        {/* Personal insights */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
            Personal Insights
          </h3>
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
            <div className="px-4 py-4 flex items-start gap-3">
              <span className="text-lg mt-0.5">🎯</span>
              <div>
                <p className="text-sm font-bold text-white">Optimal recovery range</p>
                {optimalRange ? (
                  <>
                    <p className="text-sm font-bold text-[#4ade80] mt-0.5">{optimalRange.label}</p>
                    <p className="text-xs text-[#555] mt-0.5">Avg score: {optimalRange.avgScore}</p>
                  </>
                ) : (
                  <p className="text-xs text-[#555] mt-0.5">
                    {whoopRounds.length < 5
                      ? `${Math.max(0, 5 - whoopRounds.length)} more WHOOP rounds needed`
                      : 'Need 2+ rounds in the same zone'}
                  </p>
                )}
              </div>
            </div>

            <div className="px-4 py-4 flex items-start gap-3">
              <span className="text-lg mt-0.5">📈</span>
              <div>
                <p className="text-sm font-bold text-white">Best predictor of your score</p>
                {bestMetric ? (
                  <>
                    <p className="text-sm font-bold text-[#4ade80] mt-0.5">{bestMetric.name}</p>
                    <p className="text-xs text-[#555] mt-0.5">
                      r = {bestMetric.r > 0 ? '+' : ''}{bestMetric.r.toFixed(2)} (
                      {Math.abs(bestMetric.r) >= 0.5 ? 'strong' : Math.abs(bestMetric.r) >= 0.3 ? 'moderate' : 'weak'}{' '}
                      correlation)
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[#555] mt-0.5">Not enough WHOOP data yet</p>
                )}
              </div>
            </div>

            <div className="px-4 py-4 flex items-start gap-3">
              <span className="text-lg mt-0.5">😴</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Sleep impact on score</p>
                {hasSleepData ? (
                  <div className="flex gap-2 mt-2">
                    <SleepBand label="8h+" scores={sleep8Plus} />
                    <SleepBand label="6–8h" scores={sleep6to8} />
                    <SleepBand label="<6h" scores={sleepUnder6} />
                  </div>
                ) : (
                  <p className="text-xs text-[#555] mt-0.5">Not enough sleep data yet</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Biometric consistency */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
            Biometric Consistency
          </h3>
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-5">
            {consistencyPct !== null ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white leading-snug">
                    Recovery explains{' '}
                    <span className={consistencyPct >= 40 ? 'text-[#4ade80]' : consistencyPct >= 20 ? 'text-yellow-400' : 'text-[#555]'}>
                      {consistencyPct}%
                    </span>{' '}
                    of your score variance
                  </p>
                  <p className="text-xs text-[#555] mt-2 leading-relaxed">
                    {consistencyPct >= 40
                      ? 'Your physical state strongly drives your scoring. Prioritize recovery before important rounds.'
                      : consistencyPct >= 20
                      ? 'Moderate link between your body and your game. Recovery matters alongside other factors.'
                      : 'Your score appears largely independent of recovery. Mental focus or course conditions may be bigger drivers.'}
                  </p>
                </div>
                <ConsistencyRing pct={consistencyPct} />
              </div>
            ) : (
              <p className="text-sm text-[#555] text-center py-2">
                Connect WHOOP and log more rounds to see your consistency score.
              </p>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

// ─── Components ───────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
      <div className="mx-auto max-w-lg flex items-center h-14">
        <h1 className="text-lg font-black text-white">Performance</h1>
      </div>
    </header>
  )
}

function ZoneCard({ zone, scores, range }: { zone: 'green' | 'yellow' | 'red'; scores: number[]; range: string }) {
  const cfg = {
    green:  { label: 'Green Days',  bg: 'bg-[#1a3d1a]',  border: 'border-[#2a5a2a]',  text: 'text-[#4ade80]',  dot: 'bg-[#4ade80]'  },
    yellow: { label: 'Yellow Days', bg: 'bg-[#3d3010]',  border: 'border-[#5a4a20]',  text: 'text-[#fbbf24]', dot: 'bg-[#fbbf24]' },
    red:    { label: 'Red Days',    bg: 'bg-[#3d1010]',  border: 'border-[#5a2020]',  text: 'text-[#f87171]', dot: 'bg-[#f87171]'  },
  }[zone]

  const a = avg(scores)

  return (
    <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} px-2 py-3 text-center`}>
      <div className={`w-2 h-2 rounded-full ${cfg.dot} mx-auto mb-1.5`} />
      <p className={`text-[11px] font-semibold ${cfg.text} leading-tight`}>{cfg.label}</p>
      <p className="text-[9px] text-[#555] mb-2">{range}</p>
      {scores.length >= 2 ? (
        <>
          <p className={`text-2xl font-black ${cfg.text} leading-none`}>{a}</p>
          <p className="text-[9px] text-[#555] mt-1">avg · {scores.length}r</p>
        </>
      ) : (
        <p className="text-[9px] text-[#555] leading-tight mt-1">
          {scores.length === 0 ? 'No data' : 'Need 2+ rounds'}
        </p>
      )}
    </div>
  )
}

function SleepBand({ label, scores }: { label: string; scores: number[] }) {
  const a = avg(scores)
  return (
    <div className="flex-1 rounded-xl bg-[#111f13] border border-[#2a3d2c] px-2 py-2.5 text-center">
      <p className="text-sm font-black text-white leading-none">{a !== null ? a : '—'}</p>
      <p className="text-[10px] font-medium text-[#555] mt-1">{label}</p>
      <p className="text-[8px] text-[#555] mt-0.5">{scores.length} rounds</p>
    </div>
  )
}

function ConsistencyRing({ pct }: { pct: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 40 ? '#4ade80' : pct >= 20 ? '#fbbf24' : '#555'

  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0" aria-hidden>
      <circle cx="34" cy="34" r={r} fill="none" stroke="#2a3d2c" strokeWidth="6" />
      <circle
        cx="34" cy="34" r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
      />
      <text x="34" y="34" textAnchor="middle" dominantBaseline="middle"
        fontSize="11" fontWeight="700" fill="white">
        {pct}%
      </text>
    </svg>
  )
}
