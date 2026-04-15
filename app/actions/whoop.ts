'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function disconnectWhoop() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  await supabase.from('whoop_tokens').delete().eq('user_id', user.id)

  redirect('/profile')
}
