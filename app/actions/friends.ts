'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface FriendRequestState {
  error?: string
  success?: string
  notFound?: boolean
  email?: string
}

export async function sendFriendRequest(
  _prev: FriendRequestState,
  formData: FormData
): Promise<FriendRequestState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Enter an email address' }

  // Find the target user
  const { data: found } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', email)
    .single()

  if (!found) return { notFound: true, email }
  if (found.id === user.id) return { error: "You can't add yourself" }

  // Check existing friendship
  const { data: alreadyFriends } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', user.id)
    .eq('friend_id', found.id)
    .single()

  if (alreadyFriends) {
    return { error: `You're already friends with ${found.full_name ?? email}` }
  }

  // Check existing pending request in either direction
  const { data: existingReq } = await supabase
    .from('friend_requests')
    .select('id, status, sender_id')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${found.id}),and(sender_id.eq.${found.id},receiver_id.eq.${user.id})`
    )
    .eq('status', 'pending')
    .maybeSingle()

  if (existingReq) {
    if (existingReq.sender_id === user.id) {
      return { error: 'You already sent them a request' }
    }
    // They sent us a request — auto-accept it
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', existingReq.id)
    revalidatePath('/friends')
    revalidatePath('/leaderboard')
    return { success: `You're now friends with ${found.full_name ?? email}!` }
  }

  const { error } = await supabase.from('friend_requests').insert({
    sender_id: user.id,
    receiver_id: found.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/friends')
  return { success: `Friend request sent to ${found.full_name ?? email}` }
}

export async function acceptFriendRequest(requestId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('receiver_id', user.id) // ensure only the receiver can accept

  revalidatePath('/friends')
  revalidatePath('/leaderboard')
}

export async function declineFriendRequest(requestId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('receiver_id', user.id)

  revalidatePath('/friends')
}

export async function removeFriend(friendId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Delete our row; the trigger deletes the reverse row
  await supabase
    .from('friendships')
    .delete()
    .eq('user_id', user.id)
    .eq('friend_id', friendId)

  revalidatePath('/friends')
  revalidatePath('/leaderboard')
}
