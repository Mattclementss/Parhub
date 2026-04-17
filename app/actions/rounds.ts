'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWhoopData } from '@/lib/whoop/client'

export interface HoleScore {
  hole: number
  par: number
  yardage: number
  score: number | null
  putts: number | null
  fairwayHit: boolean | null
  gir: boolean | null
}

export interface RoundPayload {
  courseId: string
  courseName: string
  teeBox: string
  transport: 'walking' | 'cart'
  holes: HoleScore[]
  notes: string
}

export async function saveRound(payload: RoundPayload): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const scoredHoles = payload.holes.filter((h) => h.score !== null)
  const parHoles = payload.holes.filter((h) => h.par === 4 || h.par === 5)

  const totalScore = scoredHoles.reduce((sum, h) => sum + (h.score ?? 0), 0)
  const totalPutts = scoredHoles.reduce((sum, h) => sum + (h.putts ?? 0), 0)
  const fairwaysHit = parHoles.filter((h) => h.fairwayHit === true).length
  const fairwaysPossible = parHoles.length
  const gir = scoredHoles.filter((h) => h.gir === true).length

  // Fetch WHOOP recovery for today if connected
  const { data: whoopToken } = await supabase
    .from('whoop_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let whoopRecovery: number | null = null
  let whoopHrv: number | null = null
  let whoopSleepHours: number | null = null

  if (whoopToken) {
    const whoopData = await getWhoopData(user.id).catch(() => null)
    if (whoopData) {
      whoopRecovery = whoopData.recoveryScore
      whoopHrv = whoopData.hrv
      whoopSleepHours = whoopData.sleepHours
    }
  }

  const { data: round, error } = await supabase
    .from('rounds')
    .insert({
      user_id: user.id,
      course_name: payload.courseName,
      course_id: payload.courseId,
      date_played: new Date().toISOString().split('T')[0],
      total_score: totalScore || null,
      total_putts: totalPutts || null,
      fairways_hit: fairwaysHit,
      fairways_possible: fairwaysPossible,
      gir,
      notes: payload.notes || null,
      whoop_recovery: whoopRecovery,
      whoop_hrv: whoopHrv,
      whoop_sleep_hours: whoopSleepHours,
    })
    .select()
    .single()

  if (error || !round) return { error: error?.message ?? 'Failed to save round' }

  if (scoredHoles.length > 0) {
    const { error: holesError } = await supabase.from('holes').insert(
      scoredHoles.map((h) => ({
        round_id: round.id,
        hole_number: h.hole,
        par: h.par,
        yardage: h.yardage || null,
        score: h.score,
        putts: h.putts,
        fairway_hit: h.fairwayHit,
        gir: h.gir,
        sand_save: null,
      }))
    )
    if (holesError) return { error: `Failed to save hole data: ${holesError.message}` }
  }

  return null
}
