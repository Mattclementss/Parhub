import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// ─── Daily cache ──────────────────────────────────────────────────────────────

export async function getOrGenerateDailyInsight(userId: string): Promise<WeeklyInsights | null> {
  try {
    const supabase = await createClient()
    const todayStr = new Date().toISOString().split('T')[0]

    // Check cache
    const { data: cached } = await supabase
      .from('insights_cache')
      .select('weekly_summary, pre_round_prediction, pattern_alert, recommended_tee_time, generated_at')
      .eq('user_id', userId)
      .single()

    if (cached && cached.generated_at.startsWith(todayStr)) {
      return {
        weeklySummary: cached.weekly_summary ?? '',
        preRoundPrediction: cached.pre_round_prediction ?? '',
        patternAlert: cached.pattern_alert ?? null,
        recommendedTeeTime: cached.recommended_tee_time ?? null,
      }
    }

    // Generate fresh
    const fresh = await generateWeeklyInsights(userId)

    await supabase.from('insights_cache').upsert(
      {
        user_id: userId,
        weekly_summary: fresh.weeklySummary,
        pre_round_prediction: fresh.preRoundPrediction,
        pattern_alert: fresh.patternAlert,
        recommended_tee_time: fresh.recommendedTeeTime,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    return fresh
  } catch {
    return null
  }
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface WeeklyInsights {
  weeklySummary: string
  preRoundPrediction: string
  patternAlert: string | null
  recommendedTeeTime: string | null
}

// ─── Tool definition for structured output ───────────────────────────────────

const insightsTool: Anthropic.Tool = {
  name: 'provide_golf_insights',
  description: 'Provide personalized golf performance insights based on the player data.',
  input_schema: {
    type: 'object' as const,
    properties: {
      weeklySummary: {
        type: 'string',
        description: '2-3 sentences summarizing recent performance trends and what stands out.',
      },
      preRoundPrediction: {
        type: 'string',
        description:
          "Prediction for the player's next round based on today's recovery, recent form, and WHOOP data patterns. 1-2 sentences.",
      },
      patternAlert: {
        type: ['string', 'null'],
        description:
          'A specific, actionable pattern detected in the data (e.g. scoring worse on low-sleep days, best scores after 8h+ sleep). null if no clear pattern with enough data.',
      },
      recommendedTeeTime: {
        type: ['string', 'null'],
        description:
          'Morning or afternoon recommendation with a one-sentence reason based on their data. null if insufficient data.',
      },
    },
    required: ['weeklySummary', 'preRoundPrediction', 'patternAlert', 'recommendedTeeTime'],
  },
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function fmtAvg(nums: number[]): string {
  if (nums.length === 0) return 'N/A'
  const a = nums.reduce((s, n) => s + n, 0) / nums.length
  return (Math.round(a * 10) / 10).toString()
}

function trend(recent: number[], older: number[]): string {
  if (recent.length < 2 || older.length < 2) return 'insufficient data'
  const r = recent.reduce((s, n) => s + n, 0) / recent.length
  const o = older.reduce((s, n) => s + n, 0) / older.length
  const diff = r - o
  if (Math.abs(diff) < 0.5) return 'stable'
  return diff < 0 ? `improving (${Math.abs(diff).toFixed(1)} strokes better)` : `declining (${Math.abs(diff).toFixed(1)} strokes worse)`
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateWeeklyInsights(userId: string): Promise<WeeklyInsights> {
  const supabase = await createClient()

  // Fetch last 30 scored rounds
  const { data: rounds } = await supabase
    .from('rounds')
    .select('total_score, date_played, total_putts, gir, fairways_hit, fairways_possible, whoop_recovery, whoop_hrv, whoop_sleep_hours, whoop_resting_hr, whoop_rem_hours, whoop_deep_sleep_hours, whoop_sleep_performance, whoop_sleep_disturbances, whoop_sleep_efficiency, whoop_strain_yesterday, course_name, notes')
    .eq('user_id', userId)
    .not('total_score', 'is', null)
    .order('date_played', { ascending: false })
    .limit(30)

  const allRounds = (rounds ?? []) as Array<{
    total_score: number
    date_played: string
    total_putts: number | null
    gir: number | null
    fairways_hit: number | null
    fairways_possible: number | null
    whoop_recovery: number | null
    whoop_hrv: number | null
    whoop_sleep_hours: number | null
    whoop_resting_hr: number | null
    whoop_rem_hours: number | null
    whoop_deep_sleep_hours: number | null
    whoop_sleep_performance: number | null
    whoop_sleep_disturbances: number | null
    whoop_sleep_efficiency: number | null
    whoop_strain_yesterday: number | null
    course_name: string
    notes: string | null
  }>


  // ── Compute summary stats ────────────────────────────────────────────────

  const scores = allRounds.map(r => r.total_score)
  const last5 = scores.slice(0, 5)
  const prev5 = scores.slice(5, 10)

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisWeekRounds = allRounds.filter(r => new Date(r.date_played) >= weekAgo)
  const thisWeekScores = thisWeekRounds.map(r => r.total_score)

  // WHOOP correlation
  const whoopRounds = allRounds.filter(r => r.whoop_recovery !== null)
  const greenRounds = whoopRounds.filter(r => r.whoop_recovery! >= 67)
  const yellowRounds = whoopRounds.filter(r => r.whoop_recovery! >= 34 && r.whoop_recovery! < 67)
  const redRounds = whoopRounds.filter(r => r.whoop_recovery! < 34)

  // Sleep quality correlations
  const sleep8Plus = allRounds.filter(r => r.whoop_sleep_hours !== null && r.whoop_sleep_hours >= 8)
  const sleep6to8 = allRounds.filter(r => r.whoop_sleep_hours !== null && r.whoop_sleep_hours >= 6 && r.whoop_sleep_hours < 8)
  const sleepUnder6 = allRounds.filter(r => r.whoop_sleep_hours !== null && r.whoop_sleep_hours < 6)

  // Deep + REM sleep correlations
  const deepSleepRounds = allRounds.filter(r => r.whoop_deep_sleep_hours !== null)
  const highDeep = deepSleepRounds.filter(r => r.whoop_deep_sleep_hours! >= 1.5)
  const lowDeep = deepSleepRounds.filter(r => r.whoop_deep_sleep_hours! < 1.5)
  const remRounds = allRounds.filter(r => r.whoop_rem_hours !== null)
  const highRem = remRounds.filter(r => r.whoop_rem_hours! >= 1.5)
  const lowRem = remRounds.filter(r => r.whoop_rem_hours! < 1.5)

  // Sleep disturbances
  const disturbanceRounds = allRounds.filter(r => r.whoop_sleep_disturbances !== null)
  const lowDisturbance = disturbanceRounds.filter(r => r.whoop_sleep_disturbances! < 8)
  const highDisturbance = disturbanceRounds.filter(r => r.whoop_sleep_disturbances! >= 8)

  // Prior day strain
  const strainRounds = allRounds.filter(r => r.whoop_strain_yesterday !== null)
  const highStrain = strainRounds.filter(r => r.whoop_strain_yesterday! >= 14)
  const lowStrain = strainRounds.filter(r => r.whoop_strain_yesterday! < 14)

  // Best round
  const bestRound = allRounds.reduce((best, r) => r.total_score < (best?.total_score ?? Infinity) ? r : best, allRounds[0])

  // Most recent WHOOP data for today's context
  const recentWithWhoop = allRounds.find(r => r.whoop_recovery !== null)
  const todayRecovery = recentWithWhoop?.whoop_recovery ?? null
  const todayHrv = recentWithWhoop?.whoop_hrv ?? null
  const todaySleep = recentWithWhoop?.whoop_sleep_hours ?? null
  const todayRestingHr = recentWithWhoop?.whoop_resting_hr ?? null
  const todayDeepSleep = recentWithWhoop?.whoop_deep_sleep_hours ?? null
  const todayRem = recentWithWhoop?.whoop_rem_hours ?? null
  const todaySleepPerformance = recentWithWhoop?.whoop_sleep_performance ?? null
  const todayDisturbances = recentWithWhoop?.whoop_sleep_disturbances ?? null
  const todayStrainYesterday = recentWithWhoop?.whoop_strain_yesterday ?? null

  // ── Build prompt ──────────────────────────────────────────────────────────

  const prompt = `You are a golf performance coach analyzing a player's biometric and scoring data. Provide honest, specific, and actionable insights — not generic advice. Only reference patterns that are supported by the actual data provided.

PLAYER STATS (last ${allRounds.length} rounds):
- Season scoring average: ${fmtAvg(scores)}
- Last 5 rounds average: ${fmtAvg(last5)}
- Previous 5 rounds average: ${fmtAvg(prev5)}
- Scoring trend: ${trend(last5, prev5)}
- This week: ${thisWeekRounds.length} round${thisWeekRounds.length !== 1 ? 's' : ''}${thisWeekScores.length > 0 ? `, avg ${fmtAvg(thisWeekScores)}` : ''}
- Best round: ${bestRound ? `${bestRound.total_score} at ${bestRound.course_name}` : 'N/A'}
- Average putts: ${fmtAvg(allRounds.filter(r => r.total_putts !== null).map(r => r.total_putts!))}
- GIR average: ${fmtAvg(allRounds.filter(r => r.gir !== null).map(r => r.gir!))} / 18
${allRounds.filter(r => r.fairways_possible).length > 0 ? `- FIR: ${fmtAvg(allRounds.filter(r => r.fairways_hit !== null && r.fairways_possible).map(r => Math.round(r.fairways_hit! / r.fairways_possible! * 100)))}%` : ''}

WHOOP RECOVERY vs SCORING (${whoopRounds.length} rounds with data):
${greenRounds.length > 0 ? `- High recovery (67-100%): ${greenRounds.length} rounds, avg score ${fmtAvg(greenRounds.map(r => r.total_score))}` : '- High recovery (67-100%): no data'}
${yellowRounds.length > 0 ? `- Medium recovery (34-66%): ${yellowRounds.length} rounds, avg score ${fmtAvg(yellowRounds.map(r => r.total_score))}` : '- Medium recovery (34-66%): no data'}
${redRounds.length > 0 ? `- Low recovery (0-33%): ${redRounds.length} rounds, avg score ${fmtAvg(redRounds.map(r => r.total_score))}` : '- Low recovery (0-33%): no data'}

SLEEP DURATION vs SCORING:
${sleep8Plus.length > 0 ? `- 8+ hours: ${sleep8Plus.length} rounds, avg score ${fmtAvg(sleep8Plus.map(r => r.total_score))}` : '- 8+ hours: no data'}
${sleep6to8.length > 0 ? `- 6-8 hours: ${sleep6to8.length} rounds, avg score ${fmtAvg(sleep6to8.map(r => r.total_score))}` : '- 6-8 hours: no data'}
${sleepUnder6.length > 0 ? `- Under 6 hours: ${sleepUnder6.length} rounds, avg score ${fmtAvg(sleepUnder6.map(r => r.total_score))}` : '- Under 6 hours: no data'}

SLEEP QUALITY vs SCORING:
${highDeep.length > 0 ? `- High deep sleep (1.5h+): ${highDeep.length} rounds, avg score ${fmtAvg(highDeep.map(r => r.total_score))}` : '- High deep sleep: no data'}
${lowDeep.length > 0 ? `- Low deep sleep (<1.5h): ${lowDeep.length} rounds, avg score ${fmtAvg(lowDeep.map(r => r.total_score))}` : ''}
${highRem.length > 0 ? `- High REM (1.5h+): ${highRem.length} rounds, avg score ${fmtAvg(highRem.map(r => r.total_score))}` : '- High REM: no data'}
${lowRem.length > 0 ? `- Low REM (<1.5h): ${lowRem.length} rounds, avg score ${fmtAvg(lowRem.map(r => r.total_score))}` : ''}
${lowDisturbance.length > 0 ? `- Low disturbances (<8): ${lowDisturbance.length} rounds, avg score ${fmtAvg(lowDisturbance.map(r => r.total_score))}` : ''}
${highDisturbance.length > 0 ? `- High disturbances (8+): ${highDisturbance.length} rounds, avg score ${fmtAvg(highDisturbance.map(r => r.total_score))}` : ''}

PRIOR-DAY STRAIN vs SCORING (${strainRounds.length} rounds with data):
${highStrain.length > 0 ? `- High prior strain (14+): ${highStrain.length} rounds, avg score ${fmtAvg(highStrain.map(r => r.total_score))}` : '- High prior strain: no data'}
${lowStrain.length > 0 ? `- Low prior strain (<14): ${lowStrain.length} rounds, avg score ${fmtAvg(lowStrain.map(r => r.total_score))}` : '- Low prior strain: no data'}

MOST RECENT BIOMETRICS:
${todayRecovery !== null ? `- Recovery score: ${Math.round(todayRecovery)}%` : '- Recovery score: not available'}
${todayHrv !== null ? `- HRV: ${todayHrv}ms` : ''}
${todayRestingHr !== null ? `- Resting HR: ${todayRestingHr} bpm` : ''}
${todaySleep !== null ? `- Total sleep: ${todaySleep}h` : ''}
${todayDeepSleep !== null ? `- Deep sleep: ${todayDeepSleep}h` : ''}
${todayRem !== null ? `- REM sleep: ${todayRem}h` : ''}
${todaySleepPerformance !== null ? `- Sleep performance: ${todaySleepPerformance}%` : ''}
${todayDisturbances !== null ? `- Sleep disturbances: ${todayDisturbances}` : ''}
${todayStrainYesterday !== null ? `- Yesterday's strain: ${todayStrainYesterday}` : ''}

Provide insights specific to THIS player's actual numbers. Reference their real scores and patterns. Be encouraging but honest.`

  // ── Call Anthropic API ────────────────────────────────────────────────────

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [insightsTool],
    tool_choice: { type: 'tool', name: 'provide_golf_insights' },
    messages: [{ role: 'user', content: prompt }],
  })

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!toolUse) throw new Error('No structured response from AI')

  const raw = toolUse.input as Record<string, unknown>

  return {
    weeklySummary: String(raw.weeklySummary ?? ''),
    preRoundPrediction: String(raw.preRoundPrediction ?? ''),
    patternAlert: raw.patternAlert != null && raw.patternAlert !== 'null' ? String(raw.patternAlert) : null,
    recommendedTeeTime: raw.recommendedTeeTime != null && raw.recommendedTeeTime !== 'null' ? String(raw.recommendedTeeTime) : null,
  }
}
