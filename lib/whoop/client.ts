import 'server-only'
import { createClient } from '@/lib/supabase/server'

const WHOOP_BASE = 'https://api.prod.whoop.com/developer/v1'
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'

export interface WhoopData {
  recoveryScore: number | null
  hrv: number | null
  restingHeartRate: number | null
  sleepHours: number | null
  remHours: number | null
  deepSleepHours: number | null
  sleepPerformance: number | null
}

async function whoopFetch(path: string, accessToken: string) {
  const res = await fetch(`${WHOOP_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`WHOOP API ${res.status}: ${path}`)
  return res.json()
}

export async function getRecovery(
  accessToken: string,
  date: string
): Promise<Pick<WhoopData, 'recoveryScore' | 'hrv' | 'restingHeartRate'> | null> {
  // Query a 36-hour window ending at end-of-day to catch the current cycle
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end.getTime() - 36 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
    limit: '5',
  })

  const data = await whoopFetch(`/recovery?${params}`, accessToken)
  const record = (data.records ?? []).find(
    (r: { score_state: string }) => r.score_state === 'SCORED'
  )
  if (!record) return null

  return {
    recoveryScore: record.score?.recovery_score ?? null,
    hrv: record.score?.hrv_rmssd_milli != null
      ? Math.round(record.score.hrv_rmssd_milli * 10) / 10
      : null,
    restingHeartRate: record.score?.resting_heart_rate ?? null,
  }
}

export async function getSleep(
  accessToken: string,
  date: string
): Promise<Pick<WhoopData, 'sleepHours' | 'remHours' | 'deepSleepHours' | 'sleepPerformance'> | null> {
  // Sleep records end in the morning — query a wider window
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end.getTime() - 36 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
    limit: '5',
  })

  const data = await whoopFetch(`/activity/sleep?${params}`, accessToken)
  const record = (data.records ?? []).find(
    (r: { nap: boolean; score_state: string }) => !r.nap && r.score_state === 'SCORED'
  )
  if (!record) return null

  const stage = record.score?.stage_summary
  const asHours = (ms: number) => Math.round((ms / 3_600_000) * 10) / 10

  return {
    sleepHours: asHours(
      (stage?.total_light_sleep_time_milli ?? 0) +
      (stage?.total_slow_wave_sleep_time_milli ?? 0) +
      (stage?.total_rem_sleep_time_milli ?? 0)
    ),
    remHours: asHours(stage?.total_rem_sleep_time_milli ?? 0),
    deepSleepHours: asHours(stage?.total_slow_wave_sleep_time_milli ?? 0),
    sleepPerformance: record.score?.sleep_performance_percentage ?? null,
  }
}

export async function refreshWhoopToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getWhoopData(userId: string): Promise<WhoopData | null> {
  const supabase = await createClient()

  const { data: tokenRow } = await supabase
    .from('whoop_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!tokenRow) return null

  let accessToken: string = tokenRow.access_token

  // Refresh if expiring within 5 minutes
  if (new Date(tokenRow.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshWhoopToken(tokenRow.refresh_token)
    if (!refreshed) {
      await supabase.from('whoop_tokens').delete().eq('user_id', userId)
      return null
    }
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    await supabase
      .from('whoop_tokens')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: newExpiresAt,
      })
      .eq('user_id', userId)
    accessToken = refreshed.access_token
  }

  const today = new Date().toISOString().split('T')[0]

  const [recoveryData, sleepData] = await Promise.all([
    getRecovery(accessToken, today).catch(() => null),
    getSleep(accessToken, today).catch(() => null),
  ])

  return {
    recoveryScore: recoveryData?.recoveryScore ?? null,
    hrv: recoveryData?.hrv ?? null,
    restingHeartRate: recoveryData?.restingHeartRate ?? null,
    sleepHours: sleepData?.sleepHours ?? null,
    remHours: sleepData?.remHours ?? null,
    deepSleepHours: sleepData?.deepSleepHours ?? null,
    sleepPerformance: sleepData?.sleepPerformance ?? null,
  }
}
