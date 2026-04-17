import { Skeleton, SkeletonCard } from '@/app/components/Skeleton'

export default function LeaderboardLoading() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-4">
        {/* Tab switcher */}
        <Skeleton className="h-12 w-full rounded-2xl" />

        {/* Leaderboard rows */}
        <section>
          <Skeleton className="h-2.5 w-32 mb-2" />
          <SkeletonCard>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2a3d2c] last:border-0">
                <Skeleton className="w-8 h-5 shrink-0" />
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-7 w-10 shrink-0" />
              </div>
            ))}
          </SkeletonCard>
        </section>
      </main>
    </>
  )
}
