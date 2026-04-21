import 'server-only'
import { createClient } from '@/lib/supabase/server'

const WHOOP_BASE = 'https://api.prod.whoop.com/developer/v2'
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'

export interface WhoopData {
  recoveryScore: number | null
  hrv: number | null
  restingHeartRate: number | null
  sleepHours: number | null
  remHours: number | null
  deepSleepHours: number | null
  sleepPerformance: number | null
  sleepDisturbances: number | null
  sleepEfficiency: number | null
  strainYesterday: number | null
  weeklyRecovery: Array<{ date: string; score: number }>
}

// Structured debug log — written to server console, returned to debug route
export interface WhoopDebugLog {
  timestamp: string
  tokenRow: {
    found: boolean
    expiresAt?: string
    isExpired?: boolean
    willRefresh?: boolean
  }
  refresh?: {
    attempted: boolean
    success?: boolean
    status?: number
    error?: string
  }
  accessTokenPrefix?: string
  recovery: {
    url: string
    status?: number
    ok?: boolean
    rawBody?: unknown
    error?: string
    selectedRecord?: unknown
    result?: unknown
  }
  sleep: {
    url: string
    status?: number
    ok?: boolean
    rawBody?: unknown
    error?: string
    selectedRecord?: unknown
    result?: unknown
  }
  finalResult?: WhoopData | null
}

async function whoopFetch(
  path: string,
  accessToken: string,
  log: WhoopDebugLog,
  section: 'recovery' | 'sleep'
) {
  const url = `${WHOOP_BASE}${path}`
  log[section].url = url
  console.log(`[WHOOP] ${section} → GET ${url}`)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  log[section].status = res.status
  log[section].ok = res.ok

  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  log[section].rawBody = body

  console.log(`[WHOOP] ${section} ← ${res.status}`, JSON.stringify(body).slice(0, 500))

  if (!res.ok) {
    const msg = `WHOOP API ${res.status}: ${path}`
    log[section].error = msg
    throw new Error(msg)
  }

  return body as Record<string, unknown>
}

export async function getRecovery(
  accessToken: string,
  log: WhoopDebugLog
): Promise<Pick<WhoopData, 'recoveryScore' | 'hrv' | 'restingHeartRate'> | null> {
  // Fetch the most recent record — v2 API, limit=1 returns latest
  const data = await whoopFetch(
    '/recovery?limit=1',
    accessToken,
    log,
    'recovery'
  )
  const records = (data.records as unknown[]) ?? []
  console.log(`[WHOOP] recovery records count: ${records.length}`)

  // Accept the record regardless of whether it's from today or yesterday
  const record = (records as Array<{ score_state: string }>).find(
    (r) => r.score_state === 'SCORED'
  )

  log.recovery.selectedRecord = record ?? null
  if (!record) {
    console.log('[WHOOP] recovery: no SCORED record found')
    return null
  }

  type RecoveryRecord = {
    score_state: string
    score?: {
      recovery_score?: number
      hrv_rmssd_milli?: number
      resting_heart_rate?: number
    }
  }
  const r = record as RecoveryRecord
  const result = {
    recoveryScore: r.score?.recovery_score ?? null,
    hrv:
      r.score?.hrv_rmssd_milli != null
        ? Math.round(r.score.hrv_rmssd_milli * 10) / 10
        : null,
    restingHeartRate: r.score?.resting_heart_rate ?? null,
  }
  log.recovery.result = result
  return result
}

export async function getSleep(
  accessToken: string,
  log: WhoopDebugLog
): Promise<Pick<WhoopData, 'sleepHours' | 'remHours' | 'deepSleepHours' | 'sleepPerformance' | 'sleepDisturbances' | 'sleepEfficiency'> | null> {
  // Fetch recent records — v2 API, limit=3 so we can skip past any naps
  const data = await whoopFetch(
    '/activity/sleep?limit=3',
    accessToken,
    log,
    'sleep'
  )
  const records = (data.records as unknown[]) ?? []
  console.log(`[WHOOP] sleep records count: ${records.length}`)

  // Skip naps, take the most recent full scored sleep
  const record = (records as Array<{ nap: boolean; score_state: string }>).find(
    (r) => !r.nap && r.score_state === 'SCORED'
  )

  log.sleep.selectedRecord = record ?? null
  if (!record) {
    console.log('[WHOOP] sleep: no non-nap SCORED record found')
    return null
  }

  type SleepRecord = {
    score?: {
      stage_summary?: {
        total_light_sleep_time_milli?: number
        total_slow_wave_sleep_time_milli?: number
        total_rem_sleep_time_milli?: number
        disturbance_count?: number
      }
      sleep_performance_percentage?: number
      sleep_efficiency_percentage?: number
    }
  }
  const r = record as SleepRecord
  const stage = r.score?.stage_summary
  const asHours = (ms: number) => Math.round((ms / 3_600_000) * 10) / 10

  const result = {
    sleepHours: asHours(
      (stage?.total_light_sleep_time_milli ?? 0) +
        (stage?.total_slow_wave_sleep_time_milli ?? 0) +
        (stage?.total_rem_sleep_time_milli ?? 0)
    ),
    remHours: asHours(stage?.total_rem_sleep_time_milli ?? 0),
    deepSleepHours: asHours(stage?.total_slow_wave_sleep_time_milli ?? 0),
    sleepPerformance: r.score?.sleep_performance_percentage ?? null,
    sleepDisturbances: stage?.disturbance_count ?? null,
    sleepEfficiency: r.score?.sleep_efficiency_percentage ?? null,
  }
  log.sleep.result = result
  return result
}

export async function getYesterdayStrain(accessToken: string): Promise<number | null> {
  try {
    const res = await fetch(`${WHOOP_BASE}/cycle?limit=2`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json() as { records?: unknown[] }
    type CycleRecord = { score_state: string; score?: { strain?: number } }
    const records = (data.records ?? []) as CycleRecord[]
    // Most recent cycle is today (in progress), second is yesterday (complete)
    const yesterday = records.find((r, i) => i > 0 && r.score_state === 'SCORED')
      ?? records.find((r) => r.score_state === 'SCORED')
    return yesterday?.score?.strain != null
      ? Math.round(yesterday.score.strain * 10) / 10
      : null
  } catch {
    return null
  }
}

export async function refreshWhoopToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  console.log('[WHOOP] attempting token refresh')
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
  console.log(`[WHOOP] token refresh ← ${res.status}`)
  if (!res.ok) {
    const body = await res.text()
    console.log('[WHOOP] token refresh error body:', body)
    return null
  }
  return res.json()
}

export async function getWhoopData(
  userId: string,
  debugLog?: WhoopDebugLog
): Promise<WhoopData | null> {
  const log: WhoopDebugLog = debugLog ?? {
    timestamp: new Date().toISOString(),
    tokenRow: { found: false },
    recovery: { url: '' },
    sleep: { url: '' },
  }

  const supabase = await createClient()

  const { data: tokenRow, error: tokenError } = await supabase
    .from('whoop_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (tokenError) {
    console.log('[WHOOP] token fetch error:', tokenError.message)
  }

  if (!tokenRow) {
    log.tokenRow = { found: false }
    console.log('[WHOOP] no token row found for user', userId)
    return null
  }

  const expiresAt = new Date(tokenRow.expires_at)
  const msUntilExpiry = expiresAt.getTime() - Date.now()
  const willRefresh = msUntilExpiry < 5 * 60 * 1000

  log.tokenRow = {
    found: true,
    expiresAt: tokenRow.expires_at,
    isExpired: msUntilExpiry < 0,
    willRefresh,
  }

  console.log(
    `[WHOOP] token found, expires: ${tokenRow.expires_at}, willRefresh: ${willRefresh}, msUntilExpiry: ${msUntilExpiry}`
  )

  let accessToken: string = tokenRow.access_token

  if (willRefresh) {
    log.refresh = { attempted: true }
    const refreshed = await refreshWhoopToken(tokenRow.refresh_token)
    if (!refreshed) {
      log.refresh.success = false
      console.log('[WHOOP] token refresh failed — deleting token row')
      await supabase.from('whoop_tokens').delete().eq('user_id', userId)
      return null
    }
    log.refresh.success = true
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
    console.log('[WHOOP] token refreshed successfully')
  }

  // Log first 20 chars of token so we can verify it looks valid
  log.accessTokenPrefix = accessToken.slice(0, 20) + '...'

  const weeklyFetch = fetch(`${WHOOP_BASE}/recovery?limit=7`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  const [recoveryData, sleepData, strainYesterday, weeklyRes] = await Promise.all([
    getRecovery(accessToken, log).catch((err) => {
      console.log('[WHOOP] getRecovery threw:', err.message)
      log.recovery.error = err.message
      return null
    }),
    getSleep(accessToken, log).catch((err) => {
      console.log('[WHOOP] getSleep threw:', err.message)
      log.sleep.error = err.message
      return null
    }),
    getYesterdayStrain(accessToken).catch(() => null),
    weeklyFetch,
  ])

  let weeklyRecovery: Array<{ date: string; score: number }> = []
  try {
    if (weeklyRes.ok) {
      const weeklyData = await weeklyRes.json() as { records?: unknown[] }
      type RecoveryRecord = {
        created_at: string
        score_state: string
        score?: { recovery_score?: number }
      }
      const records = (weeklyData.records ?? []) as RecoveryRecord[]
      weeklyRecovery = records
        .filter((r) => r.score_state === 'SCORED' && r.score?.recovery_score != null)
        .map((r) => ({
          date: r.created_at.split('T')[0],
          score: Math.round(r.score!.recovery_score!),
        }))
    }
  } catch {
    // weekly recovery unavailable — weeklyRecovery stays []
  }

  const result: WhoopData = {
    recoveryScore: recoveryData?.recoveryScore ?? null,
    hrv: recoveryData?.hrv ?? null,
    restingHeartRate: recoveryData?.restingHeartRate ?? null,
    sleepHours: sleepData?.sleepHours ?? null,
    remHours: sleepData?.remHours ?? null,
    deepSleepHours: sleepData?.deepSleepHours ?? null,
    sleepPerformance: sleepData?.sleepPerformance ?? null,
    sleepDisturbances: sleepData?.sleepDisturbances ?? null,
    sleepEfficiency: sleepData?.sleepEfficiency ?? null,
    strainYesterday: strainYesterday ?? null,
    weeklyRecovery,
  }

  log.finalResult = result
  console.log('[WHOOP] final result:', JSON.stringify(result))

  return result
}
