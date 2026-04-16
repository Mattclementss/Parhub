import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function recoveryBadgeStyle(score: number | null): string {
  if (score === null) return ''
  if (score >= 67) return 'bg-[#1a3d1a] text-[#4ade80]'
  if (score >= 34) return 'bg-[#3d3010] text-[#fbbf24]'
  return 'bg-[#3d1010] text-[#f87171]'
}

function rankBadge(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}`
}

function weekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const isWeek = tab === 'week'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', user.id)
    .single()

  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', user.id)

  const friendIds = (friendships ?? []).map((f) => f.friend_id)
  const allIds = [user.id, ...friendIds]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', allIds)

  const roundsQuery = supabase
    .from('rounds')
    .select('user_id, total_score, date_played, whoop_recovery')
    .in('user_id', allIds)
    .not('total_score', 'is', null)

  if (isWeek) {
    roundsQuery.gte('date_played', weekStart())
  }

  const { data: rounds } = await roundsQuery

  const allRounds = (rounds ?? []) as Array<{
    user_id: string
    total_score: number
    date_played: string
    whoop_recovery: number | null
  }>

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  type LeaderboardRow = {
    userId: string
    name: string
    rounds: number
    avgScore: number | null
    bestScore: number | null
    latestRecovery: number | null
    isMe: boolean
  }

  const rows: LeaderboardRow[] = allIds.map((uid) => {
    const userRounds = allRounds.filter((r) => r.user_id === uid)
    const scores = userRounds.map((r) => r.total_score)
    const p = profileMap[uid]
    const sortedByDate = [...userRounds].sort(
      (a, b) => new Date(b.date_played).getTime() - new Date(a.date_played).getTime()
    )
    const latestRecovery = sortedByDate.find((r) => r.whoop_recovery !== null)?.whoop_recovery ?? null
    return {
      userId: uid,
      name: p?.full_name ?? p?.email ?? 'Unknown',
      rounds: scores.length,
      avgScore: scores.length > 0
        ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10
        : null,
      bestScore: scores.length > 0 ? Math.min(...scores) : null,
      latestRecovery,
      isMe: uid === user.id,
    }
  })

  const ranked = [...rows].sort((a, b) => {
    if (a.avgScore === null && b.avgScore === null) return 0
    if (a.avgScore === null) return 1
    if (b.avgScore === null) return -1
    return a.avgScore - b.avgScore
  })

  const meRow = ranked.find((r) => r.isMe)
  const myRank = meRow ? ranked.indexOf(meRow) + 1 : null

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <h1 className="text-lg font-black text-white">Leaderboard</h1>
          <Link href="/profile" className="text-sm font-medium text-[#4ade80] hover:text-white transition-colors">
            Friends
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-4">
        {/* Tab switcher */}
        <div className="flex rounded-2xl border border-[#2a3d2c] bg-[#1a2e1d] overflow-hidden">
          <Link
            href="/leaderboard"
            className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${
              !isWeek ? 'bg-[#4ade80] text-black' : 'text-[#555] hover:text-[#999]'
            }`}
          >
            Season
          </Link>
          <Link
            href="/leaderboard?tab=week"
            className={`flex-1 py-3 text-sm font-bold text-center border-l border-[#2a3d2c] transition-colors ${
              isWeek ? 'bg-[#4ade80] text-black' : 'text-[#555] hover:text-[#999]'
            }`}
          >
            This Week
          </Link>
        </div>

        {/* My rank callout */}
        {myRank && myRank > 1 && meRow?.avgScore !== null && (
          <div className="rounded-2xl bg-[#1a3d1a] border border-[#2a5a2a] px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#4ade80]">Your rank</p>
            <p className="text-lg font-black text-[#4ade80]">#{myRank}</p>
          </div>
        )}

        {/* No friends yet */}
        {friendIds.length === 0 && (
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-6 text-center">
            <p className="text-2xl mb-2">🤝</p>
            <p className="text-sm font-bold text-white">Add friends to compete</p>
            <p className="text-xs text-[#555] mt-1 mb-4">
              You're only competing against yourself right now.
            </p>
            <Link
              href="/profile"
              className="inline-block rounded-xl bg-[#4ade80] px-4 py-2 text-sm font-black text-black hover:bg-[#22c55e] transition-colors"
            >
              Add Friends
            </Link>
          </div>
        )}

        {/* Leaderboard table */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
            {isWeek ? 'Best Round This Week' : 'Scoring Average'}
          </h3>
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
            {ranked.map((row, idx) => {
              const rank = idx + 1
              const displayScore = isWeek ? row.bestScore : row.avgScore
              return (
                <Link
                  key={row.userId}
                  href={`/leaderboard/${row.userId}`}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-[#1e3220] active:bg-[#223527] transition-colors ${
                    row.isMe ? 'bg-[#1a3d1a]/40' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 shrink-0 text-center">
                    {rank <= 3 ? (
                      <span className="text-lg leading-none">{rankBadge(rank)}</span>
                    ) : (
                      <span className="text-sm font-bold text-[#555]">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      row.isMe ? 'bg-[#1a3d1a] text-[#4ade80]' : 'bg-[#111f13] text-[#999]'
                    }`}
                  >
                    {row.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + stats */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {row.name}{row.isMe ? ' (you)' : ''}
                    </p>
                    <p className="text-xs text-[#555] mt-0.5">
                      {row.rounds} round{row.rounds !== 1 ? 's' : ''}
                      {row.bestScore !== null && !isWeek ? ` · best ${row.bestScore}` : ''}
                    </p>
                  </div>

                  {/* Recovery badge */}
                  {row.latestRecovery !== null && (
                    <div
                      className={`rounded-lg px-2 py-1 text-[10px] font-bold shrink-0 ${recoveryBadgeStyle(row.latestRecovery)}`}
                    >
                      {Math.round(row.latestRecovery)}%
                    </div>
                  )}

                  {/* Score */}
                  <div className="text-right shrink-0 min-w-[3rem]">
                    {displayScore !== null ? (
                      <p className="text-xl font-black text-white leading-none">{displayScore}</p>
                    ) : (
                      <p className="text-sm text-[#555]">—</p>
                    )}
                  </div>

                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                    className="w-4 h-4 text-[#555] shrink-0"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              )
            })}
          </div>
        </section>

        {/* This week: no rounds yet */}
        {isWeek && ranked.every((r) => r.rounds === 0) && (
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-8 text-center">
            <p className="text-3xl mb-2">⛳</p>
            <p className="text-sm font-bold text-white">No rounds this week yet</p>
            <p className="text-xs text-[#555] mt-1">
              Be the first to get out and log a round.
            </p>
          </div>
        )}
      </main>
    </>
  )
}
