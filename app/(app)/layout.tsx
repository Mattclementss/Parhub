import BottomNav from '@/app/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {children}
      <BottomNav />
    </div>
  )
}
