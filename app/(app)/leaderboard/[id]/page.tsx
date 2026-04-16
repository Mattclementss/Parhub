import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function recoveryColor(score: number | null): string {
  if (score === null) return 'text-[#555]'
  if (score >= 67) return 'text-[#4ade80]'
  if (score >= 34) return 'text-yellow-400'
  return 'text-red-400'
}

export default async function FriendProfilePage({
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

  if (id === user.id) redirect('/profile')

  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', user.id)
    .eq('friend_id', id)
    .single()

  if (!friendship) notFound()

  const [{ data: profile }, { data: rounds }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('id', id).single(),
    supabase
      .from('rounds')
      .select('id, course_name, date_played, total_score, total_putts, gir, whoop_recovery')
      .eq('user_id', id)
      .not('total_score', 'is', null)
      .order('date_played', { ascending: false })
      .limit(20),
  ])

  if (!profile) notFound()

  const allRounds = rounds ?? []
  const scores = allRounds.map((r) => r.total_score as number)
  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10
    : null
  const bestScore = scores.length > 0 ? Math.min(...scores) : null

  const displayName = profile.full_name ?? profile.email

  return (
    <div className="pb-10">
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center gap-3 h-14">
          <Link href="/leaderboard" className="text-[#4ade80] hover:text-white shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <p className="text-white font-bold text-sm truncate">{displayName}</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-5 space-y-5">
        {/* Profile card */}
        <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-5 py-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#1a3d1a] flex items-center justify-center text-2xl font-bold text-[#4ade80] shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white">{displayName}</p>
            <p className="text-sm text-[#555]">{profile.email}</p>
            <p className="text-xs text-[#555] mt-0.5">{allRounds.length} rounds logged</p>
          </div>
        </div>

        {/* Season stats */}
        {allRounds.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Avg Score" value={avgScore ?? '—'} />
            <StatCard label="Best Round" value={bestScore ?? '—'} />
            <StatCard label="Rounds" value={allRounds.length} />
          </div>
        ) : (
          <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] px-4 py-8 text-center">
            <p className="text-sm text-[#555]">No rounds logged yet</p>
          </div>
        )}

        {/* Recent rounds */}
        {allRounds.length > 0 && (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-2 px-1">
              Recent Rounds
            </h3>
            <div className="rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] divide-y divide-[#2a3d2c] overflow-hidden">
              {allRounds.slice(0, 10).map((round) => (
                <div key={round.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">
                      {round.course_name}
                    </p>
                    <p className="text-xs text-[#555] mt-0.5">
                      {new Date(round.date_played).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {round.whoop_recovery !== null && (
                      <span className={`text-xs font-bold ${recoveryColor(round.whoop_recovery)}`}>
                        {Math.round(round.whoop_recovery)}%
                      </span>
                    )}
                    {round.total_score !== null && (
                      <span className="text-xl font-black text-white leading-none">
                        {round.total_score}
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
