import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWeeklyInsights } from '@/lib/ai/insights'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check cache
  const { data: cached } = await supabase
    .from('insights_cache')
    .select('weekly_summary, pre_round_prediction, pattern_alert, recommended_tee_time, generated_at')
    .eq('user_id', user.id)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.generated_at).getTime()
    if (age < CACHE_TTL_MS) {
      return NextResponse.json({
        weeklySummary: cached.weekly_summary,
        preRoundPrediction: cached.pre_round_prediction,
        patternAlert: cached.pattern_alert,
        recommendedTeeTime: cached.recommended_tee_time,
        generatedAt: cached.generated_at,
        fromCache: true,
      })
    }
  }

  // Generate fresh insights
  const insights = await generateWeeklyInsights(user.id)

  // Upsert into cache
  await supabase.from('insights_cache').upsert(
    {
      user_id: user.id,
      weekly_summary: insights.weeklySummary,
      pre_round_prediction: insights.preRoundPrediction,
      pattern_alert: insights.patternAlert,
      recommended_tee_time: insights.recommendedTeeTime,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({
    ...insights,
    generatedAt: new Date().toISOString(),
    fromCache: false,
  })
}
