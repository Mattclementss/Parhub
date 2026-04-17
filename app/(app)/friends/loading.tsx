import { Skeleton, SkeletonCard } from '@/app/components/Skeleton'

export default function FriendsLoading() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0d1a0f] border-b border-[#2a3d2c] px-4">
        <div className="mx-auto max-w-lg flex items-center h-14">
          <Skeleton className="h-5 w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5 pb-10 space-y-5">
        {/* Add a friend */}
        <section className="space-y-2">
          <Skeleton className="h-2.5 w-24 mb-2" />
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-12 rounded-2xl" />
            <Skeleton className="w-16 h-12 rounded-2xl" />
          </div>
        </section>

        {/* Friends list */}
        <section>
          <Skeleton className="h-2.5 w-20 mb-2" />
          <SkeletonCard>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2a3d2c] last:border-0">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </SkeletonCard>
        </section>
      </main>
    </>
  )
}
