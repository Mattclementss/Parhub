/** Reusable skeleton block — dark green pulse */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-[#1a2e1d] ${className}`} />
  )
}

/** Full-width skeleton card — accepts children for inner layout */
export function SkeletonCard({
  className = '',
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl bg-[#1a2e1d] border border-[#2a3d2c] overflow-hidden ${className}`}>
      {children}
    </div>
  )
}
