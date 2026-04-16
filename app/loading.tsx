import { Skeleton, SkeletonCard } from '@/app/components/Skeleton'

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[#0d1a0f]">
      {/* Header */}
      <div className="px-5 pt-14 pb-2">
        <div className="mx-auto max-w-lg">
          <Skeleton className="h-3 w-32 mb-2" />
          <Skeleton className="h-7 w-48 mb-1" />
          <Skeleton className="h-7 w-36" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* Recovery card */}
        <SkeletonCard className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-[84px] h-[84px] rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="flex-1 h-10 rounded-lg" />
                <Skeleton className="flex-1 h-10 rounded-lg" />
              </div>
            </div>
          </div>
        </SkeletonCard>

        {/* Pattern card */}
        <SkeletonCard className="p-4 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        </SkeletonCard>

        {/* Weekly chart */}
        <SkeletonCard className="p-4">
          <Skeleton className="h-3 w-20 mb-4" />
          <div className="flex items-end gap-1.5 h-9">
            {[0.6, 0.8, 0.4, 1, 0.7, 0.5, 0.9].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end" style={{ height: 36 }}>
                  <div
                    className="w-full rounded-sm animate-pulse bg-[#2a3d2c]"
                    style={{ height: `${h * 36}px` }}
                  />
                </div>
                <Skeleton className="h-2 w-2 rounded-none" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Last round + log round */}
        <div className="flex gap-3">
          <SkeletonCard className="flex-1 p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-1.5 pt-1">
              <Skeleton className="flex-1 h-10 rounded-lg" />
              <Skeleton className="flex-1 h-10 rounded-lg" />
              <Skeleton className="flex-1 h-10 rounded-lg" />
            </div>
          </SkeletonCard>
          <Skeleton className="w-20 rounded-2xl" />
        </div>
      </div>

      {/* Bottom nav placeholder */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#111f13] border-t border-[#2a3d2c]" />
    </div>
  )
}
