'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const fullName = formData.get('full_name') as string | null
  const homeCourse = formData.get('home_course') as string | null
  const typicalTeeBox = formData.get('typical_tee_box') as string | null
  const handicapRaw = formData.get('handicap_index') as string | null
  const handicapIndex = handicapRaw && handicapRaw.trim() !== ''
    ? parseFloat(handicapRaw)
    : null

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName?.trim() || null,
      home_course: homeCourse?.trim() || null,
      typical_tee_box: typicalTeeBox || null,
      handicap_index: handicapIndex,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Delete all user data (cascades via FK)
  await supabase.from('profiles').delete().eq('id', user.id)
  await supabase.auth.signOut()
  return { success: true }
}
