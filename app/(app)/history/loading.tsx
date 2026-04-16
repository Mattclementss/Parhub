import { Skeleton, SkeletonCard } from '@/app/components/Skeleton'

export default function HistoryLoading() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center justify-between h-14">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="px-3 py-4 flex flex-col items-center gap-2">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-2.5 w-16" />
            </SkeletonCard>
          ))}
        </div>

        {/* Round rows */}
        <SkeletonCard>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2a3d2c] last:border-0">
              <Skeleton className="w-11 h-11 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-7 w-8 shrink-0" />
            </div>
          ))}
        </SkeletonCard>
      </main>
    </>
  )
}
