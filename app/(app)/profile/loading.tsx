import { Skeleton, SkeletonCard } from '@/app/components/Skeleton'

export default function ProfileLoading() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center h-14">
          <Skeleton className="h-5 w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 space-y-6 pb-10">
        {/* Profile header */}
        <SkeletonCard className="px-5 py-5 flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-28" />
          </div>
        </SkeletonCard>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="px-3 py-4 flex flex-col items-center gap-2">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-2.5 w-16" />
            </SkeletonCard>
          ))}
        </div>

        {/* Edit profile form */}
        <SkeletonCard>
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-[#2a3d2c] last:border-0 space-y-1.5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </SkeletonCard>
        <Skeleton className="h-12 w-full rounded-2xl" />

        {/* WHOOP + Friends sections */}
        <SkeletonCard className="p-4 flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-7 w-20 rounded-xl shrink-0" />
        </SkeletonCard>
      </main>
    </>
  )
}
