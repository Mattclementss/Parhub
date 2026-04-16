import { Skeleton, SkeletonCard } from '@/app/components/Skeleton'

export default function DashboardLoading() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center h-14">
          <Skeleton className="h-5 w-28" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">
        {/* Zone cards */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="px-3 py-4 space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-20" />
            </SkeletonCard>
          ))}
        </div>

        {/* Chart cards */}
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} className="p-4 space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </SkeletonCard>
        ))}
      </main>
    </>
  )
}
