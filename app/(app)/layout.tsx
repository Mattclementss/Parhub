import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/app/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let pendingFriendRequests = 0
  if (user) {
    const { count } = await supabase
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    pendingFriendRequests = count ?? 0
  }

  return (
    <div className="min-h-screen bg-[#0d1a0f] pb-24">
      {children}
      <BottomNav pendingFriendRequests={pendingFriendRequests} />
    </div>
  )
}
