import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getWhoopData } from '@/lib/whoop/client'
import { getOrGenerateDailyInsight } from '@/lib/ai/insights'
import BottomNav from '@/app/components/BottomNav'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning,'
  if (hour < 17) return 'Good afternoon,'
  return 'Good evening,'
}

function recoveryZone(score: number | null): 'green' | 'yellow' | 'red' | null {
  if (score === null) return null
  if (score >= 67) return 'green'
  if (score >= 34) return 'yellow'
  return 'red'
}

const ZONE_COLORS = {
  green:  { stroke: '#4ade80', text: 'text-[#4ade80]',  bg: 'bg-[#1a3d1a]', border: 'border-[#2a5a2a]', label: 'GREEN'  },
  yellow: { stroke: '#fbbf24', text: 'text-[#fbbf24]',  bg: 'bg-[#3d3010]', border: 'border-[#5a4a20]', label: 'YELLOW' },
  red:    { stroke: '#f87171', text: 'text-[#f87171]',  bg: 'bg-[#3d1010]', border: 'border-[#5a2020]', label: 'RED'    },
}

function friendRecoveryBadge(score: number): string {
  if (score >= 67) return 'bg-[#1a3d1a] text-[#4ade80]'
  if (score >= 34) return 'bg-[#3d3010] text-[#fbbf24]'
  return 'bg-[#3d1010] text-[#f87171]'
}

// ─── SVG Recovery Circle (84px) ───────────────────────────────────────────────

function RecoveryCircle({ score }: { score: number | null }) {
  const r = 33
  const circ = 2 * Math.PI * r
  const zone = recoveryZone(score)
  const strokeColor = zone ? ZONE_COLORS[zone].stroke : '#2a3d2c'
  const bgStroke = '#1a3d1a'
  const dash = score !== null ? (score / 100) * circ : 0

  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
      <circle cx="42" cy="42" r={r} fill="none" stroke={bgStroke} strokeWidth="6" />
      {score !== null && (
        <circle
          cx="42" cy="42" r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 42 42)"
        />
      )}
      <text x="42" y="38" textAnchor="middle" fontSize="18" fontWeight="900" fill="white">
        {score !== null ? Math.round(score) : '—'}
      </text>
      <text x="42" y="52" textAnchor="middle" fontSize="8" fontWeight="700"
        fill={strokeColor} letterSpacing="1.5">
        {zone ? ZONE_COLORS[zone].label : 'NO DATA'}
      </text>
    </svg>
  )
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────

function WeeklyBars({
  weekData,
}: {
  weekData: Array<{ day: string; recovery: number | null; isToday: boolean }>
}) {
  const MAX_H = 36

  return (
    <div className="flex items-end gap-1.5">
      {weekData.map(({ day, recovery, isToday }, i) => {
        const zone = recoveryZone(recovery)
        const barColor = zone ? ZONE_COLORS[zone].stroke : '#2a3d2c'
        const height = recovery !== null ? Math.max(5, (recovery / 100) * MAX_H) : 5

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div style={{ height: MAX_H }} className="flex items-end w-full">
              <div
                style={{ height: `${height}px`, backgroundColor: barColor }}
                className="w-full rounded-sm transition-all"
              />
            </div>
            <span className={`text-[9px] font-semibold ${isToday ? 'text-[#4ade80]' : 'text-[#555]'}`}>
              {day}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const [
    { data: rounds },
    { count: pendingCount },
    { data: whoopToken },
    { data: friendships },
  ] = await Promise.all([
    supabase
      .from('rounds')
      .select('id, course_name, date_played, total_score, gir, total_putts, fairways_hit, fairways_possible, whoop_recovery')
      .eq('user_id', user.id)
      .order('date_played', { ascending: false })
      .limit(30),
    supabase
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending'),
    supabase.from('whoop_tokens').select('user_id').eq('user_id', user.id).single(),
    supabase.from('friendships').select('friend_id').eq('user_id', user.id),
  ])

  const allRounds = rounds ?? []
  const lastRound = allRounds[0] ?? null
  const pendingFriendRequests = pendingCount ?? 0
  const friendIds = (friendships ?? []).map((f) => f.friend_id)

  // WHOOP
  const whoopData = whoopToken ? await getWhoopData(user.id).catch(() => null) : null

  // AI insight (cached daily, non-blocking)
  const insight = whoopToken ? await getOrGenerateDailyInsight(user.id).catch(() => null) : null

  // Weekly chart — built from WHOOP API data (weeklyRecovery), not Supabase rounds
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const record = whoopData?.weeklyRecovery.find((r) => r.date === dateStr)
    return {
      day: DAY_LABELS[i],
      recovery: record?.score ?? null,
      isToday: dateStr === todayStr,
    }
  })

  // Pattern: green vs red recovery
  const greenRounds = allRounds.filter((r) => r.whoop_recovery !== null && r.whoop_recovery >= 67 && r.total_score !== null)
  const redRounds = allRounds.filter((r) => r.whoop_recovery !== null && r.whoop_recovery < 34 && r.total_score !== null)
  const greenAvg = greenRounds.length >= 2 ? greenRounds.reduce((s, r) => s + r.total_score, 0) / greenRounds.length : null
  const redAvg = redRounds.length >= 2 ? redRounds.reduce((s, r) => s + r.total_score, 0) / redRounds.length : null
  const patternShots = greenAvg !== null && redAvg !== null ? Math.round(redAvg - greenAvg) : null

  // Friends today (phase 2)
  type FriendToday = { name: string; score: number | null; recovery: number | null }
  let friendsToday: FriendToday[] = []
  if (friendIds.length > 0) {
    const [{ data: friendProfiles }, { data: todayRounds }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('id', friendIds),
      supabase
        .from('rounds')
        .select('user_id, total_score, whoop_recovery')
        .in('user_id', friendIds)
        .eq('date_played', todayStr),
    ])
    const profileMap = Object.fromEntries((friendProfiles ?? []).map((p) => [p.id, p]))
    friendsToday = (todayRounds ?? []).map((r) => ({
      name: profileMap[r.user_id]?.full_name ?? profileMap[r.user_id]?.email ?? 'Friend',
      score: r.total_score,
      recovery: r.whoop_recovery,
    }))
  }

  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#0d1a0f]">
      {/* Header */}
      <header className="px-5 pt-14 pb-2">
        <div className="mx-auto max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-0.5">
            {dateStr}
          </p>
          <h1 className="text-2xl font-black text-white leading-tight">
            {greeting()}<br />
            <em className="not-italic text-[#4ade80]">ready to play.</em>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">

        {/* WHOOP Recovery */}
        {whoopToken ? (
          <>
            {/* Recovery circle + AI insight + biometrics */}
            <section className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-4">
              <div className="flex items-start gap-3">
                <RecoveryCircle score={whoopData?.recoveryScore ?? null} />
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <p className="text-sm text-[#999] leading-snug">
                    {insight?.preRoundPrediction ?? (
                      allRounds.length === 0
                        ? 'Play a round while wearing your WHOOP to unlock AI performance insights.'
                        : 'Log more rounds to unlock personalized AI insights.'
                    )}
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-[#111f13] border border-[#2a3d2c] px-2.5 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]">HRV</p>
                      <p className="text-base font-black text-white leading-none mt-0.5">
                        {whoopData?.hrv != null ? `${whoopData.hrv}ms` : '—'}
                      </p>
                    </div>
                    <div className="flex-1 rounded-lg bg-[#111f13] border border-[#2a3d2c] px-2.5 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]">Sleep</p>
                      <p className="text-base font-black text-white leading-none mt-0.5">
                        {whoopData?.sleepHours != null ? `${whoopData.sleepHours}h` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* YOUR PATTERN */}
            {patternShots !== null && patternShots !== 0 ? (
              <section className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-4 flex items-center gap-3">
                <span className="text-2xl shrink-0">🧠</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-1">
                    Your Pattern
                  </p>
                  <p className="text-sm font-bold text-white leading-snug">
                    You score{' '}
                    <span className="text-[#4ade80]">
                      {patternShots} shot{patternShots !== 1 ? 's' : ''} better
                    </span>{' '}
                    on green recovery days vs red days
                  </p>
                </div>
              </section>
            ) : allRounds.length === 0 ? (
              <section className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-4 flex items-center gap-3">
                <span className="text-2xl shrink-0">🧠</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-1">
                    Your Pattern
                  </p>
                  <p className="text-sm text-[#555] leading-snug">
                    Play a round while wearing your WHOOP to see how recovery affects your game.
                  </p>
                </div>
              </section>
            ) : null}

            {/* THIS WEEK */}
            <section className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-4">
                This Week
              </p>
              <WeeklyBars weekData={weekData} />
            </section>
          </>
        ) : (
          /* Connect WHOOP banner */
          <Link
            href="/api/whoop/connect"
            className="flex items-center justify-between gap-3 w-full rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-3.5 hover:bg-[#1e3220] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#111f13] border border-[#2a3d2c] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-black">W</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Connect WHOOP</p>
                <p className="text-xs text-[#555] mt-0.5">See recovery &amp; sleep data</p>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#555] shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {/* Last Round + Log Round */}
        <div className="flex gap-3">
          {/* LAST ROUND */}
          {lastRound ? (
            <Link
              href={`/history/${lastRound.id}`}
              className="flex-1 rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-4 flex flex-col gap-2 hover:bg-[#1e3220] transition-colors"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555]">
                Last Round
              </p>
              <p className="text-4xl font-black text-white leading-none">
                {lastRound.total_score ?? '—'}
              </p>
              <div>
                <p className="text-[11px] text-[#555]">
                  {new Date(lastRound.date_played).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                {lastRound.whoop_recovery !== null ? (
                  <p className={`text-[11px] font-semibold ${lastRound.whoop_recovery >= 67 ? 'text-[#4ade80]' : lastRound.whoop_recovery >= 34 ? 'text-[#fbbf24]' : 'text-[#f87171]'}`}>
                    Recovery {Math.round(lastRound.whoop_recovery)}%
                  </p>
                ) : (
                  <p className="text-[11px] text-[#555]">Recovery N/A</p>
                )}
              </div>
              {/* Stat boxes */}
              <div className="flex gap-1.5">
                <div className="flex-1 rounded-lg bg-[#111f13] border border-[#2a3d2c] px-1.5 py-1.5 text-center">
                  <p className="text-[8px] font-semibold uppercase tracking-[1px] text-[#555]">FW</p>
                  <p className="text-xs font-black text-white mt-0.5">
                    {lastRound.fairways_hit !== null && lastRound.fairways_possible
                      ? `${lastRound.fairways_hit}/${lastRound.fairways_possible}`
                      : 'N/A'}
                  </p>
                </div>
                <div className="flex-1 rounded-lg bg-[#111f13] border border-[#2a3d2c] px-1.5 py-1.5 text-center">
                  <p className="text-[8px] font-semibold uppercase tracking-[1px] text-[#555]">GIR</p>
                  <p className="text-xs font-black text-white mt-0.5">
                    {lastRound.gir !== null ? `${lastRound.gir}/18` : 'N/A'}
                  </p>
                </div>
                <div className="flex-1 rounded-lg bg-[#111f13] border border-[#2a3d2c] px-1.5 py-1.5 text-center">
                  <p className="text-[8px] font-semibold uppercase tracking-[1px] text-[#555]">Putts</p>
                  <p className="text-xs font-black text-white mt-0.5">
                    {lastRound.total_putts ?? 'N/A'}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex-1 rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-4 flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555]">Last Round</p>
              <p className="text-4xl font-black text-[#555] leading-none">—</p>
              <p className="text-xs text-[#555]">No rounds yet</p>
            </div>
          )}

          {/* LOG ROUND */}
          <Link
            href="/log-round"
            className="w-20 rounded-2xl bg-[#4ade80] flex flex-col items-center justify-center gap-2 hover:bg-[#22c55e] active:scale-[0.97] transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-black/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-black">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-xs font-black text-black text-center leading-tight">Log<br/>Round</span>
          </Link>
        </div>

        {/* FRIENDS TODAY */}
        {friendIds.length > 0 && (
          <section className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3">
              Friends Today
            </p>
            {friendsToday.length === 0 ? (
              <p className="text-sm text-[#555]">None out on the course today.</p>
            ) : (
              <div className="space-y-3">
                {friendsToday.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white truncate">
                      {f.name.split(' ')[0]}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.recovery !== null && (
                        <span className={`text-[10px] font-bold rounded-lg px-2 py-0.5 ${friendRecoveryBadge(f.recovery)}`}>
                          {Math.round(f.recovery)}%
                        </span>
                      )}
                      {f.score !== null && (
                        <p className="text-xl font-black text-white leading-none">{f.score}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      <BottomNav pendingFriendRequests={pendingFriendRequests} />
    </div>
  )
}
